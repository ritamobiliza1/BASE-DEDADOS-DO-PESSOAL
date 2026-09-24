import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Person, Recarga, ExportFilterOptions } from '../types';
import { normalizeCoordName } from './validation';

export function generateAutomatedPDF(
  allPeople: Person[],
  recs: Recarga[],
  options: ExportFilterOptions,
  reportTitleCustom?: string
) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const coordFilter = normalizeCoordName(options.coord);
  const filteredPeople = allPeople.filter((p) => {
    const matchCoord = !coordFilter || normalizeCoordName(p.coord) === coordFilter;
    const matchState = !options.state || p.estado === options.state || (options.state === 'NOVO' && p.isNovo);
    const matchType =
      (p.type === 'mob' && options.items.includes('mobilizadores')) ||
      (p.type === 'sup' && options.items.includes('supervisores')) ||
      (p.type === 'moto' && options.items.includes('motoqueiros'));

    return matchCoord && matchState && matchType;
  });

  const totalDias = filteredPeople.reduce((acc, p) => acc + Number(p.dias || 0), 0);
  const totalF = filteredPeople.filter((p) => p.sexo === 'F').length;
  const totalM = filteredPeople.filter((p) => p.sexo === 'M').length;

  // Header Formal do Governo de Angola
  doc.setFillColor(11, 19, 32);
  doc.rect(0, 0, 297, 26, 'F');

  doc.setTextColor(217, 164, 65); // Dourado
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('REPÚBLICA DE ANGOLA · GOVERNO DA PROVÍNCIA DO CUANZA-SUL', 148.5, 7, { align: 'center' });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.text('ADMINISTRAÇÃO MUNICIPAL DO SUMBE · DIRECÇÃO MUNICIPAL DE SAÚDE', 148.5, 13, { align: 'center' });

  doc.setTextColor(234, 241, 248);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Campanha de Vacinação contra a Pólio · nOVP2 · 3ª Ronda · Mapa Operacional de Efetivos e Dias de Trabalho', 148.5, 19, { align: 'center' });

  // Subtítulo e Metadados do Relatório
  const startY = 32;
  const title = reportTitleCustom || (coordFilter ? `RELATÓRIO DA COORDENAÇÃO: ${coordFilter}` : 'RELATÓRIO OPERACIONAL CONSOLIDADO');

  doc.setTextColor(20, 30, 45);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, startY);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(90, 105, 125);
  const dataEmissao = new Date().toLocaleDateString('pt-AO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  doc.text(`Data de Emissão: ${dataEmissao} | Filtro: ${coordFilter || 'Todas as Coordenações'}`, 14, startY + 5);

  // Cards de Resumo no Topo do PDF
  const cardY = startY + 9;
  const cardW = 63;
  const cardH = 15;

  const cards = [
    { label: 'TOTAL DE EFETIVOS', val: `${filteredPeople.length} Agentes` },
    { label: 'DIAS DE TRABALHO TOTAIS', val: `${totalDias} Dias` },
    { label: 'DISTRIBUIÇÃO POR GÉNERO', val: `${totalF} Mulheres / ${totalM} Homens` },
    { label: 'STATUS DOS CADASTROS', val: `${filteredPeople.filter((p) => p.isNovo).length} Novos · ${filteredPeople.filter((p) => p.estado === 'Disponível').length} Ativos` },
  ];

  cards.forEach((c, idx) => {
    const x = 14 + idx * (cardW + 5);
    doc.setFillColor(243, 246, 250);
    doc.setDrawColor(210, 220, 235);
    doc.roundedRect(x, cardY, cardW, cardH, 2, 2, 'FD');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(110, 125, 145);
    doc.text(c.label, x + 4, cardY + 5);

    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(c.val, x + 4, cardY + 11);
  });

  // Tabela Principal (SEM NENHUM VALOR MONETÁRIO - DIAS DE TRABALHO EM DESTAQUE)
  const headers = [
    ['Nº', 'NOME COMPLETO', 'BI', 'SEXO', 'COORDENAÇÃO', 'FUNÇÃO/MARCA', 'DIAS TRABALHO', 'IBAN', 'BANCO', 'CONTACTO', 'ESTADO'],
  ];

  const bodyData = filteredPeople.map((p, idx) => {
    const infoExtra = p.type === 'moto' ? `${p.marca || ''} ${p.matricula || ''}`.trim() : (p.funcao || (p.type === 'mob' ? 'Mobilizador' : 'Supervisor'));
    return [
      String(idx + 1),
      p.nome,
      p.bi,
      p.sexo,
      p.coord,
      infoExtra || '—',
      `${p.dias} dias`,
      p.iban || 'Pendente',
      p.banco || '—',
      p.contacto || '—',
      p.estado,
    ];
  });

  autoTable(doc, {
    head: headers,
    body: bodyData,
    startY: cardY + cardH + 6,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      lineColor: [215, 225, 238],
      lineWidth: 0.2,
      textColor: [20, 30, 45],
    },
    headStyles: {
      fillColor: [127, 23, 25], // Vermelho formal Sumbe
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 60, fontStyle: 'bold' },
      2: { cellWidth: 26, fontStyle: 'bold', halign: 'center' },
      3: { cellWidth: 12, halign: 'center' },
      4: { cellWidth: 26 },
      5: { cellWidth: 32 },
      6: { cellWidth: 22, halign: 'center', fontStyle: 'bold', textColor: [180, 40, 40] },
      7: { cellWidth: 42, fontStyle: 'normal' },
      8: { cellWidth: 22 },
      9: { cellWidth: 20, halign: 'center' },
      10: { cellWidth: 20, halign: 'center' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 253],
    },
    didDrawPage: (data) => {
      // Rodapé em todas as páginas
      const pageCount = (doc as any).internal.getNumberOfPages();
      const pageCurrent = data.pageNumber;

      doc.setFontSize(8);
      doc.setTextColor(130, 140, 155);
      doc.text(
        `Sistema de Mobilizadores · Sumbe PRO · Campanha de Vacinação contra a Pólio nOVP2 · Página ${pageCurrent} de ${pageCount}`,
        14,
        202
      );
    },
  });

  // Linhas de Assinaturas Formais no final do documento
  const finalY = (doc as any).lastAutoTable.finalY + 16;
  if (finalY < 185) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 75, 95);

    const signY = Math.min(finalY, 178);
    doc.line(20, signY, 85, signY);
    doc.text('O Coordenador de Área / Ronda', 25, signY + 4);

    doc.line(115, signY, 180, signY);
    doc.text('O Supervisor Municipal da Mobilização', 118, signY + 4);

    doc.line(210, signY, 275, signY);
    doc.text('A Direcção Municipal de Saúde', 218, signY + 4);
  }

  const filename = `Relatorio_${coordFilter ? coordFilter.replace(/[\s-]/g, '_') : 'Geral'}_Sumbe_nOVP2_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
