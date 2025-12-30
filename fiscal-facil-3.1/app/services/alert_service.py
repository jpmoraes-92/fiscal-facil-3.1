"""
Serviço de Alertas Proativos

Monitora o faturamento das empresas e dispara alertas quando:
- Percentual de uso > 80% (ALERTA/WARNING)
- Percentual de uso >= 100% (ESTOUROU/CRITICAL)

Notificações:
- Email (via Emergent API)
- Webhook (para integrações externas)
"""
import logging
import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import SessionLocal
from app.models.all_models import (
    EmpresaCliente, NotaFiscal, AlertaFiscal, Escritorio
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AlertService:
    """
    Serviço de Vigilância Proativa RBT12
    
    Monitora o faturamento e dispara alertas automaticamente.
    """
    
    def __init__(self):
        self.limites_regime = {
            'MEI': Decimal('81000.00'),
            'Simples Nacional': Decimal('4800000.00'),
            'Lucro Presumido': Decimal('78000000.00')
        }
    
    def calcular_rbt12(self, empresa: EmpresaCliente, db: Session) -> Dict:
        """
        Calcula o RBT12 (Receita Bruta Total dos últimos 12 meses)
        
        Args:
            empresa: Objeto EmpresaCliente
            db: Sessão do banco
            
        Returns:
            Dict com faturamento, limite, percentual e status
        """
        # Data de 12 meses atrás
        data_inicio = datetime.now() - timedelta(days=365)
        
        # Soma o faturamento dos últimos 12 meses
        resultado = db.query(
            func.coalesce(func.sum(NotaFiscal.valor_total), 0)
        ).filter(
            NotaFiscal.empresa_id == empresa.id,
            NotaFiscal.data_emissao >= data_inicio
        ).scalar()
        
        faturamento_12m = Decimal(str(resultado)) if resultado else Decimal('0')
        
        # Determina o limite baseado no regime
        if empresa.limite_faturamento_anual:
            limite = Decimal(str(empresa.limite_faturamento_anual))
        else:
            limite = self.limites_regime.get(empresa.regime_tributario, Decimal('81000.00'))
        
        # Calcula percentual de uso
        percentual = (faturamento_12m / limite * 100) if limite > 0 else Decimal('0')
        
        # Determina status
        if percentual >= 100:
            status = 'ESTOUROU'
        elif percentual >= 80:
            status = 'ALERTA'
        else:
            status = 'OK'
        
        return {
            'faturamento_12m': float(faturamento_12m),
            'limite': float(limite),
            'percentual_uso': float(percentual),
            'status': status,
            'regime': empresa.regime_tributario,
            'margem_disponivel': float(limite - faturamento_12m)
        }
    
    def verificar_empresa_e_alertar(self, empresa: EmpresaCliente, db: Session) -> Optional[AlertaFiscal]:
        """
        Verifica o status de uma empresa e cria alerta se necessário.
        """
        # Calcula RBT12
        rbt12 = self.calcular_rbt12(empresa, db)
        
        # Atualiza status na empresa
        empresa.status_rbt12 = rbt12['status']
        empresa.percentual_uso_limite = rbt12['percentual_uso']
        empresa.ultimo_calculo_rbt12 = datetime.now()
        
        alerta_criado = None
        
        # Verifica se precisa criar alerta
        if rbt12['status'] in ['ALERTA', 'ESTOUROU']:
            # Verifica se já existe alerta recente (últimas 24h)
            alerta_recente = db.query(AlertaFiscal).filter(
                AlertaFiscal.empresa_id == empresa.id,
                AlertaFiscal.tipo_alerta.in_(['RBT12_WARNING', 'RBT12_CRITICAL']),
                AlertaFiscal.data_criacao >= datetime.now() - timedelta(hours=24)
            ).first()
            
            if not alerta_recente:
                # Cria novo alerta
                tipo = 'RBT12_CRITICAL' if rbt12['status'] == 'ESTOUROU' else 'RBT12_WARNING'
                
                if rbt12['status'] == 'ESTOUROU':
                    titulo = f"🚨 LIMITE ESTOURADO - {empresa.razao_social}"
                    mensagem = (
                        f"A empresa {empresa.razao_social} (CNPJ: {empresa.cnpj}) "
                        f"ULTRAPASSOU o limite de faturamento do regime {empresa.regime_tributario}.\n\n"
                        f"📊 Faturamento (12 meses): R$ {rbt12['faturamento_12m']:,.2f}\n"
                        f"📊 Limite: R$ {rbt12['limite']:,.2f}\n"
                        f"📊 Uso: {rbt12['percentual_uso']:.1f}%\n"
                        f"📊 Excesso: R$ {abs(rbt12['margem_disponivel']):,.2f}\n\n"
                        f"⚠️ AÇÃO IMEDIATA NECESSÁRIA: Risco de desenquadramento tributário!"
                    )
                else:
                    titulo = f"⚠️ ALERTA DE FATURAMENTO - {empresa.razao_social}"
                    mensagem = (
                        f"A empresa {empresa.razao_social} (CNPJ: {empresa.cnpj}) "
                        f"está PRÓXIMA do limite de faturamento do regime {empresa.regime_tributario}.\n\n"
                        f"📊 Faturamento (12 meses): R$ {rbt12['faturamento_12m']:,.2f}\n"
                        f"📊 Limite: R$ {rbt12['limite']:,.2f}\n"
                        f"📊 Uso: {rbt12['percentual_uso']:.1f}%\n"
                        f"📊 Margem disponível: R$ {rbt12['margem_disponivel']:,.2f}\n\n"
                        f"📌 Monitore as próximas emissões de notas fiscais."
                    )
                
                alerta_criado = AlertaFiscal(
                    escritorio_id=empresa.escritorio_id,
                    empresa_id=empresa.id,
                    tipo_alerta=tipo,
                    titulo=titulo,
                    mensagem=mensagem
                )
                db.add(alerta_criado)
                
                logger.warning(f"🔔 ALERTA CRIADO: {titulo}")
        
        db.commit()
        return alerta_criado
    
    async def enviar_notificacao_email(self, alerta: AlertaFiscal, escritorio: Escritorio) -> bool:
        """
        Envia notificação por email usando Emergent API.
        
        NOTA: Esta função usa a API Emergent para envio de emails.
        """
        if not escritorio.alertas_email_ativo:
            logger.info(f"   📧 Email desativado para escritório {escritorio.id}")
            return False
        
        try:
            # TODO: Implementar integração com Emergent API para emails
            # Por enquanto, apenas loga a tentativa
            logger.info(f"   📧 [MOCK] Enviando email para {escritorio.email}:")
            logger.info(f"       Assunto: {alerta.titulo}")
            logger.info(f"       Corpo: {alerta.mensagem[:100]}...")
            
            # Marca como notificado
            alerta.notificado_email = True
            return True
            
        except Exception as e:
            logger.error(f"   ❌ Erro ao enviar email: {str(e)}")
            return False
    
    async def enviar_webhook(self, alerta: AlertaFiscal, escritorio: Escritorio) -> bool:
        """
        Envia notificação via Webhook.
        """
        if not escritorio.webhook_url:
            return False
        
        try:
            import httpx
            
            payload = {
                "tipo": alerta.tipo_alerta,
                "titulo": alerta.titulo,
                "mensagem": alerta.mensagem,
                "empresa_id": alerta.empresa_id,
                "data": alerta.data_criacao.isoformat()
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    escritorio.webhook_url,
                    json=payload,
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    alerta.notificado_webhook = True
                    logger.info(f"   🔗 Webhook enviado com sucesso")
                    return True
                    
        except Exception as e:
            logger.error(f"   ❌ Erro ao enviar webhook: {str(e)}")
        
        return False


def executar_verificacao_alertas():
    """
    Função executada pelo scheduler para verificar alertas de todas as empresas.
    """
    logger.info("="*60)
    logger.info("🔔 INICIANDO VERIFICAÇÃO DE ALERTAS RBT12")
    logger.info(f"   Horário: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    logger.info("="*60)
    
    db = SessionLocal()
    alert_service = AlertService()
    
    try:
        # Busca todas as empresas
        empresas = db.query(EmpresaCliente).all()
        
        logger.info(f"📋 Verificando {len(empresas)} empresas")
        
        alertas_criados = 0
        empresas_alerta = 0
        empresas_estourou = 0
        
        for empresa in empresas:
            alerta = alert_service.verificar_empresa_e_alertar(empresa, db)
            
            if alerta:
                alertas_criados += 1
            
            if empresa.status_rbt12 == 'ALERTA':
                empresas_alerta += 1
            elif empresa.status_rbt12 == 'ESTOUROU':
                empresas_estourou += 1
        
        logger.info("="*60)
        logger.info(f"✅ VERIFICAÇÃO CONCLUÍDA")
        logger.info(f"   - Empresas OK: {len(empresas) - empresas_alerta - empresas_estourou}")
        logger.info(f"   - Empresas em ALERTA: {empresas_alerta}")
        logger.info(f"   - Empresas ESTOURADAS: {empresas_estourou}")
        logger.info(f"   - Novos alertas criados: {alertas_criados}")
        logger.info("="*60)
        
    except Exception as e:
        logger.error(f"❌ Erro na verificação de alertas: {str(e)}")
    finally:
        db.close()
