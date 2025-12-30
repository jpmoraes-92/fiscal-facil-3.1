from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.all_models import NotaFiscal, CnaePermitido, EmpresaCliente
from app.schemas.nota_schema import NotaFiscalResponse
from app.services.xml_service import ler_xml_nota
from app.services.alert_service import AlertService
from typing import List
import re

router = APIRouter(
    prefix="/notas",
    tags=["Notas Fiscais"]
)

def normalizar_cnpj(cnpj: str) -> str:
    """Remove caracteres especiais do CNPJ, mantendo apenas dígitos"""
    if not cnpj:
        return ""
    return re.sub(r'[^0-9]', '', cnpj)

@router.get("/empresa/{empresa_id}", response_model=List[NotaFiscalResponse])
def listar_notas_empresa(
    empresa_id: int, 
    escritorio_id: int = 1,
    db: Session = Depends(get_db)
):
    """
    Lista todas as notas fiscais importadas de uma empresa específica.
    
    🔒 ISOLAMENTO B2B: Verifica se empresa pertence ao escritório.
    """
    # Valida acesso à empresa
    empresa = db.query(EmpresaCliente).filter(
        EmpresaCliente.id == empresa_id,
        EmpresaCliente.escritorio_id == escritorio_id
    ).first()
    
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada ou acesso negado.")
    
    notas = db.query(NotaFiscal).filter(NotaFiscal.empresa_id == empresa_id).all()
    return notas

@router.post("/importar/{empresa_id}", response_model=NotaFiscalResponse)
async def importar_nota_xml(
    empresa_id: int, 
    file: UploadFile = File(...),
    escritorio_id: int = 1,
    db: Session = Depends(get_db)
):
    """
    Importa uma nota fiscal via upload de XML.
    
    🔒 ISOLAMENTO B2B: Verifica se empresa pertence ao escritório.
    🔒 VALIDAÇÃO: CNPJ do XML deve corresponder ao CNPJ da empresa.
    """
    # 1. Verifica se a empresa existe E pertence ao escritório
    empresa = db.query(EmpresaCliente).filter(
        EmpresaCliente.id == empresa_id,
        EmpresaCliente.escritorio_id == escritorio_id
    ).first()
    
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada ou acesso negado.")

    # 2. Lê o arquivo XML
    conteudo = await file.read()
    dados_xml = ler_xml_nota(conteudo)
    
    if "erro" in dados_xml:
        raise HTTPException(status_code=400, detail=dados_xml["erro"])

    # 3. VALIDAÇÃO CRÍTICA: Isolamento Multi-Tenant
    cnpj_empresa_bd = normalizar_cnpj(empresa.cnpj)
    cnpj_xml_prestador = dados_xml.get('cnpj_prestador')
    
    if cnpj_xml_prestador:
        cnpj_xml_normalizado = normalizar_cnpj(cnpj_xml_prestador)
        
        if cnpj_xml_normalizado != cnpj_empresa_bd:
            raise HTTPException(
                status_code=400,
                detail=f"🚫 Erro de Isolamento: Este XML pertence ao CNPJ {cnpj_xml_prestador}, "
                       f"mas você está tentando importar na empresa {empresa.razao_social} "
                       f"(CNPJ {empresa.cnpj}). Selecione a empresa correta."
            )

    # 4. AUDITORIA: Verifica se o código de serviço está permitido
    cnae_permitido = db.query(CnaePermitido).filter(
        CnaePermitido.empresa_id == empresa_id,
        CnaePermitido.codigo_servico_municipal == dados_xml['codigo_servico']
    ).first()

    status = "APROVADA"
    mensagem = "Nota fiscal em conformidade."

    if not cnae_permitido:
        status = "ERRO_CNAE"
        mensagem = f"Código de serviço '{dados_xml['codigo_servico']}' não autorizado para este CNPJ."

    # 5. Salva no Banco
    nova_nota = NotaFiscal(
        empresa_id=empresa_id,
        numero_nota=dados_xml['numero_nota'],
        data_emissao=dados_xml['data_emissao'],
        chave_validacao=dados_xml.get('chave_validacao'),
        cnpj_tomador=dados_xml.get('cnpj_tomador'),
        codigo_servico_utilizado=dados_xml['codigo_servico'],
        valor_total=dados_xml['valor_total'],
        status_auditoria=status,
        mensagem_erro=mensagem,
        xml_bruto=dados_xml.get('xml_bruto', str(conteudo)),
        origem='UPLOAD_MANUAL'
    )

    db.add(nova_nota)
    db.commit()
    db.refresh(nova_nota)
    
    # 6. PROATIVO: Verifica alertas após import
    alert_service = AlertService()
    alert_service.verificar_empresa_e_alertar(empresa, db)

    return nova_nota

@router.get("/estatisticas/{empresa_id}")
def obter_estatisticas(
    empresa_id: int,
    escritorio_id: int = 1,
    db: Session = Depends(get_db)
):
    """
    Retorna estatísticas das notas fiscais de uma empresa.
    """
    # Valida acesso
    empresa = db.query(EmpresaCliente).filter(
        EmpresaCliente.id == empresa_id,
        EmpresaCliente.escritorio_id == escritorio_id
    ).first()
    
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada.")
    
    # Contagens
    total = db.query(NotaFiscal).filter(NotaFiscal.empresa_id == empresa_id).count()
    aprovadas = db.query(NotaFiscal).filter(
        NotaFiscal.empresa_id == empresa_id,
        NotaFiscal.status_auditoria == 'APROVADA'
    ).count()
    com_erros = total - aprovadas
    
    # Valor total
    from sqlalchemy import func
    valor_result = db.query(func.sum(NotaFiscal.valor_total)).filter(
        NotaFiscal.empresa_id == empresa_id
    ).scalar()
    valor_total = float(valor_result) if valor_result else 0.0
    
    return {
        "total_notas": total,
        "aprovadas": aprovadas,
        "com_erros": com_erros,
        "valor_total": valor_total
    }
