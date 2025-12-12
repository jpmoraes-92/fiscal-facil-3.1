from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    # Fallback seguro para desenvolvimento local com SQLite (não precisa de driver extra)
    # ou levanta um erro se preferir travar.
    print("⚠️ AVISO: DATABASE_URL não encontrada. Usando SQLite temporário.")
    DATABASE_URL = "sqlite:///./sql_app.db" 
else:
    # Correção para o Supabase (postgres:// -> postgresql://)
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(
    DATABASE_URL,
    # SQLite precisa desse argumento extra, Postgres não.
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()