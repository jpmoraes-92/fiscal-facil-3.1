import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import CadastroEmpresa from './CadastroEmpresa';
import UploadXML from './UploadXML';
import ListaNotas from './ListaNotas';
import MonitorRBT12 from './MonitorRBT12';
import BotaoRelatorio from './BotaoRelatorio';
import ImpostoEstimado from './ImpostoEstimado';
import ModalEditarEmpresa from './ModalEditarEmpresa';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [empresas, setEmpresas] = useState([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState(null);
  const [mostrarCadastro, setMostrarCadastro] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshNotas, setRefreshNotas] = useState(0);
  const [empresaEditando, setEmpresaEditando] = useState(null);

  useEffect(() => {
    carregarEmpresas();
  }, []);

  const carregarEmpresas = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/empresas`);
      setEmpresas(response.data);
      
      // Tenta restaurar empresa selecionada do localStorage
      const empresaIdSalva = localStorage.getItem('empresaSelecionadaId');
      
      if (empresaIdSalva && response.data.length > 0) {
        // Busca a empresa pelo ID salvo
        const empresaRestaurada = response.data.find(e => e.id === empresaIdSalva);
        if (empresaRestaurada) {
          setEmpresaSelecionada(empresaRestaurada);
        } else {
          // Se não encontrou, seleciona a primeira
          setEmpresaSelecionada(response.data[0]);
        }
      } else if (response.data.length > 0 && !empresaSelecionada) {
        // Primeira vez ou sem empresa salva
        setEmpresaSelecionada(response.data[0]);
      }
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
    } finally {
      setLoading(false);
    }
  };

  // Salva no localStorage quando empresa é selecionada
  const handleSelecionarEmpresa = (empresa) => {
    setEmpresaSelecionada(empresa);
    localStorage.setItem('empresaSelecionadaId', empresa.id);
  };

  const handleEmpresaCadastrada = () => {
    setMostrarCadastro(false);
    carregarEmpresas();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">📊 Fiscal Fácil</h1>
              <p className="text-sm text-gray-600 mt-1">Bem-vindo, {user?.nome}</p>
            </div>
            <button
              data-testid="logout-btn"
              onClick={logout}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Seleção de Empresa */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Minhas Empresas</h2>
            <button
              data-testid="btn-nova-empresa"
              onClick={() => setMostrarCadastro(!mostrarCadastro)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              {mostrarCadastro ? 'Cancelar' : '+ Nova Empresa'}
            </button>
          </div>

          {mostrarCadastro && (
            <CadastroEmpresa onEmpresaCadastrada={handleEmpresaCadastrada} />
          )}

          {!mostrarCadastro && empresas.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg mb-2">🏢 Nenhuma empresa cadastrada</p>
              <p className="text-sm">Clique em "Nova Empresa" para começar</p>
            </div>
          )}

          {!mostrarCadastro && empresas.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {empresas.map((empresa) => (
                <div
                  key={empresa.id}
                  data-testid={`empresa-card-${empresa.id}`}
                  className={`p-4 border-2 rounded-lg transition-all relative group ${
                    empresaSelecionada?.id === empresa.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  {/* Botão de Editar (aparece no hover) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEmpresaEditando(empresa);
                    }}
                    className="absolute top-2 right-2 p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors opacity-0 group-hover:opacity-100"
                    title="Editar empresa"
                  >
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>

                  {/* Conteúdo do card (clicável para selecionar) */}
                  <div onClick={() => handleSelecionarEmpresa(empresa)} className="cursor-pointer">
                    <h3 className="font-semibold text-gray-900 mb-1 pr-8">{empresa.razao_social}</h3>
                    <p className="text-sm text-gray-600 mb-2">CNPJ: {empresa.cnpj}</p>
                    <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                      {empresa.regime_tributario}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* KPIs e Monitores */}
        {empresaSelecionada && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <MonitorRBT12 empresaId={empresaSelecionada.id} />
            <ImpostoEstimado empresaId={empresaSelecionada.id} />
          </div>
        )}

        {/* Botão de Relatório */}
        {empresaSelecionada && (
          <div className="mb-6">
            <BotaoRelatorio empresaId={empresaSelecionada.id} />
          </div>
        )}

        {/* Área de Upload e Notas */}
        {empresaSelecionada && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <UploadXML 
              empresaId={empresaSelecionada.id} 
              onUploadSuccess={() => setRefreshNotas(prev => prev + 1)}
            />
            <ListaNotas 
              empresaId={empresaSelecionada.id} 
              refreshTrigger={refreshNotas}
            />
          </div>
        )}
      </div>

      {/* Modal de Edição de Empresa */}
      {empresaEditando && (
        <ModalEditarEmpresa
          empresa={empresaEditando}
          onClose={() => setEmpresaEditando(null)}
          onSuccess={() => {
            carregarEmpresas();
            
            // Se a empresa editada era a selecionada, atualiza ela também
            if (empresaSelecionada && empresaSelecionada.id === empresaEditando.id) {
              // Força recarga dos dados da empresa selecionada
              const empresaAtualizada = empresas.find(e => e.id === empresaEditando.id);
              if (empresaAtualizada) {
                setEmpresaSelecionada(empresaAtualizada);
              }
            }
            
            setEmpresaEditando(null);
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;