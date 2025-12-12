from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import engine, get_db
from app.models import all_models
from app.routers import empresas
from app.routers import empresas, notas

# Garante que as tabelas existam no banco ao iniciar
all_models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Audit Contábil POC - Birigui")

# Inclui as rotas de empresas (Cadastro, Consulta CNPJ, etc)
app.include_router(empresas.router)
app.include_router(empresas.router)
app.include_router(notas.router)

@app.get("/")
def home():
    return {"mensagem": "Sistema de Auditoria Fiscal está online! 🚀"}

@app.get("/teste-banco")
def teste_conexao(db: Session = Depends(get_db)):
    try:
        # Teste simples de conexão (SELECT 1)
        db.execute(text("SELECT 1"))
        return {"status": "SUCESSO", "detalhe": "Conexão com MySQL estabelecida!"}
    except Exception as e:
        return {"status": "ERRO", "detalhe": str(e)}