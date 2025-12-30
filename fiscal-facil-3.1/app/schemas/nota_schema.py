from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from enum import Enum

class OrigemNotaEnum(str, Enum):
    UPLOAD_MANUAL = 'UPLOAD_MANUAL'
    COLETA_AUTOMATICA = 'COLETA_AUTOMATICA'

class NotaFiscalResponse(BaseModel):
    id: int
    numero_nota: int
    data_emissao: datetime
    valor_total: Decimal
    codigo_servico_utilizado: str
    status_auditoria: str
    mensagem_erro: Optional[str] = None
    cnpj_tomador: Optional[str] = None
    origem: Optional[str] = 'UPLOAD_MANUAL'

    class Config:
        from_attributes = True

class NotaFiscalDetalhes(BaseModel):
    id: int
    numero_nota: int
    data_emissao: datetime
    valor_total: Decimal
    codigo_servico_utilizado: str
    status_auditoria: str
    mensagem_erro: Optional[str] = None
    cnpj_tomador: Optional[str] = None
    chave_validacao: Optional[str] = None
    xml_bruto: Optional[str] = None
    origem: Optional[str] = 'UPLOAD_MANUAL'
    data_importacao: Optional[datetime] = None

    class Config:
        from_attributes = True
