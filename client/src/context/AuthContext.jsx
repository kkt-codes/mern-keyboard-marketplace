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

    // api.js can't reach into this component's state, so when the
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

  const register = async (name, email, password, role) => {
    const { data } = await api.post('/auth/register', { name, email, password, role });
    setUser(data);
    setAccessToken(data.accessToken);
    localStorage.setItem('userInfo', JSON.stringify(data));
  };

  // Merges fresh fields (e.g. after a profile edit) into the cached user
  // without touching the accessToken, so the header/dashboard update
  // immediately without forcing a re-login.
  const updateUser = (fields) => {
    setUser((prev) => {
      const next = { ...prev, ...fields };
      localStorage.setItem('userInfo', JSON.stringify(next));
      return next;
    });
  };

  // Password changes and "log out other devices" revoke every session by
  // bumping the account's tokenVersion server-side, then hand back a fresh
  // accessToken so the session making that request isn't logged out too.
  // Without this, the next silent refresh would fail since its old refresh
  // token cookie now carries a stale version.
  const updateAccessToken = (accessToken) => {
    setAccessToken(accessToken);
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, accessToken };
      localStorage.setItem('userInfo', JSON.stringify(next));
      return next;
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, register, updateUser, updateAccessToken, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
