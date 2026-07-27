import { createContext, useState, useEffect } from 'react';
import api, { setAccessToken } from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('userInfo');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      setAccessToken(parsedUser.accessToken);
    }
    setLoading(false);

    // The "Why": api.js can't reach into this component's state, so when the
    // refresh token is invalid/expired it dispatches this event instead and
    // we react to it here to clear the logged-in user.
    const handleForcedLogout = () => setUser(null);
    window.addEventListener('auth:logout', handleForcedLogout);
    return () => window.removeEventListener('auth:logout', handleForcedLogout);
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setUser(data);
    setAccessToken(data.accessToken);
    localStorage.setItem('userInfo', JSON.stringify(data));
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      // Clear local state regardless of whether the server call succeeded,
      // so the user is never stuck "logged in" client-side.
      setAccessToken(null);
      localStorage.removeItem('userInfo');
      setUser(null);
    }
  };

  const register = async (name, email, password) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    setUser(data);
    setAccessToken(data.accessToken);
    localStorage.setItem('userInfo', JSON.stringify(data));
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, register, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
