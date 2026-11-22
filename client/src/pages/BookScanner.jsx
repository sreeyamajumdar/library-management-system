import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { createWorker } from 'tesseract.js';
import {
  Camera,
  BookOpen,
  CheckCircle,
  XCircle,
  Clock,
  ScanLine,
  RefreshCw,
  Search,
  AlertTriangle,
  BookMarked,
  Sparkles,
  Smartphone,
  ShieldAlert,
  Hash,
  User,
  Zap,
  ArrowRight,
  Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const playBeep = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.frequency.value = 880;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.35;
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.15);
  } catch {
    // Ignore audio permission error
  }
};

const normalizeIsbn = (value) => String(value ?? '').replace(/[^0-9Xx]/g, '').toUpperCase();

const canonicalizeIsbnForLookup = (value) => {
  const normalized = normalizeIsbn(value);

  if (!normalized) return '';
  if (/^93[0-9X]{8}$/i.test(normalized)) {
    return `978${normalized}`;
  }
  if (/^978[0-9X]{10}$/i.test(normalized)) {
    return normalized;
  }

  return normalized;
};

const formatIsbnForDisplay = (value) => {
  const normalized = normalizeIsbn(value);
  if (normalized.length === 13) {
    return `${normalized.slice(0, 3)}-${normalized.slice(3, 5)}-${normalized.slice(5, 8)}-${normalized.slice(8, 12)}-${normalized.slice(12)}`;
  }
  if (normalized.length === 10) {
    return `${normalized.slice(0, 3)}-${normalized.slice(3, 6)}-${normalized.slice(6)}`;
  }
  return normalized;
};

const isLikelyIsbn = (value) => {
  const normalized = normalizeIsbn(value);
  return normalized.length >= 10 && normalized.length <= 13 && /[0-9]/.test(normalized);
};

const extractIsbnCandidates = (text) => {
  if (!text) return [];

  const maybeIsbnMatches = text.match(/(?:ISBN(?:-1[03])?:?\s*)?(?:97[89]|93)[\dXx\s\-:./]{7,35}[\dXx]/gi) || [];
  const candidates = new Set();

  maybeIsbnMatches.forEach((match) => {
    const normalized = normalizeIsbn(match);
    if (isLikelyIsbn(normalized)) {
      candidates.add(normalized);
    }
  });

  const fallbackMatches = text.match(/[0-9][\d\s\-:./]{8,35}[0-9Xx]/gi) || [];
  fallbackMatches.forEach((match) => {
    const normalized = normalizeIsbn(match);
    if (isLikelyIsbn(normalized) && normalized.length >= 10) {
      candidates.add(normalized);
    }
  });

  return [...candidates];
};

