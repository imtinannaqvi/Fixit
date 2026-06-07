import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '../config';

const AuthContext = createContext<any>(null);

export const AuthProvider = ({ children }: any) => {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const savedToken = await AsyncStorage.getItem('token');
      const savedUser = await AsyncStorage.getItem('user');
      if (savedToken && savedUser) {
        setToken(savedToken);
        const parsed = JSON.parse(savedUser);
        // 👇 normalize: ensure both id and _id always exist
        setUser({ ...parsed, _id: parsed._id || parsed.id });
      }
    } catch (err) {
      console.log('Error loading user:', err);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const res = await axios.post(`${API_URL}/auth/login`, { email, password });
    const userData = res.data.user;
    // 👇 normalize: server returns "id", we need "_id" too
    const normalizedUser = { ...userData, _id: userData._id || userData.id };
    await AsyncStorage.setItem('token', res.data.token);
    await AsyncStorage.setItem('user', JSON.stringify(normalizedUser));
    setToken(res.data.token);
    setUser(normalizedUser);
  };

  const register = async (name: string, email: string, password: string, role: string, phone: string) => {
    const res = await axios.post(`${API_URL}/auth/register`, { name, email, password, role, phone });
    const userData = res.data.user;
    // 👇 normalize: server returns "id", we need "_id" too
    const normalizedUser = { ...userData, _id: userData._id || userData.id };
    await AsyncStorage.setItem('token', res.data.token);
    await AsyncStorage.setItem('user', JSON.stringify(normalizedUser));
    setToken(res.data.token);
    setUser(normalizedUser);
  };

  const logout = async () => {
    await AsyncStorage.clear();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export default {};
export const useAuth = () => useContext(AuthContext);