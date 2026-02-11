import { useState, useCallback } from 'react';
const BACKEND_API_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Custom Hook for Authentication
 * Manages user login state and tokens
 */
export const useAuth = () => {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('authToken');
    const userType = localStorage.getItem('userType');
    return token ? { token, userType } : null;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const login = useCallback(async (email, password, userType = 'user') => {
    setLoading(true);
    setError('');

    try {
      const endpoint =
        userType === 'hr'
          ? `${BACKEND_API_URL}/auth/login-hr`
          : `${BACKEND_API_URL}/auth/login-user`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      localStorage.setItem('authToken', data.token);
      localStorage.setItem('userType', userType);
      setUser({ token: data.token, userType });

      return { success: true, data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userType');
    setUser(null);
    setError('');
  }, []);

  const isAuthenticated = !!user?.token;

  return {
    user,
    loading,
    error,
    login,
    logout,
    isAuthenticated,
  };
};
