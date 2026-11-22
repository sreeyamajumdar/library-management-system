import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Briefcase,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  Mail,
  AlertCircle,
  QrCode,
  X,
  MapPin,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../context/AuthContext';

export default function TeacherLogin() {
  const { teacherLogin, api } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [activeCount, setActiveCount] = useState(null);
  const [showQR, setShowQR] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError('Please enter your Faculty ID or institutional email');
      return;
    }
    setError('');
    setSubmitting(true);

    try {
      const res = await teacherLogin({
        facultyId: identifier.trim(),
        password: password.trim() || undefined,
      });

      setLoggedInUser(res.user);

      // Check teacher into library session
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
      setError(err.response?.data?.message || 'Faculty authentication failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loggedInUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center fade-in-up border border-emerald-100 space-y-5">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 mb-1">
            <Briefcase className="h-10 w-10" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">
              Welcome, Professor {loggedInUser.name}!
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Department of {loggedInUser.department} • Faculty ID: {loggedInUser.facultyId || loggedInUser.enrollmentNumber}
            </p>
          </div>

          <div className="bg-emerald-50 text-emerald-800 p-3 rounded-2xl text-xs font-semibold">
            🎓 Faculty privileges enabled: Up to 10 books simultaneous loan & research reserves
          </div>

          {activeCount !== null && (
            <div className="inline-flex items-center gap-2 bg-gray-50 text-gray-700 px-4 py-2 rounded-full text-xs font-medium">
              <MapPin className="h-3.5 w-3.5 text-emerald-600" />
              <span>{activeCount} {activeCount === 1 ? 'person' : 'people'} currently in the library</span>
            </div>
          )}

          <button
            onClick={() => navigate('/teacher/dashboard')}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 text-sm"
          >
            Go to Faculty Dashboard
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden max-w-md w-full border border-gray-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-8 py-8 text-white text-center relative">
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
            <Briefcase className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Faculty Member Login</h1>
          <p className="text-emerald-100 text-xs mt-1">
            Academic research reserves, syllabus references & extended borrowing
          </p>
        </div>

        {/* Notice */}
        <div className="bg-emerald-50/70 border-b border-emerald-100 px-6 py-3 flex items-start gap-2.5 text-xs text-emerald-900">
          <Info className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <p>
            Faculty accounts are provisioned and managed by the Library Administration. Use your Faculty ID or registered email.
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
              Faculty ID or Institutional Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Enter your Faculty ID or institutional email"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-mono"
                required
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter faculty password..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 text-sm mt-2"
          >
            {submitting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <>
                <span>Sign In as Faculty</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          <div className="pt-4 border-t border-gray-100 flex flex-col gap-2 text-center text-xs text-gray-500">
            <p className="text-[11px] text-gray-400">
              Need teacher credentials or forgotten password? Contact your library administrator.
            </p>
            <Link to="/login" className="text-emerald-700 hover:text-emerald-900 font-semibold">
              ← Switch to Student or Admin Login
            </Link>
          </div>
        </form>
      </div>

      {/* QR Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-emerald-600 uppercase">Faculty Mobile Login</span>
              <button onClick={() => setShowQR(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 bg-gray-50 rounded-2xl border-2 border-emerald-100 inline-block">
              <QRCodeSVG value={window.location.href} size={200} level="H" includeMargin />
            </div>
            <p className="text-xs text-gray-500">Scan to log in on your smartphone or tablet.</p>
          </div>
        </div>
      )}
    </div>
  );
}
