import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

// Auth Pages
import RoleSelection from './pages/RoleSelection';
import StudentLogin from './pages/StudentLogin';
import TeacherLogin from './pages/TeacherLogin';
import AdminLogin from './pages/AdminLogin';
import Register from './pages/Register';

// Dashboard Pages
import Dashboard from './pages/Dashboard'; // Student Dashboard
import TeacherDashboard from './pages/TeacherDashboard';
import AdminPanel from './pages/AdminPanel';

// Shared Library Features
import BookInventory from './pages/BookInventory';
import BookScanner from './pages/BookScanner';

function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}

// Redirects authenticated user to their role-specific dashboard
function RoleBasedDashboardRedirect() {
  const { getDashboardPath } = useAuth();
  return <Navigate to={getDashboardPath()} replace />;
}

export default function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            borderRadius: '12px',
            background: '#1f2937',
            color: '#f9fafb',
            fontSize: '13px',
          },
        }}
      />
      <Routes>
        {/* ==================== Public Authentication Routes ==================== */}
        <Route path="/login" element={<RoleSelection />} />
        <Route path="/student/login" element={<StudentLogin />} />
        <Route path="/teacher/login" element={<TeacherLogin />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/register" element={<Register />} />

        {/* Generic /dashboard redirects user to their appropriate role portal */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <RoleBasedDashboardRedirect />
            </ProtectedRoute>
          }
        />

        {/* ==================== Role-Specific Dashboards ==================== */}
        {/* 1. Student Dashboard */}
        <Route
          path="/student/dashboard"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <AppLayout>
                <Dashboard />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        {/* 2. Teacher Dashboard */}
        <Route
          path="/teacher/dashboard"
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <AppLayout>
                <TeacherDashboard />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        {/* 3. Admin Dashboard & Management Console */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AppLayout>
                <AdminPanel />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AppLayout>
                <AdminPanel />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        {/* ==================== Shared Library Features ==================== */}
        {/* Book Catalog / Inventory */}
        <Route
          path="/books"
          element={
            <ProtectedRoute allowedRoles={['student', 'teacher', 'admin']}>
              <AppLayout>
                <BookInventory />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        {/* Self-Checkout Barcode & OCR Scanner */}
        <Route
          path="/scan"
          element={
            <ProtectedRoute allowedRoles={['student', 'teacher', 'admin']}>
              <AppLayout>
                <BookScanner />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}
