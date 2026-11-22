import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

// Session duration: 2 hours in milliseconds (strict requirement)
const SESSION_DURATION_MS = 2 * 60 * 60 * 1000;

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const api = useMemo(() => {
    const instance = axios.create({
      baseURL: '/api',
      headers: { 'Content-Type': 'application/json' },
    });

    instance.interceptors.request.use((config) => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        config.headers.Authorization = `Bearer ${storedToken}`;
      }
      return config;
    });

    instance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid — clear session
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('loginTimestamp');
          setUser(null);
          setToken(null);
          toast.error('Session expired. Please log in again.');
        }
        return Promise.reject(error);
      }
    );

    return instance;
  }, []);

  /**
   * Check if current session has expired (2-hour limit).
   */
  const isSessionValid = useCallback(() => {
    const loginTimestamp = localStorage.getItem('loginTimestamp');
    if (!loginTimestamp) return false;
    const elapsed = Date.now() - parseInt(loginTimestamp, 10);
    return elapsed < SESSION_DURATION_MS;
  }, []);

  // On mount: restore session from localStorage if valid
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser && isSessionValid()) {
      try {
        const parsed = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsed);
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('loginTimestamp');
      }
    } else if (storedToken) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('loginTimestamp');
    }
    setLoading(false);
  }, [isSessionValid]);

  // Set up timer to auto-logout when the 2-hour session expires
  useEffect(() => {
    if (!token) return;

    const loginTimestamp = localStorage.getItem('loginTimestamp');
    if (!loginTimestamp) return;

    const elapsed = Date.now() - parseInt(loginTimestamp, 10);
    const remaining = SESSION_DURATION_MS - elapsed;

    if (remaining <= 0) {
      logout();
      return;
    }

    const timer = setTimeout(() => {
      toast.error('Your 2-hour session has expired. Please log in again.');
      logout();
    }, remaining);

    return () => clearTimeout(timer);
  }, [token]);

  // Helper to persist auth data
  const handleAuthSuccess = (data, successMessage) => {
    const { token: newToken, user: newUser } = data;
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    localStorage.setItem('loginTimestamp', Date.now().toString());
    if (successMessage) {
      toast.success(successMessage);
    }
    return data;
  };

  /**
   * Student Registration
   */
  const register = async (formData) => {
    try {
      const res = await api.post('/auth/register', formData);
      return handleAuthSuccess(res.data, `Welcome to the library, ${res.data.user.name}!`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed';
      toast.error(msg);
      throw err;
    }
  };

  /**
   * Dedicated Student Login
   * Accepts { enrollmentNumber, password }
   */
  const studentLogin = async ({ enrollmentNumber, password }) => {
    try {
      const res = await api.post('/auth/student/login', {
        enrollmentNumber: enrollmentNumber.trim(),
        password,
      });
      return handleAuthSuccess(res.data, `Welcome, ${res.data.user.name}!`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Student login failed';
      toast.error(msg);
      throw err;
    }
  };

  /**
   * Dedicated Teacher Login
   * Accepts { facultyId, password } or { identifier, password }
   */
  const teacherLogin = async ({ facultyId, identifier, password }) => {
    try {
      const res = await api.post('/auth/teacher/login', {
        facultyId: facultyId || identifier,
        password,
      });
      return handleAuthSuccess(res.data, `Welcome, Professor ${res.data.user.name}!`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Faculty login failed';
      toast.error(msg);
      throw err;
    }
  };

  /**
   * Dedicated Admin Login
   * Accepts { adminId, email, password }
   */
  const adminLogin = async ({ adminId, email, identifier, password }) => {
    try {
      const res = await api.post('/auth/admin/login', {
        adminId: adminId || identifier,
        email,
        password,
      });
      return handleAuthSuccess(res.data, `Welcome, Administrator ${res.data.user.name}!`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Admin login failed';
      toast.error(msg);
      throw err;
    }
  };

  /**
   * Legacy generic login helper (backward compatibility)
   */
  const login = async (identifier, password) => {
    try {
      const payload = typeof identifier === 'object' ? identifier : { enrollmentNumber: identifier, password };
      const res = await api.post('/auth/login', payload);
      return handleAuthSuccess(res.data, `Welcome back, ${res.data.user.name}!`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed';
      toast.error(msg);
      throw err;
    }
  };

  /**
   * Logout
   */
  const logout = async () => {
    try {
      await api.post('/sessions/checkout');
    } catch {
      // Ignore checkout errors
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('loginTimestamp');
    toast.success('Logged out successfully');
  };

  const role = (user?.role || user?.position || '').toLowerCase();
  const isStudent = role === 'student';
  const isTeacher = role === 'teacher';
  const isAdmin = role === 'admin';

  /**
   * Returns dashboard destination URL based on verified role
   */
  const getDashboardPath = useCallback(() => {
    if (isAdmin) return '/admin';
    if (isTeacher) return '/teacher/dashboard';
    return '/student/dashboard';
  }, [isAdmin, isTeacher]);

  const value = {
    user,
    token,
    loading,
    api,
    role,
    isStudent,
    isTeacher,
    isAdmin,
    login,
    studentLogin,
    teacherLogin,
    adminLogin,
    register,
    logout,
    getDashboardPath,
    isAuthenticated: !!token,
    isSessionValid,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
