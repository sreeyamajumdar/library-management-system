import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  Shield,
  AlertCircle,
  QrCode,
  X,
  Lock,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../context/AuthContext';

export default function AdminLogin() {
  const { adminLogin } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showQR, setShowQR] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError('Please enter your Administrator ID or official email');
      return;
    }
    if (!password) {
      setError('Please enter your administrator password');
      return;
    }
    setError('');
    setSubmitting(true);

    try {
      await adminLogin({
        adminId: identifier.trim(),
        password,
      });
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.message || 'Administrator authentication failed. Access denied.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-md w-full border border-gray-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-900 px-8 py-8 text-white text-center relative">
          <Link
            to="/login"
            className="absolute left-4 top-4 text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors flex items-center gap-1 text-xs"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Roles</span>
          </Link>

          <button
            type="button"
            onClick={() => setShowQR(true)}
            className="absolute right-4 top-4 text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            title="Open on Mobile"
          >
            <QrCode className="h-4 w-4" />
          </button>

          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm mb-3 border border-white/20">
            <ShieldCheck className="h-7 w-7 text-indigo-300" />
          </div>
          <h1 className="text-2xl font-bold">Librarian / Staff Login</h1>
          <p className="text-indigo-200 text-xs mt-1">
            System administration, inventory management & return approvals
          </p>
        </div>

        {/* Security Warning Notice */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex items-center gap-2 text-xs text-slate-700">
          <Lock className="h-3.5 w-3.5 text-indigo-600 flex-shrink-0" />
          <span>Restricted portal. Department or student enrollment number is not required.</span>
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
              Admin ID or Email
            </label>
            <div className="relative">
              <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. ADMIN01 or admin@library.edu"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none text-sm font-mono"
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
                placeholder="Enter administrator password..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none text-sm"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm mt-2"
          >
            {submitting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4 text-indigo-400" />
                <span>Sign In to Admin Console</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          <div className="pt-4 border-t border-gray-100 flex flex-col gap-2 text-center text-xs text-gray-500">
            <p className="text-[11px] text-gray-400">
              Initial setup? Run <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700">npm run seed:admin</code> or contact system administrator.
            </p>
            <Link to="/login" className="text-indigo-600 hover:text-indigo-800 font-semibold">
              ← Switch to Student or Teacher Login
            </Link>
          </div>
        </form>
      </div>

      {/* QR Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-indigo-600 uppercase">Admin Mobile Portal</span>
              <button onClick={() => setShowQR(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 bg-gray-50 rounded-2xl border-2 border-indigo-100 inline-block">
              <QRCodeSVG value={window.location.href} size={200} level="H" includeMargin />
            </div>
            <p className="text-xs text-gray-500">Scan to open Admin Login on authorized mobile device.</p>
          </div>
        </div>
      )}
    </div>
  );
}