export default function BookScanner() {
  const { api, user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Target book passed from inventory "Scan to Borrow"
  const targetBookId = searchParams.get('bookId');
  const targetIsbn = searchParams.get('isbn');
  const targetTitle = searchParams.get('title');

  // Mode: 'camera' or 'manual'
  const [activeTab, setActiveTab] = useState('camera');

  // Camera states
  const [cameraStatus, setCameraStatus] = useState('initializing'); // 'initializing' | 'running' | 'error' | 'paused'
  const [cameraError, setCameraError] = useState('');
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  // Live OCR state
  const [liveOcrActive, setLiveOcrActive] = useState(true);
  const [ocrStatusText, setOcrStatusText] = useState('');
  const [lastDetectedText, setLastDetectedText] = useState('');

  // Book checkout states
  const [scannedCode, setScannedCode] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState({ status: 'idle', book: null, books: [], message: '' });
  const [borrowing, setBorrowing] = useState(false);
  const [borrowSuccess, setBorrowSuccess] = useState(null);

  // Quick manual input on camera screen
  const [directIsbnInput, setDirectIsbnInput] = useState('');

  // Session activity & user records
  const [sessionCheckouts, setSessionCheckouts] = useState([]);
  const [myBooks, setMyBooks] = useState([]);

  // Manual search tab state
  const [manualQuery, setManualQuery] = useState('');
  const [manualSearching, setManualSearching] = useState(false);
  const [manualResults, setManualResults] = useState([]);

  // Refs
  const html5QrCodeRef = useRef(null);
  const isProcessingRef = useRef(false);
  const ocrWorkerRef = useRef(null);
  const ocrIntervalRef = useRef(null);

  // Secure context detection
  const isSecureOrigin =
    window.isSecureContext ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  // Fetch student's currently borrowed books
  const fetchMyBooks = useCallback(async () => {
    try {
      const res = await api.get('/transactions/my-books');
      setMyBooks(res.data.transactions || []);
    } catch {
      // Silently fail
    }
  }, [api]);

  useEffect(() => {
    fetchMyBooks();
  }, [fetchMyBooks]);

  // Cleanly stop any active camera stream
  const stopCamera = async () => {
    if (ocrIntervalRef.current) {
      clearInterval(ocrIntervalRef.current);
      ocrIntervalRef.current = null;
    }
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Camera stop warning:', err);
      }
    }
  };

  // Look up a book in MongoDB by its scanned ISBN
  const lookupBookByIsbn = useCallback(
    async (isbnToLookup) => {
      setLookupLoading(true);
      setBorrowSuccess(null);

      try {
        const cleanParam = encodeURIComponent(isbnToLookup.trim());
        const res = await api.get(`/books/isbn/${cleanParam}`);
        const data = res.data;

        if (data.isMultiple && data.books?.length > 1) {
          setLookupResult({
            status: 'multiple',
            books: data.books,
            book: null,
            message: '',
            scannedIsbn: isbnToLookup,
          });
        } else if (data.book) {
          setLookupResult({
            status: 'found',
            book: data.book,
            books: [],
            message: '',
            scannedIsbn: isbnToLookup,
          });
        } else {
          setLookupResult({
            status: 'not_found',
            book: null,
            books: [],
            message: 'Book not found in the library inventory.',
            scannedIsbn: isbnToLookup,
          });
        }
      } catch (err) {
        setLookupResult({
          status: 'not_found',
          book: null,
          books: [],
          message: err.response?.data?.message || 'Book not found in the library inventory.',
          scannedIsbn: isbnToLookup,
        });
      } finally {
        setLookupLoading(false);
      }
    },
    [api]
  );

  // Handle successful barcode or text match
  const handleTriggerMatch = useCallback(
    async (isbnMatch) => {
      if (isProcessingRef.current) return;
      const canonicalMatch = canonicalizeIsbnForLookup(isbnMatch);
      isProcessingRef.current = true;

      playBeep();

      // Pause the camera feed while user confirms
      try {
        if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.pause();
          setCameraStatus('paused');
        }
      } catch {
        // Ignore pause failure
      }

      setScannedCode(canonicalMatch);
      await lookupBookByIsbn(canonicalMatch);
    },
    [lookupBookByIsbn]
  );

  // Initialize persistent Tesseract OCR worker for real-time text reading
  useEffect(() => {
    let active = true;
    const setupOcr = async () => {
      try {
        const worker = await createWorker('eng');
        if (active) {
          ocrWorkerRef.current = worker;
        } else {
          await worker.terminate();
        }
      } catch (err) {
        console.warn('OCR worker setup notice:', err);
      }
    };
    setupOcr();

    return () => {
      active = false;
      if (ocrWorkerRef.current) {
        ocrWorkerRef.current.terminate().catch(() => {});
      }
    };
  }, []);

  // Real-time Text OCR Scanner from live video feed
  const scanVideoFrameForText = useCallback(async () => {
    if (!ocrWorkerRef.current || isProcessingRef.current || cameraStatus !== 'running') return;

    try {
      const videoElement = document.querySelector('#reader video');
      if (!videoElement || videoElement.readyState < 2) return;

      const canvas = document.createElement('canvas');
      const vw = videoElement.videoWidth || 640;
      const vh = videoElement.videoHeight || 480;

      // Crop to the central scanning reticle for ultra-fast recognition
      const cropW = Math.floor(vw * 0.75);
      const cropH = Math.floor(vh * 0.5);
      const startX = Math.floor((vw - cropW) / 2);
      const startY = Math.floor((vh - cropH) / 2);

      canvas.width = cropW;
      canvas.height = cropH;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoElement, startX, startY, cropW, cropH, 0, 0, cropW, cropH);

      setOcrStatusText('Analyzing live video frame...');
      const {
        data: { text },
      } = await ocrWorkerRef.current.recognize(canvas);

      if (!text || !text.trim() || isProcessingRef.current) return;

      const normalizedText = text.replace(/[\r\n]+/g, ' ').trim();
      setLastDetectedText(normalizedText.substring(0, 50));

      const extractedIsbnCandidates = extractIsbnCandidates(normalizedText);

      if (extractedIsbnCandidates.length > 0) {
        const candidate = canonicalizeIsbnForLookup(extractedIsbnCandidates[0]);
        const displayCandidate = formatIsbnForDisplay(candidate);
        setOcrStatusText(`Detected ISBN: ${displayCandidate}`);
        toast.success(`Recognized text: ${displayCandidate}`, { icon: '🔍' });
        await handleTriggerMatch(candidate);
        return;
      }

      // Generic ISBN capture as a fallback for non-standard OCR formatting.
      const isbnRegex =
        /(?:ISBN(?:-1[03])?:?\s*)?((?:97[89][- ]?)?[0-9]{1,5}[- ]?[0-9]{1,7}[- ]?[0-9]{1,7}[- ]?[0-9Xx])/gi;
      const matches = normalizedText.match(isbnRegex);

      if (matches && matches.length > 0) {
        for (const rawMatch of matches) {
          const cleanIsbn = rawMatch.replace(/ISBN:?/gi, '').trim();
          const digitsOnly = cleanIsbn.replace(/[^0-9X]/gi, '');
          if (digitsOnly.length >= 9) {
            setOcrStatusText(`Detected ISBN: ${cleanIsbn}`);
            toast.success(`Recognized text: ${cleanIsbn}`, { icon: '🔍' });
            await handleTriggerMatch(digitsOnly);
            return;
          }
        }
      }
    } catch {
      // Ignore background OCR frame error
    } finally {
      if (!isProcessingRef.current) {
        setOcrStatusText('');
      }
    }
  }, [cameraStatus, handleTriggerMatch]);

  // Periodic Live OCR loop
  useEffect(() => {
    if (cameraStatus === 'running' && liveOcrActive) {
      ocrIntervalRef.current = setInterval(() => {
        scanVideoFrameForText();
      }, 1400); // Check every 1.4 seconds

      return () => {
        if (ocrIntervalRef.current) clearInterval(ocrIntervalRef.current);
      };
    }
  }, [cameraStatus, liveOcrActive, scanVideoFrameForText]);

  // Start the camera using Html5Qrcode
  const startCamera = useCallback(
    async (cameraIdOrFacing) => {
      setCameraStatus('initializing');
      setCameraError('');

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraStatus('error');
        if (!isSecureOrigin) {
          setCameraError(
            'Camera access requires a Secure Context (HTTPS or localhost). Modern browsers block camera streams over plain HTTP on local network IPs (e.g. 192.168.x.x). Please test on localhost or use the manual search below.'
          );
        } else {
          setCameraError('Camera API is not supported by this browser. Please use manual entry below.');
        }
        return;
      }

      await stopCamera();

      try {
          const qrCode = new Html5Qrcode('reader', {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.CODE_93,
            Html5QrcodeSupportedFormats.ITF,
            Html5QrcodeSupportedFormats.CODABAR,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
          verbose: false,
        });
        html5QrCodeRef.current = qrCode;

        try {
          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0) {
            setCameras(devices);
          }
        } catch {
          // Fall back
        }

        const cameraConfig = cameraIdOrFacing
          ? typeof cameraIdOrFacing === 'string'
            ? { deviceId: { exact: cameraIdOrFacing } }
            : cameraIdOrFacing
          : { facingMode: 'environment' };

        const config = {
          fps: 15,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const boxWidth = Math.max(260, Math.floor(minEdge * 0.8));
            const boxHeight = Math.max(160, Math.floor(boxWidth * 0.55));
            return { width: boxWidth, height: boxHeight };
          },
          aspectRatio: 1.777778,
        };

        await qrCode.start(
          cameraConfig,
          config,
          (decodedBarcode) => handleTriggerMatch(decodedBarcode),
          () => {}
        );

        setCameraStatus('running');
        isProcessingRef.current = false;

        try {
          const trackCapabilities = qrCode.getRunningTrackCapabilities();
          setTorchAvailable(!!(trackCapabilities && trackCapabilities.torch));
        } catch {
          setTorchAvailable(false);
        }
      } catch (err) {
        console.error('Camera startup error:', err);
        setCameraStatus('error');
        const errStr = String(err).toLowerCase();

        if (errStr.includes('notallowederror') || errStr.includes('permission')) {
          setCameraError(
            'Camera permission was denied. Please allow camera access in your browser site permissions and click Retry.'
          );
        } else if (errStr.includes('notfounderror') || errStr.includes('devicesnotfound')) {
          setCameraError('No camera detected on this device. You can use the manual search below to check out books.');
        } else if (
          errStr.includes('notreadableerror') ||
          errStr.includes('could not start video source') ||
          errStr.includes('trackstarterror')
        ) {
          setCameraError(
            'Camera is currently in use by another tab or application. Please close other camera apps and click Retry.'
          );
        } else if (!isSecureOrigin) {
          setCameraError(
            'Camera access requires a Secure Context (HTTPS or localhost). If you are accessing this from a phone on your local Wi-Fi, modern mobile browsers block camera access over plain HTTP.'
          );
        } else {
          setCameraError('Unable to initialize camera preview. Please check browser permissions and click Retry.');
        }
      }
    },
    [handleTriggerMatch, isSecureOrigin]
  );

  useEffect(() => {
    if (activeTab === 'camera') {
      const initTimer = setTimeout(() => {
        startCamera(selectedCameraId || { facingMode: 'environment' });
      }, 100);

      return () => {
        clearTimeout(initTimer);
        stopCamera();
      };
    } else {
      stopCamera();
    }
  }, [activeTab, selectedCameraId, startCamera]);

  const handleCameraChange = (deviceId) => {
    setSelectedCameraId(deviceId);
    startCamera(deviceId);
  };

  const toggleTorch = async () => {
    if (!html5QrCodeRef.current || !torchAvailable) return;
    try {
      const nextState = !torchOn;
      await html5QrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: nextState }],
      });
      setTorchOn(nextState);
    } catch {
      toast.error('Torch not supported on this device');
    }
  };

  const handleResumeScanning = async () => {
    setLookupResult({ status: 'idle', book: null, books: [], message: '' });
    setBorrowSuccess(null);
    setScannedCode('');
    setDirectIsbnInput('');
    isProcessingRef.current = false;

    if (activeTab === 'camera') {
      try {
        if (html5QrCodeRef.current) {
          if (html5QrCodeRef.current.getState && html5QrCodeRef.current.getState() === 3) {
            html5QrCodeRef.current.resume();
            setCameraStatus('running');
          } else if (!html5QrCodeRef.current.isScanning) {
            await startCamera(selectedCameraId || { facingMode: 'environment' });
          }
        } else {
          await startCamera(selectedCameraId || { facingMode: 'environment' });
        }
      } catch {
        await startCamera(selectedCameraId || { facingMode: 'environment' });
      }
    }
  };

  // Confirm Borrow Action
  const handleConfirmBorrow = async (bookToBorrow) => {
    if (!bookToBorrow || borrowing) return;
    setBorrowing(true);

    try {
      const res = await api.post('/transactions/borrow', { bookId: bookToBorrow._id });
      const { message, dueDateFormatted, dueDate, transaction, book: updatedBook } = res.data;

      const confirmedBook = updatedBook || bookToBorrow;
      const displayDueDate =
        dueDateFormatted ||
        (dueDate
          ? new Date(dueDate).toLocaleDateString(undefined, {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })
          : 'In 14 days');

      toast.success(message || 'Book borrowed successfully!', { icon: '🎉' });

      setBorrowSuccess({
        book: confirmedBook,
        dueDateFormatted: displayDueDate,
      });

      setSessionCheckouts((prev) => [
        {
          book: confirmedBook,
          dueDateFormatted: displayDueDate,
          timestamp: new Date(),
        },
        ...prev,
      ]);

      setLookupResult({ status: 'idle', book: null, books: [], message: '' });
      fetchMyBooks();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to borrow book. Please try again.';
      toast.error(msg);
    } finally {
      setBorrowing(false);
    }
  };

  // Direct input submit for manual ISBN lookup from the camera screen.
  const handleDirectIsbnSubmit = (e) => {
    e?.preventDefault();
    if (!directIsbnInput.trim()) return;
    handleTriggerMatch(directIsbnInput.trim());
  };

  // Manual search tab
  const handleManualSearch = async (e) => {
    e?.preventDefault();
    const query = manualQuery.trim();
    if (!query) {
      toast.error('Please enter an ISBN or book title');
      return;
    }

    setManualSearching(true);
    setLookupResult({ status: 'idle', book: null, books: [], message: '' });
    setBorrowSuccess(null);

    try {
      const cleanDigits = query.replace(/[^0-9X]/gi, '');
      if (cleanDigits.length >= 6) {
        try {
          const isbnRes = await api.get(`/books/isbn/${encodeURIComponent(query)}`);
          if (isbnRes.data.book) {
            setLookupResult({
              status: 'found',
              book: isbnRes.data.book,
              books: [],
              message: '',
              scannedIsbn: query,
            });
            setManualSearching(false);
            return;
          }
        } catch {
          // Fall through
        }
      }

      const res = await api.get('/books', { params: { search: query } });
      const results = res.data.books || res.data || [];
      setManualResults(results);

      if (results.length === 0) {
        setLookupResult({
          status: 'not_found',
          book: null,
          books: [],
          message: `No books found matching "${query}".`,
          scannedIsbn: query,
        });
      } else if (results.length === 1) {
        setLookupResult({
          status: 'found',
          book: results[0],
          books: [],
          message: '',
          scannedIsbn: results[0].isbn || query,
        });
      }
    } catch {
      toast.error('Failed to search inventory');
    } finally {
      setManualSearching(false);
    }
  };

  const isBookAlreadyBorrowed = (bookId) => {
    return myBooks.some((tx) => (tx.book?._id || tx.book) === bookId);
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <ScanLine className="h-6 w-6" />
            </span>
            <h1 className="text-2xl font-bold text-gray-900">Self-Checkout Book Scanner</h1>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            Scan a barcode or let the camera read the printed ISBN text to borrow.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
          <div className="h-9 w-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
            {user?.name?.charAt(0)?.toUpperCase() || 'S'}
          </div>
          <div className="text-left text-xs">
            <p className="font-semibold text-gray-900">{user?.name}</p>
            <p className="text-gray-500 font-mono">
              {user?.enrollmentNumber} • {user?.position}
            </p>
          </div>
        </div>
      </div>

      {/* Target Book Verification Alert (When redirected from Catalog "Scan to Borrow") */}
      {targetTitle && (
        <div className="bg-indigo-50 border-2 border-indigo-400 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-sm fade-in-up">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-xl">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="text-xs">
              <p className="font-bold text-indigo-900 text-sm">
                Verification Required for: <span className="underline">{targetTitle}</span>
              </p>
              <p className="text-indigo-700 mt-0.5">
                Hold the book's barcode or printed ISBN (<code>{targetIsbn}</code>) in front of the lens to confirm
                checkout.
              </p>
            </div>
          </div>

          {targetIsbn && (
            <button
              onClick={() => handleTriggerMatch(targetIsbn)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl whitespace-nowrap shadow-sm"
            >
              Verify Now ({targetIsbn})
            </button>
          )}
        </div>
      )}

      {/* Mode Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => {
            setActiveTab('camera');
            setLookupResult({ status: 'idle', book: null, books: [], message: '' });
          }}
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === 'camera'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Camera className="h-4 w-4" />
          Live Barcode & Text Scanner
        </button>
        <button
          onClick={() => {
            setActiveTab('manual');
            stopCamera();
          }}
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === 'manual'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Search className="h-4 w-4" />
          Manual ISBN / Title Lookup
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Scanner or Manual Search (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {activeTab === 'camera' ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Camera Header Bar */}
              <div className="p-3 bg-gray-900 text-white flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      cameraStatus === 'running'
                        ? 'bg-green-400 animate-pulse'
                        : cameraStatus === 'initializing'
                        ? 'bg-yellow-400'
                        : cameraStatus === 'paused'
                        ? 'bg-indigo-400'
                        : 'bg-red-400'
                    }`}
                  />
                  <span className="font-medium text-gray-300">
                    {cameraStatus === 'running'
                      ? 'Camera Active — Reading Barcodes & Printed ISBN Text'
                      : cameraStatus === 'initializing'
                      ? 'Starting Camera Stream...'
                      : cameraStatus === 'paused'
                      ? 'ISBN Captured — Reviewing Book'
                      : 'Camera Stopped'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Live OCR status indicator */}
                  <div className="hidden sm:flex items-center gap-1 text-[11px] bg-gray-800 text-indigo-300 px-2 py-0.5 rounded-full border border-gray-700">
                    <Sparkles className="h-3 w-3 text-indigo-400 animate-pulse" />
                    <span>OCR Active</span>
                  </div>

                  {torchAvailable && (
                    <button
                      onClick={toggleTorch}
                      className={`p-1.5 rounded-md text-xs flex items-center gap-1 ${
                        torchOn ? 'bg-amber-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                      title="Toggle Torch/Flash"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      {torchOn ? 'Flash On' : 'Flash'}
                    </button>
                  )}

                  {cameras.length > 1 && (
                    <select
                      value={selectedCameraId}
                      onChange={(e) => handleCameraChange(e.target.value)}
                      className="bg-gray-800 text-gray-200 text-xs px-2 py-1 rounded border border-gray-700 outline-none"
                    >
                      {cameras.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label || `Camera ${c.id.substring(0, 5)}...`}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Viewport & Viewfinder */}
              <div className="relative bg-black min-h-[340px] flex items-center justify-center overflow-hidden">
                <div id="reader" className="w-full h-full min-h-[340px]"></div>

                {cameraStatus === 'initializing' && (
                  <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-6 text-center text-white z-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mb-4"></div>
                    <p className="font-semibold text-lg">Initializing Camera</p>
                    <p className="text-gray-400 text-xs mt-1">Requesting video permissions and focusing lens...</p>
                  </div>
                )}

                {cameraStatus === 'error' && (
                  <div className="absolute inset-0 bg-gray-900/95 flex flex-col items-center justify-center p-6 text-center text-white z-20">
                    <div className="h-14 w-14 rounded-full bg-red-900/60 text-red-400 flex items-center justify-center mb-4">
                      <AlertTriangle className="h-8 w-8" />
                    </div>
                    <p className="font-bold text-lg text-red-200 mb-1">Camera Failed to Open</p>
                    <p className="text-gray-300 text-xs max-w-md mb-5 leading-relaxed">{cameraError}</p>
                    <div className="flex flex-wrap gap-3 justify-center">
                      <button
                        onClick={() => startCamera(selectedCameraId || { facingMode: 'environment' })}
                        className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Retry Camera
                      </button>
                      <button
                        onClick={() => setActiveTab('manual')}
                        className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-200 font-medium px-4 py-2 rounded-lg text-sm border border-gray-700 transition-colors"
                      >
                        <Search className="h-4 w-4" />
                        Use Manual Search
                      </button>
                    </div>
                  </div>
                )}

                {/* Reticle Frame Guide */}
                {cameraStatus === 'running' && (
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center z-10">
                    <div className="relative w-64 sm:w-72 h-40 border-2 border-indigo-400 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                      <div className="scanner-laser"></div>
                      <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-indigo-500 rounded-tl"></div>
                      <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-indigo-500 rounded-tr"></div>
                      <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-indigo-500 rounded-bl"></div>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-indigo-500 rounded-br"></div>
                    </div>

                    <div className="mt-3 flex flex-col items-center gap-1">
                      <p className="text-white text-xs font-semibold bg-black/70 px-3 py-1 rounded-full backdrop-blur-sm">
                        Align barcode or printed text inside the box
                      </p>
                      {ocrStatusText && (
                        <p className="text-indigo-300 text-[11px] font-mono bg-indigo-950/80 px-2 py-0.5 rounded-md">
                          {ocrStatusText}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Direct Instant ISBN Entry & Quick Demo Bar */}
              <div className="p-3.5 bg-gray-50 border-t border-gray-200 space-y-3">
                {/* Instant OCR Snapshot & Direct Input */}
                <form onSubmit={handleDirectIsbnSubmit} className="flex gap-2">
                  <div className="relative flex-1">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                     type="text"
                     value={directIsbnInput}
                     onChange={(e) => setDirectIsbnInput(e.target.value)}
                     placeholder="Type or paste ISBN..."
                     className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors whitespace-nowrap shadow-sm"
                  >
                    Lookup & Borrow
                  </button>
                  <button
                    type="button"
                    onClick={scanVideoFrameForText}
                    disabled={cameraStatus !== 'running'}
                    className="bg-gray-800 hover:bg-gray-900 disabled:bg-gray-300 text-white font-semibold text-xs px-3 py-2 rounded-xl transition-colors flex items-center gap-1 whitespace-nowrap shadow-sm"
                    title="Snap text frame"
                  >
                    <Eye className="h-3.5 w-3.5 text-indigo-400" />
                    Snap Text
                  </button>
                </form>

              </div>
            </div>
          ) : (
            /* Manual Search Tab */
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 space-y-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Manual Book Checkout</h2>
                <p className="text-gray-500 text-xs mt-0.5">
                  Type an ISBN or title.
                </p>
              </div>

              <form onSubmit={handleManualSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={manualQuery}
                    onChange={(e) => setManualQuery(e.target.value)}
                    placeholder="Enter ISBN or title..."
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm font-mono"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={manualSearching}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm flex items-center gap-2"
                >
                  {manualSearching ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>Search</>
                  )}
                </button>
              </form>

              {manualResults.length > 1 && !lookupResult.book && (
                <div className="space-y-2 pt-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase">
                    Select Book ({manualResults.length} found):
                  </p>
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {manualResults.map((b) => (
                      <div
                        key={b._id}
                        onClick={() => {
                          setLookupResult({
                            status: 'found',
                            book: b,
                            books: [],
                            message: '',
                            scannedIsbn: b.isbn,
                          });
                        }}
                        className="p-3 border border-gray-200 hover:border-indigo-500 rounded-xl cursor-pointer hover:bg-indigo-50/50 transition-all flex items-center justify-between"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-sm font-semibold text-gray-900 truncate">{b.title}</p>
                          <p className="text-xs text-gray-500">
                            {b.author} • ISBN: {b.isbn || 'No ISBN'}
                          </p>
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
                            b.availableCopies > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {b.availableCopies} avail
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Borrow Success Banner */}
          {borrowSuccess && (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5 shadow-sm fade-in-up">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-emerald-900">Book Borrowed Successfully!</h3>
                  <p className="text-sm text-emerald-800 mt-0.5">
                    <strong>{borrowSuccess.book?.title}</strong> has been issued to your account.
                  </p>
                  <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 bg-white/80 rounded-lg text-xs font-semibold text-emerald-800 border border-emerald-200">
                    <Clock className="h-3.5 w-3.5 text-emerald-600" />
                    Due Date: {borrowSuccess.dueDateFormatted} (14 days)
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={handleResumeScanning}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <ScanLine className="h-3.5 w-3.5" />
                      Scan Next Book
                    </button>
                    <button
                      onClick={() => navigate('/dashboard')}
                      className="bg-white hover:bg-gray-100 text-gray-700 font-semibold text-xs px-4 py-2 rounded-lg transition-colors border border-gray-300"
                    >
                      Go to Dashboard
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Book Confirmation Screen */}
          {lookupLoading ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-3"></div>
              <p className="text-sm font-semibold text-gray-800">Looking up ISBN in Inventory...</p>
              <p className="text-xs text-gray-400 font-mono mt-1">{scannedCode}</p>
            </div>
          ) : lookupResult.status === 'found' && lookupResult.book ? (
            <div className="bg-white rounded-2xl shadow-sm border-2 border-indigo-500 p-5 fade-in-up space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1 bg-green-100 text-green-700 rounded-md">
                    <CheckCircle className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-green-700">
                    Book Recognized in Inventory
                  </span>
                </div>
                <span className="text-xs text-gray-400 font-mono">ISBN: {scannedCode}</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <div className="w-24 h-32 bg-gradient-to-br from-indigo-100 via-purple-50 to-indigo-200 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner border border-indigo-100">
                  <BookOpen className="h-10 w-10 text-indigo-400" />
                </div>

                <div className="flex-1 space-y-1.5">
                  <h2 className="text-lg font-bold text-gray-900 leading-snug">{lookupResult.book.title}</h2>
                  <p className="text-xs text-gray-600 flex items-center gap-1">
                    <User className="h-3 w-3 text-gray-400" />
                    {lookupResult.book.author}
                  </p>
                  {lookupResult.book.edition && (
                    <p className="text-xs text-indigo-700 font-medium flex items-center gap-1">
                      <BookMarked className="h-3 w-3" />
                      Edition: {lookupResult.book.edition}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 font-mono flex items-center gap-1">
                    <Hash className="h-3 w-3 text-gray-400" />
                    ISBN: {lookupResult.book.isbn || 'N/A'}
                  </p>

                  <div className="flex flex-wrap gap-1 pt-1">
                    {lookupResult.book.semester?.map((sem) => (
                      <span key={sem} className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                        Sem {sem === 4 ? 'IV' : sem === 5 ? 'V' : sem}
                      </span>
                    ))}
                    {lookupResult.book.courses?.map((c, i) => (
                      <span key={i} className="text-[10px] font-medium bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                        {c.courseCode} — {c.courseName}
                      </span>
                    ))}
                  </div>

                  <div className="pt-2 flex items-center gap-3">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                        lookupResult.book.availableCopies > 0
                          ? 'bg-green-100 text-green-800 border border-green-200'
                          : 'bg-red-100 text-red-800 border border-red-200'
                      }`}
                    >
                      {lookupResult.book.availableCopies > 0
                        ? `✅ ${lookupResult.book.availableCopies} of ${lookupResult.book.totalCopies} copies available`
                        : '❌ All copies checked out'}
                    </span>

                    {isBookAlreadyBorrowed(lookupResult.book._id) && (
                      <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium">
                        ⚠️ Already on your account
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={() => handleConfirmBorrow(lookupResult.book)}
                  disabled={
                    borrowing ||
                    lookupResult.book.availableCopies <= 0 ||
                    isBookAlreadyBorrowed(lookupResult.book._id)
                  }
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm"
                >
                  {borrowing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Confirming Checkout...
                    </>
                  ) : lookupResult.book.availableCopies <= 0 ? (
                    'No Copies Available'
                  ) : isBookAlreadyBorrowed(lookupResult.book._id) ? (
                    'Already Borrowed by You'
                  ) : (
                    <>
                      <BookOpen className="h-4 w-4" />
                      Borrow Book (14 Days)
                    </>
                  )}
                </button>

                <button
                  onClick={handleResumeScanning}
                  className="sm:w-44 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Scan Another
                </button>
              </div>
            </div>
          ) : lookupResult.status === 'not_found' ? (
            <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-6 text-center space-y-3 fade-in-up">
              <div className="h-12 w-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <XCircle className="h-7 w-7" />
              </div>
              <h3 className="text-base font-bold text-gray-900">Book not found in the library inventory.</h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                No entry matches barcode: <code className="font-mono font-bold text-gray-700">{lookupResult.scannedIsbn || scannedCode}</code>.
              </p>
              <div className="flex gap-2 justify-center pt-2">
                <button
                  onClick={handleResumeScanning}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Try Scanning Again
                </button>
                <button
                  onClick={() => {
                    setActiveTab('manual');
                    setManualQuery(lookupResult.scannedIsbn || '');
                  }}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  Search by Title
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* Right Column: Session Activity & Loans */}
        <div className="lg:col-span-5 space-y-4">
          {/* Books Borrowed During Current Session */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                  <CheckCircle className="h-4 w-4" />
                </span>
                <h3 className="font-bold text-gray-900 text-sm">Checked Out This Session</h3>
              </div>
              <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100">
                {sessionCheckouts.length} {sessionCheckouts.length === 1 ? 'book' : 'books'}
              </span>
            </div>

            {sessionCheckouts.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-5 italic">
                No books borrowed in this session yet. Scan a book to begin self-checkout.
              </p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {sessionCheckouts.map((item, i) => (
                  <div key={i} className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-start gap-2.5">
                    <BookOpen className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-gray-900 truncate">{item.book.title}</p>
                      <p className="text-[11px] text-gray-500">{item.book.author}</p>
                      <p className="text-[10px] text-emerald-700 font-medium mt-0.5">Due: {item.dueDateFormatted}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Loans */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg">
                  <BookMarked className="h-4 w-4" />
                </span>
                <h3 className="font-bold text-gray-900 text-sm">Your Active Loans</h3>
              </div>
              <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                {myBooks.length} active
              </span>
            </div>

            {myBooks.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-5 italic">You have no active book loans.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {myBooks.map((tx) => {
                  const b = tx.book || tx;
                  return (
                    <div key={tx._id || b._id} className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-gray-900 truncate">{b.title}</p>
                        <p className="text-[11px] text-gray-500">{b.author}</p>
                        {tx.dueDate && (
                          <p className="text-[10px] text-indigo-600 font-medium mt-0.5">
                            Due by: {new Date(tx.dueDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      {tx.isPendingReturn && (
                        <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                          Approval Pending
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Self-Checkout Steps Guide */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-4 border border-indigo-100 text-xs space-y-2">
            <h4 className="font-bold text-indigo-950 flex items-center gap-1.5">
              <Smartphone className="h-4 w-4 text-indigo-600" />
              Self-Checkout Instructions
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-indigo-900">
              <li>Turn book to back cover where ISBN barcode or printed text is shown.</li>
              <li>Align the barcode or text inside the scanning frame.</li>
              <li>Review the book details on the confirmation card.</li>
              <li>Click <strong>Borrow Book</strong> to register the 14-day loan.</li>
              <li>Repeat for any additional books before leaving.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
