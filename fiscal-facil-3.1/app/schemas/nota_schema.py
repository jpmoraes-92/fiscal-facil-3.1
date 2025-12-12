from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

class NotaFiscalResponse(BaseModel):
    id: int
    numero_nota: int
    data_emissao: datetime
    valor_total: Decimal
    codigo_servico_utilizado: str
    status_auditoria: str
    mensagem_erro: Optional[str] = None
    cnpj_tomador: Optional[str] = None

    class Config:
        from_attributes = True