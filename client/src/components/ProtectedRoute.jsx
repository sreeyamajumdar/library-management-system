import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { useEffect, useRef } from 'react';

export default function ProtectedRoute({ children, allowedRoles = null, adminOnly = false }) {
  const { isAuthenticated, role, loading, getDashboardPath } = useAuth();
  const location = useLocation();
  const warnedRef = useRef(false);

  // Normalize allowed roles
  const effectiveAllowedRoles = allowedRoles
    ? allowedRoles.map((r) => r.toLowerCase())
    : adminOnly
    ? ['admin']
    : null;

  const isRoleAllowed = !effectiveAllowedRoles || effectiveAllowedRoles.includes(role);

  useEffect(() => {
    if (isAuthenticated && !isRoleAllowed && !warnedRef.current) {
      warnedRef.current = true;
      toast.error(`Access Denied: Your account role (${role || 'user'}) cannot access this area.`);
    }
  }, [isAuthenticated, isRoleAllowed, role]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isRoleAllowed) {
    // Redirect to the user's role-specific dashboard
    return <Navigate to={getDashboardPath()} replace />;
  }

  return children;
}
