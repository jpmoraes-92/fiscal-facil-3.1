import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const ImpostoEstimado = ({ empresaId }) => {
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (empresaId) {
      // Limpa estado anterior para evitar "stale data"
      setDados(null);
      setLoading(true);
      setError('');
      carregarDados();
    }
  }, [empresaId]);

  const carregarDados = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API_URL}/api/notas/imposto-mes/${empresaId}`);
      setDados(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  if (!empresaId) return null;

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded mb-2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    );
  }

  if (!dados) return null;

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg shadow-md p-6 border-2 border-purple-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-3xl">💰</span>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Imposto Estimado</h3>
            <p className="text-sm text-gray-600">Mês {dados.mes_referencia}</p>
          </div>
        </div>
        <button
          onClick={carregarDados}
          className="text-gray-500 hover:text-gray-700 transition-colors"
          title="Atualizar"
        >
          🔄
        </button>
      </div>

      {/* Valor Principal */}
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-1">Imposto a Recolher (Estimado)</p>
        <p className="text-4xl font-bold text-purple-700">
          {formatarMoeda(dados.imposto_estimado_mes)}
        </p>
      </div>

      {/* Detalhes */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between items-center py-2 border-t border-purple-200">
          <span className="text-sm text-gray-600">Faturamento do Mês:</span>
          <span className="text-sm font-semibold text-gray-900">
            {formatarMoeda(dados.valor_total_mes)}
          </span>
        </div>
        <div className="flex justify-between items-center py-2 border-t border-purple-200">
          <span className="text-sm text-gray-600">Alíquota Aplicada:</span>
          <span className="text-sm font-semibold text-gray-900">
            {dados.aliquota_aplicada}%
          </span>
        </div>
      </div>

      {/* Informação adicional */}
      <div className="bg-white bg-opacity-70 rounded-lg p-3 border border-purple-200">
        <div className="flex items-start gap-2">
          <span className="text-blue-600 mt-0.5">ℹ️</span>
          <div>
            <p className="text-xs text-gray-700">
              <strong>Base de Cálculo:</strong> {dados.base_calculo}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Cálculo estimado considerando a alíquota configurada de {dados.aliquota_aplicada}%. 
              Valores reais podem variar conforme faixa de faturamento e anexo específico.
            </p>
          </div>
        </div>
      </div>

      {/* Badge de Status */}
      <div className="mt-4 flex justify-center">
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-semibold">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Cálculo Automático
        </span>
      </div>
    </div>
  );
};

export default ImpostoEstimado;
