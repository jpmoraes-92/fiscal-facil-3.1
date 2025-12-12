import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const ModalVisualizarNota = ({ notaId, onClose }) => {
  const [nota, setNota] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mostrarXML, setMostrarXML] = useState(false);

  useEffect(() => {
    if (!notaId) return;

    const carregarNota = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await axios.get(`${API_URL}/api/notas/${notaId}/detalhes`);
        setNota(response.data);
      } catch (err) {
        console.error('Erro ao carregar nota:', err);
        setError(err.response?.data?.detail || 'Erro ao carregar detalhes da nota');
      } finally {
        setLoading(false);
      }
    };

    carregarNota();
  }, [notaId]);

  if (!notaId) return null;

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor || 0);
  };

  const formatarData = (dataStr) => {
    if (!dataStr) return 'N/A';
    try {
      const data = new Date(dataStr);
      return data.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dataStr;
    }
  };

  const getStatusColor = (status) => {
    if (status === 'APROVADA') {
      return {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-700',
        badge: 'bg-green-100 text-green-800',
        icon: '✅'
      };
    } else {
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-700',
        badge: 'bg-red-100 text-red-800',
        icon: '❌'
      };
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10">
          <h3 className="text-xl font-bold text-gray-800">
            📄 Nota Fiscal de Serviços Eletrônica
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            data-testid="btn-fechar-modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <svg className="animate-spin h-12 w-12 text-blue-500 mx-auto mb-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-600">Carregando dados...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-600 font-semibold mb-2">Erro ao carregar dados</p>
                <p className="text-gray-600 text-sm">{error}</p>
              </div>
            </div>
          )}

          {nota && !loading && !error && (
            <div className="space-y-6">
              {/* Status da Auditoria */}
              {(() => {
                const colors = getStatusColor(nota.status_auditoria);
                return (
                  <div className={`p-4 rounded-lg border-2 ${colors.bg} ${colors.border}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-semibold">
                        {colors.icon} Status da Auditoria
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${colors.badge}`}>
                        {nota.status_auditoria}
                      </span>
                    </div>
                    <p className={`text-sm ${colors.text} font-medium`}>
                      {nota.mensagem_erro || 'Nota fiscal em conformidade'}
                    </p>
                  </div>
                );
              })()}

              {/* Dados da Empresa Prestadora */}
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
                  🏢 Dados da Empresa Prestadora
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Razão Social</p>
                    <p className="text-sm font-semibold text-gray-900">{nota.empresa?.razao_social || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">CNPJ</p>
                    <p className="text-sm font-semibold text-gray-900">{nota.empresa?.cnpj || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Regime Tributário</p>
                    <p className="text-sm font-semibold text-gray-900">{nota.empresa?.regime_tributario || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Dados da Nota Fiscal */}
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
                  📋 Dados da Nota Fiscal
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Número da Nota</p>
                    <p className="text-sm font-semibold text-gray-900">{nota.numero_nota}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Data de Emissão</p>
                    <p className="text-sm font-semibold text-gray-900">{formatarData(nota.data_emissao)}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Chave de Validação</p>
                    <p className="text-sm font-semibold text-gray-900 break-all">{nota.chave_validacao || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">CNPJ Tomador</p>
                    <p className="text-sm font-semibold text-gray-900">{nota.cnpj_tomador || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Código de Serviço</p>
                    <p className="text-sm font-semibold text-gray-900">{nota.codigo_servico_utilizado}</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg border-2 border-blue-200">
                    <p className="text-xs text-blue-600 mb-1">Valor Total</p>
                    <p className="text-xl font-bold text-blue-900">{formatarMoeda(nota.valor_total)}</p>
                  </div>
                </div>
              </div>

              {/* Informações Adicionais */}
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
                  ℹ️ Informações Adicionais
                </h4>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Data de Importação</p>
                  <p className="text-sm font-semibold text-gray-900">{formatarData(nota.data_importacao)}</p>
                </div>
              </div>

              {/* Visualizar XML */}
              {nota.xml_original && (
                <div>
                  <button
                    onClick={() => setMostrarXML(!mostrarXML)}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mostrarXML ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                    </svg>
                    {mostrarXML ? 'Ocultar' : 'Visualizar'} XML Original
                  </button>

                  {mostrarXML && (
                    <div className="mt-3">
                      <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-xs max-h-96 overflow-y-auto">
                        {nota.xml_original}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {nota && !loading && (
          <div className="sticky bottom-0 bg-gray-50 border-t p-4 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              📄 Documento gerado pelo Sistema Fiscal Fácil
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Imprimir
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModalVisualizarNota;
