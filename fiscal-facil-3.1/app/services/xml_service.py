"""
Serviço de processamento de XML de Notas Fiscais
Utiliza o parser híbrido que suporta múltiplos formatos
"""
import sys
import os

# Adiciona o caminho do backend/utils ao path para importar o parser híbrido
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../backend'))

from utils.xml_parser import parse_xml_nota
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def ler_xml_nota(conteudo_arquivo: bytes):
    """
    Processa XML de nota fiscal usando o parser híbrido.
    Suporta formatos: Legado (Ginfes) e SPED (Padrão Nacional)
    
    Returns:
        dict com os dados da nota ou {"erro": "mensagem"}
    """
    try:
        # Usa o parser híbrido completo que já extrai CNPJ do prestador
        dados = parse_xml_nota(conteudo_arquivo)
        return dados
    except Exception as e:
        logger.error(f"Erro ao processar XML: {str(e)}")
        return {"erro": f"Falha ao processar XML: {str(e)}"}