import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  FileText,
  Printer,
  CheckSquare,
  Square,
  MapPin,
  Sliders,
  Filter,
} from 'lucide-react';
import { Person, Recarga, ExportFilterOptions, SupportedLanguage } from '../types';
import { translations } from '../utils/i18n';
import { generateAutomatedPDF } from '../utils/pdfExport';
import { exportCleanExcel } from '../utils/excelExport';
import { normalizeCoordName } from '../utils/validation';

interface ExportPrintModalProps {
  isOpen: boolean;
  mode: 'export' | 'print' | 'pdf';
  onClose: () => void;
  allPeople: Person[];
  recs: Recarga[];
  onTriggerDirectPrint: (options: ExportFilterOptions) => void;
  lang: SupportedLanguage;
}

export const ExportPrintModal: React.FC<ExportPrintModalProps> = ({
  isOpen,
  mode,
  onClose,
  allPeople,
  recs,
  onTriggerDirectPrint,
  lang,
}) => {
  const t = translations[lang];

  const coords = Array.from(new Set(allPeople.map((p) => normalizeCoordName(p.coord)).filter(Boolean))).sort();

  const [selectedCoord, setSelectedCoord] = useState<string>('');
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedItems, setSelectedItems] = useState<('mobilizadores' | 'supervisores' | 'motoqueiros' | 'recargas' | 'escala')[]>([
    'mobilizadores',
    'supervisores',
    'motoqueiros',
  ]);

  if (!isOpen) return null;

  const toggleItem = (item: 'mobilizadores' | 'supervisores' | 'motoqueiros' | 'recargas' | 'escala') => {
    if (selectedItems.includes(item)) {
      setSelectedItems(selectedItems.filter((i) => i !== item));
    } else {
      setSelectedItems([...selectedItems, item]);
    }
  };

  const getFilterOptions = (): ExportFilterOptions => ({
    items: selectedItems,
    coord: selectedCoord,
    state: selectedState,
  });

  const handleGeneratePDF = () => {
    generateAutomatedPDF(allPeople, recs, getFilterOptions());
    onClose();
  };

  const handleExportExcel = () => {
    exportCleanExcel(allPeople, recs, getFilterOptions());
    onClose();
  };

  const handlePrint = () => {
    onTriggerDirectPrint(getFilterOptions());
    onClose();
  };

  // Preview counts
  const filteredCount = allPeople.filter((p) => {
    const matchCoord = !selectedCoord || normalizeCoordName(p.coord) === normalizeCoordName(selectedCoord);
    const matchState = !selectedState || p.estado === selectedState || (selectedState === 'NOVO' && p.isNovo);
    const matchType =
      (p.type === 'mob' && selectedItems.includes('mobilizadores')) ||
      (p.type === 'sup' && selectedItems.includes('supervisores')) ||
      (p.type === 'moto' && selectedItems.includes('motoqueiros'));

    return matchCoord && matchState && matchType;
  }).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-200 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sliders className="h-5 w-5 text-amber-400" />
              <span>Exportar & Imprimir por Coordenação</span>
            </h2>
            <p className="text-xs text-slate-400">
              Gere relatórios em PDF, folhas de cálculo Excel ou folhas de assinatura prontas para impressão
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Item Selection */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            1. Categorias a Incluir
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 text-xs">
            {[
              { id: 'mobilizadores', label: '👥 Mobilizadores' },
              { id: 'supervisores', label: '🎯 Supervisores' },
              { id: 'motoqueiros', label: '🏍️ Motoqueiros' },
              { id: 'recargas', label: '📱 Recargas' },
              { id: 'escala', label: '📅 Escala de Dias' },
            ].map((opt) => {
              const active = selectedItems.includes(opt.id as any);
              return (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => toggleItem(opt.id as any)}
                  className={`flex items-center gap-2 rounded-xl border p-2.5 font-medium transition ${
                    active
                      ? 'border-amber-500/60 bg-amber-950/30 text-white'
                      : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {active ? (
                    <CheckSquare className="h-4 w-4 text-amber-400" />
                  ) : (
                    <Square className="h-4 w-4 text-slate-500" />
                  )}
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Coordination and State Filters */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Coordenação */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              2. Coordenação de Saúde
            </label>
            <select
              value={selectedCoord}
              onChange={(e) => setSelectedCoord(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2 px-3 text-xs text-white outline-none focus:border-amber-500"
            >
              <option value="">Todas as Coordenações (Geral)</option>
              {coords.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Estado */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              3. Filtrar por Estado
            </label>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2 px-3 text-xs text-white outline-none focus:border-amber-500"
            >
              <option value="">Todos os Estados</option>
              <option value="NOVO">Apenas NOVOS</option>
              <option value="Disponível">Apenas Ativos (Disponíveis)</option>
              <option value="Substituído">Apenas Substituídos</option>
            </select>
          </div>
        </div>

        {/* Live Filter Summary */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs flex items-center justify-between text-slate-400">
          <span>
            Registos selecionados para geração:{' '}
            <b className="text-white">{filteredCount} agentes</b>
          </span>
          <span className="text-amber-400 font-semibold">
            {selectedCoord ? `Zona: ${selectedCoord}` : 'Todas as Zonas'}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 border-t border-slate-800 pt-4">
          <button
            onClick={handleGeneratePDF}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 py-2.5 px-3 text-xs font-bold text-white shadow-lg shadow-red-950/50 hover:from-red-500 hover:to-red-600 transition"
          >
            <FileText className="h-4 w-4" />
            <span>Gerar PDF Auto</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 py-2.5 px-3 text-xs font-bold text-white shadow-lg shadow-emerald-950/50 hover:from-emerald-500 hover:to-emerald-600 transition"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Exportar Excel</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 py-2.5 px-3 text-xs font-bold text-white shadow-lg shadow-amber-950/50 hover:from-amber-500 hover:to-amber-600 transition"
          >
            <Printer className="h-4 w-4" />
            <span>Imprimir Oficial</span>
          </button>
        </div>
      </div>
    </div>
  );
};
