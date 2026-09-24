import React, { useState, useMemo } from 'react';
import {
  Printer,
  FileText,
  FileSpreadsheet,
  Coins,
  Users,
  UserCheck,
  Bike,
  Smartphone,
  Layers,
  Calendar,
  Building,
  Sliders,
  Check,
  RotateCcw,
  Sparkles,
  Clock,
  AlertCircle,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Person, Recarga, SupportedLanguage, PaymentRatesConfig, DEFAULT_PAYMENT_RATES, PersonType } from '../types';
import { normalizeCoordName } from '../utils/validation';
import { exportMapaPagamentoExcel } from '../utils/excelExport';

interface MapaPagamentoViewProps {
  allPeople: Person[];
  recargas: Recarga[];
  lang: SupportedLanguage;
  onBulkUpdateDays?: (targetRole: PersonType | 'all', newDays: number, targetCoord?: string) => void;
}

type MapaCategory = 'mobs' | 'sups' | 'motos' | 'recs' | 'resumo';

const RATES_STORAGE_KEY = 'nOVP2_payment_rates_config';

function loadStoredRates(): PaymentRatesConfig {
  try {
    const raw = localStorage.getItem(RATES_STORAGE_KEY);
    if (raw) return { ...DEFAULT_PAYMENT_RATES, ...JSON.parse(raw) };
  } catch (e) {
    console.error('Failed to load payment rates', e);
  }
  return DEFAULT_PAYMENT_RATES;
}

