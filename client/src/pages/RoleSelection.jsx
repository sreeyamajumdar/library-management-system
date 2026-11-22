import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Briefcase,
  ShieldCheck,
  Library,
  ArrowRight,
  QrCode,
  Smartphone,
  X,
  UserPlus,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

// Auto-refresh landing page every 24 hours
const PAGE_REFRESH_INTERVAL = 24 * 60 * 60 * 1000;

export default function RoleSelection() {
  const navigate = useNavigate();
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.reload();
    }, PAGE_REFRESH_INTERVAL);
    return () => clearTimeout(timer);
  }, []);

  const roles = [
    {
      id: 'student',
      title: 'Student Portal',
      subtitle: 'Course textbooks, self-checkout, and personal book loans',
      path: '/student/login',
      icon: GraduationCap,
      color: 'from-blue-600 to-indigo-600',
      textColor: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200 hover:border-indigo-500',
      badge: 'Students & Scholars',
      actionText: 'Student Login',
    },
    {
      id: 'teacher',
      title: 'Faculty Portal',
      subtitle: 'Extended research borrowing (up to 10 books) and academic resources',
      path: '/teacher/login',
      icon: Briefcase,
      color: 'from-emerald-600 to-teal-600',
      textColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200 hover:border-emerald-500',
      badge: 'Professors & Faculty',
      actionText: 'Teacher Login',
    },
    {
      id: 'admin',
      title: 'Librarian / Staff',
      subtitle: 'Inventory management, return approvals, and member administration',
      path: '/admin/login',
      icon: ShieldCheck,
      color: 'from-purple-600 to-slate-800',
      textColor: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200 hover:border-purple-500',
      badge: 'Authorized Staff Only',
      actionText: 'Admin Login',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
            <Library className="h-9 w-9" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            Library Management System
          </h1>
          <p className="text-gray-500 text-sm sm:text-base max-w-lg mx-auto">
            Welcome to the digital library portal. Please select your role to proceed to your dedicated authentication portal.
          </p>
        </div>

        {/* 3 Role Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {roles.map((r) => {
            const Icon = r.icon;
            return (
              <div
                key={r.id}
                onClick={() => navigate(r.path)}
                className={`bg-white rounded-2xl p-6 border-2 ${r.borderColor} shadow-sm hover:shadow-xl transition-all duration-200 cursor-pointer flex flex-col justify-between group transform hover:-translate-y-1`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl ${r.bgColor} ${r.textColor}`}>
                      <Icon className="h-7 w-7" />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                      {r.badge}
                    </span>
                  </div>

                  <h2 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                    {r.title}
                  </h2>
                  <p className="text-gray-500 text-xs sm:text-sm mt-2 leading-relaxed">
                    {r.subtitle}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r ${r.color} shadow-sm group-hover:shadow transition-all flex items-center justify-center gap-2`}
                  >
                    <span>{r.actionText}</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-gray-600">
            <GraduationCap className="h-4 w-4 text-indigo-600" />
            <span>Are you a new student joining the library?</span>
            <Link to="/register" className="font-bold text-indigo-600 hover:underline">
              Register Student Account →
            </Link>
          </div>

          <button
            onClick={() => setShowQR(true)}
            className="inline-flex items-center gap-1.5 text-gray-600 hover:text-indigo-600 font-medium px-3 py-1.5 rounded-lg border border-gray-200 hover:border-indigo-300 transition-colors"
          >
            <QrCode className="h-4 w-4 text-indigo-600" />
            <span>Open on Mobile (QR)</span>
          </button>
        </div>
      </div>

      {/* QR Code Modal for cross-device access */}
      {showQR && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Mobile Check-In</span>
              <button onClick={() => setShowQR(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl border-2 border-indigo-100 inline-block">
              <QRCodeSVG value={window.location.href} size={200} level="H" includeMargin />
            </div>

            <p className="text-xs text-gray-500">
              Scan with your phone camera to open the Library Login portal on your device.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
