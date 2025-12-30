"""
Serviço de Agendamento de Tarefas

Executa tarefas automáticas em intervalos definidos:
- Coleta de notas fiscais: A cada 1 hora
- Verificação de alertas RBT12: A cada 30 minutos

Utiliza APScheduler para gerenciamento de jobs.
"""
import logging
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from app.services.nfe_collector_service import executar_coleta_todas_empresas
from app.services.alert_service import executar_verificacao_alertas

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Instância global do scheduler
scheduler = BackgroundScheduler()


def start_scheduler():
    """
    Inicia o scheduler com todas as tarefas agendadas.
    """
    if scheduler.running:
        logger.warning("Scheduler já está rodando")
        return
    
    logger.info("="*60)
    logger.info("🚀 INICIANDO SERVIÇO DE VIGILÂNCIA FISCAL 24H")
    logger.info("="*60)
    
    # Job 1: Coleta automática de notas - A cada 1 hora
    scheduler.add_job(
        executar_coleta_todas_empresas,
        trigger=IntervalTrigger(hours=1),
        id='coleta_notas',
        name='Coleta Automática de NF-e',
        replace_existing=True,
        max_instances=1
    )
    logger.info("   ✅ Job 'Coleta de Notas' agendado: A cada 1 hora")
    
    # Job 2: Verificação de alertas RBT12 - A cada 30 minutos
    scheduler.add_job(
        executar_verificacao_alertas,
        trigger=IntervalTrigger(minutes=30),
        id='verificar_alertas',
        name='Verificação de Alertas RBT12',
        replace_existing=True,
        max_instances=1
    )
    logger.info("   ✅ Job 'Verificação de Alertas' agendado: A cada 30 minutos")
    
    # Job 3: Execução imediata inicial (1 minuto após startup)
    scheduler.add_job(
        executar_coleta_todas_empresas,
        trigger='date',
        run_date=datetime.now(),
        id='coleta_inicial',
        name='Coleta Inicial',
        replace_existing=True
    )
    
    scheduler.add_job(
        executar_verificacao_alertas,
        trigger='date',
        run_date=datetime.now(),
        id='alertas_inicial',
        name='Verificação Inicial',
        replace_existing=True
    )
    logger.info("   ✅ Jobs iniciais agendados para execução imediata")
    
    # Inicia o scheduler
    scheduler.start()
    
    logger.info("="*60)
    logger.info("✅ SERVIÇO DE VIGILÂNCIA ATIVO")
    logger.info("   O sistema está monitorando automaticamente:")
    logger.info("   - Novas notas fiscais (coleta a cada hora)")
    logger.info("   - Status de faturamento RBT12 (verificação a cada 30 min)")
    logger.info("   - Alertas serão disparados automaticamente")
    logger.info("="*60)


def shutdown_scheduler():
    """
    Para o scheduler de forma graceful.
    """
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("🛑 Scheduler de vigilância encerrado")


def get_scheduler_status() -> dict:
    """
    Retorna o status atual do scheduler e seus jobs.
    """
    if not scheduler.running:
        return {"status": "stopped", "jobs": []}
    
    jobs = []
    for job in scheduler.get_jobs():
        jobs.append({
            "id": job.id,
            "name": job.name,
            "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
            "trigger": str(job.trigger)
        })
    
    return {
        "status": "running",
        "jobs": jobs
    }


def trigger_job_manual(job_id: str) -> dict:
    """
    Dispara um job manualmente.
    """
    if job_id == 'coleta_notas':
        executar_coleta_todas_empresas()
        return {"mensagem": "Coleta de notas executada manualmente"}
    elif job_id == 'verificar_alertas':
        executar_verificacao_alertas()
        return {"mensagem": "Verificação de alertas executada manualmente"}
    else:
        return {"erro": f"Job '{job_id}' não encontrado"}
