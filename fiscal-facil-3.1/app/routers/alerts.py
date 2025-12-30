"""
Router de Alertas Fiscais

Gerencia alertas de faturamento e configurações de notificação.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from app.core.database import get_db
from app.models.all_models import AlertaFiscal, Escritorio, EmpresaCliente

router = APIRouter(
    prefix="/alertas",
    tags=["Alertas"]
)


# ==================== SCHEMAS ====================
class AlertaResponse(BaseModel):
    id: int
    empresa_id: int
    empresa_nome: Optional[str] = None
    tipo_alerta: str
    titulo: str
    mensagem: str
    lido: bool
    data_criacao: datetime
    
    class Config:
        from_attributes = True


class ConfiguracaoAlertas(BaseModel):
    alertas_email_ativo: bool = True
    webhook_url: Optional[str] = None
    alerta_percentual_warning: float = 80.0
    alerta_percentual_critical: float = 100.0


# ==================== ENDPOINTS ====================

@router.get("/", response_model=List[AlertaResponse])
def listar_alertas(
    escritorio_id: int = 1,
    apenas_nao_lidos: bool = False,
    limite: int = 50,
    db: Session = Depends(get_db)
):
    """
    🔔 LISTA ALERTAS DO ESCRITÓRIO
    
    Retorna todos os alertas fiscais do escritório.
    
    🔒 ISOLAMENTO B2B: Filtra estritamente por escritorio_id.
    """
    query = db.query(AlertaFiscal).filter(
        AlertaFiscal.escritorio_id == escritorio_id
    )
    
    if apenas_nao_lidos:
        query = query.filter(AlertaFiscal.lido == False)
    
    alertas = query.order_by(AlertaFiscal.data_criacao.desc()).limit(limite).all()
    
    # Enriquece com nome da empresa
    resultado = []
    for alerta in alertas:
        empresa = db.query(EmpresaCliente).filter(
            EmpresaCliente.id == alerta.empresa_id
        ).first()
        
        resultado.append(AlertaResponse(
            id=alerta.id,
            empresa_id=alerta.empresa_id,
            empresa_nome=empresa.razao_social if empresa else "N/A",
            tipo_alerta=alerta.tipo_alerta,
            titulo=alerta.titulo,
            mensagem=alerta.mensagem,
            lido=alerta.lido,
            data_criacao=alerta.data_criacao
        ))
    
    return resultado


@router.get("/contagem")
def contar_alertas_nao_lidos(
    escritorio_id: int = 1,
    db: Session = Depends(get_db)
):
    """
    📊 CONTA ALERTAS NÃO LIDOS
    
    Retorna contagem de alertas pendentes para badge de notificação.
    """
    total = db.query(AlertaFiscal).filter(
        AlertaFiscal.escritorio_id == escritorio_id,
        AlertaFiscal.lido == False
    ).count()
    
    criticos = db.query(AlertaFiscal).filter(
        AlertaFiscal.escritorio_id == escritorio_id,
        AlertaFiscal.lido == False,
        AlertaFiscal.tipo_alerta == 'RBT12_CRITICAL'
    ).count()
    
    return {
        "total_nao_lidos": total,
        "criticos": criticos
    }


@router.patch("/{alerta_id}/lido")
def marcar_alerta_lido(
    alerta_id: int,
    escritorio_id: int = 1,
    db: Session = Depends(get_db)
):
    """
    ✅ MARCA ALERTA COMO LIDO
    """
    alerta = db.query(AlertaFiscal).filter(
        AlertaFiscal.id == alerta_id,
        AlertaFiscal.escritorio_id == escritorio_id
    ).first()
    
    if not alerta:
        raise HTTPException(status_code=404, detail="Alerta não encontrado.")
    
    alerta.lido = True
    alerta.data_leitura = datetime.now()
    db.commit()
    
    return {"mensagem": "Alerta marcado como lido"}


@router.patch("/marcar-todos-lidos")
def marcar_todos_alertas_lidos(
    escritorio_id: int = 1,
    db: Session = Depends(get_db)
):
    """
    ✅ MARCA TODOS OS ALERTAS COMO LIDOS
    """
    db.query(AlertaFiscal).filter(
        AlertaFiscal.escritorio_id == escritorio_id,
        AlertaFiscal.lido == False
    ).update({"lido": True, "data_leitura": datetime.now()})
    
    db.commit()
    
    return {"mensagem": "Todos os alertas marcados como lidos"}


@router.get("/configuracoes")
def obter_configuracoes_alertas(
    escritorio_id: int = 1,
    db: Session = Depends(get_db)
):
    """
    ⚙️ OBTER CONFIGURAÇÕES DE ALERTAS
    """
    escritorio = db.query(Escritorio).filter(Escritorio.id == escritorio_id).first()
    
    if not escritorio:
        raise HTTPException(status_code=404, detail="Escritório não encontrado.")
    
    return {
        "alertas_email_ativo": escritorio.alertas_email_ativo,
        "webhook_url": escritorio.webhook_url,
        "alerta_percentual_warning": escritorio.alerta_percentual_warning,
        "alerta_percentual_critical": escritorio.alerta_percentual_critical,
        "email_destino": escritorio.email
    }


@router.put("/configuracoes")
def atualizar_configuracoes_alertas(
    config: ConfiguracaoAlertas,
    escritorio_id: int = 1,
    db: Session = Depends(get_db)
):
    """
    ⚙️ ATUALIZAR CONFIGURAÇÕES DE ALERTAS
    
    Permite configurar:
    - Ativação de alertas por email
    - URL do webhook para integrações
    - Percentuais de alerta (warning e critical)
    """
    escritorio = db.query(Escritorio).filter(Escritorio.id == escritorio_id).first()
    
    if not escritorio:
        raise HTTPException(status_code=404, detail="Escritório não encontrado.")
    
    # Valida percentuais
    if config.alerta_percentual_warning >= config.alerta_percentual_critical:
        raise HTTPException(
            status_code=400, 
            detail="O percentual de warning deve ser menor que o de critical."
        )
    
    escritorio.alertas_email_ativo = config.alertas_email_ativo
    escritorio.webhook_url = config.webhook_url
    escritorio.alerta_percentual_warning = config.alerta_percentual_warning
    escritorio.alerta_percentual_critical = config.alerta_percentual_critical
    
    db.commit()
    
    return {"mensagem": "Configurações de alertas atualizadas com sucesso"}
