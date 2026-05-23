import React, { createContext, useContext, useEffect, useState } from 'react';
import { nutriApi } from '@/api/nutriApi';

const AuthContext = createContext();
const STORAGE_KEY = 'nutriai_user';

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => readStoredUser());
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(readStoredUser()?.email));
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const saveUser = (nextUser) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
    setIsAuthenticated(true);
  };

  const checkUserAuth = async () => {
    const stored = readStoredUser();
    if (!stored?.email) {
      setIsLoadingAuth(false);
      setAuthChecked(true);
      setIsAuthenticated(false);
      return;
    }

    try {
      setIsLoadingAuth(true);
      setAuthError(null);
      const currentUser = await nutriApi.auth.me();
      saveUser(currentUser);
    } catch (error) {
      console.error('User auth check failed:', error);
      setAuthError({ type: 'backend_unavailable', message: error.message });
      setIsAuthenticated(false);
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  };

  useEffect(() => {
    checkUserAuth();
  }, []);

  const register = async ({ email, code }) => {
    const savedUser = await nutriApi.auth.verifyRegister({ email, code });
    saveUser(savedUser);
    return savedUser;
  };

  const requestRegistrationCode = async ({ email, nickname, password }) => {
    return nutriApi.auth.requestCode({ email, nickname, password });
  };

  const login = async ({ identifier, password }) => {
    const savedUser = await nutriApi.auth.login({ identifier, password });
    saveUser(savedUser);
    return savedUser;
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    setIsAuthenticated(false);
  };

  const navigateToLogin = () => {};

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings: false,
        authError,
        appPublicSettings: null,
        authChecked,
        register,
        requestRegistrationCode,
        login,
        logout,
        navigateToLogin,
        checkUserAuth,
        checkAppState: checkUserAuth,
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
