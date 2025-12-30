"""
Router de Dashboard Global para Escritórios de Contabilidade

Fornece visão consolidada de todas as empresas clientes,
priorizando aquelas com problemas fiscais.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import List, Optional
from pydantic import BaseModel
from app.core.database import get_db
from app.models.all_models import EmpresaCliente, NotaFiscal, Escritorio
from app.services.alert_service import AlertService
from app.services.scheduler_service import get_scheduler_status, trigger_job_manual

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard Global"]
)


# ==================== SCHEMAS ====================
class EmpresaResumo(BaseModel):
    id: int
    cnpj: str
    razao_social: str
    regime_tributario: str
    status_rbt12: str
    percentual_uso: float
    faturamento_12m: float
    limite: float
    total_notas: int
    notas_com_erro: int
    coleta_automatica: bool
    ultima_coleta: Optional[datetime]
    
    class Config:
        from_attributes = True


class DashboardGlobal(BaseModel):
    escritorio_nome: str
    total_empresas: int
    empresas_ok: int
    empresas_alerta: int
    empresas_estouradas: int
    faturamento_total: float
    empresas: List[EmpresaResumo]
    scheduler_status: dict


# ==================== ENDPOINTS ====================

@router.get("/global", response_model=DashboardGlobal)
def obter_dashboard_global(
    escritorio_id: int = 1,
    ordenar_por_risco: bool = True,
    db: Session = Depends(get_db)
):
    """
    📊 DASHBOARD GLOBAL DO ESCRITÓRIO
    
    Retorna visão consolidada de todas as empresas clientes.
    Por padrão, ordena por risco (ESTOUROU > ALERTA > OK).
    
    🔒 ISOLAMENTO B2B: Filtra estritamente por escritorio_id.
    """
    # Busca escritório
    escritorio = db.query(Escritorio).filter(Escritorio.id == escritorio_id).first()
    if not escritorio:
        raise HTTPException(status_code=404, detail="Escritório não encontrado.")
    
    # Busca todas as empresas do escritório
    empresas = db.query(EmpresaCliente).filter(
        EmpresaCliente.escritorio_id == escritorio_id
    ).all()
    
    alert_service = AlertService()
    empresas_resumo = []
    
    faturamento_total = 0.0
    empresas_ok = 0
    empresas_alerta = 0
    empresas_estouradas = 0
    
    for empresa in empresas:
        # Calcula RBT12 atualizado
        rbt12 = alert_service.calcular_rbt12(empresa, db)
        
        # Contagem de notas
        total_notas = db.query(NotaFiscal).filter(
            NotaFiscal.empresa_id == empresa.id
        ).count()
        
        notas_com_erro = db.query(NotaFiscal).filter(
            NotaFiscal.empresa_id == empresa.id,
            NotaFiscal.status_auditoria != 'APROVADA'
        ).count()
        
        # Atualiza contadores
        faturamento_total += rbt12['faturamento_12m']
        
        if rbt12['status'] == 'OK':
            empresas_ok += 1
        elif rbt12['status'] == 'ALERTA':
            empresas_alerta += 1
        else:
            empresas_estouradas += 1
        
        empresas_resumo.append(EmpresaResumo(
            id=empresa.id,
            cnpj=empresa.cnpj,
            razao_social=empresa.razao_social,
            regime_tributario=empresa.regime_tributario,
            status_rbt12=rbt12['status'],
            percentual_uso=rbt12['percentual_uso'],
            faturamento_12m=rbt12['faturamento_12m'],
            limite=rbt12['limite'],
            total_notas=total_notas,
            notas_com_erro=notas_com_erro,
            coleta_automatica=empresa.coleta_automatica_ativa,
            ultima_coleta=empresa.ultima_coleta
        ))
    
    # Ordena por risco se solicitado
    if ordenar_por_risco:
        ordem_risco = {'ESTOUROU': 0, 'ALERTA': 1, 'OK': 2}
        empresas_resumo.sort(key=lambda x: (ordem_risco.get(x.status_rbt12, 3), -x.percentual_uso))
    
    return DashboardGlobal(
        escritorio_nome=escritorio.nome_responsavel,
        total_empresas=len(empresas),
        empresas_ok=empresas_ok,
        empresas_alerta=empresas_alerta,
        empresas_estouradas=empresas_estouradas,
        faturamento_total=faturamento_total,
        empresas=empresas_resumo,
        scheduler_status=get_scheduler_status()
    )


@router.get("/metricas/{empresa_id}")
def obter_metricas_empresa(
    empresa_id: int,
    escritorio_id: int = 1,
    db: Session = Depends(get_db)
):
    """
    📊 MÉTRICAS RBT12 DE UMA EMPRESA
    
    Retorna detalhes do faturamento e status de uma empresa específica.
    """
    empresa = db.query(EmpresaCliente).filter(
        EmpresaCliente.id == empresa_id,
        EmpresaCliente.escritorio_id == escritorio_id
    ).first()
    
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada.")
    
    alert_service = AlertService()
    rbt12 = alert_service.calcular_rbt12(empresa, db)
    
    return {
        "empresa": empresa.razao_social,
        "cnpj": empresa.cnpj,
        "regime_tributario": empresa.regime_tributario,
        "faturamento_atual": rbt12['faturamento_12m'],
        "limite": rbt12['limite'],
        "percentual_uso": rbt12['percentual_uso'],
        "status": rbt12['status'],
        "margem_disponivel": rbt12['margem_disponivel'],
        "razao_social": empresa.razao_social
    }


@router.post("/sync/manual")
def executar_sincronizacao_manual(
    tipo: str = "all",
    db: Session = Depends(get_db)
):
    """
    🔄 SINCRONIZAÇÃO MANUAL
    
    Dispara manualmente os jobs de coleta e/ou verificação.
    
    Tipos:
    - "coleta": Apenas coleta de notas
    - "alertas": Apenas verificação de alertas
    - "all": Ambos
    """
    resultados = []
    
    if tipo in ["coleta", "all"]:
        resultado = trigger_job_manual("coleta_notas")
        resultados.append({"coleta": resultado})
    
    if tipo in ["alertas", "all"]:
        resultado = trigger_job_manual("verificar_alertas")
        resultados.append({"alertas": resultado})
    
    return {
        "mensagem": "Sincronização manual executada",
        "resultados": resultados
    }


@router.get("/scheduler/status")
def obter_status_scheduler():
    """
    📊 STATUS DO SCHEDULER
    
    Retorna informações sobre os jobs agendados.
    """
    return get_scheduler_status()
