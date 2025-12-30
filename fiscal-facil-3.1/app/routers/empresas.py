from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.empresa_schema import EmpresaResponse, EmpresaSalvar, EmpresaUpdate, EmpresaCompleta
from app.services.brasil_api_service import consultar_cnpj_brasilapi
from app.models.all_models import EmpresaCliente, CnaePermitido
from typing import List

router = APIRouter(
    prefix="/empresas",
    tags=["Empresas"]
)

# 1. Rota de Consulta CNPJ
@router.get("/consulta/{cnpj}", response_model=EmpresaResponse)
def preencher_cadastro_via_cnpj(cnpj: str):
    """Consulta dados de uma empresa via CNPJ (BrasilAPI)"""
    return consultar_cnpj_brasilapi(cnpj)

# 2. Rota de Cadastro
@router.post("/", status_code=201)
def cadastrar_empresa(
    empresa: EmpresaSalvar, 
    db: Session = Depends(get_db)
):
    """
    Cadastra uma nova empresa cliente.
    
    🔒 ISOLAMENTO B2B: Empresa é vinculada ao escritorio_id.
    """
    # Verifica se já existe
    cnpj_limpo = "".join([n for n in empresa.cnpj if n.isdigit()])
    existente = db.query(EmpresaCliente).filter(EmpresaCliente.cnpj == cnpj_limpo).first()
    if existente:
        raise HTTPException(status_code=400, detail="Empresa já cadastrada.")

    # Cria a Empresa
    nova_empresa = EmpresaCliente(
        escritorio_id=empresa.escritorio_id,
        cnpj=cnpj_limpo,
        razao_social=empresa.razao_social,
        nome_fantasia=empresa.nome_fantasia,
        regime_tributario=empresa.regime_tributario,
        data_abertura=empresa.data_abertura,
        # Define limite MEI automático se for o caso
        limite_faturamento_anual=81000.00 if empresa.regime_tributario == 'MEI' else (
            4800000.00 if empresa.regime_tributario == 'Simples Nacional' else 78000000.00
        ),
        coleta_automatica_ativa=True,  # Por padrão, coleta ativa
        status_rbt12='OK'
    )
    
    db.add(nova_empresa)
    db.commit()
    db.refresh(nova_empresa)

    # Cria os CNAEs permitidos (O De/Para)
    for cnae in empresa.cnaes_mapeados:
        novo_cnae = CnaePermitido(
            empresa_id=nova_empresa.id,
            cnae_codigo=cnae.cnae_codigo,
            codigo_servico_municipal=cnae.codigo_servico_municipal,
            descricao=cnae.descricao
        )
        db.add(novo_cnae)
    
    db.commit()

    return {"mensagem": "Empresa cadastrada com sucesso!", "id": nova_empresa.id}

# 3. Rota de Listagem (GET todas as empresas de um escritório)
@router.get("/", response_model=List[EmpresaCompleta])
def listar_empresas(
    escritorio_id: int = 1, 
    db: Session = Depends(get_db)
):
    """
    Lista todas as empresas cadastradas de um escritório.
    
    🔒 ISOLAMENTO B2B: Filtra estritamente por escritorio_id.
    """
    empresas = db.query(EmpresaCliente).filter(
        EmpresaCliente.escritorio_id == escritorio_id
    ).all()
    return empresas

# 4. Rota de Edição (PUT)
@router.put("/{empresa_id}", response_model=EmpresaCompleta)
def atualizar_empresa(
    empresa_id: int, 
    dados: EmpresaUpdate,
    escritorio_id: int = 1,
    db: Session = Depends(get_db)
):
    """
    Atualiza os dados cadastrais de uma empresa.
    
    🔒 ISOLAMENTO B2B: Verifica se empresa pertence ao escritório.
    """
    # Busca empresa com validação de escritório
    empresa = db.query(EmpresaCliente).filter(
        EmpresaCliente.id == empresa_id,
        EmpresaCliente.escritorio_id == escritorio_id
    ).first()
    
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada ou acesso negado.")
    
    # Atualiza apenas os campos fornecidos
    dados_dict = dados.dict(exclude_unset=True)
    
    for campo, valor in dados_dict.items():
        setattr(empresa, campo, valor)
    
    # Atualiza limite de faturamento se regime mudou
    if dados.regime_tributario:
        if dados.regime_tributario == 'MEI':
            empresa.limite_faturamento_anual = 81000.00
        elif dados.regime_tributario == 'Simples Nacional':
            empresa.limite_faturamento_anual = 4800000.00
        else:
            empresa.limite_faturamento_anual = 78000000.00
    
    db.commit()
    db.refresh(empresa)
    
    return empresa

# 5. Rota de Detalhes (GET específica)
@router.get("/{empresa_id}", response_model=EmpresaCompleta)
def obter_empresa(
    empresa_id: int, 
    escritorio_id: int = 1,
    db: Session = Depends(get_db)
):
    """
    Retorna os dados completos de uma empresa específica.
    
    🔒 ISOLAMENTO B2B: Verifica se empresa pertence ao escritório.
    """
    empresa = db.query(EmpresaCliente).filter(
        EmpresaCliente.id == empresa_id,
        EmpresaCliente.escritorio_id == escritorio_id
    ).first()
    
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada ou acesso negado.")
    
    return empresa

# 6. NOVA: Configuração de Coleta Automática
@router.patch("/{empresa_id}/coleta")
def configurar_coleta_automatica(
    empresa_id: int,
    ativar: bool = True,
    escritorio_id: int = 1,
    db: Session = Depends(get_db)
):
    """
    Ativa ou desativa a coleta automática de notas para uma empresa.
    """
    empresa = db.query(EmpresaCliente).filter(
        EmpresaCliente.id == empresa_id,
        EmpresaCliente.escritorio_id == escritorio_id
    ).first()
    
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada.")
    
    empresa.coleta_automatica_ativa = ativar
    db.commit()
    
    status = "ativada" if ativar else "desativada"
    return {"mensagem": f"Coleta automática {status} para {empresa.razao_social}"}
