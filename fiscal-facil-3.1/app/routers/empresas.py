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

# 1. Rota de Consulta (Já testada)
@router.get("/consulta/{cnpj}", response_model=EmpresaResponse)
def preencher_cadastro_via_cnpj(cnpj: str):
    return consultar_cnpj_brasilapi(cnpj)

# 2. Rota de Cadastro (Nova!)
@router.post("/", status_code=201)
def cadastrar_empresa(empresa: EmpresaSalvar, db: Session = Depends(get_db)):
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
        # Define limite MEI automático se for o caso (regra simples)
        limite_faturamento_anual=81000.00 if empresa.regime_tributario == 'MEI' else 4800000.00
    )
    
    db.add(nova_empresa)
    db.commit()
    db.refresh(nova_empresa)

    # Cria os CNAEs permitidos (O De/Para)
    for cnae in empresa.cnaes_mapeados:
        novo_cnae = CnaePermitido(
            empresa_id=nova_empresa.id,
            cnae_codigo=cnae.cnae_codigo,
            codigo_servico_municipal=cnae.codigo_servico_municipal, # O CRÍTICO: 08.02
            descricao=cnae.descricao
        )
        db.add(novo_cnae)
    
    db.commit()

    return {"mensagem": "Empresa cadastrada com sucesso!", "id": nova_empresa.id}

# 3. Rota de Listagem (GET todas as empresas)
@router.get("/", response_model=List[EmpresaCompleta])
def listar_empresas(escritorio_id: int = 1, db: Session = Depends(get_db)):
    """
    Lista todas as empresas cadastradas de um escritório.
    Por padrão usa escritorio_id=1 (POC)
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
    db: Session = Depends(get_db)
):
    """
    Atualiza os dados cadastrais de uma empresa.
    Apenas os campos enviados serão atualizados.
    CNPJ não pode ser alterado (chave única).
    """
    # Busca empresa
    empresa = db.query(EmpresaCliente).filter(EmpresaCliente.id == empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada.")
    
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
        # Lucro Presumido pode ter limites variados
    
    db.commit()
    db.refresh(empresa)
    
    return empresa

# 5. Rota de Detalhes (GET específica)
@router.get("/{empresa_id}", response_model=EmpresaCompleta)
def obter_empresa(empresa_id: int, db: Session = Depends(get_db)):
    """
    Retorna os dados completos de uma empresa específica.
    """
    empresa = db.query(EmpresaCliente).filter(EmpresaCliente.id == empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada.")
    return empresa