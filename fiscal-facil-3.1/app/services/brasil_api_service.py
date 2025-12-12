import requests
from fastapi import HTTPException
import logging

# Configura logs para você ver o erro real no terminal
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def consultar_cnpj_brasilapi(cnpj: str):
    cnpj_limpo = "".join([n for n in cnpj if n.isdigit()])
    
    # --- TENTATIVA 1: BrasilAPI ---
    try:
        logger.info(f"Tentando BrasilAPI para {cnpj_limpo}...")
        url = f"https://brasilapi.com.br/api/cnpj/v1/{cnpj_limpo}"
        response = requests.get(url, timeout=5) # Timeout curto para não travar
        
        if response.status_code == 200:
            dados = response.json()
            # Garante que os CNAEs são strings antes de enviar ao frontend
            cnae_principal_code = dados.get("cnae_fiscal_principal", {}).get("code")
            cnaes_secundarios_codes = [c.get('code') for c in dados.get("cnaes_secundarios", [])]
            
            return {
                "cnpj": cnpj_limpo,
                "razao_social": dados.get("razao_social"),
                "nome_fantasia": dados.get("nome_fantasia"),
                "logradouro": f"{dados.get('logradouro')}, {dados.get('numero')}",
                "bairro": dados.get("bairro"),
                "municipio": dados.get("municipio"),
                "uf": dados.get("uf"),
                "cnae_principal": str(cnae_principal_code) if cnae_principal_code is not None else None,
                "cnaes_secundarios": [str(c) for c in cnaes_secundarios_codes if c is not None]
            }
        else:
            logger.warning(f"BrasilAPI falhou: Status {response.status_code}")

    except Exception as e:
        logger.warning(f"Erro conexão BrasilAPI: {str(e)}")

    # --- TENTATIVA 2: ReceitaWS (Plano B) ---
    try:
        logger.info("Tentando ReceitaWS (Backup)...")
        url_ws = f"https://www.receitaws.com.br/v1/cnpj/{cnpj_limpo}"
        response = requests.get(url_ws, timeout=10)
        
        if response.status_code == 200:
            dados = response.json()
            
            if dados.get("status") == "ERROR":
                # Se a ReceitaWS disse que não existe, então não existe mesmo
                raise HTTPException(status_code=404, detail=dados.get("message"))

            # Tratamento para padronizar os CNAEs (remover pontos e traços)
            cnae_principal_code = dados.get("atividade_principal", [{}])[0].get("code", "").replace(".", "").replace("-", "")
            cnaes_secundarios = [c.get("code", "").replace(".", "").replace("-", "") for c in dados.get("atividades_secundarias", [])]

            # cnae_principal_code and cnaes_secundarios are already strings from above processing
            return {
                "cnpj": cnpj_limpo,
                "razao_social": dados.get("nome"),
                "nome_fantasia": dados.get("fantasia"),
                "logradouro": f"{dados.get('logradouro')}, {dados.get('numero')}",
                "bairro": dados.get("bairro"),
                "municipio": dados.get("municipio"),
                "uf": dados.get("uf"),
                "cnae_principal": cnae_principal_code,
                "cnaes_secundarios": cnaes_secundarios
            }
            
    except Exception as e:
        logger.error(f"Erro ReceitaWS: {str(e)}")

    # Se chegou aqui, nada funcionou
    raise HTTPException(status_code=503, detail="Serviços de consulta indisponíveis no momento. Tente novamente.")