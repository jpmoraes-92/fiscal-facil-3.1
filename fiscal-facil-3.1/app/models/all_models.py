from sqlalchemy import Column, Integer, String, ForeignKey, DECIMAL, DateTime, Date, Enum, Text
from sqlalchemy.orm import relationship
from app.core.database import Base
import datetime

# Tabela Escritórios
class Escritorio(Base):
    __tablename__ = "escritorios"

    id = Column(Integer, primary_key=True, index=True)
    nome_responsavel = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    senha_hash = Column(String(255), nullable=False)
    telefone = Column(String(20))
    data_criacao = Column(DateTime, default=datetime.datetime.now)

    empresas = relationship("EmpresaCliente", back_populates="escritorio")

# Tabela Empresas Clientes
class EmpresaCliente(Base):
    __tablename__ = "empresas_clientes"

    id = Column(Integer, primary_key=True, index=True)
    escritorio_id = Column(Integer, ForeignKey("escritorios.id"))
    cnpj = Column(String(18), unique=True, nullable=False)
    razao_social = Column(String(150), nullable=False)
    nome_fantasia = Column(String(150))
    regime_tributario = Column(Enum('MEI', 'Simples Nacional', 'Lucro Presumido'), nullable=False)
    data_abertura = Column(Date)
    limite_faturamento_anual = Column(DECIMAL(15, 2))

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

    empresa = relationship("EmpresaCliente", back_populates="notas")