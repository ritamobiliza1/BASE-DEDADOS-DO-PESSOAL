import React, { useState, useMemo } from 'react';
import {
  Printer,
  FileText,
  Calendar,
  Clock,
  Plus,
  Trash2,
  Users,
  UserCheck,
  Bike,
  Layers,
  FileSpreadsheet,
  CheckSquare,
  Square,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Person, SupportedLanguage } from '../types';
import { normalizeCoordName } from '../utils/validation';
import { exportListaPresencaExcel } from '../utils/excelExport';

interface ListaPresencaViewProps {
  allPeople: Person[];
  lang: SupportedLanguage;
}

interface DayConfig {
  dayNumber: number;
  date: string;
  label: string;
}

type RoleFilterType = 'all' | 'mob' | 'sup' | 'moto';

const DEFAULT_DAYS: DayConfig[] = [
  { dayNumber: 1, date: '02/10/2026', label: '1º Dia' },
  { dayNumber: 2, date: '03/10/2026', label: '2º Dia' },
  { dayNumber: 3, date: '04/10/2026', label: '3º Dia' },
  { dayNumber: 4, date: '05/10/2026', label: '4º Dia' },
  { dayNumber: 5, date: '06/10/2026', label: '5º Dia' },
];

export const ListaPresencaView: React.FC<ListaPresencaViewProps> = ({ allPeople, lang }) => {
  // Available coordinations
  const coordsList = useMemo(() => {
    const set = new Set(allPeople.map((p) => normalizeCoordName(p.coord)).filter(Boolean));
    return ['TODAS AS COORDENAÇÕES', ...Array.from(set).sort()];
  }, [allPeople]);

  const [selectedCoord, setSelectedCoord] = useState<string>('CHINGO 1');
  const [selectedRole, setSelectedRole] = useState<RoleFilterType>('mob'); // Default to Mobilizadores as requested
  const [daysList, setDaysList] = useState<DayConfig[]>(DEFAULT_DAYS);
  const [horarioTrabalho, setHorarioTrabalho] = useState('08h00 às 16h00');
  const [includeOnlyActive, setIncludeOnlyActive] = useState(true);
  const [withNames, setWithNames] = useState<boolean>(true); // Mode: Com Nomes ou Sem Nomes (Em Branco)
  const [blankRowsCount, setBlankRowsCount] = useState<number>(25);

  // Simplified and fixed function names as requested
  const getFixedFunction = (p: Person): string => {
    if (p.type === 'mob') return 'Mobilizador';
    if (p.type === 'sup') return 'Supervisor';
    if (p.type === 'moto') return 'Motoqueiro';
    return 'Agente';
  };

  // Filter people based on selected coordination and selected role
  const coordStaff = useMemo(() => {
    return allPeople.filter((p) => {
      const matchCoord =
        selectedCoord === 'TODAS AS COORDENAÇÕES' ||
        normalizeCoordName(p.coord) === normalizeCoordName(selectedCoord);

      const matchRole =
        selectedRole === 'all' ||
        (selectedRole === 'mob' && p.type === 'mob') ||
        (selectedRole === 'sup' && p.type === 'sup') ||
        (selectedRole === 'moto' && p.type === 'moto');

      const matchActive = !includeOnlyActive || p.estado !== 'Substituído';
      return matchCoord && matchRole && matchActive;
    });
  }, [allPeople, selectedCoord, selectedRole, includeOnlyActive]);

  // Counts for role selector badges
  const roleCounts = useMemo(() => {
    const filterByCoord = allPeople.filter((p) => {
      const matchCoord =
        selectedCoord === 'TODAS AS COORDENAÇÕES' ||
        normalizeCoordName(p.coord) === normalizeCoordName(selectedCoord);
      const matchActive = !includeOnlyActive || p.estado !== 'Substituído';
      return matchCoord && matchActive;
    });

    return {
      all: filterByCoord.length,
      mob: filterByCoord.filter((p) => p.type === 'mob').length,
      sup: filterByCoord.filter((p) => p.type === 'sup').length,
      moto: filterByCoord.filter((p) => p.type === 'moto').length,
    };
  }, [allPeople, selectedCoord, includeOnlyActive]);

  // Add / Remove Days
  const handleAddDay = () => {
    const nextNum = daysList.length + 1;
    setDaysList([
      ...daysList,
      { dayNumber: nextNum, date: `0${nextNum + 1}/10/2026`, label: `${nextNum}º Dia` },
    ]);
  };

  const handleRemoveDay = () => {
    if (daysList.length <= 1) return;
    setDaysList(daysList.slice(0, -1));
  };

  const handleUpdateDayDate = (index: number, newDate: string) => {
    const updated = [...daysList];
    updated[index].date = newDate;
    setDaysList(updated);
  };

  // Direct Print
  const handlePrint = () => {
    window.print();
  };

  // Role subtitle label
  const getRoleTitle = () => {
    if (selectedRole === 'mob') return 'MOBILIZADORES';
    if (selectedRole === 'sup') return 'SUPERVISORES';
    if (selectedRole === 'moto') return 'MOTOQUEIROS';
    return 'EQUIPA COMPLETA';
  };

  // Export Excel
  const handleExportExcel = () => {
    exportListaPresencaExcel(
      selectedCoord,
      getRoleTitle(),
      daysList,
      coordStaff,
      withNames
    );
  };

  // Export PDF
  const handleExportPDF = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    // Header Government of Angola
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 297, 24, 'F');

    doc.setTextColor(245, 158, 11); // Amber
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text('REPÚBLICA DE ANGOLA · GOVERNO DA PROVÍNCIA DO CUANZA-SUL', 148.5, 6.5, { align: 'center' });

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10.5);
    doc.text('ADMINISTRAÇÃO MUNICIPAL DO SUMBE · DIRECÇÃO MUNICIPAL DE SAÚDE', 148.5, 12.5, { align: 'center' });

    doc.setTextColor(226, 232, 240);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(
      'Campanha de Vacinação contra a Pólio · nOVP2 · 3ª Ronda · FOLHA OFICIAL DE PRESENÇAS E ASSINATURAS',
      148.5,
      18,
      { align: 'center' }
    );

    // Subtitle
    const coordTitle =
      selectedCoord === 'TODAS AS COORDENAÇÕES' ? 'MUNICÍPIO DO SUMBE' : selectedCoord;

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`LISTA DE PRESENÇA · ${getRoleTitle()} · COORDENAÇÃO: ${coordTitle} ${withNames ? '' : '(EM BRANCO)'}`, 14, 30);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(
      `Formato: ${withNames ? `Efetivo Registado (${coordStaff.length} agentes)` : `Folha em Branco (${blankRowsCount} linhas para campo)`} | Horário: ${horarioTrabalho} | Escala: ${daysList.length} Dias | Emissão: ${new Date().toLocaleDateString('pt-AO')}`,
      14,
      35
    );

    // Table Columns: NO BI, NO TOTAL DIAS, NO VISTO COORD - generous space for signatures!
    const tableColumns = [
      { header: 'Nº', dataKey: 'num' },
      { header: 'NOME COMPLETO DO AGENTE', dataKey: 'nome' },
      { header: 'FUNÇÃO', dataKey: 'funcao' },
      ...daysList.map((d) => ({
        header: `${d.label}\n${d.date}`,
        dataKey: `dia_${d.dayNumber}`,
      })),
    ];

    let tableRows: Record<string, string>[] = [];

    if (withNames) {
      tableRows = coordStaff.map((p, idx) => {
        const rowData: Record<string, string> = {
          num: String(idx + 1),
          nome: p.nome,
          funcao: getFixedFunction(p),
        };

        daysList.forEach((d) => {
          rowData[`dia_${d.dayNumber}`] = '________________';
        });

        return rowData;
      });
    } else {
      // Empty rows for manual writing
      const totalRows = Math.max(coordStaff.length, blankRowsCount);
      tableRows = Array.from({ length: totalRows }).map((_, idx) => {
        const rowData: Record<string, string> = {
          num: String(idx + 1),
          nome: '',
          funcao: selectedRole === 'mob' ? 'Mobilizador' : selectedRole === 'sup' ? 'Supervisor' : selectedRole === 'moto' ? 'Motoqueiro' : '',
        };

        daysList.forEach((d) => {
          rowData[`dia_${d.dayNumber}`] = '';
        });

        return rowData;
      });
    }

    // Calculate column widths dynamically based on number of days
    const daysCount = daysList.length;
    const remainingWidth = 270 - 10 - 75 - 35; // Total usable width ~270mm in landscape minus num, name, function
    const dayColWidth = Math.max(22, remainingWidth / daysCount);

    const dynamicColStyles: Record<string, any> = {
      num: { halign: 'center', cellWidth: 10 },
      nome: { fontStyle: 'bold', cellWidth: 75 },
      funcao: { cellWidth: 35 },
    };

    daysList.forEach((d) => {
      dynamicColStyles[`dia_${d.dayNumber}`] = { halign: 'center', cellWidth: dayColWidth };
    });

    autoTable(doc, {
      startY: 38,
      columns: tableColumns,
      body: tableRows,
      styles: {
        fontSize: 8,
        cellPadding: withNames ? 2.5 : 4,
        valign: 'middle',
        overflow: 'linebreak',
        lineColor: [148, 163, 184],
        lineWidth: 0.15,
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 8,
      },
      columnStyles: dynamicColStyles,
      didDrawPage: (data) => {
        const pageHeight = doc.internal.pageSize.height || 210;
        doc.setFontSize(8);
        doc.setTextColor(100);

        // Signatures at bottom of final page
        const signY = pageHeight - 14;
        doc.text('________________________________', 40, signY);
        doc.text('O Coordenador de Zona', 40, signY + 4);

        doc.text('________________________________', 148.5, signY, { align: 'center' });
        doc.text('O Supervisor Municipal', 148.5, signY + 4, { align: 'center' });

        doc.text('________________________________', 240, signY);
        doc.text('A Direcção de Saúde', 240, signY + 4);
      },
    });

    doc.save(`Lista_Presenca_${getRoleTitle()}_${coordTitle.replace(/\s+/g, '_')}_${withNames ? 'ComNomes' : 'EmBranco'}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* 1-CLICK CONTROLS CARD */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-2xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-amber-400" />
              <span>Lista de Presença Diária & Assinaturas</span>
            </h2>
            <p className="text-xs text-slate-400">
              Selecione o tipo de lista, formato (com ou sem nomes) e coordenação para imprimir ou exportar
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:from-amber-500 hover:to-amber-400 transition shadow"
            >
              <Printer className="h-4 w-4" />
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
              <span>Gerar PDF</span>
            </button>
          </div>
        </div>

        {/* FORMATO: COM OU SEM NOMES (FOLHA EM BRANCO) */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
              Modo da Lista:
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setWithNames(true)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  withNames
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <CheckSquare className="h-3.5 w-3.5" />
                <span>Com Nomes dos Agentes</span>
              </button>

              <button
                type="button"
                onClick={() => setWithNames(false)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  !withNames
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Square className="h-3.5 w-3.5" />
                <span>Sem Nomes (Folha em Branco para Terreno)</span>
              </button>
            </div>
          </div>

          {!withNames && (
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span>Linhas em branco:</span>
              {[20, 25, 30, 35].map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => setBlankRowsCount(cnt)}
                  className={`rounded px-2 py-0.5 font-bold text-[11px] ${
                    blankRowsCount === cnt ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {cnt}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 1. ROLE FILTER (SELEÇÃO DO TIPO DE LISTA) */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">
            1. Selecione o Tipo de Lista a Imprimir:
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button
              type="button"
              onClick={() => setSelectedRole('mob')}
              className={`flex items-center justify-between rounded-xl p-3 text-xs font-bold transition shadow-sm ${
                selectedRole === 'mob'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 ring-2 ring-amber-300'
                  : 'border border-slate-800 bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>Apenas Mobilizadores</span>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${
                selectedRole === 'mob' ? 'bg-slate-950 text-amber-400' : 'bg-slate-900 text-slate-300'
              }`}>
                {roleCounts.mob}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedRole('sup')}
              className={`flex items-center justify-between rounded-xl p-3 text-xs font-bold transition shadow-sm ${
                selectedRole === 'sup'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white ring-2 ring-blue-300'
                  : 'border border-slate-800 bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                <span>Apenas Supervisores</span>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${
                selectedRole === 'sup' ? 'bg-slate-950 text-blue-300' : 'bg-slate-900 text-slate-300'
              }`}>
                {roleCounts.sup}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedRole('moto')}
              className={`flex items-center justify-between rounded-xl p-3 text-xs font-bold transition shadow-sm ${
                selectedRole === 'moto'
                  ? 'bg-gradient-to-r from-teal-600 to-teal-700 text-white ring-2 ring-teal-300'
                  : 'border border-slate-800 bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Bike className="h-4 w-4" />
                <span>Apenas Motoqueiros</span>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${
                selectedRole === 'moto' ? 'bg-slate-950 text-teal-300' : 'bg-slate-900 text-slate-300'
              }`}>
                {roleCounts.moto}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedRole('all')}
              className={`flex items-center justify-between rounded-xl p-3 text-xs font-bold transition shadow-sm ${
                selectedRole === 'all'
                  ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white ring-2 ring-purple-300'
                  : 'border border-slate-800 bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                <span>Equipa Completa (Todos)</span>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${
                selectedRole === 'all' ? 'bg-slate-950 text-purple-300' : 'bg-slate-900 text-slate-300'
              }`}>
                {roleCounts.all}
              </span>
            </button>
          </div>
        </div>

        {/* 2. 1-CLICK COORDINATION SELECTOR PILLS */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            2. Selecione a Coordenação (Clique para carregar imediatamente):
          </label>
          <div className="flex flex-wrap gap-2">
            {coordsList.map((c) => {
              const isActive = selectedCoord === c;
              return (
                <button
                  type="button"
                  key={c}
                  onClick={() => setSelectedCoord(c)}
                  className={`rounded-xl px-3.5 py-2 text-xs font-bold transition shadow-sm ${
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

        {/* 3. WORKING DAYS & DATES CONFIGURATION */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <Clock className="h-4 w-4 text-amber-400" />
              <span>Datas e Dias de Trabalho na Folha ({daysList.length} dias):</span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={handleAddDay}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-slate-200 hover:bg-slate-700 font-semibold"
              >
                <Plus className="h-3 w-3 text-emerald-400" />
                <span>+ Adicionar Dia</span>
              </button>

              <button
                type="button"
                onClick={handleRemoveDay}
                disabled={daysList.length <= 1}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-slate-200 hover:bg-slate-700 disabled:opacity-40 font-semibold"
              >
                <Trash2 className="h-3 w-3 text-red-400" />
                <span>- Remover Dia</span>
              </button>
            </div>
          </div>

          {/* Editable Date Inputs */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 text-xs">
            {daysList.map((day, idx) => (
              <div key={day.dayNumber} className="rounded-lg border border-slate-800 bg-slate-900/80 p-2 space-y-1">
                <div className="font-bold text-amber-400 text-[11px]">{day.label}</div>
                <input
                  type="text"
                  value={day.date}
                  onChange={(e) => handleUpdateDayDate(idx, e.target.value)}
                  placeholder="DD/MM/AAAA"
                  className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white font-mono outline-none focus:border-amber-500"
                />
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span>Horário de Trabalho:</span>
              <input
                type="text"
                value={horarioTrabalho}
                onChange={(e) => setHorarioTrabalho(e.target.value)}
                className="w-36 rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs text-white font-semibold"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">
                {withNames ? coordStaff.length : Math.max(coordStaff.length, blankRowsCount)}
              </span>
              <span>{withNames ? `${getRoleTitle().toLowerCase()} registados` : 'linhas em branco'} para {selectedCoord}</span>
            </div>
          </div>
        </div>
      </div>

      {/* PRINTABLE OFFICIAL ATTENDANCE SHEET */}
      <div className="rounded-2xl border border-slate-800 bg-white text-slate-950 p-6 shadow-2xl print:p-0 print:border-none print:shadow-none">
        {/* Document Header */}
        <div className="border-b-2 border-slate-950 pb-3 mb-4 text-center">
          <div className="text-[11px] font-black tracking-widest uppercase">REPÚBLICA DE ANGOLA</div>
          <div className="text-xs font-bold uppercase">GOVERNO DA PROVÍNCIA DO CUANZA-SUL</div>
          <div className="text-sm font-black uppercase">ADMINISTRAÇÃO MUNICIPAL DO SUMBE · DIRECÇÃO MUNICIPAL DE SAÚDE</div>
          <div className="text-[11px] mt-1 text-slate-700 font-semibold">
            CAMPANHA DE VACINAÇÃO CONTRA A PÓLIO (nOVP2) · 3ª RONDA
          </div>
          <div className="mt-2 text-base font-black tracking-wider uppercase text-red-800">
            FOLHA OFICIAL DE CONTROLO DE PRESENÇAS E ASSINATURA DIÁRIA · {getRoleTitle()} · {selectedCoord} {withNames ? '' : '(EM BRANCO)'}
          </div>
          <div className="mt-1 flex justify-center gap-6 text-[10px] font-bold text-slate-600">
            <span>Escala Operacional: {daysList.length} Dias de Trabalho</span>
            <span>Horário: {horarioTrabalho}</span>
            <span>{withNames ? `Total Agentes: ${coordStaff.length}` : `Linhas em Branco: ${Math.max(coordStaff.length, blankRowsCount)}`}</span>
            <span>Data de Emissão: {new Date().toLocaleDateString('pt-AO')}</span>
          </div>
        </div>

        {/* Clean, spacious table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-slate-950 text-[10.5px]">
            <thead>
              <tr className="bg-slate-200 border-b border-slate-950 text-slate-950 font-bold uppercase text-center">
                <th className="border border-slate-950 p-2 w-8">Nº</th>
                <th className="border border-slate-950 p-2 text-left min-w-[200px]">NOME COMPLETO DO AGENTE</th>
                <th className="border border-slate-950 p-2 text-left w-32">FUNÇÃO</th>
                {daysList.map((d) => (
                  <th key={d.dayNumber} className="border border-slate-950 p-2 min-w-[90px]">
                    <div>{d.label}</div>
                    <div className="text-[9px] font-mono text-slate-700">{d.date}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-400">
              {withNames ? (
                coordStaff.length === 0 ? (
                  <tr>
                    <td colSpan={3 + daysList.length} className="p-8 text-center text-slate-500 font-bold">
                      Nenhum {getRoleTitle().toLowerCase()} encontrado para {selectedCoord}.
                    </td>
                  </tr>
                ) : (
                  coordStaff.map((p, idx) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="border border-slate-950 p-2 text-center font-mono font-bold">{idx + 1}</td>
                      <td className="border border-slate-950 p-2 font-bold text-slate-950 text-[11px]">{p.nome}</td>
                      <td className="border border-slate-950 p-2 font-semibold text-slate-800">
                        {getFixedFunction(p)}
                      </td>

                      {/* Daily Signature Box */}
                      {daysList.map((d) => (
                        <td key={d.dayNumber} className="border border-slate-950 p-2 text-center">
                          <div className="h-8 flex flex-col justify-end border-b border-dashed border-slate-500 pb-0.5">
                            <span className="text-[8px] text-slate-400 uppercase tracking-tighter">Assinatura</span>
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))
                )
              ) : (
                /* Mode Sem Nomes (Em Branco) */
                Array.from({ length: Math.max(coordStaff.length, blankRowsCount) }).map((_, idx) => (
                  <tr key={idx} className="h-10 hover:bg-slate-50">
                    <td className="border border-slate-950 p-2 text-center font-mono font-bold text-slate-700">{idx + 1}</td>
                    <td className="border border-slate-950 p-2">
                      <div className="border-b border-dotted border-slate-400 h-6"></div>
                    </td>
                    <td className="border border-slate-950 p-2 font-semibold text-slate-600">
                      {selectedRole === 'mob' ? 'Mobilizador' : selectedRole === 'sup' ? 'Supervisor' : selectedRole === 'moto' ? 'Motoqueiro' : ''}
                    </td>
                    {daysList.map((d) => (
                      <td key={d.dayNumber} className="border border-slate-950 p-2 text-center">
                        <div className="h-8 flex flex-col justify-end border-b border-dashed border-slate-400 pb-0.5">
                          <span className="text-[7.5px] text-slate-300 uppercase">Assinatura</span>
                        </div>
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Signature Blocks */}
        <div className="mt-12 grid grid-cols-3 gap-6 text-center text-[10px] pt-4 break-inside-avoid">
          <div>
            <div className="border-t-2 border-slate-950 pt-1 font-bold">O Coordenador de Zona / Área</div>
            <div className="text-slate-600 text-[9px] mt-0.5">Assinatura e Data</div>
          </div>
          <div>
            <div className="border-t-2 border-slate-950 pt-1 font-bold">O Supervisor Municipal da Mobilização Social</div>
            <div className="text-slate-600 text-[9px] mt-0.5">Victória Canhanga / André de Melo</div>
          </div>
          <div>
            <div className="border-t-2 border-slate-950 pt-1 font-bold">A Direcção Municipal de Saúde do Sumbe</div>
            <div className="text-slate-600 text-[9px] mt-0.5">Visto e Homologação</div>
          </div>
        </div>
      </div>
    </div>
  );
};
