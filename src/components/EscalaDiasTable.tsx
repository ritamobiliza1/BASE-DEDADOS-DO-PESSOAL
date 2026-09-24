import React, { useState, useMemo } from 'react';
import {
  CalendarDays,
  Search,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  Printer,
  FileSpreadsheet,
  FileText,
  Sliders,
  Zap,
  Users,
  Check,
} from 'lucide-react';
import { Person, SupportedLanguage, PersonType } from '../types';
import { translations } from '../utils/i18n';

interface EscalaDiasTableProps {
  allPeople: Person[];
  onUpdateDays: (personId: string, newDays: number) => void;
  onBulkUpdateDays?: (targetRole: PersonType | 'all', newDays: number, targetCoord?: string) => number;
  lang: SupportedLanguage;
  onOpenExportModal: (mode: 'export' | 'print' | 'pdf') => void;
}

export const EscalaDiasTable: React.FC<EscalaDiasTableProps> = ({
  allPeople,
  onUpdateDays,
  onBulkUpdateDays,
  lang,
  onOpenExportModal,
}) => {
  const t = translations[lang];
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCoord, setSelectedCoord] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedDays, setSelectedDays] = useState('all');

  // Estado para Alteração em Massa de Dias de Trabalho (quando os dias são mais)
  const [showBulkCard, setShowBulkCard] = useState<boolean>(true);
  const [bulkRole, setBulkRole] = useState<PersonType | 'all'>('all');
  const [bulkCoord, setBulkCoord] = useState<string>('all');
  const [bulkDays, setBulkDays] = useState<number>(5);
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState<string>('');

  const coords = Array.from(new Set(allPeople.map((p) => p.coord).filter(Boolean))).sort();
  const availableDays = Array.from(new Set(allPeople.map((p) => p.dias))).sort((a, b) => a - b);

  // Quantidade de pessoas que serão afetadas pela alteração em massa
  const bulkTargetPeople = useMemo(() => {
    return allPeople.filter((p) => {
      const matchRole = bulkRole === 'all' || p.type === bulkRole;
      const matchCoord = bulkCoord === 'all' || p.coord.toUpperCase() === bulkCoord.toUpperCase();
      return matchRole && matchCoord && p.estado !== 'Substituído';
    });
  }, [allPeople, bulkRole, bulkCoord]);

  const handleApplyBulkDays = () => {
    if (!onBulkUpdateDays) return;
    const count = onBulkUpdateDays(
      bulkRole,
      bulkDays,
      bulkCoord === 'all' ? undefined : bulkCoord
    );
    setBulkSuccessMsg(`Sucesso! ${bulkDays} dias de trabalho definidos para ${count} pessoas.`);
    setTimeout(() => setBulkSuccessMsg(''), 4500);
  };

  const filtered = allPeople.filter((p) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !q ||
      p.nome.toLowerCase().includes(q) ||
      p.bi.toLowerCase().includes(q) ||
      p.coord.toLowerCase().includes(q);

    const matchesCoord = selectedCoord === 'all' || p.coord.toUpperCase() === selectedCoord.toUpperCase();
    const matchesType = selectedType === 'all' || p.type === selectedType;
    const matchesDays = selectedDays === 'all' || p.dias.toString() === selectedDays;

    return matchesSearch && matchesCoord && matchesType && matchesDays;
  });

  // Totais consolidados
  const totalDias = filtered.reduce((acc, p) => acc + Number(p.dias || 0), 0);
  const avgDias = filtered.length > 0 ? (totalDias / filtered.length).toFixed(1) : '0';

  // Resumo por Coordenação
  const coordSummary = coords.map((c) => {
    const list = allPeople.filter((p) => p.coord.toUpperCase() === c.toUpperCase());
    const days = list.reduce((acc, p) => acc + Number(p.dias || 0), 0);
    return {
      coord: c,
      totalPessoas: list.length,
      totalDias: days,
      avg: list.length > 0 ? (days / list.length).toFixed(1) : '0',
    };
  });

  return (
    <div className="space-y-6">
      {/* Header and Summary Cards */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <CalendarDays className="h-5 w-5 text-red-500" />
              <span>Escala & Controlo de Dias de Trabalho</span>
            </h2>
            <p className="text-xs text-slate-400">
              Gestão operacional das jornadas de trabalho dos agentes na 3ª Ronda nOVP2 (sem dados financeiros)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onOpenExportModal('pdf')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/40 bg-red-950/60 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-900/60 transition"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>PDF da Escala</span>
            </button>
            <button
              onClick={() => onOpenExportModal('export')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-950/60 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-900/60 transition"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Exportar Excel</span>
            </button>
            <button
              onClick={() => onOpenExportModal('print')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-950/60 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-900/60 transition"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Imprimir</span>
            </button>
          </div>
        </div>

        {/* Big Numbers */}
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-3.5 text-center">
            <div className="text-xs font-semibold text-slate-400 uppercase">Efetivo Filtrado</div>
            <div className="text-2xl font-black text-white">{filtered.length}</div>
            <div className="text-[11px] text-slate-400">agentes mobilizadores e apoio</div>
          </div>

          <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-3.5 text-center">
            <div className="text-xs font-semibold text-red-400 uppercase">Dias de Trabalho Totais</div>
            <div className="text-2xl font-black text-red-400">{totalDias}</div>
            <div className="text-[11px] text-red-300 font-semibold">dias operacionais atribuídos</div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-3.5 text-center">
            <div className="text-xs font-semibold text-slate-400 uppercase">Média Geral</div>
            <div className="text-2xl font-black text-amber-400">{avgDias}</div>
            <div className="text-[11px] text-slate-400">dias médios por agente</div>
          </div>
        </div>

        {/* FERRAMENTA: ALTERAÇÃO EM MASSA DE DIAS DE TRABALHO */}
        <div className="mt-5 rounded-xl border border-amber-500/40 bg-amber-950/20 p-4 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-500/20 pb-2.5">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                Alteração Rápida de Dias para Todos (Quando a Campanha tem mais dias)
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              Atualiza simultaneamente a escala e todos os mapas de pagamento
            </span>
          </div>

          {bulkSuccessMsg && (
            <div className="mt-3 rounded-lg border border-emerald-500/50 bg-emerald-950/70 p-2.5 text-xs font-bold text-emerald-200 flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-400" />
              <span>{bulkSuccessMsg}</span>
            </div>
          )}

          <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Público Alvo:
              </label>
              <select
                value={bulkRole}
                onChange={(e) => setBulkRole(e.target.value as any)}
                aria-label="Público Alvo"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-amber-500"
              >
                <option value="all">Todos os Agentes (Geral)</option>
                <option value="mob">Apenas Mobilizadores</option>
                <option value="sup">Apenas Supervisores</option>
                <option value="moto">Apenas Motoqueiros</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Coordenação:
              </label>
              <select
                value={bulkCoord}
                onChange={(e) => setBulkCoord(e.target.value)}
                aria-label="Coordenação Alvo"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-amber-500"
              >
                <option value="all">Todas as Coordenações</option>
                {coords.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Novos Dias de Trabalho:
              </label>
              <div className="flex items-center gap-1.5">
                {[3, 4, 5, 6, 7].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setBulkDays(d)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                      bulkDays === d
                        ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {d}d
                  </button>
                ))}
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={bulkDays}
                  onChange={(e) => setBulkDays(Math.max(1, Number(e.target.value) || 1))}
                  aria-label="Número de dias"
                  className="w-14 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-center text-xs font-bold text-white outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={handleApplyBulkDays}
                disabled={bulkTargetPeople.length === 0}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-3 py-2 text-xs font-bold text-slate-950 shadow-md hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 transition"
              >
                <Zap className="h-3.5 w-3.5" />
                <span>Aplicar {bulkDays} dias a {bulkTargetPeople.length} agentes</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Coordination Summary Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
        <h3 className="mb-3 text-sm font-bold text-white">Consolidado de Dias por Coordenação</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-2.5 px-3">Coordenação</th>
                <th className="py-2.5 px-3 text-center">Efetivo</th>
                <th className="py-2.5 px-3 text-center">Dias Acumulados</th>
                <th className="py-2.5 px-3 text-center">Média / Agente</th>
                <th className="py-2.5 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {coordSummary.map((c) => (
                <tr key={c.coord} className="hover:bg-slate-800/40 transition">
                  <td className="py-2 px-3 font-bold text-slate-200">{c.coord}</td>
                  <td className="py-2 px-3 text-center text-slate-300 font-medium">{c.totalPessoas} pessoas</td>
                  <td className="py-2 px-3 text-center">
                    <span className="rounded-full bg-red-950/60 border border-red-500/30 px-2.5 py-0.5 font-bold text-red-300">
                      {c.totalDias} dias
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center text-slate-400 font-medium">{c.avg} dias</td>
                  <td className="py-2 px-3 text-right">
                    <button
                      onClick={() => setSelectedCoord(c.coord)}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] font-semibold text-slate-300 hover:bg-slate-700 hover:text-white"
                    >
                      Filtrar Zona
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Main Staff Roster with Days Editor */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por nome ou BI..."
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-400 outline-none focus:border-red-500"
            />
          </div>

          <select
            value={selectedCoord}
            onChange={(e) => setSelectedCoord(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 outline-none"
          >
            <option value="all">Todas Coordenações</option>
            {coords.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 outline-none"
          >
            <option value="all">Todas Funções</option>
            <option value="mob">Mobilizadores</option>
            <option value="sup">Supervisores</option>
            <option value="moto">Motoqueiros</option>
          </select>

          <select
            value={selectedDays}
            onChange={(e) => setSelectedDays(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 outline-none"
          >
            <option value="all">Todos os Dias</option>
            {availableDays.map((d) => (
              <option key={d} value={d.toString()}>{d} Dias de Trabalho</option>
            ))}
          </select>

          {(searchTerm || selectedCoord !== 'all' || selectedType !== 'all' || selectedDays !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCoord('all');
                setSelectedType('all');
                setSelectedDays('all');
              }}
              className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
            >
              Limpar
            </button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-amber-400">
              <tr>
                <th className="py-3 px-3 text-center">Nº</th>
                <th className="py-3 px-3">Nome Completo</th>
                <th className="py-3 px-3">BI</th>
                <th className="py-3 px-3 text-center">Função</th>
                <th className="py-3 px-3">Coordenação</th>
                <th className="py-3 px-3 text-center">Dias de Trabalho</th>
                <th className="py-3 px-3 text-center">Ajuste Rápido de Dias</th>
                <th className="py-3 px-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filtered.map((p, idx) => (
                <tr key={p.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-2.5 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                  <td className="py-2.5 px-3 font-bold text-white">{p.nome}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-300">{p.bi}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${
                      p.type === 'mob' ? 'bg-red-950/60 text-red-300 border border-red-500/30' :
                      p.type === 'sup' ? 'bg-blue-950/60 text-blue-300 border border-blue-500/30' :
                      'bg-teal-950/60 text-teal-300 border border-teal-500/30'
                    }`}>
                      {p.type === 'mob' ? 'Mobilizador' : p.type === 'sup' ? 'Supervisor' : 'Motoqueiro'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-300">{p.coord}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="rounded-full bg-red-950/80 border border-red-500/40 px-3 py-1 font-black text-sm text-red-300">
                      {p.dias} dias
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => onUpdateDays(p.id, Math.max(1, p.dias - 1))}
                        className="h-6 w-6 rounded bg-slate-800 border border-slate-700 text-slate-300 font-bold hover:bg-slate-700 transition"
                        title="Diminuir 1 dia"
                      >
                        -
                      </button>
                      <button
                        onClick={() => onUpdateDays(p.id, 5)}
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold border transition ${
                          p.dias === 5 ? 'bg-red-700 text-white border-red-500' : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                        title="Padrão 5 dias"
                      >
                        5d
                      </button>
                      <button
                        onClick={() => onUpdateDays(p.id, 7)}
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold border transition ${
                          p.dias === 7 ? 'bg-red-700 text-white border-red-500' : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                        title="Supervisor 7 dias"
                      >
                        7d
                      </button>
                      <button
                        onClick={() => onUpdateDays(p.id, p.dias + 1)}
                        className="h-6 w-6 rounded bg-slate-800 border border-slate-700 text-slate-300 font-bold hover:bg-slate-700 transition"
                        title="Aumentar 1 dia"
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      p.estado === 'NOVO' ? 'bg-amber-950 text-amber-300 border border-amber-500' :
                      p.estado === 'Disponível' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500' :
                      'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {p.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
