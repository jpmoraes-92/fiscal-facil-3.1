import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const ModalEditarEmpresa = ({ empresa, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    razao_social: '',
    nome_fantasia: '',
    regime_tributario: 'Simples Nacional',
    aliquota_imposto: 6.0,
    cnaes_permitidos: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 🔧 Função auxiliar para extrair mensagem de erro de forma segura
  const extrairMensagemErro = (error) => {
    let mensagemErro = "Erro desconhecido ao processar requisição.";
    
    if (error.response) {
      const data = error.response.data;
      
      // Se data é string direta
      if (typeof data === 'string') {
        mensagemErro = data;
      }
      // Se tem detail (FastAPI padrão)
      else if (data?.detail) {
        // Se detail é array (erros de validação Pydantic)
        if (Array.isArray(data.detail)) {
          mensagemErro = data.detail.map(e => {
            if (typeof e === 'string') return e;
            if (e.msg) return `${e.loc ? e.loc.join('.') + ': ' : ''}${e.msg}`;
            return JSON.stringify(e);
          }).join('; ');
        }
        // Se detail é string
        else if (typeof data.detail === 'string') {
          mensagemErro = data.detail;
        }
        // Se detail é objeto
        else {
          mensagemErro = JSON.stringify(data.detail);
        }
      }
      // Fallback: converte data para string
      else {
        mensagemErro = JSON.stringify(data);
      }
    }
    // Se não tem response, usa message
    else if (error.message) {
      mensagemErro = error.message;
    }
    // Se mensagem ainda for objeto (última defesa)
    if (typeof mensagemErro === 'object') {
      mensagemErro = JSON.stringify(mensagemErro);
    }
    
    return mensagemErro;
  };

  useEffect(() => {
    if (empresa) {
      // Normaliza CNAEs para garantir que cnae_codigo seja string e codigo_servico_municipal não seja null
      const cnaesSeguros = (empresa.cnaes_permitidos || []).map(c => ({
        ...c,
        cnae_codigo: c.cnae_codigo != null ? String(c.cnae_codigo) : '',
        codigo_servico_municipal: c.codigo_servico_municipal || ''
      }));

      setFormData({
        razao_social: empresa.razao_social || '',
        nome_fantasia: empresa.nome_fantasia || '',
        regime_tributario: empresa.regime_tributario || 'Simples Nacional',
        aliquota_imposto: empresa.aliquota_imposto || 6.0,
        cnaes_permitidos: cnaesSeguros
      });
    }
  }, [empresa]);

  const adicionarCNAE = () => {
    setFormData({
      ...formData,
      cnaes_permitidos: [
        ...formData.cnaes_permitidos,
        { cnae_codigo: '', codigo_servico_municipal: '', descricao: '' }
      ]
    });
  };

  const removerCNAE = (index) => {
    const novosCNAEs = formData.cnaes_permitidos.filter((_, i) => i !== index);
    setFormData({ ...formData, cnaes_permitidos: novosCNAEs });
  };

  const atualizarCNAE = (index, campo, valor) => {
    const novosCNAEs = [...formData.cnaes_permitidos];
    novosCNAEs[index][campo] = valor;
    setFormData({ ...formData, cnaes_permitidos: novosCNAEs });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Garante que os CNAEs enviados têm cnae_codigo como string
      const dadosParaEnviar = {
        ...formData,
        cnaes_permitidos: (formData.cnaes_permitidos || []).map(c => ({
          ...c,
          cnae_codigo: String(c.cnae_codigo || ''),
          codigo_servico_municipal: c.codigo_servico_municipal || ''
        }))
      };

      console.log('📤 Enviando dados para API:', dadosParaEnviar);
      
      const response = await axios.put(`${API_URL}/api/empresas/${empresa.id}`, dadosParaEnviar);
      
      console.log('✅ Resposta da API:', response.data);
      
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      console.error('❌ Erro ao atualizar empresa:', err);
      const mensagemErro = extrairMensagemErro(err);
      setError(mensagemErro);
    } finally {
      setLoading(false);
    }
  };

  if (!empresa) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl">
        {/* Header */}
        <div className="border-b p-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-800">
            ✏️ Editar Empresa
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* CNPJ (somente leitura) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CNPJ (não editável)
            </label>
            <input
              type="text"
              value={empresa.cnpj}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
            />
          </div>

          {/* Razão Social */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Razão Social *
            </label>
            <input
              type="text"
              value={formData.razao_social}
              onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: MINHA EMPRESA LTDA"
            />
          </div>

          {/* Nome Fantasia */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome Fantasia
            </label>
            <input
              type="text"
              value={formData.nome_fantasia}
              onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Minha Empresa"
            />
          </div>

          {/* Regime Tributário */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Regime Tributário *
            </label>
            <select
              value={formData.regime_tributario}
              onChange={(e) => setFormData({ ...formData, regime_tributario: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="MEI">MEI - Microempreendedor Individual</option>
              <option value="Simples Nacional">Simples Nacional</option>
              <option value="Lucro Presumido">Lucro Presumido</option>
            </select>
          </div>

          {/* Alíquota Simples Nacional */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alíquota Simples Nacional (%)
            </label>
            <input
              type="number"
              step="0.1"
              min="0.01"
              max="20.0"
              value={formData.aliquota_imposto}
              onChange={(e) => setFormData({ ...formData, aliquota_imposto: parseFloat(e.target.value) || 6.0 })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="6.0"
            />
            <p className="text-xs text-gray-500 mt-1">
              💡 Informe a alíquota efetiva (Anexo III: 6%, Anexo IV: 4.5-16.93%, Anexo V: 15.5-30%)
            </p>
          </div>

          {/* CNAEs Permitidos */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                CNAEs / Serviços Autorizados
              </label>
              <button
                type="button"
                onClick={adicionarCNAE}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Adicionar Serviço
              </button>
            </div>

            {formData.cnaes_permitidos.length === 0 ? (
              <div className="text-center py-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <p className="text-sm text-gray-500">Nenhum serviço cadastrado</p>
                <p className="text-xs text-gray-400 mt-1">Clique em "Adicionar Serviço" para começar</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {formData.cnaes_permitidos.map((cnae, index) => (
                  <div key={index} className="flex gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="CNAE (ex: 6201-5/00)"
                        value={cnae.cnae_codigo}
                        onChange={(e) => atualizarCNAE(index, 'cnae_codigo', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="Código Serviço (ex: 08.02)"
                        value={cnae.codigo_servico_municipal}
                        onChange={(e) => atualizarCNAE(index, 'codigo_servico_municipal', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="Descrição (opcional)"
                        value={cnae.descricao || ''}
                        onChange={(e) => atualizarCNAE(index, 'descricao', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 col-span-2"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removerCNAE(index)}
                      className="flex-shrink-0 p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Remover"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Erro */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Footer com botões */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalEditarEmpresa;