export const MapaPagamentoView: React.FC<MapaPagamentoViewProps> = ({
  allPeople,
  recargas,
  onBulkUpdateDays,
}) => {
  const [activeCategory, setActiveCategory] = useState<MapaCategory>('mobs');
  const [selectedCoord, setSelectedCoord] = useState<string>('TODAS AS COORDENAÇÕES');
  const [dataCampanha, setDataCampanha] = useState('19 à 23 DE AGOSTO DE 2026');
  const [anoExercicio, setAnoExercicio] = useState('2026');

  // Configuração dinâmica de valores diários e dias de trabalho por função
  const [ratesConfig, setRatesConfig] = useState<PaymentRatesConfig>(loadStoredRates);
  const [showConfigPanel, setShowConfigPanel] = useState<boolean>(false);
  const [applyFeedback, setApplyFeedback] = useState<string>('');

  const updateRate = (key: keyof PaymentRatesConfig, value: number) => {
    const safeVal = Math.max(0, Number(value) || 0);
    const updated = { ...ratesConfig, [key]: safeVal };
    setRatesConfig(updated);
    try {
      localStorage.setItem(RATES_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetRates = () => {
    setRatesConfig(DEFAULT_PAYMENT_RATES);
    try {
      localStorage.setItem(RATES_STORAGE_KEY, JSON.stringify(DEFAULT_PAYMENT_RATES));
    } catch (e) {
      console.error(e);
    }
    setApplyFeedback('Valores diários e dias restaurados para os padrões oficiais da campanha!');
    setTimeout(() => setApplyFeedback(''), 4000);
  };

  const handleApplyRoleDays = (role: PersonType, days: number, label: string) => {
    if (!onBulkUpdateDays) return;
    onBulkUpdateDays(role, days, selectedCoord === 'TODAS AS COORDENAÇÕES' ? undefined : selectedCoord);
    setApplyFeedback(`Sucesso: ${days} dias aplicados a todos os ${label}!`);
    setTimeout(() => setApplyFeedback(''), 4000);
  };

  // Available coordinations
  const coordsList = useMemo(() => {
    const set = new Set(allPeople.map((p) => normalizeCoordName(p.coord)).filter(Boolean));
    return ['TODAS AS COORDENAÇÕES', ...Array.from(set).sort()];
  }, [allPeople]);

  // Helpers to get official payment calculations (utiliza ratesConfig dinâmico)
  const calculateMobRow = (p: Person) => {
    const dias = Number(p.dias) || ratesConfig.mobDays;
    const valDiario = ratesConfig.mobRate;
    const valTotal = dias * valDiario;
    return { dias, valDiario, valTotal };
  };

  const calculateSupRow = (p: Person) => {
    const isMunicipal =
      p.coord.toUpperCase().includes('MUNICIPAL') || p.nome.toUpperCase().includes('VICTÓRIA');
    const dias = Number(p.dias) || (isMunicipal ? ratesConfig.supMunDays : ratesConfig.supAreaDays);
    const valDiario = isMunicipal ? ratesConfig.supMunRate : ratesConfig.supAreaRate;
    const valTotal = dias * valDiario;
    return { dias, valDiario, valTotal, isMunicipal };
  };

  const calculateMotoRow = (p: Person) => {
    const isMunicipal =
      p.coord.toUpperCase().includes('MUNICIPAL') ||
      p.nome.toUpperCase().includes('DOMINGOS CANHANGA');
    const dias = Number(p.dias) || (isMunicipal ? ratesConfig.motoMunDays : ratesConfig.motoAreaDays);
    const valDiario = isMunicipal ? ratesConfig.motoMunRate : ratesConfig.motoAreaRate;
    const valTotal = dias * valDiario;
    return { dias, valDiario, valTotal, isMunicipal };
  };

  // Filtered lists
  const filterByCoord = (list: Person[]) => {
    return list.filter((p) => {
      const match =
        selectedCoord === 'TODAS AS COORDENAÇÕES' ||
        normalizeCoordName(p.coord) === normalizeCoordName(selectedCoord);
      return match && p.estado !== 'Substituído';
    });
  };

  const mobsList = useMemo(
    () => filterByCoord(allPeople.filter((p) => p.type === 'mob')),
    [allPeople, selectedCoord]
  );
  const supsList = useMemo(
    () => filterByCoord(allPeople.filter((p) => p.type === 'sup')),
    [allPeople, selectedCoord]
  );
  const motosList = useMemo(
    () => filterByCoord(allPeople.filter((p) => p.type === 'moto')),
    [allPeople, selectedCoord]
  );

  const recsList = useMemo(() => {
    return recargas.filter((r) => {
      return (
        selectedCoord === 'TODAS AS COORDENAÇÕES' ||
        normalizeCoordName(r.coord) === normalizeCoordName(selectedCoord)
      );
    });
  }, [recargas, selectedCoord]);

  // Totals calculations
  const totalMobsKz = useMemo(
    () => mobsList.reduce((acc, p) => acc + calculateMobRow(p).valTotal, 0),
    [mobsList]
  );
  const totalSupsKz = useMemo(
    () => supsList.reduce((acc, p) => acc + calculateSupRow(p).valTotal, 0),
    [supsList]
  );
  const totalMotosKz = useMemo(
    () => motosList.reduce((acc, p) => acc + calculateMotoRow(p).valTotal, 0),
    [motosList]
  );
  const totalRecsKz = useMemo(
    () =>
      recsList.reduce(
        (acc, r) => acc + (Number(r.qtd) || ratesConfig.recDefaultQtd) * ratesConfig.recUnitVal,
        0
      ),
    [recsList, ratesConfig]
  );
  const totalGeralCampanha = totalMobsKz + totalSupsKz + totalMotosKz + totalRecsKz;

  // Title strings
  const getMapTitle = () => {
    switch (activeCategory) {
      case 'mobs':
        return 'MAPA DE PAGAMENTO DOS MOBILIZADORES';
      case 'sups':
        return 'MAPA DE PAGAMENTO DOS SUPERVISORES DA MOBILIZAÇÃO';
      case 'motos':
        return 'MAPA DE PAGAMENTO DOS TRANSPORTES DE APOIO AOS SUPERVISORES DA MOBILIZAÇÃO';
      case 'recs':
        return 'MAPA DE RECARGA PARA OS SUPERVISORES DA MOBILIZAÇÃO';
      case 'resumo':
        return 'MAPA RESUMO FINANCEIRO GERAL DA CAMPANHA';
    }
  };

  // Direct Print
  const handlePrint = () => {
    window.print();
  };

  // Excel Export
  const handleExportExcel = () => {
    exportMapaPagamentoExcel(
      activeCategory === 'resumo' ? 'todos' : activeCategory,
      allPeople,
      recargas,
      selectedCoord,
      ratesConfig
    );
  };

  // PDF Export
  const handleExportPDF = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    // Official Header
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('REPÚBLICA DE ANGOLA', 148.5, 8, { align: 'center' });
    doc.setFontSize(8);
    doc.text('GOVERNO DA PROVÍNCIA DO CUANZA-SUL', 148.5, 12, { align: 'center' });
    doc.text('ADMINISTRAÇÃO MUNICIPAL DO SUMBE', 148.5, 16, { align: 'center' });
    doc.text('DIRECÇÃO DE SAÚDE', 148.5, 20, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('Campanha de Vacinação Contra a Póliomielite nOVP2 3ª/Ronda', 148.5, 24, {
      align: 'center',
    });
    doc.setFont('helvetica', 'bold');
    doc.text(dataCampanha, 148.5, 28, { align: 'center' });

    // Top Right Visto Box (Exact match to PDF)
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.3);
    doc.rect(215, 6, 70, 20);
    doc.setFontSize(7.5);
    doc.text('VISTO,', 250, 10, { align: 'center' });
    doc.text('O DIRECTOR MUNICIPAL', 250, 14, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text(`DATA _____ / _____ / ${anoExercicio}`, 250, 22, { align: 'center' });

    // Title
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(getMapTitle(), 148.5, 34, { align: 'center' });

    if (selectedCoord !== 'TODAS AS COORDENAÇÕES') {
      doc.setFontSize(8.5);
      doc.setTextColor(180, 83, 9);
      doc.text(`COORDENAÇÃO: ${selectedCoord}`, 148.5, 38, { align: 'center' });
    }

    const startTableY = selectedCoord !== 'TODAS AS COORDENAÇÕES' ? 41 : 37;

    // Body based on category
    if (activeCategory === 'mobs') {
      const headers = [
        'Nº',
        'NOME COMPLETO',
        'BI',
        'SEXO',
        'COORDENAÇÃO',
        'TOTAL/DIAS',
        'VAL. DIÁRIO',
        'VAL. TOTAL',
        'IBAN',
        'BANCO',
      ];
      const rows = mobsList.map((p, idx) => {
        const { dias, valDiario, valTotal } = calculateMobRow(p);
        return [
          String(idx + 1),
          p.nome,
          p.bi,
          p.sexo,
          p.coord,
          String(dias),
          valDiario.toLocaleString('pt-AO', { minimumFractionDigits: 2 }),
          valTotal.toLocaleString('pt-AO', { minimumFractionDigits: 2 }),
          p.iban,
          p.banco,
        ];
      });

      // Total Row
      rows.push([
        '',
        'TOTAL GERAL',
        '',
        '',
        '',
        String(mobsList.reduce((acc, p) => acc + (p.dias || 5), 0)),
        '',
        totalMobsKz.toLocaleString('pt-AO', { minimumFractionDigits: 2 }),
        '',
        '',
      ]);

      autoTable(doc, {
        startY: startTableY,
        head: [headers],
        body: rows,
        styles: {
          fontSize: 6.5,
          cellPadding: 1.5,
          lineColor: [148, 163, 184],
          lineWidth: 0.1,
          valign: 'middle',
        },
        headStyles: {
          fillColor: [56, 189, 248], // Sky Blue as in Sumbe PDF
          textColor: [15, 23, 42],
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 7,
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 8 },
          1: { fontStyle: 'bold', cellWidth: 50 },
          2: { halign: 'center', cellWidth: 26 },
          3: { halign: 'center', cellWidth: 10 },
          4: { halign: 'center', cellWidth: 24 },
          5: { halign: 'center', cellWidth: 16 },
          6: { halign: 'right', cellWidth: 18 },
          7: { halign: 'right', fontStyle: 'bold', cellWidth: 20 },
          8: { halign: 'center', cellWidth: 62 },
          9: { halign: 'center', cellWidth: 22 },
        },
        didDrawPage: () => {
          const pageHeight = doc.internal.pageSize.height || 210;
          doc.setFontSize(7.5);
          doc.setTextColor(15, 23, 42);
          doc.text(
            `DIRECÇÃO MUNICIPAL DE SAÚDE AOS _________ DE _____________________ DE ${anoExercicio}`,
            148.5,
            pageHeight - 8,
            { align: 'center' }
          );
        },
      });
    } else if (activeCategory === 'sups') {
      const headers = [
        'Nº',
        'NOME COMPLETO',
        'BI',
        'SEXO',
        'A. COORDENAÇÃO',
        'T. DIA',
        'VAL. DIÁRIO',
        'VAL. TOTAL',
        'IBAN',
        'BANCO',
      ];
      const rows = supsList.map((p, idx) => {
        const { dias, valDiario, valTotal } = calculateSupRow(p);
        return [
          String(idx + 1),
          p.nome,
          p.bi,
          p.sexo,
          p.coord,
          String(dias),
          valDiario.toLocaleString('pt-AO', { minimumFractionDigits: 2 }),
          valTotal.toLocaleString('pt-AO', { minimumFractionDigits: 2 }),
          p.iban,
          p.banco,
        ];
      });

      rows.push([
        '',
        'TOTAL GERAL',
        '',
        '',
        '',
        String(supsList.reduce((acc, p) => acc + (p.dias || 5), 0)),
        '',
        totalSupsKz.toLocaleString('pt-AO', { minimumFractionDigits: 2 }),
        '',
        '',
      ]);

      autoTable(doc, {
        startY: startTableY,
        head: [headers],
        body: rows,
        styles: {
          fontSize: 7,
          cellPadding: 2,
          lineColor: [148, 163, 184],
          lineWidth: 0.1,
          valign: 'middle',
        },
        headStyles: {
          fillColor: [2, 132, 199], // Deep Sky Blue
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 7.5,
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 8 },
          1: { fontStyle: 'bold', cellWidth: 54 },
          2: { halign: 'center', cellWidth: 26 },
          3: { halign: 'center', cellWidth: 10 },
          4: { halign: 'center', cellWidth: 24 },
          5: { halign: 'center', cellWidth: 16 },
          6: { halign: 'right', cellWidth: 18 },
          7: { halign: 'right', fontStyle: 'bold', cellWidth: 22 },
          8: { halign: 'center', cellWidth: 62 },
          9: { halign: 'center', cellWidth: 24 },
        },
        didDrawPage: () => {
          const pageHeight = doc.internal.pageSize.height || 210;
          doc.setFontSize(7.5);
          doc.setTextColor(15, 23, 42);
          doc.text(
            `DIRECÇÃO MUNICIPAL DE SAÚDE AOS _________ DE _____________________ DE ${anoExercicio}`,
            148.5,
            pageHeight - 8,
            { align: 'center' }
          );
        },
      });
    } else if (activeCategory === 'motos') {
      const headers = [
        'Nº',
        'NOME COMPLETO',
        'BI',
        'SEXO',
        'A. COORDENAÇÃO',
        'MARCA',
        'MATRÍCULA',
        'T. DIA',
        'VAL. DIÁRIO',
        'VAL. TOTAL',
        'IBAN',
        'BANCO',
      ];
      const rows = motosList.map((p, idx) => {
        const { dias, valDiario, valTotal } = calculateMotoRow(p);
        return [
          String(idx + 1),
          p.nome,
          p.bi,
          p.sexo,
          p.coord,
          p.marca || 'LING KEN',
          p.matricula || '—',
          String(dias),
          valDiario.toLocaleString('pt-AO', { minimumFractionDigits: 2 }),
          valTotal.toLocaleString('pt-AO', { minimumFractionDigits: 2 }),
          p.iban,
          p.banco,
        ];
      });

      rows.push([
        '',
        'TOTAL GERAL',
        '',
        '',
        '',
        '',
        '',
        String(motosList.reduce((acc, p) => acc + (p.dias || 4), 0)),
        '',
        totalMotosKz.toLocaleString('pt-AO', { minimumFractionDigits: 2 }),
        '',
        '',
      ]);

      autoTable(doc, {
        startY: startTableY,
        head: [headers],
        body: rows,
        styles: {
          fontSize: 6.5,
          cellPadding: 1.8,
          lineColor: [148, 163, 184],
          lineWidth: 0.1,
          valign: 'middle',
        },
        headStyles: {
          fillColor: [13, 148, 136], // Teal as in PDF
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 7,
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 7 },
          1: { fontStyle: 'bold', cellWidth: 46 },
          2: { halign: 'center', cellWidth: 24 },
          3: { halign: 'center', cellWidth: 9 },
          4: { halign: 'center', cellWidth: 22 },
          5: { halign: 'center', cellWidth: 17 },
          6: { halign: 'center', cellWidth: 20 },
          7: { halign: 'center', cellWidth: 12 },
          8: { halign: 'right', cellWidth: 18 },
          9: { halign: 'right', fontStyle: 'bold', cellWidth: 20 },
          10: { halign: 'center', cellWidth: 54 },
          11: { halign: 'center', cellWidth: 20 },
        },
        didDrawPage: () => {
          const pageHeight = doc.internal.pageSize.height || 210;
          doc.setFontSize(7.5);
          doc.setTextColor(15, 23, 42);

          const signY = pageHeight - 16;
          doc.text('________________________________', 40, signY);
          doc.text('Financeiro Municipal', 40, signY + 3.5);

          doc.text('________________________________', 148.5, signY, { align: 'center' });
          doc.text('Inspetora Administrativa de Saúde Municipal', 148.5, signY + 3.5, {
            align: 'center',
          });

          doc.text('________________________________', 245, signY);
          doc.text('Assessor Provincial de Saúde', 245, signY + 3.5);

          doc.text(
            `DIRECÇÃO MUNICIPAL DE SAÚDE AOS _________ DE _____________________ DE ${anoExercicio}`,
            148.5,
            pageHeight - 4,
            { align: 'center' }
          );
        },
      });
    } else if (activeCategory === 'recs') {
      const headers = [
        'Nº',
        'Nome Completo',
        'Função',
        'COORDENAÇÃO',
        'QTD',
        'VALOR DA RECARGA',
        'TELEFONE',
        'ASSINATURA',
      ];
      const rows = recsList.map((r, idx) => {
        const qtd = Number(r.qtd) || 2;
        const total = qtd * 1000;
        return [
          String(idx + 1),
          r.nome,
          r.funcao || 'Supervisor (a) de Mobsoc',
          r.coord,
          String(qtd),
          total.toLocaleString('pt-AO', { minimumFractionDigits: 2 }),
          r.telefone || '',
          '________________',
        ];
      });

      rows.push([
        '',
        'TOTAL GERAL',
        '',
        '',
        String(recsList.reduce((acc, r) => acc + (r.qtd || 2), 0)),
        totalRecsKz.toLocaleString('pt-AO', { minimumFractionDigits: 2 }),
        '',
        '',
      ]);

      autoTable(doc, {
        startY: startTableY,
        head: [headers],
        body: rows,
        styles: {
          fontSize: 7.5,
          cellPadding: 2,
          lineColor: [148, 163, 184],
          lineWidth: 0.1,
          valign: 'middle',
        },
        headStyles: {
          fillColor: [79, 70, 229], // Indigo
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 7.5,
        },
        didDrawPage: () => {
          const pageHeight = doc.internal.pageSize.height || 210;
          doc.setFontSize(7.5);
          doc.setTextColor(15, 23, 42);

          const signY = pageHeight - 14;
          doc.text('Chefe de Secção da Saúde Pública', 148.5, signY, { align: 'center' });
          doc.text('_______________________________________________', 148.5, signY + 4, {
            align: 'center',
          });
          doc.text('MSc. MARIA JÚLIA DOMINGOS DA SILVA', 148.5, signY + 7.5, { align: 'center' });

          doc.text(
            `DIRECÇÃO MUNICIPAL DE SAÚDE AOS _________ DE _____________________ DE ${anoExercicio}`,
            148.5,
            pageHeight - 3,
            { align: 'center' }
          );
        },
      });
    }

    doc.save(
      `Mapa_Pagamento_${activeCategory.toUpperCase()}_Sumbe_${selectedCoord.replace(/[\s-]/g, '_')}.pdf`
    );
  };

  return (
    <div className="space-y-6">
      {/* CONTROLS CARD */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/95 p-5 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Coins className="h-5 w-5 text-amber-400" />
              <span>Mapas Oficiais de Pagamento · Campanha nOVP2</span>
            </h2>
            <p className="text-xs text-slate-400">
              Emissão e exportação em conformidade com o modelo oficial da Direcção Municipal de Saúde do Sumbe
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowConfigPanel(!showConfigPanel)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition shadow ${
                showConfigPanel
                  ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300'
                  : 'bg-slate-800 text-amber-300 border border-amber-500/40 hover:bg-slate-700'
              }`}
              title="Configurar valores diários em Kwanzas e dias de trabalho por função"
            >
              <Sliders className="h-4 w-4" />
              <span>{showConfigPanel ? 'Ocultar Parâmetros' : 'Ajustar Valores & Dias'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 hover:text-white transition shadow"
            >
              <Printer className="h-4 w-4 text-amber-400" />
              <span>Imprimir</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 py-2 text-xs font-bold text-white hover:from-emerald-500 hover:to-teal-500 transition shadow"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Exportar Excel</span>
            </button>

            <button
              onClick={handleExportPDF}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 px-3.5 py-2 text-xs font-bold text-white hover:from-red-500 hover:to-red-600 transition shadow"
            >
              <FileText className="h-4 w-4" />
              <span>Gerar PDF Oficial</span>
            </button>
          </div>
        </div>

        {/* PAINEL DINÂMICO DE VALORES DIÁRIOS & DIAS DE TRABALHO POR FUNÇÃO */}
        {showConfigPanel && (
          <div className="rounded-2xl border border-amber-500/40 bg-slate-950/95 p-4.5 shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-amber-400" />
                  <span>Configuração de Valores Diários e Dias de Trabalho por Função</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Altere o valor diário em Kwanzas (Kz) ou o número de dias quando a ronda é prolongada. As tabelas, somas, impressão, Excel e PDF são recalculados instantaneamente.
                </p>
              </div>

              <button
                onClick={handleResetRates}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
              >
                <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
                <span>Restaurar Padrões Oficiais</span>
              </button>
            </div>

            {applyFeedback && (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/60 p-2.5 text-xs text-emerald-200 flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-400" />
                <span>{applyFeedback}</span>
              </div>
            )}

            {/* Grid of Roles */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {/* Mobilizadores */}
              <div className="rounded-xl border border-sky-800/60 bg-sky-950/30 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    Mobilizadores
                  </span>
                  <span className="text-[10px] text-sky-400 font-semibold">{mobsList.length} pessoas</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold block mb-1">Valor Diário (Kz)</label>
                    <input
                      type="number"
                      value={ratesConfig.mobRate}
                      onChange={(e) => updateRate('mobRate', Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-mono font-bold text-white outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold block mb-1">Dias Padrão</label>
                    <input
                      type="number"
                      value={ratesConfig.mobDays}
                      onChange={(e) => updateRate('mobDays', Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-mono font-bold text-white outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
                <div className="pt-1 flex items-center justify-between border-t border-sky-900/50">
                  <div className="text-[11px] text-slate-300">
                    Total: <b className="text-sky-300 font-mono">{(ratesConfig.mobRate * ratesConfig.mobDays).toLocaleString('pt-AO')} Kz</b>
                  </div>
                  {onBulkUpdateDays && (
                    <button
                      onClick={() => handleApplyRoleDays('mob', ratesConfig.mobDays, 'Mobilizadores')}
                      className="rounded-lg bg-sky-600 hover:bg-sky-500 px-2.5 py-1 text-[10px] font-bold text-white transition shadow"
                      title="Aplica este número de dias a todos os mobilizadores"
                    >
                      ⚡ Aplicar {ratesConfig.mobDays} dias a todos
                    </button>
                  )}
                </div>
              </div>

              {/* Supervisores de Área */}
              <div className="rounded-xl border border-blue-800/60 bg-blue-950/30 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5" />
                    Supervisores de Área
                  </span>
                  <span className="text-[10px] text-blue-400 font-semibold">Coordenações Locais</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold block mb-1">Valor Diário (Kz)</label>
                    <input
                      type="number"
                      value={ratesConfig.supAreaRate}
                      onChange={(e) => updateRate('supAreaRate', Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-mono font-bold text-white outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold block mb-1">Dias Padrão</label>
                    <input
                      type="number"
                      value={ratesConfig.supAreaDays}
                      onChange={(e) => updateRate('supAreaDays', Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-mono font-bold text-white outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="pt-1 flex items-center justify-between border-t border-blue-900/50">
                  <div className="text-[11px] text-slate-300">
                    Total: <b className="text-blue-300 font-mono">{(ratesConfig.supAreaRate * ratesConfig.supAreaDays).toLocaleString('pt-AO')} Kz</b>
                  </div>
                  {onBulkUpdateDays && (
                    <button
                      onClick={() => handleApplyRoleDays('sup', ratesConfig.supAreaDays, 'Supervisores')}
                      className="rounded-lg bg-blue-600 hover:bg-blue-500 px-2.5 py-1 text-[10px] font-bold text-white transition shadow"
                    >
                      ⚡ Aplicar {ratesConfig.supAreaDays} dias
                    </button>
                  )}
                </div>
              </div>

              {/* Supervisor Municipal */}
              <div className="rounded-xl border border-indigo-800/60 bg-indigo-950/30 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                    <Building className="h-3.5 w-3.5" />
                    Supervisor Municipal
                  </span>
                  <span className="text-[10px] text-indigo-400 font-semibold">Coordenação Geral</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold block mb-1">Valor Diário (Kz)</label>
                    <input
                      type="number"
                      value={ratesConfig.supMunRate}
                      onChange={(e) => updateRate('supMunRate', Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-mono font-bold text-white outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold block mb-1">Dias Padrão</label>
                    <input
                      type="number"
                      value={ratesConfig.supMunDays}
                      onChange={(e) => updateRate('supMunDays', Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-mono font-bold text-white outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div className="pt-1 text-[11px] text-slate-300 border-t border-indigo-900/50">
                  Total Municipal: <b className="text-indigo-300 font-mono">{(ratesConfig.supMunRate * ratesConfig.supMunDays).toLocaleString('pt-AO')} Kz</b>
                </div>
              </div>

              {/* Motoqueiros / Apoio de Área */}
              <div className="rounded-xl border border-teal-800/60 bg-teal-950/30 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
                    <Bike className="h-3.5 w-3.5" />
                    Motoqueiros de Área
                  </span>
                  <span className="text-[10px] text-teal-400 font-semibold">Transporte Apoio</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold block mb-1">Valor Diário (Kz)</label>
                    <input
                      type="number"
                      value={ratesConfig.motoAreaRate}
                      onChange={(e) => updateRate('motoAreaRate', Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-mono font-bold text-white outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold block mb-1">Dias Padrão</label>
                    <input
                      type="number"
                      value={ratesConfig.motoAreaDays}
                      onChange={(e) => updateRate('motoAreaDays', Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-mono font-bold text-white outline-none focus:border-teal-500"
                    />
                  </div>
                </div>
                <div className="pt-1 flex items-center justify-between border-t border-teal-900/50">
                  <div className="text-[11px] text-slate-300">
                    Total: <b className="text-teal-300 font-mono">{(ratesConfig.motoAreaRate * ratesConfig.motoAreaDays).toLocaleString('pt-AO')} Kz</b>
                  </div>
                  {onBulkUpdateDays && (
                    <button
                      onClick={() => handleApplyRoleDays('moto', ratesConfig.motoAreaDays, 'Motoqueiros')}
                      className="rounded-lg bg-teal-600 hover:bg-teal-500 px-2.5 py-1 text-[10px] font-bold text-white transition shadow"
                    >
                      ⚡ Aplicar {ratesConfig.motoAreaDays} dias
                    </button>
                  )}
                </div>
              </div>

              {/* Viatura Municipal */}
              <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/30 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <Building className="h-3.5 w-3.5" />
                    Viatura Municipal (Ford)
                  </span>
                  <span className="text-[10px] text-emerald-400 font-semibold">Logística Central</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold block mb-1">Valor Diário (Kz)</label>
                    <input
                      type="number"
                      value={ratesConfig.motoMunRate}
                      onChange={(e) => updateRate('motoMunRate', Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-mono font-bold text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold block mb-1">Dias Padrão</label>
                    <input
                      type="number"
                      value={ratesConfig.motoMunDays}
                      onChange={(e) => updateRate('motoMunDays', Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-mono font-bold text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
                <div className="pt-1 text-[11px] text-slate-300 border-t border-emerald-900/50">
                  Total Viatura: <b className="text-emerald-300 font-mono">{(ratesConfig.motoMunRate * ratesConfig.motoMunDays).toLocaleString('pt-AO')} Kz</b>
                </div>
              </div>

              {/* Recargas Telefónicas */}
              <div className="rounded-xl border border-purple-800/60 bg-purple-950/30 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                    <Smartphone className="h-3.5 w-3.5" />
                    Recargas Telefónicas
                  </span>
                  <span className="text-[10px] text-purple-400 font-semibold">Comunicação</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold block mb-1">Valor Unitário (Kz)</label>
                    <input
                      type="number"
                      value={ratesConfig.recUnitVal}
                      onChange={(e) => updateRate('recUnitVal', Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-mono font-bold text-white outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold block mb-1">Qtd por Supervisor</label>
                    <input
                      type="number"
                      value={ratesConfig.recDefaultQtd}
                      onChange={(e) => updateRate('recDefaultQtd', Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-mono font-bold text-white outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
                <div className="pt-1 text-[11px] text-slate-300 border-t border-purple-900/50">
                  Total/Supervisor: <b className="text-purple-300 font-mono">{(ratesConfig.recUnitVal * ratesConfig.recDefaultQtd).toLocaleString('pt-AO')} Kz</b>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 1. SELEÇÃO DA CATEGORIA DO MAPA */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">
            1. Selecione o Mapa de Pagamento:
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <button
              type="button"
              onClick={() => setActiveCategory('mobs')}
              className={`flex flex-col rounded-xl p-3 text-left transition shadow-sm ${
                activeCategory === 'mobs'
                  ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-slate-950 ring-2 ring-sky-300 font-bold'
                  : 'border border-slate-800 bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  <span>Mobilizadores</span>
                </span>
                <span className="rounded-full bg-slate-950/40 px-1.5 py-0.2 text-[10px]">
                  {mobsList.length}
                </span>
              </div>
              <div className="mt-2 text-sm font-black">
                {totalMobsKz.toLocaleString('pt-AO')} Kz
              </div>
              <div className="text-[10px] opacity-80">5.000 Kz / dia</div>
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory('sups')}
              className={`flex flex-col rounded-xl p-3 text-left transition shadow-sm ${
                activeCategory === 'sups'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white ring-2 ring-blue-300 font-bold'
                  : 'border border-slate-800 bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4" />
                  <span>Supervisores</span>
                </span>
                <span className="rounded-full bg-slate-950/40 px-1.5 py-0.2 text-[10px]">
                  {supsList.length}
                </span>
              </div>
              <div className="mt-2 text-sm font-black">
                {totalSupsKz.toLocaleString('pt-AO')} Kz
              </div>
              <div className="text-[10px] opacity-80">10.000 / 25.000 Kz dia</div>
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory('motos')}
              className={`flex flex-col rounded-xl p-3 text-left transition shadow-sm ${
                activeCategory === 'motos'
                  ? 'bg-gradient-to-r from-teal-600 to-teal-700 text-white ring-2 ring-teal-300 font-bold'
                  : 'border border-slate-800 bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1.5">
                  <Bike className="h-4 w-4" />
                  <span>Transportes / Motos</span>
                </span>
                <span className="rounded-full bg-slate-950/40 px-1.5 py-0.2 text-[10px]">
                  {motosList.length}
                </span>
              </div>
              <div className="mt-2 text-sm font-black">
                {totalMotosKz.toLocaleString('pt-AO')} Kz
              </div>
              <div className="text-[10px] opacity-80">40.000 / 100.000 Kz dia</div>
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory('recs')}
              className={`flex flex-col rounded-xl p-3 text-left transition shadow-sm ${
                activeCategory === 'recs'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white ring-2 ring-indigo-300 font-bold'
                  : 'border border-slate-800 bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1.5">
                  <Smartphone className="h-4 w-4" />
                  <span>Recargas Telefónicas</span>
                </span>
                <span className="rounded-full bg-slate-950/40 px-1.5 py-0.2 text-[10px]">
                  {recsList.length}
                </span>
              </div>
              <div className="mt-2 text-sm font-black">
                {totalRecsKz.toLocaleString('pt-AO')} Kz
              </div>
              <div className="text-[10px] opacity-80">2.000 Kz / supervisor</div>
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory('resumo')}
              className={`flex flex-col rounded-xl p-3 text-left transition shadow-sm ${
                activeCategory === 'resumo'
                  ? 'bg-gradient-to-r from-amber-500 to-red-600 text-slate-950 ring-2 ring-amber-300 font-bold'
                  : 'border border-slate-800 bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1.5">
                  <Layers className="h-4 w-4" />
                  <span>Total Geral</span>
                </span>
                <span className="rounded-full bg-slate-950/40 px-1.5 py-0.2 text-[10px]">
                  Global
                </span>
              </div>
              <div className="mt-2 text-sm font-black">
                {totalGeralCampanha.toLocaleString('pt-AO')} Kz
              </div>
              <div className="text-[10px] opacity-80">Orçamento Consolidado</div>
            </button>
          </div>
        </div>

        {/* 2. FILTRAR POR COORDENAÇÃO */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            2. Filtrar por Coordenação (ou ver Município Geral):
          </label>
          <div className="flex flex-wrap gap-2">
            {coordsList.map((c) => {
              const isActive = selectedCoord === c;
              return (
                <button
                  type="button"
                  key={c}
                  onClick={() => setSelectedCoord(c)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition shadow-sm ${
                    isActive
                      ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white ring-2 ring-amber-400'
                      : 'border border-slate-800 bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. DADOS DE CABEÇALHO */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-slate-300 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <span>Período da Ronda:</span>
            <input
              type="text"
              value={dataCampanha}
              onChange={(e) => setDataCampanha(e.target.value)}
              className="w-56 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white font-semibold"
            />
          </div>

          <div className="flex items-center gap-2">
            <span>Ano de Exercício:</span>
            <input
              type="text"
              value={anoExercicio}
              onChange={(e) => setAnoExercicio(e.target.value)}
              className="w-20 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white font-semibold"
            />
          </div>
        </div>
      </div>

      {/* DOCUMENT PREVIEW & PRINTABLE VIEW */}
      <div className="rounded-2xl border border-slate-800 bg-white text-slate-950 p-6 shadow-2xl print:p-0 print:border-none print:shadow-none">
        {/* Document Header matching official PDF */}
        <div className="relative mb-6">
          {/* Center Title block */}
          <div className="text-center">
            <div className="text-[11px] font-black uppercase tracking-wider text-slate-900">
              REPÚBLICA DE ANGOLA
            </div>
            <div className="text-[10px] font-bold uppercase text-slate-800">
              GOVERNO DA PROVÍNCIA DO CUANZA-SUL
            </div>
            <div className="text-[11px] font-black uppercase text-slate-900">
              ADMINISTRAÇÃO MUNICIPAL DO SUMBE
            </div>
            <div className="text-[10px] font-bold uppercase text-slate-800">
              DIRECÇÃO DE SAÚDE
            </div>
            <div className="text-[9.5px] mt-1 text-slate-600">
              Campanha de Vacinação Contra a Póliomielite nOVP2 3ª/Ronda
            </div>
            <div className="text-[9.5px] font-bold text-slate-900 uppercase">
              {dataCampanha}
            </div>
          </div>

          {/* Top Right "VISTO, O DIRECTOR MUNICIPAL" Box (From PDF) */}
          <div className="absolute right-0 top-0 hidden sm:block border border-slate-900 p-2 text-center text-[9px] w-48 bg-slate-50">
            <div className="font-black text-slate-900">VISTO,</div>
            <div className="font-bold text-slate-800">O DIRECTOR MUNICIPAL</div>
            <div className="mt-3 font-mono text-[8.5px]">
              DATA _____ / _____ / {anoExercicio}
            </div>
          </div>

          {/* Main Map Name */}
          <div className="mt-4 text-center">
            <div className="text-xs font-black tracking-wider uppercase text-slate-950 underline underline-offset-4">
              {getMapTitle()}
            </div>
            {selectedCoord !== 'TODAS AS COORDENAÇÕES' && (
              <div className="text-[11px] font-bold text-amber-700 mt-1 uppercase">
                COORDENAÇÃO: {selectedCoord}
              </div>
            )}
          </div>
        </div>

        {/* 1. TABLE MOBILIZADORES */}
        {activeCategory === 'mobs' && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-900 text-[10px]">
              <thead>
                <tr className="bg-sky-400 text-slate-950 font-bold uppercase text-center border-b border-slate-900">
                  <th className="border border-slate-900 p-1.5 w-8">Nº</th>
                  <th className="border border-slate-900 p-1.5 text-left">NOME COMPLETO</th>
                  <th className="border border-slate-900 p-1.5">BI</th>
                  <th className="border border-slate-900 p-1.5 w-10">SEXO</th>
                  <th className="border border-slate-900 p-1.5">COORDENAÇÃO</th>
                  <th className="border border-slate-900 p-1.5 w-16">TOTAL/DIAS</th>
                  <th className="border border-slate-900 p-1.5 text-right w-20">VAL. DIÁRIO</th>
                  <th className="border border-slate-900 p-1.5 text-right w-24">VAL. TOTAL</th>
                  <th className="border border-slate-900 p-1.5 text-left">IBAN</th>
                  <th className="border border-slate-900 p-1.5 w-20">BANCO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {mobsList.map((p, idx) => {
                  const { dias, valDiario, valTotal } = calculateMobRow(p);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="border border-slate-900 p-1 text-center font-mono font-bold">
                        {idx + 1}
                      </td>
                      <td className="border border-slate-900 p-1 font-bold text-slate-900 text-[10.5px]">
                        {p.nome}
                      </td>
                      <td className="border border-slate-900 p-1 text-center font-mono text-[9.5px]">
                        {p.bi}
                      </td>
                      <td className="border border-slate-900 p-1 text-center">{p.sexo}</td>
                      <td className="border border-slate-900 p-1 text-center font-semibold">
                        {p.coord}
                      </td>
                      <td className="border border-slate-900 p-1 text-center font-bold">{dias}</td>
                      <td className="border border-slate-900 p-1 text-right font-mono">
                        {valDiario.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="border border-slate-900 p-1 text-right font-mono font-bold text-slate-900">
                        {valTotal.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="border border-slate-900 p-1 font-mono text-[9px]">
                        {p.iban}
                      </td>
                      <td className="border border-slate-900 p-1 text-center font-bold">
                        {p.banco}
                      </td>
                    </tr>
                  );
                })}

                {/* Total Row */}
                <tr className="bg-yellow-100 font-bold border-t-2 border-slate-950">
                  <td colSpan={5} className="border border-slate-900 p-1.5 text-right font-black uppercase">
                    TOTAL GERAL ({mobsList.length} Mobilizadores):
                  </td>
                  <td className="border border-slate-900 p-1.5 text-center font-black">
                    {mobsList.reduce((acc, p) => acc + (p.dias || 5), 0)}
                  </td>
                  <td className="border border-slate-900 p-1.5"></td>
                  <td className="border border-slate-900 p-1.5 text-right font-black text-red-900 text-xs">
                    {totalMobsKz.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}
                  </td>
                  <td colSpan={2} className="border border-slate-900 p-1.5 text-slate-600 text-[9px]">
                    Kz (Kwanzas)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* 2. TABLE SUPERVISORES */}
        {activeCategory === 'sups' && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-900 text-[10px]">
              <thead>
                <tr className="bg-sky-500 text-white font-bold uppercase text-center border-b border-slate-900">
                  <th className="border border-slate-900 p-1.5 w-8">Nº</th>
                  <th className="border border-slate-900 p-1.5 text-left">NOME COMPLETO</th>
                  <th className="border border-slate-900 p-1.5">BI</th>
                  <th className="border border-slate-900 p-1.5 w-10">SEXO</th>
                  <th className="border border-slate-900 p-1.5">A. COORDENAÇÃO</th>
                  <th className="border border-slate-900 p-1.5 w-16">T. DIA</th>
                  <th className="border border-slate-900 p-1.5 text-right w-24">VAL. DIÁRIO</th>
                  <th className="border border-slate-900 p-1.5 text-right w-24">VAL. TOTAL</th>
                  <th className="border border-slate-900 p-1.5 text-left">IBAN</th>
                  <th className="border border-slate-900 p-1.5 w-24">BANCO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {supsList.map((p, idx) => {
                  const { dias, valDiario, valTotal } = calculateSupRow(p);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="border border-slate-900 p-1.5 text-center font-mono font-bold">
                        {idx + 1}
                      </td>
                      <td className="border border-slate-900 p-1.5 font-bold text-slate-900">
                        {p.nome}
                      </td>
                      <td className="border border-slate-900 p-1.5 text-center font-mono text-[9.5px]">
                        {p.bi}
                      </td>
                      <td className="border border-slate-900 p-1.5 text-center">{p.sexo}</td>
                      <td className="border border-slate-900 p-1.5 text-center font-semibold">
                        {p.coord}
                      </td>
                      <td className="border border-slate-900 p-1.5 text-center font-bold">
                        {dias}
                      </td>
                      <td className="border border-slate-900 p-1.5 text-right font-mono">
                        {valDiario.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="border border-slate-900 p-1.5 text-right font-mono font-bold text-slate-900">
                        {valTotal.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="border border-slate-900 p-1.5 font-mono text-[9px]">
                        {p.iban}
                      </td>
                      <td className="border border-slate-900 p-1.5 text-center font-bold">
                        {p.banco}
                      </td>
                    </tr>
                  );
                })}

                <tr className="bg-yellow-100 font-bold border-t-2 border-slate-950">
                  <td colSpan={5} className="border border-slate-900 p-1.5 text-right font-black uppercase">
                    TOTAL GERAL ({supsList.length} Supervisores):
                  </td>
                  <td className="border border-slate-900 p-1.5 text-center font-black">
                    {supsList.reduce((acc, p) => acc + (p.dias || 5), 0)}
                  </td>
                  <td className="border border-slate-900 p-1.5"></td>
                  <td className="border border-slate-900 p-1.5 text-right font-black text-red-900 text-xs">
                    {totalSupsKz.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}
                  </td>
                  <td colSpan={2} className="border border-slate-900 p-1.5 text-slate-600 text-[9px]">
                    Kz (Kwanzas)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* 3. TABLE TRANSPORTES DE APOIO (MOTOQUEIROS) */}
        {activeCategory === 'motos' && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-900 text-[9.5px]">
              <thead>
                <tr className="bg-emerald-600 text-white font-bold uppercase text-center border-b border-slate-900">
                  <th className="border border-slate-900 p-1.5 w-7">Nº</th>
                  <th className="border border-slate-900 p-1.5 text-left">NOME COMPLETO</th>
                  <th className="border border-slate-900 p-1.5">BI</th>
                  <th className="border border-slate-900 p-1.5 w-8">SEXO</th>
                  <th className="border border-slate-900 p-1.5">A. COORDENAÇÃO</th>
                  <th className="border border-slate-900 p-1.5">MARCA</th>
                  <th className="border border-slate-900 p-1.5">MATRÍCULA</th>
                  <th className="border border-slate-900 p-1.5 w-12">T. DIA</th>
                  <th className="border border-slate-900 p-1.5 text-right w-20">VAL. DIÁRIO</th>
                  <th className="border border-slate-900 p-1.5 text-right w-24">VAL. TOTAL</th>
                  <th className="border border-slate-900 p-1.5 text-left">IBAN</th>
                  <th className="border border-slate-900 p-1.5 w-20">BANCO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {motosList.map((p, idx) => {
                  const { dias, valDiario, valTotal } = calculateMotoRow(p);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="border border-slate-900 p-1 text-center font-mono font-bold">
                        {idx + 1}
                      </td>
                      <td className="border border-slate-900 p-1 font-bold text-slate-900">
                        {p.nome}
                      </td>
                      <td className="border border-slate-900 p-1 text-center font-mono text-[9px]">
                        {p.bi}
                      </td>
                      <td className="border border-slate-900 p-1 text-center">{p.sexo}</td>
                      <td className="border border-slate-900 p-1 text-center font-semibold">
                        {p.coord}
                      </td>
                      <td className="border border-slate-900 p-1 text-center">{p.marca || 'LING KEN'}</td>
                      <td className="border border-slate-900 p-1 text-center font-mono text-[9px]">
                        {p.matricula || '—'}
                      </td>
                      <td className="border border-slate-900 p-1 text-center font-bold">{dias}</td>
                      <td className="border border-slate-900 p-1 text-right font-mono">
                        {valDiario.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="border border-slate-900 p-1 text-right font-mono font-bold text-slate-900">
                        {valTotal.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="border border-slate-900 p-1 font-mono text-[8.5px]">
                        {p.iban}
                      </td>
                      <td className="border border-slate-900 p-1 text-center font-bold">
                        {p.banco}
                      </td>
                    </tr>
                  );
                })}

                <tr className="bg-yellow-100 font-bold border-t-2 border-slate-950">
                  <td colSpan={7} className="border border-slate-900 p-1.5 text-right font-black uppercase">
                    TOTAL GERAL ({motosList.length} Transportes):
                  </td>
                  <td className="border border-slate-900 p-1.5 text-center font-black">
                    {motosList.reduce((acc, p) => acc + (p.dias || 4), 0)}
                  </td>
                  <td className="border border-slate-900 p-1.5"></td>
                  <td className="border border-slate-900 p-1.5 text-right font-black text-red-900 text-xs">
                    {totalMotosKz.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}
                  </td>
                  <td colSpan={2} className="border border-slate-900 p-1.5 text-slate-600 text-[9px]">
                    Kz (Kwanzas)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* 4. TABLE RECARGAS */}
        {activeCategory === 'recs' && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-900 text-[10px]">
              <thead>
                <tr className="bg-indigo-600 text-white font-bold uppercase text-center border-b border-slate-900">
                  <th className="border border-slate-900 p-1.5 w-8">Nº</th>
                  <th className="border border-slate-900 p-1.5 text-left">NOME COMPLETO</th>
                  <th className="border border-slate-900 p-1.5 text-left">FUNÇÃO</th>
                  <th className="border border-slate-900 p-1.5">COORDENAÇÃO</th>
                  <th className="border border-slate-900 p-1.5 w-16">QTD</th>
                  <th className="border border-slate-900 p-1.5 text-right w-24">VALOR DA RECARGA</th>
                  <th className="border border-slate-900 p-1.5 text-center w-28">TELEFONE</th>
                  <th className="border border-slate-900 p-1.5 text-center w-36">ASSINATURA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {recsList.map((r, idx) => {
                  const qtd = Number(r.qtd) || 2;
                  const total = qtd * 1000;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="border border-slate-900 p-1.5 text-center font-mono font-bold">
                        {idx + 1}
                      </td>
                      <td className="border border-slate-900 p-1.5 font-bold text-slate-900">
                        {r.nome}
                      </td>
                      <td className="border border-slate-900 p-1.5 text-slate-700">
                        {r.funcao || 'Supervisor (a) de Mobsoc'}
                      </td>
                      <td className="border border-slate-900 p-1.5 text-center font-semibold">
                        {r.coord}
                      </td>
                      <td className="border border-slate-900 p-1.5 text-center font-bold">{qtd}</td>
                      <td className="border border-slate-900 p-1.5 text-right font-mono font-bold">
                        {total.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="border border-slate-900 p-1.5 text-center font-mono font-semibold">
                        {r.telefone || '—'}
                      </td>
                      <td className="border border-slate-900 p-1.5 text-center">
                        <div className="border-b border-dotted border-slate-500 h-5"></div>
                      </td>
                    </tr>
                  );
                })}

                <tr className="bg-yellow-100 font-bold border-t-2 border-slate-950">
                  <td colSpan={4} className="border border-slate-900 p-1.5 text-right font-black uppercase">
                    TOTAL GERAL ({recsList.length} Supervisores):
                  </td>
                  <td className="border border-slate-900 p-1.5 text-center font-black">
                    {recsList.reduce((acc, r) => acc + (r.qtd || 2), 0)}
                  </td>
                  <td className="border border-slate-900 p-1.5 text-right font-black text-red-900 text-xs">
                    {totalRecsKz.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}
                  </td>
                  <td colSpan={2} className="border border-slate-900 p-1.5 text-slate-600 text-[9px]">
                    Kz (Kwanzas)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* 5. RESUMO FINANCEIRO CONSOLIDADO */}
        {activeCategory === 'resumo' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-sky-300 bg-sky-50 p-4">
                <div className="text-xs font-bold text-sky-900 uppercase">Mobilizadores Sociais</div>
                <div className="text-xl font-black text-sky-950 mt-1">
                  {totalMobsKz.toLocaleString('pt-AO')} Kz
                </div>
                <div className="text-[11px] text-sky-700 mt-1">{mobsList.length} agentes (5.000 Kz/dia)</div>
              </div>

              <div className="rounded-xl border border-blue-300 bg-blue-50 p-4">
                <div className="text-xs font-bold text-blue-900 uppercase">Supervisores</div>
                <div className="text-xl font-black text-blue-950 mt-1">
                  {totalSupsKz.toLocaleString('pt-AO')} Kz
                </div>
                <div className="text-[11px] text-blue-700 mt-1">{supsList.length} supervisores de zona</div>
              </div>

              <div className="rounded-xl border border-teal-300 bg-teal-50 p-4">
                <div className="text-xs font-bold text-teal-900 uppercase">Apoio Transportes / Motos</div>
                <div className="text-xl font-black text-teal-950 mt-1">
                  {totalMotosKz.toLocaleString('pt-AO')} Kz
                </div>
                <div className="text-[11px] text-teal-700 mt-1">{motosList.length} viaturas / motorizadas</div>
              </div>

              <div className="rounded-xl border border-indigo-300 bg-indigo-50 p-4">
                <div className="text-xs font-bold text-indigo-900 uppercase">Recargas Telefónicas</div>
                <div className="text-xl font-black text-indigo-950 mt-1">
                  {totalRecsKz.toLocaleString('pt-AO')} Kz
                </div>
                <div className="text-[11px] text-indigo-700 mt-1">{recsList.length} cartões de comunicação</div>
              </div>
            </div>

            <div className="rounded-xl border-2 border-red-800 bg-red-50 p-4 flex items-center justify-between">
              <div>
                <div className="text-xs font-black text-red-900 uppercase">
                  ORÇAMENTO GLOBAL DA CAMPANHA DE VACINAÇÃO CONTRA A PÓLIO (nOVP2)
                </div>
                <div className="text-[11px] text-red-700">
                  Total consolidado para {selectedCoord === 'TODAS AS COORDENAÇÕES' ? 'todo o Município do Sumbe' : `Coordenação ${selectedCoord}`}
                </div>
              </div>
              <div className="text-2xl font-black text-red-900">
                {totalGeralCampanha.toLocaleString('pt-AO')} Kz
              </div>
            </div>
          </div>
        )}

        {/* Footer Signature Blocks based on page in PDF */}
        <div className="mt-10 border-t border-slate-900 pt-4 break-inside-avoid">
          {activeCategory === 'motos' ? (
            <div>
              <div className="grid grid-cols-3 gap-6 text-center text-[10px]">
                <div>
                  <div className="border-t border-slate-900 pt-1 font-bold">Financeiro Municipal</div>
                  <div className="text-slate-600 text-[9px]">Assinatura</div>
                </div>
                <div>
                  <div className="border-t border-slate-900 pt-1 font-bold">
                    Inspetora Administrativa de Saúde Municipal
                  </div>
                  <div className="text-slate-600 text-[9px]">Assinatura</div>
                </div>
                <div>
                  <div className="border-t border-slate-900 pt-1 font-bold">Assessor Provincial de Saúde</div>
                  <div className="text-slate-600 text-[9px]">Assinatura</div>
                </div>
              </div>
              <div className="text-center text-[9px] mt-6 text-slate-800 font-semibold">
                DIRECÇÃO MUNICIPAL DE SAÚDE AOS _________ DE _____________________ DE {anoExercicio}
              </div>
            </div>
          ) : activeCategory === 'recs' ? (
            <div className="text-center">
              <div className="inline-block text-[10px]">
                <div className="font-bold">Chefe de Secção da Saúde Pública</div>
                <div className="border-t border-slate-900 pt-1 mt-6 font-semibold">
                  MSc. MARIA JÚLIA DOMINGOS DA SILVA
                </div>
              </div>
              <div className="text-[9px] mt-4 text-slate-800 font-semibold">
                DIRECÇÃO MUNICIPAL DE SAÚDE AOS _________ DE _____________________ DE {anoExercicio}
              </div>
            </div>
          ) : (
            <div className="text-center text-[9.5px] text-slate-800 font-semibold">
              DIRECÇÃO MUNICIPAL DE SAÚDE AOS _________ DE _____________________ DE {anoExercicio}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
