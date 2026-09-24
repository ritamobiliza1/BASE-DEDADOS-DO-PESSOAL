import React, { useState } from 'react';
import {
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Edit2,
  Trash2,
  RefreshCw,
  Clock,
  Sparkles,
  Phone,
  Bike,
  Building,
  GraduationCap,
} from 'lucide-react';
import { Person, PersonType, SupportedLanguage } from '../types';
import { translations } from '../utils/i18n';
import { validateAngolanBI, validateAngolanIBAN, autoNormalizePerson } from '../utils/validation';

interface PeopleTableProps {
  type: PersonType;
  people: Person[];
  allPeople: Person[];
  onEdit: (person: Person) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string) => void;
  onNormalize: (person: Person) => void;
  onOpenNew: (type: PersonType) => void;
  lang: SupportedLanguage;
}

export const PeopleTable: React.FC<PeopleTableProps> = ({
  type,
  people,
  allPeople,
  onEdit,
  onDelete,
  onToggleStatus,
  onNormalize,
  onOpenNew,
  lang,
}) => {
  const t = translations[lang];
  const [searchTerm, setSearchTerm] = useState('');
  const [coordFilter, setCoordFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [daysFilter, setDaysFilter] = useState('all');
  const [academicFilter, setAcademicFilter] = useState('all');
  const [onlyIssues, setOnlyIssues] = useState(false);
  const [onlyNew, setOnlyNew] = useState(false);

  const coords = Array.from(new Set(allPeople.map((p) => p.coord).filter(Boolean))).sort();
  const availableDays = Array.from(new Set(people.map((p) => p.dias))).sort((a, b) => a - b);
  const academicLevels = Array.from(new Set(people.map((p) => p.nivelAcademico).filter(Boolean))).sort() as string[];

  // Duplicados na base inteira
  const biCounts = new Map<string, number>();
  allPeople.forEach((p) => {
    const clean = (p.bi || '').trim().toUpperCase();
    if (clean) biCounts.set(clean, (biCounts.get(clean) || 0) + 1);
  });

  const filtered = people.filter((p) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !q ||
      p.nome.toLowerCase().includes(q) ||
      p.bi.toLowerCase().includes(q) ||
      p.coord.toLowerCase().includes(q) ||
      (p.iban && p.iban.toLowerCase().includes(q)) ||
      (p.contacto && p.contacto.toLowerCase().includes(q)) ||
      (p.matricula && p.matricula.toLowerCase().includes(q)) ||
      (p.curso && p.curso.toLowerCase().includes(q)) ||
      (p.nivelAcademico && p.nivelAcademico.toLowerCase().includes(q)) ||
      (p.areaFormacao && p.areaFormacao.toLowerCase().includes(q));

    const matchesCoord = coordFilter === 'all' || p.coord.toUpperCase() === coordFilter.toUpperCase();
    const matchesState = stateFilter === 'all' || p.estado === stateFilter;
    const matchesDays = daysFilter === 'all' || p.dias.toString() === daysFilter;
    const matchesAcademic = academicFilter === 'all' || p.nivelAcademico === academicFilter;
    const matchesNew = !onlyNew || p.isNovo || p.estado === 'NOVO';

    // Verificação de validação
    const biVal = validateAngolanBI(p.bi);
    const ibanVal = validateAngolanIBAN(p.iban);
    const isDupBi = (biCounts.get(p.bi.trim().toUpperCase()) || 0) > 1;
    const hasIssue = !biVal.isValid || !ibanVal.isValid || isDupBi;

    const matchesIssue = !onlyIssues || hasIssue;

    return matchesSearch && matchesCoord && matchesState && matchesDays && matchesAcademic && matchesNew && matchesIssue;
  });

  const title =
    type === 'mob' ? t.mobilizadores : type === 'sup' ? t.supervisores : t.motoqueiros;

  const totalFilteredDays = filtered.reduce((acc, p) => acc + Number(p.dias || 0), 0);

  return (
    <div className="space-y-4">
      {/* Top Action & Filters Bar */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-xl">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenNew(type)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-md transition ${
                type === 'mob'
                  ? 'bg-red-600 hover:bg-red-500'
                  : type === 'sup'
                  ? 'bg-blue-600 hover:bg-blue-500'
                  : 'bg-teal-600 hover:bg-teal-500'
              }`}
            >
              <span>+ Novo Cadastro</span>
            </button>
            <span className="text-xs text-slate-400">
              Registos entram automaticamente com status <b className="text-amber-400">NOVO</b>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400">
              Mostrando <b>{filtered.length}</b> de <b>{people.length}</b> registos ·{' '}
              <b className="text-red-400">{totalFilteredDays}</b> dias de trabalho totais
            </span>
          </div>
        </div>

        {/* Filter Inputs Grid */}
        <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por nome, BI, IBAN, contacto..."
              className="w-full rounded-xl border border-slate-700 bg-slate-800/90 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-400 outline-none focus:border-amber-500"
            />
          </div>

          <select
            value={coordFilter}
            onChange={(e) => setCoordFilter(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 outline-none"
          >
            <option value="all">Todas as Coordenações</option>
            {coords.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 outline-none"
          >
            <option value="all">Todos os Estados</option>
            <option value="NOVO">🟡 NOVO</option>
            <option value="Disponível">🟢 Disponível</option>
            <option value="Indisponível">🔴 Indisponível</option>
            <option value="Substituído">⚪ Substituído</option>
          </select>

          <select
            value={daysFilter}
            onChange={(e) => setDaysFilter(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 outline-none"
          >
            <option value="all">Todos os Dias</option>
            {availableDays.map((d) => (
              <option key={d} value={d.toString()}>{d} Dias de Trabalho</option>
            ))}
          </select>

          {academicLevels.length > 0 && (
            <select
              value={academicFilter}
              onChange={(e) => setAcademicFilter(e.target.value)}
              className="rounded-xl border border-indigo-500/40 bg-slate-800 px-3 py-2 text-xs font-medium text-indigo-200 outline-none"
            >
              <option value="all">🎓 Todos os Níveis Académicos</option>
              {academicLevels.map((lvl) => (
                <option key={lvl} value={lvl}>{lvl}</option>
              ))}
            </select>
          )}

          <button
            onClick={() => setOnlyNew(!onlyNew)}
            className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
              onlyNew
                ? 'border-amber-500 bg-amber-950/60 text-amber-300'
                : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            🟡 Só NOVOS
          </button>

          <button
            onClick={() => setOnlyIssues(!onlyIssues)}
            className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
              onlyIssues
                ? 'border-red-500 bg-red-950/60 text-red-300'
                : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            ⚠️ Só com Alertas
          </button>

          {(searchTerm || coordFilter !== 'all' || stateFilter !== 'all' || daysFilter !== 'all' || academicFilter !== 'all' || onlyNew || onlyIssues) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setCoordFilter('all');
                setStateFilter('all');
                setDaysFilter('all');
                setAcademicFilter('all');
                setOnlyNew(false);
                setOnlyIssues(false);
              }}
              className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-400 hover:bg-slate-700 hover:text-white"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Main Table without monetary values, emphasizing working days */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-amber-400">
            <tr>
              <th className="py-3.5 px-3 text-center">Nº</th>
              <th className="py-3.5 px-3">Nome Completo</th>
              <th className="py-3.5 px-3">Habilitações / Curso Feito</th>
              <th className="py-3.5 px-3">BI</th>
              <th className="py-3.5 px-3 text-center">Sexo</th>
              <th className="py-3.5 px-3">Coordenação</th>
              {type === 'moto' && (
                <>
                  <th className="py-3.5 px-3">Marca</th>
                  <th className="py-3.5 px-3">Matrícula</th>
                </>
              )}
              {type === 'sup' && <th className="py-3.5 px-3">Função</th>}
              <th className="py-3.5 px-3 text-center text-red-400">Dias de Trabalho</th>
              <th className="py-3.5 px-3">IBAN</th>
              <th className="py-3.5 px-3">Banco</th>
              {type !== 'mob' && <th className="py-3.5 px-3">Contacto</th>}
              <th className="py-3.5 px-3 text-center">Estado</th>
              <th className="py-3.5 px-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={14} className="py-12 text-center text-slate-500">
                  Nenhum registo encontrado com os filtros aplicados.
                </td>
              </tr>
            ) : (
              filtered.map((p, idx) => {
                const biVal = validateAngolanBI(p.bi);
                const ibanVal = validateAngolanIBAN(p.iban);
                const isDupBi = (biCounts.get(p.bi.trim().toUpperCase()) || 0) > 1;
                const isNew = p.isNovo || p.estado === 'NOVO';

                return (
                  <tr
                    key={p.id}
                    className={`transition ${
                      isNew
                        ? 'bg-amber-950/20 border-l-4 border-amber-500 hover:bg-amber-950/30'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="py-2.5 px-3 text-center text-slate-500 font-mono">{idx + 1}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{p.nome}</span>
                        {isNew && (
                          <span className="rounded-full bg-gradient-to-r from-amber-500 to-red-500 px-2 py-0.2 text-[9px] font-black uppercase text-slate-950 shadow-sm animate-pulse">
                            NOVO
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      {p.curso || p.nivelAcademico ? (
                        <div className="space-y-0.5">
                          <div className="font-semibold text-indigo-300 flex items-center gap-1">
                            <GraduationCap className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                            <span>{p.curso || p.nivelAcademico}</span>
                          </div>
                          {p.nivelAcademico && p.curso && (
                            <div className="text-[10px] text-slate-400">{p.nivelAcademico}</div>
                          )}
                          {p.instituicao && (
                            <div className="text-[9px] text-slate-500 italic">{p.instituicao}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-600 italic">Pendente</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <span className={biVal.isValid && !isDupBi ? 'text-slate-300' : 'text-amber-400 font-bold'}>
                          {p.bi}
                        </span>
                        {!biVal.isValid && (
                          <span title={biVal.message} className="cursor-help text-red-400">
                            ⚠️
                          </span>
                        )}
                        {isDupBi && (
                          <span title="BI Duplicado na base de dados" className="cursor-help text-amber-400">
                            (Duplicado)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-300">
                      <span className={p.sexo === 'F' ? 'text-pink-400' : 'text-sky-400'}>{p.sexo}</span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-300">{p.coord}</td>

                    {type === 'moto' && (
                      <>
                        <td className="py-2.5 px-3 text-slate-300">{p.marca || '—'}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-300">{p.matricula || '—'}</td>
                      </>
                    )}

                    {type === 'sup' && (
                      <td className="py-2.5 px-3 text-slate-300">{p.funcao || 'Supervisor (a)'}</td>
                    )}

                    {/* DIAS DE TRABALHO - DESTAQUE ESPECIAL (SEM VALOR MONETÁRIO) */}
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-950/80 border border-red-500/40 px-2.5 py-0.5 font-black text-xs text-red-300">
                        <Clock className="h-3 w-3 text-red-400" />
                        {p.dias} dias
                      </span>
                    </td>

                    {/* IBAN */}
                    <td className="py-2.5 px-3 font-mono text-[11px]">
                      {p.iban ? (
                        <div className="flex items-center gap-1">
                          <span className={ibanVal.isValid ? 'text-slate-300' : 'text-amber-400 font-semibold'}>
                            {p.iban}
                          </span>
                          {!ibanVal.isValid && (
                            <span title={ibanVal.message} className="cursor-help text-amber-400">
                              ⚠️
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">Pendente</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-slate-300">{p.banco || '—'}</td>

                    {type !== 'mob' && (
                      <td className="py-2.5 px-3 font-mono text-slate-300">{p.contacto || '—'}</td>
                    )}

                    {/* Estado */}
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => onToggleStatus(p.id)}
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border transition ${
                          p.estado === 'NOVO'
                            ? 'bg-amber-950 text-amber-300 border-amber-500'
                            : p.estado === 'Disponível'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                            : p.estado === 'Indisponível'
                            ? 'bg-red-950 text-red-300 border-red-500'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                        title="Clique para alternar estado"
                      >
                        {p.estado}
                      </button>
                    </td>

                    {/* Ações */}
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onNormalize(p)}
                          className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-amber-300 transition"
                          title="Normalizar espaços e maiúsculas automaticamente"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => onEdit(p)}
                          className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-blue-400 transition"
                          title="Editar cadastro"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => onDelete(p.id)}
                          className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-red-400 transition"
                          title="Eliminar"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
