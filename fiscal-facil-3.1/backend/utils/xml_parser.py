import xmltodict
from datetime import datetime
from decimal import Decimal
import logging
import re

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def parse_xml_nota(conteudo_arquivo: bytes):
    """
    Parser XML Híbrido - Suporta múltiplos formatos de NFS-e:
    - Layout Legado (Ginfes/Birigui)
    - Layout Padrão Nacional (SPED)
    """
    try:
        # Decodifica o arquivo XML
        try:
            xml_string = conteudo_arquivo.decode('utf-8')
        except UnicodeDecodeError:
            xml_string = conteudo_arquivo.decode('iso-8859-1')

        # Parse do XML
        doc = xmltodict.parse(xml_string)
        
        # Detecta o formato automaticamente
        if 'tbnfd' in doc or 'nfdok' in doc:
            # FORMATO LEGADO (Ginfes/Birigui)
            logger.info("Detectado: Layout Legado (Ginfes)")
            return _parse_layout_legado(doc, xml_string)
        
        elif 'NFSe' in doc:
            # FORMATO PADRÃO NACIONAL (SPED)
            logger.info("Detectado: Layout Padrão Nacional (SPED)")
            return _parse_layout_sped(doc, xml_string)
        
        else:
            return {"erro": "Layout de XML desconhecido. Verifique se é um XML de nota fiscal de serviço válido."}

    except Exception as e:
        logger.error(f"Erro ao processar XML: {str(e)}")
        return {"erro": f"Falha ao processar XML: {str(e)}"}


def _parse_layout_legado(doc: dict, xml_string: str) -> dict:
    """
    Parser para o formato legado (Ginfes/Birigui)
    
    ATENÇÃO: Este formato NÃO possui campo de CNPJ do Prestador.
    A validação de segurança multi-tenant fica limitada para este formato.
    """
    try:
        nota_dict = doc['tbnfd']['nfdok']['NewDataSet']['NOTA_FISCAL']
        
        # Data de emissão (formato: YYYY-MM-DD HH:MM:SS)
        data_bruta = nota_dict['DataEmissao'] 
        data_limpa = data_bruta[:10] 
        data_formatada = datetime.strptime(data_limpa, '%Y-%m-%d')

        # Valor total
        valor_bruto = nota_dict.get('ValorTotalNota', '0')
        if not valor_bruto:
            valor_bruto = '0'
        valor_decimal = float(Decimal(valor_bruto))

        # ⚠️ LIMITAÇÃO CRÍTICA DO FORMATO LEGADO:
        # XMLs Ginfes/Birigui NÃO possuem campo de CNPJ do Prestador.
        # Apenas o CNPJ do Tomador (Cliente) está disponível.
        # Este XML será REJEITADO na importação por questões de segurança.
        logger.error(
            f"❌ XML Legado (Ginfes) - Nota #{nota_dict.get('NumeroNota')}: "
            "Formato NÃO possui CNPJ do Prestador. IMPORTAÇÃO SERÁ BLOQUEADA por segurança."
        )

        dados_nota = {
            "numero_nota": int(nota_dict['NumeroNota']),
            "data_emissao": data_formatada.isoformat(),
            "codigo_servico": nota_dict.get('Cae'),
            "valor_total": valor_decimal,
            "chave_validacao": nota_dict.get('ChaveValidacao'),
            "cnpj_tomador": nota_dict.get('ClienteCNPJCPF'),
            "cnpj_prestador": None,  # ⚠️ Não disponível em XML legado
            "formato_xml": "Ginfes/Legado",  # Identificador de formato
            "xml_bruto": xml_string
        }
        
        return dados_nota
        
    except Exception as e:
        logger.error(f"Erro ao processar Layout Legado: {str(e)}")
        return {"erro": f"Falha ao processar XML legado: {str(e)}"}


def _parse_layout_sped(doc: dict, xml_string: str) -> dict:
    """Parser para o formato Padrão Nacional (SPED)"""
    try:
        nfse = doc['NFSe']
        info = nfse['infNFSe']
        
        # Número da nota
        numero_nota = int(info['nNFSe'])
        
        # Data de emissão (formato ISO com timezone: 2025-01-17T15:04:03-03:00)
        data_bruta = info['dhProc']
        # Remove timezone para datetime naive (compatível com MongoDB)
        data_sem_tz = re.sub(r'[+-]\d{2}:\d{2}$', '', data_bruta)
        data_formatada = datetime.fromisoformat(data_sem_tz)
        
        # Valor líquido (pode estar em diferentes lugares)
        valores = info.get('valores', {})
        valor_liq = valores.get('vLiq')
        
        # Se não encontrou vLiq, tenta vServPrest dentro do DPS
        if not valor_liq:
            dps = info.get('DPS', {})
            if dps:
                inf_dps = dps.get('infDPS', {})
                valores_dps = inf_dps.get('valores', {})
                vserv_prest = valores_dps.get('vServPrest', {})
                valor_liq = vserv_prest.get('vServ', '0')
        
        valor_decimal = float(Decimal(valor_liq or '0'))
        
        # Código de serviço (tenta extrair do DPS ou da raiz)
        codigo_servico = None
        
        # Tenta pegar do DPS primeiro
        dps = info.get('DPS', {})
        if dps:
            inf_dps = dps.get('infDPS', {})
            serv = inf_dps.get('serv', {})
            cserv = serv.get('cServ', {})
            codigo_servico = cserv.get('cTribNac')
        
        # Se não encontrou, usa xNBS ou xTribNac como fallback
        if not codigo_servico:
            codigo_servico = info.get('xNBS') or info.get('xTribNac')
        
        # CNPJ Tomador (do DPS)
        cnpj_tomador = None
        if dps:
            inf_dps = dps.get('infDPS', {})
            toma = inf_dps.get('toma', {})
            cnpj_tomador = toma.get('CNPJ')
        
        # CNPJ Prestador (emissor)
        emit = info.get('emit', {})
        cnpj_prestador = emit.get('CNPJ')
        
        dados_nota = {
            "numero_nota": numero_nota,
            "data_emissao": data_formatada.isoformat(),
            "codigo_servico": codigo_servico,
            "valor_total": valor_decimal,
            "chave_validacao": info.get('@Id'),  # ID da NFSe como chave
            "cnpj_tomador": cnpj_tomador,
            "cnpj_prestador": cnpj_prestador,  # ✅ Disponível em XML SPED
            "formato_xml": "SPED/Nacional",  # Identificador de formato
            "xml_bruto": xml_string
        }
        
        return dados_nota
        
    except Exception as e:
        logger.error(f"Erro ao processar Layout SPED: {str(e)}")
        return {"erro": f"Falha ao processar XML SPED: {str(e)}"}
