import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Library, UserPlus, CheckCircle, QrCode, Smartphone, X } from 'lucide-react';
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
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.department.trim()) errs.department = 'Department is required';
    if (!form.enrollmentNumber.trim()) {
      errs.enrollmentNumber = 'Enrollment number is required';
    } else if (!/^[A-Za-z0-9]{3,20}$/.test(form.enrollmentNumber.trim())) {
      errs.enrollmentNumber = 'Must be 3-20 alphanumeric characters';
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
        position: form.position,
        enrollmentNumber: form.enrollmentNumber.trim(),
      });
      setSuccess(true);
    } catch {
      // Toast already shown by AuthContext
    } finally {
      setSubmitting(false);
    }
  };

  // Get the current page URL for the QR code
  const registerUrl = `${window.location.origin}/register`;

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center fade-in-up">
          <div className="checkmark-animate inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
          <p className="text-gray-600 mb-6">
            Your account has been created. You can now log in with your enrollment number.
          </p>
          <Link
            to="/login"
            className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Go to Login
          </Link>
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
          <h1 className="text-2xl font-bold text-white">Library Registration</h1>
          <p className="text-indigo-100 mt-1">Create your library account</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors ${
                errors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
            />
            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <input
              type="text"
              name="department"
              value={form.department}
              onChange={handleChange}
              placeholder="e.g. Computer Science"
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors ${
                errors.department ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
            />
            {errors.department && <p className="mt-1 text-sm text-red-500">{errors.department}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
            <select
              name="position"
              value={form.position}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white transition-colors"
            >
              <option value="Student">Student</option>
              <option value="Teacher">Teacher</option>
              <option value="Admin">Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Enrollment Number</label>
            <input
              type="text"
              name="enrollmentNumber"
              value={form.enrollmentNumber}
              onChange={handleChange}
              placeholder="e.g. CS2024001"
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors ${
                errors.enrollmentNumber ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
            />
            {errors.enrollmentNumber && (
              <p className="mt-1 text-sm text-red-500">{errors.enrollmentNumber}</p>
            )}
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
                <UserPlus className="h-5 w-5" />
                Register
              </>
            )}
          </button>

          {/* Register on another device — QR Code */}
          <div className="border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={() => setShowQR(!showQR)}
              className="w-full flex items-center justify-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium py-2 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              <Smartphone className="h-5 w-5" />
              Register on another device
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
                <p className="text-sm text-gray-600 mb-3">Scan this QR code to open the registration page on your phone</p>
                <div className="inline-block p-3 bg-white rounded-xl shadow-sm">
                  <QRCodeSVG
                    value={registerUrl}
                    size={180}
                    bgColor="#ffffff"
                    fgColor="#4338ca"
                    level="M"
                    includeMargin={false}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2 break-all">{registerUrl}</p>
              </div>
            )}
          </div>

          <p className="text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
              Login here
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
