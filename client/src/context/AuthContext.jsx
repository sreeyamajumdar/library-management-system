import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

// Session duration: 2 hours in milliseconds
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
   * Check if the current session has expired (2-hour limit).
   * Returns true if session is still valid, false if expired.
   */
  const isSessionValid = useCallback(() => {
    const loginTimestamp = localStorage.getItem('loginTimestamp');
    if (!loginTimestamp) return false;
    const elapsed = Date.now() - parseInt(loginTimestamp, 10);
    return elapsed < SESSION_DURATION_MS;
  }, []);

  // On mount: restore session from localStorage, but only if not expired
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser && isSessionValid()) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('loginTimestamp');
      }
    } else if (storedToken) {
      // Session expired — clean up
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('loginTimestamp');
    }
    setLoading(false);
  }, [isSessionValid]);

  // Set up a timer to auto-logout when the 2-hour session expires
  useEffect(() => {
    if (!token) return;

    const loginTimestamp = localStorage.getItem('loginTimestamp');
    if (!loginTimestamp) return;

    const elapsed = Date.now() - parseInt(loginTimestamp, 10);
    const remaining = SESSION_DURATION_MS - elapsed;

    if (remaining <= 0) {
      // Already expired
      logout();
      return;
    }

    const timer = setTimeout(() => {
      toast.error('Your 2-hour session has expired. Please log in again.');
      logout();
    }, remaining);

    return () => clearTimeout(timer);
  }, [token]);

  const register = async (data) => {
    try {
      const res = await api.post('/auth/register', data);
      toast.success('Registration successful!');
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed';
      toast.error(msg);
      throw err;
    }
  };

  const login = async (enrollmentNumber) => {
    try {
      const res = await api.post('/auth/login', { enrollmentNumber });
      const { token: newToken, user: newUser } = res.data;
      setToken(newToken);
      setUser(newUser);
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));
      localStorage.setItem('loginTimestamp', Date.now().toString());
      toast.success(`Welcome back, ${newUser.name}!`);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed';
      toast.error(msg);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await api.post('/sessions/checkout');
    } catch {
      // Ignore checkout errors on logout
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('loginTimestamp');
    toast.success('Logged out successfully');
  };

  const value = {
    user,
    token,
    loading,
    api,
    login,
    register,
    logout,
    isAuthenticated: !!token,
    isAdmin: user?.position === 'Admin',
    isSessionValid,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
