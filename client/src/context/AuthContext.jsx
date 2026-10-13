import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('indodhobi_user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('indodhobi_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyUser = async () => {
      if (token) {
        try {
          const res = await authService.getMe();
          if (res.success && res.user) {
            setUser(res.user);
            localStorage.setItem('indodhobi_user', JSON.stringify(res.user));
          }
        } catch (err) {
          console.warn('[AuthContext] Session expired or invalid:', err);
          logout();
        }
      }
      setLoading(false);
    };

    verifyUser();
  }, [token]);

  const login = async (email, password) => {
    try {
      const res = await authService.login(email, password);
      if (res.success) {
        setToken(res.token);
        setUser(res.user);
        localStorage.setItem('indodhobi_token', res.token);
        localStorage.setItem('indodhobi_user', JSON.stringify(res.user));
        toast.success(`Welcome back, ${res.user.name.split(' ')[0]}!`);
        return { success: true, user: res.user };
      }
      return { success: false, message: res.message };
    } catch (error) {
      const msg = error.response?.data?.message || 'Login failed. Please check your credentials.';
      toast.error(msg);
      return { success: false, message: msg };
    }
  };

  const register = async (userData) => {
    try {
      const res = await authService.register(userData);
      if (res.success) {
        setToken(res.token);
        setUser(res.user);
        localStorage.setItem('indodhobi_token', res.token);
        localStorage.setItem('indodhobi_user', JSON.stringify(res.user));
        toast.success(`Account created! Welcome to IndoDhobi, ${res.user.name.split(' ')[0]}!`);
        return { success: true, user: res.user };
      }
      return { success: false, message: res.message };
    } catch (error) {
      const msg = error.response?.data?.message || 'Registration failed.';
      toast.error(msg);
      return { success: false, message: msg };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('indodhobi_token');
    localStorage.removeItem('indodhobi_user');
    toast.success('You have been logged out.');
  };

  const updateUser = (updatedData) => {
    setUser(updatedData);
    localStorage.setItem('indodhobi_user', JSON.stringify(updatedData));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        updateUser,
        isAuthenticated: Boolean(token && user),
        isAdmin: user?.role === 'admin',
        isRider: user?.role === 'rider'
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
