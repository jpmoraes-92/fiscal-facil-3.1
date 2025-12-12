import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Gera um PDF profissional de Nota Fiscal de Serviço
 * @param {Object} notaData - Dados da nota fiscal
 */
export const generateInvoicePDF = (notaData) => {
  // Cria documento A4
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;

  // ===== CABEÇALHO =====
  doc.setFillColor(41, 128, 185);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('NOTA FISCAL DE SERVIÇO ELETRÔNICA', pageWidth / 2, 15, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`NFS-e Nº ${notaData.numero_nota || 'N/A'}`, pageWidth / 2, 25, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text(`Data de Emissão: ${formatDate(notaData.data_emissao)}`, pageWidth / 2, 33, { align: 'center' });

  // Reset cor do texto
  doc.setTextColor(0, 0, 0);
  let yPos = 50;

  // ===== DADOS DO PRESTADOR =====
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO PRESTADOR DE SERVIÇOS', margin, yPos);
  yPos += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  // Tabela do Prestador
  doc.autoTable({
    startY: yPos,
    head: [['Campo', 'Informação']],
    body: [
      ['CNPJ', notaData.cnpj_prestador || 'Não informado (XML Legado)'],
      ['Inscrição Municipal', notaData.inscricao_municipal || 'N/A'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [52, 152, 219], textColor: 255 },
    margin: { left: margin, right: margin },
    columnStyles: {
      0: { cellWidth: 60, fontStyle: 'bold' },
      1: { cellWidth: 'auto' }
    }
  });

  yPos = doc.lastAutoTable.finalY + 10;

  // ===== DADOS DO TOMADOR =====
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO TOMADOR DE SERVIÇOS', margin, yPos);
  yPos += 7;

  doc.autoTable({
    startY: yPos,
    head: [['Campo', 'Informação']],
    body: [
      ['CNPJ/CPF', notaData.cnpj_tomador || 'N/A'],
      ['Nome/Razão Social', notaData.tomador_nome || 'N/A'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [52, 152, 219], textColor: 255 },
    margin: { left: margin, right: margin },
    columnStyles: {
      0: { cellWidth: 60, fontStyle: 'bold' },
      1: { cellWidth: 'auto' }
    }
  });

  yPos = doc.lastAutoTable.finalY + 10;

  // ===== DADOS DO SERVIÇO =====
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('DISCRIMINAÇÃO DOS SERVIÇOS', margin, yPos);
  yPos += 7;

  doc.autoTable({
    startY: yPos,
    head: [['Campo', 'Valor']],
    body: [
      ['Código do Serviço', notaData.codigo_servico_utilizado || 'N/A'],
      ['Descrição', notaData.descricao_servico || 'Serviços conforme contrato'],
      ['Valor dos Serviços', formatCurrency(notaData.valor_total)],
      ['Base de Cálculo', formatCurrency(notaData.base_calculo || notaData.valor_total)],
      ['Alíquota ISS', notaData.aliquota ? `${notaData.aliquota}%` : 'N/A'],
      ['Valor do ISS', formatCurrency(notaData.valor_iss || 0)],
      ['Outras Deduções', formatCurrency(notaData.deducoes || 0)],
    ],
    theme: 'grid',
    headStyles: { fillColor: [52, 152, 219], textColor: 255 },
    margin: { left: margin, right: margin },
    columnStyles: {
      0: { cellWidth: 80, fontStyle: 'bold' },
      1: { cellWidth: 'auto', halign: 'right' }
    }
  });

  yPos = doc.lastAutoTable.finalY + 10;

  // ===== VALOR LÍQUIDO (DESTAQUE) =====
  doc.setFillColor(46, 204, 113);
  doc.rect(margin, yPos, pageWidth - (margin * 2), 15, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('VALOR LÍQUIDO DA NFS-e', margin + 5, yPos + 10);
  doc.text(formatCurrency(notaData.valor_total), pageWidth - margin - 5, yPos + 10, { align: 'right' });

  doc.setTextColor(0, 0, 0);
  yPos += 25;

  // ===== INFORMAÇÕES ADICIONAIS =====
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMAÇÕES ADICIONAIS', margin, yPos);
  yPos += 7;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  const infoAdicional = notaData.informacoes_adicionais || 
    'Nota Fiscal emitida nos termos da Lei Complementar Federal nº 116/2003 e legislação municipal vigente.';
  
  const splitInfo = doc.splitTextToSize(infoAdicional, pageWidth - (margin * 2));
  doc.text(splitInfo, margin, yPos);
  
  yPos += (splitInfo.length * 5) + 10;

  // ===== CHAVE DE VERIFICAÇÃO =====
  if (notaData.chave_validacao) {
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos, pageWidth - (margin * 2), 12, 'F');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('CÓDIGO DE VERIFICAÇÃO:', margin + 5, yPos + 8);
    doc.setFont('helvetica', 'normal');
    doc.text(notaData.chave_validacao, margin + 80, yPos + 8);
    
    yPos += 20;
  }

  // ===== RODAPÉ =====
  const pageHeight = doc.internal.pageSize.height;
  doc.setFillColor(41, 128, 185);
  doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text('Gerado via Fiscal Fácil 3.0', pageWidth / 2, pageHeight - 12, { align: 'center' });
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, pageWidth / 2, pageHeight - 7, { align: 'center' });

  // ===== SALVAR PDF =====
  const fileName = `NFSe_${notaData.numero_nota || 'SEM_NUMERO'}_${notaData.data_emissao?.replace(/[^0-9]/g, '') || 'sem_data'}.pdf`;
  doc.save(fileName);
};

// ===== FUNÇÕES AUXILIARES =====

/**
 * Formata valor monetário
 */
const formatCurrency = (value) => {
  if (!value && value !== 0) return 'R$ 0,00';
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(numValue);
};

/**
 * Formata data
 */
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    return dateString;
  }
};

export default generateInvoicePDF;
