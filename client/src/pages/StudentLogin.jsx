import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  ArrowRight,
  ArrowLeft,
  Hash,
  AlertCircle,
  QrCode,
  X,
  MapPin,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../context/AuthContext';

export default function StudentLogin() {
  const { studentLogin, api } = useAuth();
  const navigate = useNavigate();

  const [enrollmentNumber, setEnrollmentNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [activeCount, setActiveCount] = useState(null);
  const [showQR, setShowQR] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!enrollmentNumber.trim()) {
      setError('Please enter your enrollment number');
      return;
    }
    setError('');
    setSubmitting(true);

    try {
      const res = await studentLogin({
        enrollmentNumber: enrollmentNumber.trim(),
      });

      setLoggedInUser(res.user);

      // Check student into library session
      try {
        await api.post('/sessions/checkin');
      } catch {
        // Ignore if already active
      }

      // Fetch active count
      try {
        const countRes = await api.get('/sessions/active-count');
        setActiveCount(countRes.data?.activeCount ?? countRes.data?.count ?? 0);
      } catch {
        setActiveCount(null);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your enrollment number.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loggedInUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center fade-in-up border border-indigo-100 space-y-5">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-indigo-100 text-indigo-600 mb-1">
            <GraduationCap className="h-10 w-10" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">
              Welcome, {loggedInUser.name}!
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {loggedInUser.department} • Enrollment #{loggedInUser.enrollmentNumber}
            </p>
          </div>

          {activeCount !== null && (
            <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full text-xs font-semibold">
              <MapPin className="h-3.5 w-3.5" />
              <span>{activeCount} {activeCount === 1 ? 'person' : 'people'} currently in the library</span>
            </div>
          )}

          <button
            onClick={() => navigate('/student/dashboard')}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 text-sm"
          >
            Go to Student Dashboard
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden max-w-md w-full border border-gray-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-8 text-white text-center relative">
          <Link
            to="/login"
            className="absolute left-4 top-4 text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors flex items-center gap-1 text-xs"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Roles</span>
          </Link>

          <button
            type="button"
            onClick={() => setShowQR(true)}
            className="absolute right-4 top-4 text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            title="Open on Mobile"
          >
            <QrCode className="h-4 w-4" />
          </button>

          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm mb-3">
            <GraduationCap className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Student Login</h1>
          <p className="text-indigo-100 text-xs mt-1">
            Access course textbooks, reserve books, and self-checkout
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Enrollment Number
            </label>
            <div className="relative">
              <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={enrollmentNumber}
                onChange={(e) => setEnrollmentNumber(e.target.value)}
                placeholder="Enter your enrollment number"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono"
                required
                autoFocus
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 text-sm mt-2"
          >
            {submitting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <>
                <span>Sign In as Student</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          <div className="pt-4 border-t border-gray-100 flex flex-col gap-2 text-center text-xs text-gray-500">
            <p>
              New student?{' '}
              <Link to="/register" className="font-bold text-indigo-600 hover:underline">
                Create Student Account
              </Link>
            </p>
            <Link to="/login" className="text-gray-400 hover:text-gray-600">
              ← Switch to Teacher or Admin Login
            </Link>
          </div>
        </form>
      </div>

      {/* QR Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-indigo-600 uppercase">Student Mobile Login</span>
              <button onClick={() => setShowQR(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 bg-gray-50 rounded-2xl border-2 border-indigo-100 inline-block">
              <QRCodeSVG value={window.location.href} size={200} level="H" includeMargin />
            </div>
            <p className="text-xs text-gray-500">Scan to log in directly on your phone.</p>
          </div>
        </div>
      )}
    </div>
  );
}
