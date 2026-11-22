import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  UserPlus,
  CheckCircle,
  QrCode,
  X,
  Hash,
  Building,
  User,
  ArrowRight,
  Info,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: '',
    department: '',
    position: 'Student',
    enrollmentNumber: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Full name is required';
    if (!form.department.trim()) errs.department = 'Department is required';
    if (!form.enrollmentNumber.trim()) {
      errs.enrollmentNumber = 'Enrollment number is required';
    } else if (!/^[A-Za-z0-9]{3,25}$/.test(form.enrollmentNumber.trim())) {
      errs.enrollmentNumber = 'Must be 3-25 alphanumeric characters';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await register({
        name: form.name.trim(),
        department: form.department.trim(),
        position: 'Student',
        enrollmentNumber: form.enrollmentNumber.trim(),
      });
      setSuccess(true);
    } catch {
      // Toast shown by AuthContext
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center fade-in-up border border-indigo-100">
          <div className="checkmark-animate inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6 text-green-600">
            <CheckCircle className="h-12 w-12" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Student Registration Successful!</h2>
          <p className="text-gray-600 text-sm mb-6">
            Your library student account has been created. You can now log in using your enrollment number.
          </p>
          <Link
            to="/student/login"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl transition-colors shadow-sm text-sm"
          >
            <span>Proceed to Student Login</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden max-w-md w-full border border-gray-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-8 text-center text-white relative">
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
          <h1 className="text-2xl font-bold">Student Registration</h1>
          <p className="text-indigo-100 text-xs mt-1">
            Create your digital library membership account
          </p>
        </div>

        {/* Note */}
        <div className="bg-indigo-50/70 border-b border-indigo-100 px-6 py-2.5 flex items-center gap-2 text-xs text-indigo-900">
          <Info className="h-4 w-4 text-indigo-600 flex-shrink-0" />
          <span>Faculty and Administrator accounts are issued via the Library Administration.</span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Sreeya Majumdar"
                className={`w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm ${
                  errors.name ? 'border-red-400 bg-red-50/50' : 'border-gray-300'
                }`}
              />
            </div>
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Department</label>
            <div className="relative">
              <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                name="department"
                value={form.department}
                onChange={handleChange}
                placeholder="e.g. Computer Science and Engineering"
                className={`w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm ${
                  errors.department ? 'border-red-400 bg-red-50/50' : 'border-gray-300'
                }`}
              />
            </div>
            {errors.department && <p className="text-red-500 text-xs mt-1">{errors.department}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Enrollment Number
            </label>
            <div className="relative">
              <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                name="enrollmentNumber"
                value={form.enrollmentNumber}
                onChange={handleChange}
                placeholder="e.g. 12024002001144"
                className={`w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono ${
                  errors.enrollmentNumber ? 'border-red-400 bg-red-50/50' : 'border-gray-300'
                }`}
              />
            </div>
            {errors.enrollmentNumber && <p className="text-red-500 text-xs mt-1">{errors.enrollmentNumber}</p>}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 text-sm mt-3"
          >
            {submitting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                <span>Complete Registration</span>
              </>
            )}
          </button>

          <div className="pt-4 border-t border-gray-100 text-center text-xs text-gray-500">
            Already registered?{' '}
            <Link to="/student/login" className="font-bold text-indigo-600 hover:underline">
              Student Login
            </Link>
          </div>
        </form>
      </div>

      {/* QR Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-indigo-600 uppercase">Student Registration QR</span>
              <button onClick={() => setShowQR(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 bg-gray-50 rounded-2xl border-2 border-indigo-100 inline-block">
              <QRCodeSVG value={window.location.href} size={200} level="H" includeMargin />
            </div>
            <p className="text-xs text-gray-500">Scan to register directly on your mobile device.</p>
          </div>
        </div>
      )}
    </div>
  );
}
