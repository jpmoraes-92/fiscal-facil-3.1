import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const MonitorRBT12 = ({ empresaId }) => {
  const [metricas, setMetricas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (empresaId) {
      // Limpa estado anterior para evitar "stale data"
      setMetricas(null);
      setLoading(true);
      setError('');
      carregarMetricas();
    }
  }, [empresaId]);

  const carregarMetricas = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API_URL}/api/dashboard/metrics/${empresaId}`);
      setMetricas(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao carregar métricas');
    } finally {
      setLoading(false);
    }
  };

  if (!empresaId) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
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

  if (!metricas) {
    return null;
  }

  // Define cores baseadas no status
  const getStatusColors = () => {
    if (metricas.status === 'ESTOUROU') {
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-700',
        icon: '🚨',
        bar: 'bg-red-500',
        title: 'LIMITE ESTOURADO!'
      };
    } else if (metricas.status === 'ALERTA') {
      return {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        text: 'text-yellow-700',
        icon: '⚠️',
        bar: 'bg-yellow-500',
        title: 'ATENÇÃO: Próximo do Limite'
      };
    } else {
      return {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-700',
        icon: '✅',
        bar: 'bg-green-500',
        title: 'Faturamento Saudável'
      };
    }
  };

  const colors = getStatusColors();
  const percentualParaBarra = Math.min(metricas.percentual_uso, 100);

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  return (
    <div data-testid="monitor-rbt12" className={`rounded-lg shadow-md p-6 border-2 ${colors.bg} ${colors.border}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{colors.icon}</span>
          <h3 className="text-lg font-semibold text-gray-800">Monitor de Faturamento (RBT12)</h3>
        </div>
        <button
          data-testid="btn-refresh-metrics"
          onClick={carregarMetricas}
          className="text-gray-500 hover:text-gray-700 transition-colors"
          title="Atualizar métricas"
        >
          🔄
        </button>
      </div>

      {/* Status Badge */}
      <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold mb-4 ${colors.text} bg-white border ${colors.border}`}>
        {colors.title}
      </div>

      {/* Valores */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-600">Faturamento Atual (12 meses)</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatarMoeda(metricas.faturamento_atual)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Limite {metricas.regime_tributario}</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatarMoeda(metricas.limite)}
          </p>
        </div>
      </div>

      {/* Barra de Progresso */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Uso do Limite</span>
          <span className={`text-sm font-bold ${colors.text}`}>
            {metricas.percentual_uso.toFixed(1)}%
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
          <div
            data-testid="progress-bar"
            className={`h-full ${colors.bar} transition-all duration-500 ease-out flex items-center justify-end pr-2`}
            style={{ width: `${percentualParaBarra}%` }}
          >
            {metricas.percentual_uso >= 10 && (
              <span className="text-xs font-bold text-white">
                {metricas.percentual_uso.toFixed(0)}%
              </span>
            )}
          </div>
        </div>

        {/* Marcadores na barra */}
        <div className="flex justify-between mt-1 text-xs text-gray-500">
          <span>0%</span>
          <span>80% (Alerta)</span>
          <span>100%</span>
        </div>
      </div>

      {/* Margem Disponível */}
      <div className={`p-3 rounded-lg ${metricas.margem_disponivel > 0 ? 'bg-white' : 'bg-red-100'}`}>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">
            {metricas.margem_disponivel > 0 ? 'Margem Disponível:' : 'Excesso:'}
          </span>
          <span className={`text-lg font-bold ${metricas.margem_disponivel > 0 ? 'text-gray-900' : 'text-red-700'}`}>
            {formatarMoeda(Math.abs(metricas.margem_disponivel))}
          </span>
        </div>
      </div>

      {/* Alertas */}
      {metricas.status === 'ALERTA' && (
        <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>⚠️ Atenção:</strong> A empresa está próxima do limite de faturamento. 
            Monitore cuidadosamente as próximas emissões de notas fiscais.
          </p>
        </div>
      )}

      {metricas.status === 'ESTOUROU' && (
        <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg">
          <p className="text-sm text-red-800">
            <strong>🚨 URGENTE:</strong> O limite de faturamento foi ultrapassado! 
            A empresa pode estar sujeita a desenquadramento do regime tributário atual.
            Contate o cliente imediatamente.
          </p>
        </div>
      )}

      {/* Info do Regime */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          <strong>Regime:</strong> {metricas.regime_tributario} | <strong>Empresa:</strong> {metricas.razao_social}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          * Cálculo baseado nas notas fiscais emitidas nos últimos 12 meses móveis
        </p>
      </div>
    </div>
  );
};

export default MonitorRBT12;
