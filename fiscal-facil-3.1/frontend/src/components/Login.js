import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    telefone: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(formData.email, formData.senha);
      } else {
        await register(formData.nome, formData.email, formData.senha, formData.telefone);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao processar solicitação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">📊 Fiscal Fácil</h1>
          <p className="text-gray-600">Sistema de Auditoria Fiscal</p>
        </div>

        <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
          <button
            data-testid="toggle-login-btn"
            className={`flex-1 py-2 rounded-md transition-all ${
              isLogin ? 'bg-white shadow-md text-blue-600 font-semibold' : 'text-gray-600'
            }`}
            onClick={() => setIsLogin(true)}
          >
            Entrar
          </button>
          <button
            data-testid="toggle-register-btn"
            className={`flex-1 py-2 rounded-md transition-all ${
              !isLogin ? 'bg-white shadow-md text-blue-600 font-semibold' : 'text-gray-600'
            }`}
            onClick={() => setIsLogin(false)}
          >
            Registrar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
              <input
                data-testid="input-nome"
                type="text"
                required={!isLogin}
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="João Silva"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              data-testid="input-email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input
              data-testid="input-senha"
              type="password"
              required
              value={formData.senha}
              onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <input
                data-testid="input-telefone"
                type="tel"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="(18) 99999-9999"
              />
            </div>
          )}

          {error && (
            <div data-testid="error-message" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            data-testid="submit-btn"
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processando...' : isLogin ? 'Entrar' : 'Criar Conta'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;