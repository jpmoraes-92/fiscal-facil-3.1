import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // 🔒 Interceptor Axios para tratar Token Expirado (401)
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response, // Sucesso - retorna normalmente
      (error) => {
        if (error.response && error.response.status === 401) {
          // Token expirado ou inválido
          console.warn('🔒 Token expirado ou inválido. Redirecionando para login...');
          
          // Limpa sessão
          setToken(null);
          setUser(null);
          localStorage.removeItem('token');
          localStorage.removeItem('empresaSelecionada');
          delete axios.defaults.headers.common['Authorization'];
          
          // Redireciona para login
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );

    // Cleanup: remove interceptor quando component desmontar
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/auth/me`);
      setUser(response.data);
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, senha) => {
    const response = await axios.post(`${API_URL}/api/auth/login`, { email, senha });
    const { access_token, usuario } = response.data;
    setToken(access_token);
    setUser(usuario);
    localStorage.setItem('token', access_token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    return response.data;
  };

  const register = async (nome, email, senha, telefone) => {
    const response = await axios.post(`${API_URL}/api/auth/registro`, { nome, email, senha, telefone });
    const { access_token, usuario } = response.data;
    setToken(access_token);
    setUser(usuario);
    localStorage.setItem('token', access_token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    return response.data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('empresaSelecionada'); // Limpa empresa selecionada
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};