from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from enum import Enum

# Opções fixas para evitar erro de digitação
class RegimeTributarioEnum(str, Enum):
    MEI = 'MEI'
    SIMPLES_NACIONAL = 'Simples Nacional'
    LUCRO_PRESUMIDO = 'Lucro Presumido'

# Modelo para mapear o CNAE (Receita) x Código Serviço (Prefeitura)
class CnaeMapeamento(BaseModel):
    cnae_codigo: str
    codigo_servico_municipal: str  # Ex: 08.02
    descricao: Optional[str] = None

# O que o Front envia para SALVAR no banco
class EmpresaSalvar(BaseModel):
    escritorio_id: int = 1  # Padrão 1 para a POC
    cnpj: str
    razao_social: str
    nome_fantasia: Optional[str] = None
    logradouro: Optional[str] = None
    bairro: Optional[str] = None
    municipio: Optional[str] = None
    uf: Optional[str] = None
    
    # Dados fiscais que a contadora seleciona na tela
    regime_tributario: RegimeTributarioEnum
    data_abertura: Optional[date] = None
    
    # Lista de CNAEs já com o código de serviço vinculado
    cnaes_mapeados: List[CnaeMapeamento] = []

# Schema para ATUALIZAÇÃO (campos opcionais)
class EmpresaUpdate(BaseModel):
    razao_social: Optional[str] = None
    nome_fantasia: Optional[str] = None
    regime_tributario: Optional[RegimeTributarioEnum] = None
    data_abertura: Optional[date] = None
    logradouro: Optional[str] = None
    bairro: Optional[str] = None
    municipio: Optional[str] = None
    uf: Optional[str] = None

# Schema completo para retornar empresa com todos os dados
class EmpresaCompleta(BaseModel):
    id: int
    cnpj: str
    razao_social: str
    nome_fantasia: Optional[str] = None
    regime_tributario: str
    data_abertura: Optional[date] = None
    limite_faturamento_anual: Optional[float] = None
    
    # Novos campos de monitoramento
    status_rbt12: Optional[str] = 'OK'
    percentual_uso_limite: Optional[float] = 0.0
    coleta_automatica_ativa: Optional[bool] = True
    ultima_coleta: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# O que a API devolve na consulta (já estava pronto)
class EmpresaResponse(BaseModel):
    cnpj: str
    razao_social: str
    nome_fantasia: Optional[str] = None
    logradouro: Optional[str] = None
    bairro: Optional[str] = None
    municipio: Optional[str] = None
    uf: Optional[str] = None
    cnae_principal: Optional[str] = None
    cnaes_secundarios: List[str] = []
