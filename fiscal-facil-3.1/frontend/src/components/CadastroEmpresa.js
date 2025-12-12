import React, { useState } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const CadastroEmpresa = ({ onEmpresaCadastrada }) => {
  const [step, setStep] = useState(1);
  const [cnpj, setCnpj] = useState('');
  const [dadosReceita, setDadosReceita] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    regime_tributario: 'Simples Nacional',
    aliquota_imposto: 6.0,
    cnaes_permitidos: []
  });

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

  // Função para aplicar máscara de CNPJ
  const aplicarMascaraCNPJ = (valor) => {
    // Remove tudo que não é número
    const numeros = valor.replace(/\D/g, '');
    
    // Aplica a máscara progressivamente
    if (numeros.length <= 2) {
      return numeros;
    } else if (numeros.length <= 5) {
      return numeros.replace(/(\d{2})(\d{0,3})/, '$1.$2');
    } else if (numeros.length <= 8) {
      return numeros.replace(/(\d{2})(\d{3})(\d{0,3})/, '$1.$2.$3');
    } else if (numeros.length <= 12) {
      return numeros.replace(/(\d{2})(\d{3})(\d{3})(\d{0,4})/, '$1.$2.$3/$4');
    } else {
      return numeros.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5');
    }
  };

  // Remove máscara do CNPJ (apenas números)
  const limparCNPJ = (valor) => {
    return valor.replace(/\D/g, '');
  };

  // Handler para mudança no campo CNPJ
  const handleCnpjChange = (e) => {
    const valorDigitado = e.target.value;
    const valorFormatado = aplicarMascaraCNPJ(valorDigitado);
    setCnpj(valorFormatado);
  };

  const consultarCNPJ = async () => {
    setError('');
    setLoading(true);
    
    // Remove a máscara antes de enviar
    const cnpjLimpo = limparCNPJ(cnpj);
    
    // Validação básica
    if (cnpjLimpo.length !== 14) {
      setError('CNPJ inválido. Digite 14 números.');
      setLoading(false);
      return;
    }
    
    try {
      const response = await axios.get(`${API_URL}/api/empresas/consulta/${cnpjLimpo}`);
      const dados = response.data;
      setDadosReceita(dados);
      
      // 🎯 AUTO-POPULAÇÃO DE CNAEs
      const cnaesAutoPopulados = [];
      
      // Adiciona CNAE Principal
      if (dados.cnae_principal) {
        cnaesAutoPopulados.push({
          // força conversão para string para evitar 422 (BrasilAPI pode retornar número)
          cnae_codigo: dados.cnae_principal.codigo ? String(dados.cnae_principal.codigo) : '',
          descricao: dados.cnae_principal.descricao || '',
          codigo_servico_municipal: '' // Contadora preenche depois
        });
      }
      
      // Adiciona CNAEs Secundários (até 5 para não sobrecarregar)
      if (dados.cnaes_secundarios && dados.cnaes_secundarios.length > 0) {
        dados.cnaes_secundarios.slice(0, 5).forEach(cnae => {
          cnaesAutoPopulados.push({
            // força conversão para string: String(12345) -> '12345'
            cnae_codigo: cnae.codigo ? String(cnae.codigo) : '',
            descricao: cnae.descricao || '',
            codigo_servico_municipal: ''
          });
        });
      }
      
      // Atualiza formData com CNAEs auto-populados
      setFormData({
        ...formData,
        cnaes_permitidos: cnaesAutoPopulados
      });
      
      console.log(`✅ ${cnaesAutoPopulados.length} CNAEs auto-populados da Receita Federal`);
      
      setStep(2);
    } catch (err) {
      const mensagemErro = extrairMensagemErro(err);
      setError(mensagemErro);
      console.error('❌ Erro ao consultar CNPJ:', err);
    } finally {
      setLoading(false);
    }
  };

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
    const novosCAEs = formData.cnaes_permitidos.filter((_, i) => i !== index);
    setFormData({ ...formData, cnaes_permitidos: novosCAEs });
  };

  const atualizarCNAE = (index, campo, valor) => {
    const novosCAEs = [...formData.cnaes_permitidos];
    novosCAEs[index][campo] = valor;
    setFormData({ ...formData, cnaes_permitidos: novosCAEs });
  };

  const cadastrarEmpresa = async () => {
    setError('');
    setLoading(true);
    try {
      // Prepara os dados no formato esperado pelo backend (cnae_codigo sempre string)
      const dadosParaEnviar = {
        cnpj: dadosReceita.cnpj,
        razao_social: dadosReceita.razao_social,
        nome_fantasia: dadosReceita.nome_fantasia,
        regime_tributario: formData.regime_tributario,
        aliquota_imposto: formData.aliquota_imposto || 6.0,
        data_abertura: null,
        // Garante que todos os CNAEs tenham cnae_codigo em string e codigo_servico_municipal não seja null
        cnaes_permitidos: (formData.cnaes_permitidos || []).map(c => ({
          ...c,
          cnae_codigo: String(c.cnae_codigo || ''),
          codigo_servico_municipal: c.codigo_servico_municipal || ''
        }))
      };

      console.log('📤 Enviando dados para API (Cadastro):', dadosParaEnviar);
      await axios.post(`${API_URL}/api/empresas`, dadosParaEnviar);
      onEmpresaCadastrada();
    } catch (err) {
      const mensagemErro = extrairMensagemErro(err);
      setError(mensagemErro);
      console.error('❌ Erro ao cadastrar empresa:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg p-6 mb-6">
      {step === 1 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Consultar CNPJ</h3>
          <div className="flex gap-3">
            <input
              data-testid="input-cnpj"
              type="text"
              value={cnpj}
              onChange={handleCnpjChange}
              placeholder="00.000.000/0000-00"
              maxLength="18"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button
              data-testid="btn-consultar-cnpj"
              onClick={consultarCNPJ}
              disabled={loading || !cnpj}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Consultando...' : 'Consultar'}
            </button>
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
      )}

      {step === 2 && dadosReceita && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Dados da Empresa</h3>
          <div className="bg-white p-4 rounded-lg mb-4">
            <p className="mb-2"><strong>Razão Social:</strong> {dadosReceita.razao_social}</p>
            <p className="mb-2"><strong>Nome Fantasia:</strong> {dadosReceita.nome_fantasia || 'N/A'}</p>
            <p className="mb-2"><strong>CNPJ:</strong> {dadosReceita.cnpj}</p>
            <p className="mb-2"><strong>Situação:</strong> {dadosReceita.situacao_cadastral || 'N/A'}</p>
            <p className="mb-2"><strong>Data Abertura:</strong> {dadosReceita.data_abertura || 'N/A'}</p>
            <p className="mb-2"><strong>Capital Social:</strong> {dadosReceita.capital_social ? `R$ ${dadosReceita.capital_social}` : 'N/A'}</p>
          </div>

          {/* QSA - Quadro de Sócios */}
          {dadosReceita.qsa && dadosReceita.qsa.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-3">
                👥 Sócios e Administradores (Dados da Receita Federal)
              </h4>
              <div className="space-y-2">
                {dadosReceita.qsa.map((socio, index) => (
                  <div key={index} className="bg-white p-3 rounded border border-blue-100">
                    <p className="text-sm font-medium text-gray-800">{socio.nome}</p>
                    <p className="text-xs text-gray-600">{socio.qualificacao}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Regime Tributário</label>
            <select
              data-testid="select-regime"
              value={formData.regime_tributario}
              onChange={(e) => setFormData({ ...formData, regime_tributario: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="MEI">MEI</option>
              <option value="Simples Nacional">Simples Nacional</option>
              <option value="Lucro Presumido">Lucro Presumido</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Alíquota Simples Nacional (%)
              <span className="text-xs text-gray-500 ml-2">
                💡 Informe a alíquota efetiva (Anexo III, IV, V, etc) para estimativa de imposto
              </span>
            </label>
            <input
              data-testid="input-aliquota"
              type="number"
              step="0.1"
              min="0.01"
              max="20.0"
              value={formData.aliquota_imposto || 6.0}
              onChange={(e) => setFormData({ ...formData, aliquota_imposto: parseFloat(e.target.value) || 6.0 })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="6.0"
            />
            <p className="text-xs text-gray-500 mt-1">
              Ex: 6.0 para Anexo III, 15.5 para Anexo V
            </p>
          </div>

          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium">CNAEs Permitidos (Códigos de Serviço)</label>
              <button
                data-testid="btn-adicionar-cnae"
                onClick={adicionarCNAE}
                className="text-sm px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
              >
                + Adicionar
              </button>
            </div>

            {formData.cnaes_permitidos.length > 0 && (
              <div className="bg-green-50 border border-green-200 p-3 rounded-lg mb-3">
                <p className="text-xs text-green-800">
                  ✅ <strong>{formData.cnaes_permitidos.length} CNAE(s) preenchido(s) automaticamente</strong> da Receita Federal.
                  Preencha o "Código Serviço Municipal" para cada um (varia por prefeitura).
                </p>
              </div>
            )}

            {formData.cnaes_permitidos.length === 0 && (
              <p className="text-sm text-gray-500 mb-2 italic">
                Nenhum CNAE cadastrado na Receita. Clique em "+ Adicionar" para inserir manualmente.
              </p>
            )}

            {formData.cnaes_permitidos.map((cnae, index) => (
              <div key={index} className="bg-white p-3 rounded-lg mb-2 border">
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <input
                    data-testid={`input-cnae-codigo-${index}`}
                    type="text"
                    placeholder="CNAE (ex: 6201-5/00)"
                    value={cnae.cnae_codigo}
                    onChange={(e) => atualizarCNAE(index, 'cnae_codigo', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                  <input
                    data-testid={`input-codigo-servico-${index}`}
                    type="text"
                    placeholder="Cód. Serviço (ex: 08.02)"
                    value={cnae.codigo_servico_municipal}
                    onChange={(e) => atualizarCNAE(index, 'codigo_servico_municipal', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                  <button
                    data-testid={`btn-remover-cnae-${index}`}
                    onClick={() => removerCNAE(index)}
                    className="px-3 py-2 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                  >
                    Remover
                  </button>
                </div>
                <input
                  data-testid={`input-descricao-${index}`}
                  type="text"
                  placeholder="Descrição (opcional)"
                  value={cnae.descricao}
                  onChange={(e) => atualizarCNAE(index, 'descricao', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                />
              </div>
            ))}

            {formData.cnaes_permitidos.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">Nenhum CNAE adicionado. Clique em "+ Adicionar"</p>
            )}
          </div>

          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

          <div className="flex gap-3">
            <button
              data-testid="btn-voltar"
              onClick={() => setStep(1)}
              className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
            >
              Voltar
            </button>
            <button
              data-testid="btn-cadastrar"
              onClick={cadastrarEmpresa}
              disabled={loading || formData.cnaes_permitidos.length === 0}
              className="flex-1 px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
            >
              {loading ? 'Cadastrando...' : 'Cadastrar Empresa'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CadastroEmpresa;