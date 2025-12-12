import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const ModalPDFNota = ({ notaId, onClose }) => {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!notaId) return;

    const carregarPDF = async () => {
      setLoading(true);
      setError('');

      try {
        // Faz o download do PDF com autenticação
        const response = await axios.get(
          `${API_URL}/api/notas/${notaId}/pdf`,
          {
            responseType: 'blob', // Importante: recebe como blob
          }
        );

        // Cria uma URL local do blob
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        setPdfUrl(url);
      } catch (err) {
        console.error('Erro ao carregar PDF:', err);
        setError(err.response?.data?.detail || 'Erro ao carregar PDF da nota');
      } finally {
        setLoading(false);
      }
    };

    carregarPDF();

    // Cleanup: revoga a URL quando o componente desmontar
    return () => {
      if (pdfUrl) {
        window.URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [notaId]);

  if (!notaId) return null;

  const handleDownload = () => {
    if (pdfUrl) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `nota_fiscal_${notaId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-800">
            📄 Visualização da Nota Fiscal
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

        {/* PDF Viewer */}
        <div className="flex-1 overflow-hidden bg-gray-100">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <svg className="animate-spin h-12 w-12 text-blue-500 mx-auto mb-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-600">Carregando PDF...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-6">
                <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-600 font-semibold mb-2">Erro ao carregar PDF</p>
                <p className="text-gray-600 text-sm">{error}</p>
                <button
                  onClick={onClose}
                  className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Fechar
                </button>
              </div>
            </div>
          )}

          {pdfUrl && !loading && !error && (
            <iframe
              src={pdfUrl}
              title="Nota Fiscal PDF"
              className="w-full h-full border-0"
              style={{ minHeight: '500px' }}
            />
          )}
        </div>

        {/* Footer */}
        {pdfUrl && !loading && (
          <div className="flex items-center justify-between p-4 border-t bg-gray-50">
            <p className="text-sm text-gray-600">
              💡 Use Ctrl+P para imprimir ou Ctrl+S para salvar
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Baixar PDF
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
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

export default ModalPDFNota;
