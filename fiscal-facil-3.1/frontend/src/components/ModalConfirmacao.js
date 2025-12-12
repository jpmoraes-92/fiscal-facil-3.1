import React from 'react';

const ModalConfirmacao = ({ 
  show, 
  title, 
  message, 
  confirmText = "Confirmar", 
  cancelText = "Cancelar",
  confirmColor = "red", // red, blue, green
  onConfirm, 
  onCancel,
  loading = false
}) => {
  if (!show) return null;

  const colorStyles = {
    red: {
      btn: 'bg-red-600 hover:bg-red-700',
      icon: 'text-red-600',
      iconBg: 'bg-red-100'
    },
    blue: {
      btn: 'bg-blue-600 hover:bg-blue-700',
      icon: 'text-blue-600',
      iconBg: 'bg-blue-100'
    },
    green: {
      btn: 'bg-green-600 hover:bg-green-700',
      icon: 'text-green-600',
      iconBg: 'bg-green-100'
    }
  };

  const colors = colorStyles[confirmColor] || colorStyles.red;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full animate-scale-in">
        {/* Ícone de Alerta */}
        <div className="p-6">
          <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full ${colors.iconBg} mb-4`}>
            <svg className={`h-6 w-6 ${colors.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          {/* Título */}
          <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
            {title}
          </h3>

          {/* Mensagem */}
          <p className="text-sm text-gray-600 text-center mb-6">
            {message}
          </p>

          {/* Botões */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`flex-1 px-4 py-2 ${colors.btn} text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processando...
                </span>
              ) : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalConfirmacao;
