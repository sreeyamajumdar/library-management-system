import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Library, LogIn, MapPin, ArrowRight, QrCode, Smartphone, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../context/AuthContext';

// Auto-refresh the login page every 24 hours (in ms)
const PAGE_REFRESH_INTERVAL = 24 * 60 * 60 * 1000;

export default function Login() {
  const { login, api } = useAuth();
  const navigate = useNavigate();
  const [enrollmentNumber, setEnrollmentNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [activeCount, setActiveCount] = useState(null);
  const [error, setError] = useState('');
  const [showQR, setShowQR] = useState(false);

  // Auto-refresh page every 24 hours
  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.reload();
    }, PAGE_REFRESH_INTERVAL);

    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!enrollmentNumber.trim()) {
      setError('Please enter your enrollment number');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await login(enrollmentNumber.trim());
      setLoggedInUser(res.user);

      // Check user into library
      try {
        await api.post('/sessions/checkin');
      } catch {
        // Ignore if already checked in
      }

      // Fetch active count
      try {
        const countRes = await api.get('/sessions/active-count');
        setActiveCount(countRes.data.count);
      } catch {
        setActiveCount(null);
      }
    } catch {
      // Toast already shown
    } finally {
      setSubmitting(false);
    }
  };

  // Get the current page URL for the QR code
  const loginUrl = `${window.location.origin}/login`;

  if (loggedInUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center fade-in-up">
          <div className="text-6xl mb-4">👋</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome, {loggedInUser.name}!
          </h1>
          <p className="text-gray-500 mb-6">{loggedInUser.department} • {loggedInUser.position}</p>

          {activeCount !== null && (
            <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full mb-6">
              <MapPin className="h-4 w-4" />
              <span className="font-medium">{activeCount} {activeCount === 1 ? 'person' : 'people'} currently in library</span>
            </div>
          )}

          <div className="mt-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              Go to Dashboard
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-md w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm mb-4">
            <Library className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Library Login</h1>
          <p className="text-indigo-100 mt-1">Sign in to access the library</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Enrollment Number</label>
            <input
              type="text"
              value={enrollmentNumber}
              onChange={(e) => {
                setEnrollmentNumber(e.target.value);
                setError('');
              }}
              placeholder="e.g. CS2024001"
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors ${
                error ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              autoFocus
            />
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <LogIn className="h-5 w-5" />
                Login
              </>
            )}
          </button>

          {/* Login on another device — QR Code */}
          <div className="border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={() => setShowQR(!showQR)}
              className="w-full flex items-center justify-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium py-2 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              <Smartphone className="h-5 w-5" />
              Login on another device
              <QrCode className="h-4 w-4" />
            </button>

            {showQR && (
              <div className="mt-4 p-4 bg-gray-50 rounded-xl text-center fade-in-up relative">
                <button
                  type="button"
                  onClick={() => setShowQR(false)}
                  className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
                <p className="text-sm text-gray-600 mb-3">Scan this QR code to open the login page on your phone</p>
                <div className="inline-block p-3 bg-white rounded-xl shadow-sm">
                  <QRCodeSVG
                    value={loginUrl}
                    size={180}
                    bgColor="#ffffff"
                    fgColor="#4338ca"
                    level="M"
                    includeMargin={false}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2 break-all">{loginUrl}</p>
              </div>
            )}
          </div>

          <p className="text-center text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-indigo-600 hover:text-indigo-700 font-medium">
              Register here
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
