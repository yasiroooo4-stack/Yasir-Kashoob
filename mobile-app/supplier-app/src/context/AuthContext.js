import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { API } from '../services/api';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await SecureStore.getItemAsync('token');
      const storedUser = await SecureStore.getItemAsync('user');
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.log('Error loading auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (supplierCode, password) => {
    try {
      const response = await axios.post(API.LOGIN, {
        supplier_code: supplierCode,
        password: password,
      });

      const { access_token, supplier } = response.data;

      await SecureStore.setItemAsync('token', access_token);
      await SecureStore.setItemAsync('user', JSON.stringify(supplier));

      setToken(access_token);
      setUser(supplier);

      return { success: true, supplier };
    } catch (error) {
      const message = error.response?.data?.detail || 'فشل تسجيل الدخول';
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync('token');
      await SecureStore.deleteItemAsync('user');
      setToken(null);
      setUser(null);
    } catch (error) {
      console.log('Error logging out:', error);
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      await axios.put(
        `${API.CHANGE_PASSWORD}?supplier_code=${user.code}&current_password=${currentPassword}&new_password=${newPassword}`
      );
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.detail || 'فشل تغيير كلمة المرور';
      return { success: false, error: message };
    }
  };

  const updateUser = (newUserData) => {
    setUser(prev => ({ ...prev, ...newUserData }));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        changePassword,
        updateUser,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
