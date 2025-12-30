"""
Serviço de Coleta Automática de Notas Fiscais

Este serviço simula (MOCK) a coleta de notas fiscais de APIs de prefeituras.
No futuro, deve ser substituído por conectores reais para cada prefeitura.

Padrões suportados (para futura integração):
- ABRASF 2.04
- Padrão Nacional (SPED)
- APIs específicas de prefeituras
"""
import logging
import random
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from decimal import Decimal
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.all_models import EmpresaCliente, NotaFiscal, LogColeta, CnaePermitido

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class NFECollectorService:
    """
    Serviço de Coleta Automática de NF-e
    
    MODO ATUAL: MOCKADO (Simula notas para demonstração)
    MODO FUTURO: Integração real com APIs de prefeituras
    """
    
    def __init__(self):
        self.modo = "MOCK"  # MOCK ou PRODUCAO
        self.servicos_mock = [
            {"codigo": "08.02", "descricao": "Consultoria em TI"},
            {"codigo": "17.01", "descricao": "Assessoria Contábil"},
            {"codigo": "17.19", "descricao": "Contabilidade"},
            {"codigo": "14.01", "descricao": "Serviços Advocatícios"},
        ]
    
    def coletar_notas_empresa(self, empresa: EmpresaCliente, db: Session) -> Dict:
        """
        Coleta novas notas fiscais para uma empresa específica.
        
        Args:
            empresa: Objeto EmpresaCliente
            db: Sessão do banco de dados
            
        Returns:
            Dict com resultado da coleta
        """
        logger.info(f"🔍 Iniciando coleta para: {empresa.razao_social} (CNPJ: {empresa.cnpj})")
        
        if self.modo == "MOCK":
            return self._coletar_mock(empresa, db)
        else:
            return self._coletar_producao(empresa, db)
    
    def _coletar_mock(self, empresa: EmpresaCliente, db: Session) -> Dict:
        """
        Simula coleta de notas fiscais (MODO DEMONSTRAÇÃO)
        
        Gera entre 0-3 notas aleatórias para simular atividade.
        """
        try:
            # Simula probabilidade de encontrar novas notas (70% de chance)
            if random.random() > 0.70:
                # Sem novas notas
                log = LogColeta(
                    empresa_id=empresa.id,
                    status='SEM_NOVAS_NOTAS',
                    notas_coletadas=0,
                    mensagem="Nenhuma nova nota fiscal encontrada nesta varredura."
                )
                db.add(log)
                
                # Atualiza timestamp da última coleta
                empresa.ultima_coleta = datetime.now()
                db.commit()
                
                logger.info(f"   📭 Nenhuma nova nota para {empresa.razao_social}")
                return {
                    "sucesso": True,
                    "notas_coletadas": 0,
                    "mensagem": "Nenhuma nova nota encontrada"
                }
            
            # Gera entre 1-3 notas mock
            num_notas = random.randint(1, 3)
            notas_criadas = []
            
            # Busca o maior número de nota existente
            ultima_nota = db.query(NotaFiscal).filter(
                NotaFiscal.empresa_id == empresa.id
            ).order_by(NotaFiscal.numero_nota.desc()).first()
            
            prox_numero = (ultima_nota.numero_nota + 1) if ultima_nota else 1001
            
            # Busca CNAEs permitidos da empresa
            cnaes = db.query(CnaePermitido).filter(
                CnaePermitido.empresa_id == empresa.id
            ).all()
            
            for i in range(num_notas):
                # Escolhe um serviço (80% chance de usar CNAE permitido)
                if cnaes and random.random() < 0.80:
                    cnae = random.choice(cnaes)
                    codigo_servico = cnae.codigo_servico_municipal
                    status = "APROVADA"
                    mensagem = "Nota fiscal em conformidade."
                else:
                    # 20% chance de gerar erro de CNAE
                    servico = random.choice(self.servicos_mock)
                    codigo_servico = servico["codigo"]
                    status = "ERRO_CNAE"
                    mensagem = f"Código de serviço '{codigo_servico}' não autorizado para este CNPJ."
                
                # Valor entre R$ 500 e R$ 15.000
                valor = Decimal(str(random.uniform(500, 15000))).quantize(Decimal('0.01'))
                
                # Data de emissão (últimas 24h)
                data_emissao = datetime.now() - timedelta(
                    hours=random.randint(1, 23),
                    minutes=random.randint(0, 59)
                )
                
                nova_nota = NotaFiscal(
                    empresa_id=empresa.id,
                    numero_nota=prox_numero + i,
                    data_emissao=data_emissao,
                    chave_validacao=f"NFSe-{empresa.cnpj[:8]}-{prox_numero + i}-{datetime.now().strftime('%Y%m%d')}",
                    cnpj_tomador=f"{random.randint(10, 99)}.{random.randint(100, 999)}.{random.randint(100, 999)}/0001-{random.randint(10, 99)}",
                    codigo_servico_utilizado=codigo_servico,
                    valor_total=valor,
                    status_auditoria=status,
                    mensagem_erro=mensagem,
                    origem='COLETA_AUTOMATICA'
                )
                
                db.add(nova_nota)
                notas_criadas.append({
                    "numero": nova_nota.numero_nota,
                    "valor": float(valor),
                    "status": status
                })
            
            # Log da coleta
            log = LogColeta(
                empresa_id=empresa.id,
                status='SUCESSO',
                notas_coletadas=num_notas,
                mensagem=f"Coletadas {num_notas} notas via simulação MOCK."
            )
            db.add(log)
            
            # Atualiza timestamp
            empresa.ultima_coleta = datetime.now()
            db.commit()
            
            logger.info(f"   ✅ {num_notas} notas coletadas para {empresa.razao_social}")
            
            return {
                "sucesso": True,
                "notas_coletadas": num_notas,
                "notas": notas_criadas,
                "mensagem": f"Coletadas {num_notas} novas notas fiscais (MOCK)"
            }
            
        except Exception as e:
            logger.error(f"   ❌ Erro na coleta mock: {str(e)}")
            
            # Log de falha
            log = LogColeta(
                empresa_id=empresa.id,
                status='FALHA',
                notas_coletadas=0,
                mensagem=f"Erro na coleta: {str(e)}"
            )
            db.add(log)
            db.commit()
            
            return {
                "sucesso": False,
                "notas_coletadas": 0,
                "erro": str(e)
            }
    
    def _coletar_producao(self, empresa: EmpresaCliente, db: Session) -> Dict:
        """
        Coleta real de notas fiscais (MODO PRODUÇÃO)
        
        TODO: Implementar conectores para:
        - API Padrão Nacional (SPED)
        - WebServices ABRASF
        - APIs específicas de prefeituras
        """
        # Verifica se empresa tem configuração de API
        if not empresa.endpoint_prefeitura:
            return {
                "sucesso": False,
                "erro": "Empresa sem endpoint de prefeitura configurado"
            }
        
        # TODO: Implementar chamada real à API
        logger.warning(f"Modo PRODUCAO não implementado para {empresa.cnpj}")
        return {
            "sucesso": False,
            "erro": "Modo produção ainda não implementado"
        }


def executar_coleta_todas_empresas():
    """
    Função executada pelo scheduler para coletar notas de todas as empresas.
    """
    logger.info("="*60)
    logger.info("🔄 INICIANDO VARREDURA AUTOMÁTICA DE NOTAS FISCAIS")
    logger.info(f"   Horário: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    logger.info("="*60)
    
    db = SessionLocal()
    collector = NFECollectorService()
    
    try:
        # Busca empresas com coleta ativa
        empresas = db.query(EmpresaCliente).filter(
            EmpresaCliente.coleta_automatica_ativa == True
        ).all()
        
        logger.info(f"📋 {len(empresas)} empresas com coleta automática ativa")
        
        total_notas = 0
        for empresa in empresas:
            resultado = collector.coletar_notas_empresa(empresa, db)
            if resultado.get("sucesso"):
                total_notas += resultado.get("notas_coletadas", 0)
        
        logger.info("="*60)
        logger.info(f"✅ VARREDURA CONCLUÍDA - {total_notas} notas coletadas no total")
        logger.info("="*60)
        
    except Exception as e:
        logger.error(f"❌ Erro na varredura automática: {str(e)}")
    finally:
        db.close()
