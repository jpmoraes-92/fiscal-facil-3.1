from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.all_models import NotaFiscal, CnaePermitido, EmpresaCliente
from app.schemas.nota_schema import NotaFiscalResponse
from app.services.xml_service import ler_xml_nota
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
def listar_notas_empresa(empresa_id: int, db: Session = Depends(get_db)):
    """
    Lista todas as notas fiscais importadas de uma empresa específica.
    Usado para preencher o Grid/Tabela do painel.
    
    🔒 ISOLAMENTO MULTI-TENANT: Filtra estritamente por empresa_id
    """
    notas = db.query(NotaFiscal).filter(NotaFiscal.empresa_id == empresa_id).all()
    return notas

@router.post("/importar/{empresa_id}", response_model=NotaFiscalResponse)
async def importar_nota_xml(empresa_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    # 1. Verifica se a empresa existe
    empresa = db.query(EmpresaCliente).filter(EmpresaCliente.id == empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada.")

    # 2. Lê o arquivo XML
    conteudo = await file.read()
    dados_xml = ler_xml_nota(conteudo)
    
    if "erro" in dados_xml:
        raise HTTPException(status_code=400, detail=dados_xml["erro"])

    # 🔒 3. VALIDAÇÃO CRÍTICA: Isolamento Multi-Tenant (CNPJ do XML deve bater com CNPJ da Empresa)
    cnpj_empresa_bd = normalizar_cnpj(empresa.cnpj)
    
    # Tenta pegar CNPJ do prestador (XMLs SPED) ou usa o CNPJ da própria empresa para legados
    cnpj_xml_prestador = dados_xml.get('cnpj_prestador')
    
    if cnpj_xml_prestador:
        cnpj_xml_normalizado = normalizar_cnpj(cnpj_xml_prestador)
        
        if cnpj_xml_normalizado != cnpj_empresa_bd:
            # BLOQUEIA IMPORTAÇÃO
            raise HTTPException(
                status_code=400,
                detail=f"🚫 Erro de Isolamento: Este XML pertence ao CNPJ {cnpj_xml_prestador}, "
                       f"mas você está tentando importar na empresa {empresa.razao_social} (CNPJ {empresa.cnpj}). "
                       f"Selecione a empresa correta antes de importar."
            )
    
    # Para XMLs legados que não têm cnpj_prestador explícito, confiamos na empresa selecionada
    # mas registramos um aviso no log
    if not cnpj_xml_prestador:
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"XML sem CNPJ do prestador. Importando na empresa {empresa.razao_social} (ID: {empresa_id})")

    # 4. AUDITORIA: Verifica se o código de serviço (Ex: 08.02) está na lista de permitidos
    cnae_permitido = db.query(CnaePermitido).filter(
        CnaePermitido.empresa_id == empresa_id,
        CnaePermitido.codigo_servico_municipal == dados_xml['codigo_servico']
    ).first()

    status = "APROVADA"
    mensagem = "Nota fiscal em conformidade."

    if not cnae_permitido:
        status = "ERRO_CNAE"
        mensagem = f"Código de serviço '{dados_xml['codigo_servico']}' não autorizado para este CNPJ."

    # 5. Salva no Banco (somente se passou na validação de CNPJ)
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
        xml_bruto=dados_xml.get('xml_bruto', str(conteudo))
    )

    db.add(nova_nota)
    db.commit()
    db.refresh(nova_nota)

    return nova_nota