import React, { useState } from 'react';
import {
  TrendingUp,
  Users,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Layers,
  MapPin,
  Bike,
  ShieldCheck,
  FileCheck,
  Filter,
  GraduationCap,
} from 'lucide-react';
import { Person, SupportedLanguage } from '../types';
import { translations } from '../utils/i18n';
import { auditAllPeople } from '../utils/validation';

interface ProductivityDashboardProps {
  allPeople: Person[];
  lang: SupportedLanguage;
}

export const ProductivityDashboard: React.FC<ProductivityDashboardProps> = ({
  allPeople,
  lang,
}) => {
  const t = translations[lang];
  const [selectedCoord, setSelectedCoord] = useState<string>('all');

  const coords = Array.from(new Set(allPeople.map((p) => p.coord).filter(Boolean))).sort();

  const filtered = selectedCoord === 'all'
    ? allPeople
    : allPeople.filter((p) => p.coord.toUpperCase() === selectedCoord.toUpperCase());

  const mobs = filtered.filter((p) => p.type === 'mob');
  const sups = filtered.filter((p) => p.type === 'sup');
  const motos = filtered.filter((p) => p.type === 'moto');

  // Total Working Days Tally (Campo Fundamental solicitado)
  const totalDays = filtered.reduce((acc, p) => acc + Number(p.dias || 0), 0);
  const avgDays = filtered.length > 0 ? (totalDays / filtered.length).toFixed(1) : '0';

  // Género
  const femaleCount = filtered.filter((p) => p.sexo === 'F').length;
  const maleCount = filtered.filter((p) => p.sexo === 'M').length;
  const femalePercent = filtered.length > 0 ? Math.round((femaleCount / filtered.length) * 100) : 0;
  const malePercent = filtered.length > 0 ? Math.round((maleCount / filtered.length) * 100) : 0;

  // Rácio de Supervisão
  const ratioMobSup = sups.length > 0 ? (mobs.length / sups.length).toFixed(1) : mobs.length.toString();
  const ratioSupMoto = motos.length > 0 ? (sups.length / motos.length).toFixed(1) : sups.length.toString();

  // Conformidade Documental
  const audit = auditAllPeople(filtered);
  const biComplianceRate = filtered.length > 0 ? Math.round((audit.validBiCount / filtered.length) * 100) : 0;
  const ibanComplianceRate = filtered.length > 0 ? Math.round((audit.validIbanCount / filtered.length) * 100) : 0;

  // Agrupamento por Coordenação
  const coordStats = coords.map((c) => {
    const list = allPeople.filter((p) => p.coord.toUpperCase() === c.toUpperCase());
    const cMobs = list.filter((p) => p.type === 'mob').length;
    const cSups = list.filter((p) => p.type === 'sup').length;
    const cMotos = list.filter((p) => p.type === 'moto').length;
    const cDays = list.reduce((acc, p) => acc + Number(p.dias || 0), 0);
    return {
      name: c,
      total: list.length,
      mobs: cMobs,
      sups: cSups,
      motos: cMotos,
      days: cDays,
    };
  });

  const maxCoordDays = Math.max(1, ...coordStats.map((c) => c.days));

  // Distribuição de Dias Trabalhados
  const daysDistribution: Record<number, number> = {};
  filtered.forEach((p) => {
    const d = Number(p.dias) || 0;
    daysDistribution[d] = (daysDistribution[d] || 0) + 1;
  });

  // Perfil Académico e Cursos
  const courseCounts: Record<string, number> = {};
  const levelCounts: Record<string, number> = {};
  filtered.forEach((p) => {
    if (p.curso) {
      courseCounts[p.curso] = (courseCounts[p.curso] || 0) + 1;
    }
    if (p.nivelAcademico) {
      levelCounts[p.nivelAcademico] = (levelCounts[p.nivelAcademico] || 0) + 1;
    }
  });

  const topCourses = Object.entries(courseCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  const topLevels = Object.entries(levelCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Top Filter and Heading */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 md:flex-row md:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-white">
            <TrendingUp className="h-5 w-5 text-amber-400" />
            <span>{t.productivity}</span>
          </h2>
          <p className="text-xs text-slate-400">
            Acompanhamento de metas operacionais, dias de trabalho acumulados e cobertura por coordenação
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-300">Filtrar Zona:</span>
          <select
            value={selectedCoord}
            onChange={(e) => setSelectedCoord(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 outline-none focus:border-amber-500"
          >
            <option value="all">Todas as Coordenações ({allPeople.length} Agentes)</option>
            {coords.map((c) => (
              <option key={c} value={c}>
                {c} ({allPeople.filter((p) => p.coord.toUpperCase() === c.toUpperCase()).length} pessoas)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Working Days */}
        <div className="relative overflow-hidden rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-950/40 via-slate-900 to-slate-900 p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-red-400">
              {t.totalDiasTrabalhados}
            </span>
            <div className="rounded-lg bg-red-500/20 p-2 text-red-300">
              <CalendarCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{totalDays}</span>
            <span className="text-xs text-red-300 font-semibold">dias de campo</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Média de <b>{avgDays}</b> dias por agente
          </p>
        </div>

        {/* Total Staff Breakdown */}
        <div className="relative overflow-hidden rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-950/40 via-slate-900 to-slate-900 p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
              {t.totalEfetivo}
            </span>
            <div className="rounded-lg bg-blue-500/20 p-2 text-blue-300">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{filtered.length}</span>
            <span className="text-xs text-blue-300 font-semibold">agentes</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {mobs.length} Mobs · {sups.length} Sups · {motos.length} Motos
          </p>
        </div>

        {/* Supervision & Logistics Ratios */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Rácios de Apoio
            </span>
            <div className="rounded-lg bg-amber-500/20 p-2 text-amber-300">
              <Layers className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-xs font-semibold text-slate-200">
              <span>Mobs / Supervisor:</span>
              <span className="text-amber-300 font-bold">{ratioMobSup} : 1</span>
            </div>
            <div className="mt-1 flex justify-between text-xs font-semibold text-slate-200">
              <span>Sups / Motoqueiro:</span>
              <span className="text-amber-300 font-bold">{ratioSupMoto} : 1</span>
            </div>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400">
            Padrão ideal OMS: 8 a 12 mobilizadores por supervisor
          </p>
        </div>

        {/* Data Quality & Compliance */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Conformidade Documental
            </span>
            <div className="rounded-lg bg-emerald-500/20 p-2 text-emerald-300">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{biComplianceRate}%</span>
            <span className="text-xs text-emerald-300 font-semibold">BI Válidos</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {ibanComplianceRate}% dos IBANs verificados sem erro
          </p>
        </div>
      </div>

      {/* Two Column Grid: Coordination Breakdown & Gender/Days Distribution */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Coordination Progress & Days Ranking */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold text-white">
              <MapPin className="h-4 w-4 text-red-400" />
              <span>{t.coberturaZonas} (Dias & Agentes)</span>
            </h3>
            <span className="text-xs text-slate-400">{coordStats.length} Zonas Ativas</span>
          </div>

          <div className="space-y-3.5">
            {coordStats.map((item) => {
              const pct = Math.round((item.days / maxCoordDays) * 100);
              return (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">{item.name}</span>
                    <span className="text-slate-400">
                      <b>{item.days}</b> dias · <b>{item.total}</b> agentes ({item.mobs} M / {item.sups} S / {item.motos} Mot)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-red-600 via-amber-500 to-emerald-500 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Gender Breakdown & Days Distribution */}
        <div className="space-y-6">
          {/* Gender Balance Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
              <Users className="h-4 w-4 text-amber-400" />
              <span>{t.distribuicaoGenero}</span>
            </h3>

            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-pink-300 font-semibold">
                Mulheres: <b>{femaleCount}</b> ({femalePercent}%)
              </span>
              <span className="text-sky-300 font-semibold">
                Homens: <b>{maleCount}</b> ({malePercent}%)
              </span>
            </div>

            <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-slate-800 p-0.5">
              <div
                className="h-full rounded-l-full bg-pink-500 transition-all"
                style={{ width: `${femalePercent}%` }}
                title={`Mulheres: ${femaleCount} (${femalePercent}%)`}
              />
              <div
                className="h-full rounded-r-full bg-sky-500 transition-all"
                style={{ width: `${malePercent}%` }}
                title={`Homens: ${maleCount} (${malePercent}%)`}
              />
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              Forte representação feminina na mobilização de base comunitária no município do Sumbe.
            </p>
          </div>

          {/* Habilitações & Cursos Académicos Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
              <GraduationCap className="h-4 w-4 text-indigo-400" />
              <span>Habilitações Literárias & Cursos dos Agentes</span>
            </h3>

            {topCourses.length === 0 && topLevels.length === 0 ? (
              <p className="text-xs text-slate-500 italic">
                Nenhuma formação académica preenchida ainda. Atualize os cadastros para ver as métricas.
              </p>
            ) : (
              <div className="space-y-4">
                {topCourses.length > 0 && (
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 block mb-2">
                      Cursos Mais Frequentes
                    </span>
                    <div className="space-y-1.5">
                      {topCourses.map(([cName, cCount]) => {
                        const pct = Math.round((cCount / filtered.length) * 100);
                        return (
                          <div key={cName} className="space-y-0.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-200">{cName}</span>
                              <span className="text-slate-400 text-[11px]">
                                <b>{cCount}</b> agentes ({pct}%)
                              </span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                              <div
                                className="h-full rounded-full bg-indigo-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {topLevels.length > 0 && (
                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                      Níveis Académicos Registados
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {topLevels.map(([lName, lCount]) => (
                        <span
                          key={lName}
                          className="rounded-lg border border-indigo-500/30 bg-indigo-950/30 px-2 py-0.5 text-[10px] font-semibold text-indigo-200"
                        >
                          {lName}: <b>{lCount}</b>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Working Days Distribution Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
              <Clock className="h-4 w-4 text-emerald-400" />
              <span>Distribuição da Carga de Trabalho (Dias por Agente)</span>
            </h3>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Object.entries(daysDistribution)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([days, count]) => (
                  <div
                    key={days}
                    className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-800/50 p-2.5"
                  >
                    <span className="text-lg font-black text-amber-400">{days}</span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Dias</span>
                    <span className="mt-1 rounded-full bg-slate-700/60 px-2 py-0.5 text-xs font-semibold text-slate-200">
                      {count} agentes
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
