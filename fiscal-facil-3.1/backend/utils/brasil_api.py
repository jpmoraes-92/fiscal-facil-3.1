import requests
from fastapi import HTTPException
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def consultar_cnpj(cnpj: str):
    """
    Consulta dados cadastrais de uma empresa na BrasilAPI (Receita Federal).
    
    Retorna:
    - Dados cadastrais básicos
    - CNAE principal e secundários (código + descrição)
    - QSA (Quadro de Sócios e Administradores)
    """
    cnpj_limpo = "".join([n for n in cnpj if n.isdigit()])
    
    try:
        logger.info(f"Consultando CNPJ {cnpj_limpo} na BrasilAPI...")
        url = f"https://brasilapi.com.br/api/cnpj/v1/{cnpj_limpo}"
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            dados = response.json()
            
            # CNAE Principal (código + descrição)
            cnae_principal = dados.get("cnae_fiscal_principal")
            cnae_principal_obj = None
            if cnae_principal and isinstance(cnae_principal, dict):
                cnae_principal_obj = {
                    # Garante que 'codigo' é string
                    "codigo": str(cnae_principal.get("codigo")) if cnae_principal.get("codigo") is not None else None,
                    "descricao": cnae_principal.get("descricao")
                }
            
            # CNAEs Secundários (lista completa com código + descrição)
            cnaes_secundarios = []
            for c in dados.get("cnaes_secundarios", []):
                if isinstance(c, dict):
                    cnaes_secundarios.append({
                        "codigo": str(c.get("codigo")) if c.get("codigo") is not None else None,
                        "descricao": c.get("descricao")
                    })
            
            # QSA (Quadro de Sócios e Administradores)
            qsa = []
            for socio in dados.get("qsa", []):
                if isinstance(socio, dict):
                    qsa.append({
                        "nome": socio.get("nome_socio"),
                        "qualificacao": socio.get("qualificacao_socio"),
                        "cpf_cnpj": socio.get("cpf_cnpj_socio")  # Pode estar mascarado
                    })
            
            return {
                "cnpj": cnpj_limpo,
                "razao_social": dados.get("razao_social"),
                "nome_fantasia": dados.get("nome_fantasia"),
                "logradouro": f"{dados.get('logradouro')}, {dados.get('numero')}",
                "bairro": dados.get("bairro"),
                "municipio": dados.get("municipio"),
                "uf": dados.get("uf"),
                "situacao_cadastral": dados.get("descricao_situacao_cadastral"),
                "data_abertura": dados.get("data_inicio_atividade"),
                "cnae_principal": cnae_principal_obj,
                "cnaes_secundarios": cnaes_secundarios,
                "qsa": qsa,
                "capital_social": dados.get("capital_social")
            }
        else:
            logger.warning(f"BrasilAPI retornou status {response.status_code}")
            raise HTTPException(status_code=404, detail="CNPJ não encontrado na Receita Federal")
            
    except requests.exceptions.RequestException as e:
        logger.error(f"Erro ao consultar CNPJ: {str(e)}")
        raise HTTPException(status_code=503, detail="Serviço de consulta indisponível")