import React, { useState } from 'react';
import axios from 'axios';
import Toast from './Toast';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const BotaoRelatorio = ({ empresaId }) => {
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const gerarRelatorio = async () => {
    setGerando(true);
    setErro('');

    try {
      const response = await axios.get(
        `${API_URL}/api/relatorios/inconsistencias/${empresaId}`,
        {
          responseType: 'blob',
        }
      );

      // Cria um link de download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Extrai o nome do arquivo do header ou usa um padrão
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'relatorio_inconsistencias.xlsx';
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      // Feedback de sucesso com Toast
      setToast({
        show: true,
        message: '✅ Relatório Excel gerado e baixado com sucesso!',
        type: 'success'
      });
    } catch (err) {
      console.error('Erro ao gerar relatório:', err);
      
      // Tratamento especial para resposta blob com erro
      let errorMsg = 'Erro ao gerar relatório';
      
      if (err.response?.status === 404) {
        errorMsg = 'Nenhuma inconsistência encontrada. Todas as notas estão aprovadas!';
        setToast({
          show: true,
          message: `ℹ️ ${errorMsg}`,
          type: 'info'
        });
      } else if (err.response?.data) {
        // Se a resposta for blob, tenta converter para texto
        if (err.response.data instanceof Blob) {
          try {
            const text = await err.response.data.text();
            const jsonError = JSON.parse(text);
            errorMsg = jsonError.detail || errorMsg;
          } catch {
            errorMsg = 'Erro ao processar resposta do servidor';
          }
        } else {
          errorMsg = err.response.data.detail || errorMsg;
        }
        
        setToast({
          show: true,
          message: `❌ ${errorMsg}`,
          type: 'error'
        });
      } else {
        setToast({
          show: true,
          message: `❌ ${errorMsg}: ${err.message}`,
          type: 'error'
        });
      }
      
      setErro(errorMsg);
    } finally {
      setGerando(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border-2 border-blue-200">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">📄</span>
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Relatório de Inconsistências</h3>
          <p className="text-sm text-gray-600">Exporte todas as notas com erros em Excel</p>
        </div>
      </div>

      <button
        data-testid="btn-gerar-relatorio"
        onClick={gerarRelatorio}
        disabled={gerando}
        className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold flex items-center justify-center gap-2"
      >
        {gerando ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Gerando Relatório...</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>📊 Baixar Relatório Excel</span>
          </>
        )}
      </button>

      <div className="mt-3 text-xs text-gray-500 space-y-1">
        <p>✅ Contém apenas notas com erros de auditoria</p>
        <p>✅ Formato Excel (.xlsx) pronto para WhatsApp</p>
        <p>✅ Dados atualizados em tempo real</p>
      </div>

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

export default BotaoRelatorio;
