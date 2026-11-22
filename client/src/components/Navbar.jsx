import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, BarChart3, ScanLine, Settings, LogOut, Library, Menu, X, Shield, Briefcase, GraduationCap } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout, isAdmin, isTeacher, role, getDashboardPath } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const dashboardPath = getDashboardPath();

  const navItems = [
    { to: dashboardPath, label: 'Dashboard', icon: BarChart3 },
    { to: '/books', label: 'Books', icon: BookOpen },
    { to: '/scan', label: 'Scanner', icon: ScanLine },
    ...(isAdmin ? [{ to: '/admin', label: 'Admin', icon: Settings }] : []),
  ];

  const isActive = (path) => location.pathname === path;

  const roleBadgeConfig = {
    admin: {
      bg: 'bg-purple-100 text-purple-700 border-purple-200',
      icon: Shield,
      label: 'Admin',
    },
    teacher: {
      bg: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      icon: Briefcase,
      label: 'Faculty',
    },
    student: {
      bg: 'bg-blue-100 text-blue-700 border-blue-200',
      icon: GraduationCap,
      label: 'Student',
    },
  };

  const userRoleKey = (user?.position || role || 'student').toLowerCase();
  const roleConfig = roleBadgeConfig[userRoleKey] || roleBadgeConfig.student;
  const RoleIcon = roleConfig.icon;

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to={dashboardPath} className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                <Library className="h-5 w-5" />
              </div>
              <span className="text-lg font-bold text-gray-900 hidden sm:block">
                LibManager
              </span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(to)
                    ? 'bg-indigo-50 text-indigo-700 font-bold'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </div>

          {/* User section */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                <span className="text-xs font-bold text-indigo-700">
                  {user?.name?.charAt(0)?.toUpperCase() || '?'}
                </span>
              </div>
              <div className="text-left text-xs leading-tight">
                <p className="font-bold text-gray-800 truncate max-w-[140px]">{user?.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded font-semibold text-[10px] border ${roleConfig.bg}`}>
                    <RoleIcon className="h-2.5 w-2.5" />
                    <span>{user?.position || roleConfig.label}</span>
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-gray-600 hover:text-gray-900"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white px-4 py-3 space-y-2">
          <div className="pb-2 border-b border-gray-100 flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-xs">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-xs text-gray-900">{user?.name}</p>
              <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded font-bold text-[10px] border ${roleConfig.bg}`}>
                {user?.position || roleConfig.label}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                  isActive(to)
                    ? 'bg-indigo-50 text-indigo-700 font-bold'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
