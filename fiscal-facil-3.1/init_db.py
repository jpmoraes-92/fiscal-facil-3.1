from app.core.database import SessionLocal, engine
from app.models import all_models

def seed_database():
    # Garante que as tabelas existem
    all_models.Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Verifica se o escritório padrão já existe
        escritorio = db.query(all_models.Escritorio).filter(all_models.Escritorio.id == 1).first()
        
        if not escritorio:
            print("Criando Escritório Padrão (ID 1)...")
            novo_escritorio = all_models.Escritorio(
                id=1,
                nome_responsavel="Juliano Contabilidade",
                email="admin@fiscalfacil.com",
                senha_hash="senha123", # Em produção usaríamos hash real
                telefone="18999999999"
            )
            db.add(novo_escritorio)
            db.commit()
            print("✅ Escritório criado com sucesso!")
        else:
            print("ℹ️ Escritório ID 1 já existe. Nenhuma ação necessária.")
            
    except Exception as e:
        print(f"❌ Erro ao popular banco: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()