from sqlalchemy import Column, Integer, String, ForeignKey, DECIMAL, DateTime, Date, Enum, Text, Boolean, Float
from sqlalchemy.orm import relationship
from app.core.database import Base
import datetime

# Tabela Escritórios (B2B - Multi-tenant)
class Escritorio(Base):
    __tablename__ = "escritorios"

    id = Column(Integer, primary_key=True, index=True)
    nome_responsavel = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    senha_hash = Column(String(255), nullable=False)
    telefone = Column(String(20))
    
    # Configurações de Alertas
    webhook_url = Column(String(500), nullable=True)  # URL para webhook de alertas
    alertas_email_ativo = Column(Boolean, default=True)  # Receber alertas por email
    alerta_percentual_warning = Column(Float, default=80.0)  # Percentual para alerta amarelo
    alerta_percentual_critical = Column(Float, default=100.0)  # Percentual para alerta vermelho
    
    data_criacao = Column(DateTime, default=datetime.datetime.now)
    ultimo_login = Column(DateTime, nullable=True)

    empresas = relationship("EmpresaCliente", back_populates="escritorio")
    alertas = relationship("AlertaFiscal", back_populates="escritorio")

# Tabela Empresas Clientes
class EmpresaCliente(Base):
    __tablename__ = "empresas_clientes"

    id = Column(Integer, primary_key=True, index=True)
    escritorio_id = Column(Integer, ForeignKey("escritorios.id"), nullable=False)
    cnpj = Column(String(18), unique=True, nullable=False)
    razao_social = Column(String(150), nullable=False)
    nome_fantasia = Column(String(150))
    regime_tributario = Column(Enum('MEI', 'Simples Nacional', 'Lucro Presumido'), nullable=False)
    data_abertura = Column(Date)
    limite_faturamento_anual = Column(DECIMAL(15, 2))
    
    # Status de Monitoramento
    status_rbt12 = Column(Enum('OK', 'ALERTA', 'ESTOUROU'), default='OK')
    percentual_uso_limite = Column(Float, default=0.0)
    ultimo_calculo_rbt12 = Column(DateTime, nullable=True)
    
    # Configurações de Coleta Automática
    coleta_automatica_ativa = Column(Boolean, default=True)
    ultima_coleta = Column(DateTime, nullable=True)
    endpoint_prefeitura = Column(String(500), nullable=True)  # URL da API da prefeitura
    token_prefeitura = Column(String(500), nullable=True)  # Token de acesso
    
    data_cadastro = Column(DateTime, default=datetime.datetime.now)

    escritorio = relationship("Escritorio", back_populates="empresas")
    cnaes = relationship("CnaePermitido", back_populates="empresa")
    notas = relationship("NotaFiscal", back_populates="empresa")

# Tabela CNAEs Permitidos
class CnaePermitido(Base):
    __tablename__ = "cnaes_permitidos"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas_clientes.id"))
    cnae_codigo = Column(String(10), nullable=False)
    codigo_servico_municipal = Column(String(10), nullable=False)
    descricao = Column(String(255))

    empresa = relationship("EmpresaCliente", back_populates="cnaes")

# Tabela Notas Fiscais
class NotaFiscal(Base):
    __tablename__ = "notas_fiscais"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas_clientes.id"))
    numero_nota = Column(Integer, nullable=False)
    data_emissao = Column(DateTime, nullable=False)
    chave_validacao = Column(String(50))
    cnpj_tomador = Column(String(18))
    codigo_servico_utilizado = Column(String(10), nullable=False)
    valor_total = Column(DECIMAL(15, 2), nullable=False)
    xml_bruto = Column(Text)
    status_auditoria = Column(Enum('APROVADA', 'ERRO_CNAE', 'ERRO_IMPOSTO', 'ALERTA'), default='APROVADA')
    mensagem_erro = Column(Text)
    data_importacao = Column(DateTime, default=datetime.datetime.now)
    
    # Origem da Nota
    origem = Column(Enum('UPLOAD_MANUAL', 'COLETA_AUTOMATICA'), default='UPLOAD_MANUAL')

    empresa = relationship("EmpresaCliente", back_populates="notas")

# NOVA: Tabela de Alertas Fiscais
class AlertaFiscal(Base):
    __tablename__ = "alertas_fiscais"

    id = Column(Integer, primary_key=True, index=True)
    escritorio_id = Column(Integer, ForeignKey("escritorios.id"), nullable=False)
    empresa_id = Column(Integer, ForeignKey("empresas_clientes.id"), nullable=False)
    
    tipo_alerta = Column(Enum('RBT12_WARNING', 'RBT12_CRITICAL', 'CNAE_ERRO', 'COLETA_FALHA'), nullable=False)
    titulo = Column(String(200), nullable=False)
    mensagem = Column(Text, nullable=False)
    
    # Status do Alerta
    lido = Column(Boolean, default=False)
    notificado_email = Column(Boolean, default=False)
    notificado_webhook = Column(Boolean, default=False)
    
    data_criacao = Column(DateTime, default=datetime.datetime.now)
    data_leitura = Column(DateTime, nullable=True)

    escritorio = relationship("Escritorio", back_populates="alertas")
    empresa = relationship("EmpresaCliente")

# NOVA: Tabela de Log de Coletas Automáticas
class LogColeta(Base):
    __tablename__ = "logs_coleta"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas_clientes.id"), nullable=False)
    
    status = Column(Enum('SUCESSO', 'FALHA', 'SEM_NOVAS_NOTAS'), nullable=False)
    notas_coletadas = Column(Integer, default=0)
    mensagem = Column(Text)
    
    data_execucao = Column(DateTime, default=datetime.datetime.now)
