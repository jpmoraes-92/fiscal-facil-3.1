from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import engine, get_db
from app.models import all_models
from app.routers import empresas, notas, dashboard, alerts
from app.services.scheduler_service import start_scheduler, shutdown_scheduler
from contextlib import asynccontextmanager

# Garante que as tabelas existam no banco ao iniciar
all_models.Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gerencia o ciclo de vida da aplicação - inicia e para o scheduler"""
    # Startup
    start_scheduler()
    yield
    # Shutdown
    shutdown_scheduler()

app = FastAPI(
    title="Fiscal Fácil SaaS - Auditoria Contábil B2B",
    description="Sistema de Vigilância Fiscal 24h para Escritórios de Contabilidade",
    version="3.2.0",
    lifespan=lifespan
)

# Inclui as rotas (CORRIGIDO - sem duplicatas)
app.include_router(empresas.router)
app.include_router(notas.router)
app.include_router(dashboard.router)
app.include_router(alerts.router)

@app.get("/")
def home():
    return {
        "mensagem": "Sistema de Vigilância Fiscal 24h está online! 🚀",
        "versao": "3.2.0 - SaaS B2B",
        "recursos": [
            "✅ Coleta Automática de Notas (Mock)",
            "✅ Monitor RBT12 Proativo",
            "✅ Alertas por Email",
            "✅ Dashboard Global para Escritórios"
        ]
    }

@app.get("/teste-banco")
def teste_conexao(db: Session = Depends(get_db)):
    try:
        # Teste simples de conexão (SELECT 1)
        db.execute(text("SELECT 1"))
        return {"status": "SUCESSO", "detalhe": "Conexão com banco estabelecida!"}
    except Exception as e:
        return {"status": "ERRO", "detalhe": str(e)}

@app.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    """Endpoint de health check para monitoramento"""
    try:
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected", "scheduler": "running"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}
