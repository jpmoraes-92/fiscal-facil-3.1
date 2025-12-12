import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ModalConfirmacao from './ModalConfirmacao';
import Toast from './Toast';
import { generateInvoicePDF } from '../utils/pdfGenerator';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const ListaNotas = ({ empresaId, refreshTrigger }) => {
  const [notas, setNotas] = useState([]);
  const [estatisticas, setEstatisticas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [excluindo, setExcluindo] = useState(null);
  const [notaParaExcluir, setNotaParaExcluir] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    if (empresaId) {
      // Limpa estado anterior para evitar "stale data"
      setNotas([]);
      setEstatisticas(null);
      setLoading(true);
      carregarNotas();
      carregarEstatisticas();
    }
  }, [empresaId, refreshTrigger]);

  const carregarNotas = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/notas/empresa/${empresaId}`);
      setNotas(response.data);
    } catch (error) {
      console.error('Erro ao carregar notas:', error);
    } finally {
      setLoading(false);
    }
  };

  const carregarEstatisticas = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/notas/estatisticas/${empresaId}`);
      setEstatisticas(response.data);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const atualizarLista = () => {
    carregarNotas();
    carregarEstatisticas();
  };

  const handleExcluir = async () => {
    if (!notaParaExcluir) return;

    setExcluindo(notaParaExcluir.id);
    try {
      await axios.delete(`${API_URL}/api/notas/${notaParaExcluir.id}`);
      
      // Atualiza a lista removendo a nota excluída
      setNotas(notas.filter(nota => nota.id !== notaParaExcluir.id));
      
      // Recarrega estatísticas
      carregarEstatisticas();
      
      // Feedback visual (Toast)
      setToast({
        show: true,
        message: `✅ Nota #${notaParaExcluir.numero_nota} excluída com sucesso!`,
        type: 'success'
      });
      
      // Fecha o modal
      setNotaParaExcluir(null);
    } catch (error) {
      setToast({
        show: true,
        message: `❌ Erro ao excluir nota: ${error.response?.data?.detail || error.message}`,
        type: 'error'
      });
    } finally {
      setExcluindo(null);
    }
  };

  const handleDownloadXML = async (notaId, numeroNota) => {
    try {
      // Busca os detalhes da nota incluindo o XML bruto
      const response = await axios.get(`${API_URL}/api/notas/${notaId}/detalhes`);
      const xmlContent = response.data.xml_original;

      if (!xmlContent) {
        setToast({
          show: true,
          message: '❌ XML não disponível para esta nota.',
          type: 'error'
        });
        return;
      }

      // Cria um Blob com o conteúdo XML
      const blob = new Blob([xmlContent], { type: 'text/xml' });
      
      // Cria um link temporário para download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `nota_${numeroNota}.xml`;
      
      // Adiciona ao DOM, clica e remove (necessário para Firefox)
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Libera a URL do Blob
      URL.revokeObjectURL(url);

      setToast({
        show: true,
        message: `✅ XML da nota #${numeroNota} baixado com sucesso!`,
        type: 'success'
      });
    } catch (error) {
      console.error('Erro ao baixar XML:', error);
      setToast({
        show: true,
        message: `❌ Erro ao baixar XML: ${error.response?.data?.detail || error.message}`,
        type: 'error'
      });
    }
  };

  const handleDownloadPDF = async (nota) => {
    try {
      // Gera o PDF usando os dados da nota
      generateInvoicePDF(nota);

      setToast({
        show: true,
        message: `✅ PDF da nota #${nota.numero_nota} gerado com sucesso!`,
        type: 'success'
      });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      setToast({
        show: true,
        message: `❌ Erro ao gerar PDF: ${error.message}`,
        type: 'error'
      });
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-center text-gray-500">Carregando notas...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">📋 Notas Fiscais</h2>
        <button
          data-testid="btn-atualizar-notas"
          onClick={atualizarLista}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
        >
          🔄 Atualizar
        </button>
      </div>

      {estatisticas && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Total de Notas</p>
            <p className="text-2xl font-bold text-blue-600">{estatisticas.total_notas}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Aprovadas</p>
            <p className="text-2xl font-bold text-green-600">{estatisticas.aprovadas}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Com Erros</p>
            <p className="text-2xl font-bold text-red-600">{estatisticas.com_erros}</p>
          </div>
        </div>
      )}

      {notas.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg mb-2">📄 Nenhuma nota importada</p>
          <p className="text-sm">Faça o upload de um arquivo XML para começar</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nota</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {notas.map((nota) => (
                <tr key={nota.id} data-testid={`nota-row-${nota.id}`} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{nota.numero_nota}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(nota.data_emissao).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    R$ {nota.valor_total?.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        nota.status_auditoria === 'APROVADA'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {nota.status_auditoria === 'APROVADA' ? '✅ Aprovada' : '❌ Erro'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    <div className="flex items-center justify-center gap-2">
                      {/* Botão Excluir */}
                      <button
                        data-testid={`btn-excluir-${nota.id}`}
                        onClick={() => setNotaParaExcluir(nota)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir nota"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>

                      {/* Botão Download XML */}
                      <button
                        data-testid={`btn-download-xml-${nota.id}`}
                        onClick={() => handleDownloadXML(nota.id, nota.numero_nota)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Baixar XML da nota"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </button>

                      {/* Botão Download PDF */}
                      <button
                        data-testid={`btn-download-pdf-${nota.id}`}
                        onClick={() => handleDownloadPDF(nota)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Gerar PDF da nota"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      <ModalConfirmacao
        show={!!notaParaExcluir}
        title="Excluir Nota Fiscal?"
        message={`Tem certeza que deseja excluir a Nota #${notaParaExcluir?.numero_nota}? Esta ação não pode ser desfeita.`}
        confirmText="Sim, Excluir"
        cancelText="Cancelar"
        confirmColor="red"
        loading={!!excluindo}
        onConfirm={handleExcluir}
        onCancel={() => setNotaParaExcluir(null)}
      />

      {/* Toast de Feedback */}
      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, show: false })}
      />
    </div>
  );
};

export default ListaNotas;
