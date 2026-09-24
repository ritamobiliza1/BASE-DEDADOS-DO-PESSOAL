import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  Filter,
  FileCheck,
} from 'lucide-react';
import { Person, SupportedLanguage } from '../types';
import { translations } from '../utils/i18n';
import { auditAllPeople, autoNormalizePerson } from '../utils/validation';

interface ValidationAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  allPeople: Person[];
  onBatchNormalize: (normalizedPeople: Person[]) => void;
  onSelectPersonToEdit: (person: Person) => void;
  lang: SupportedLanguage;
}

export const ValidationAuditModal: React.FC<ValidationAuditModalProps> = ({
  isOpen,
  onClose,
  allPeople,
  onBatchNormalize,
  onSelectPersonToEdit,
  lang,
}) => {
  const t = translations[lang];
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'error' | 'warning'>('all');

  if (!isOpen) return null;

  const summary = auditAllPeople(allPeople);

  const displayedIssues = summary.totalIssues.filter((issue) => {
    if (filterSeverity === 'all') return true;
    return issue.severity === filterSeverity;
  });

  const handleNormalizeAll = () => {
    if (confirm('Deseja limpar espaços extras, converter BIs e IBANs para maiúsculas e atualizar os nomes dos bancos em todos os registos?')) {
      const normalized = allPeople.map(autoNormalizePerson);
      onBatchNormalize(normalized);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-200 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Centro de Auditoria & Validação de Dados</h2>
              <p className="text-xs text-slate-400">
                Verificação rigorosa de integridade dos Bilhetes de Identidade (BI), IBANs, dias de trabalho e duplicados
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quality Score and Metric Badges */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-3 text-center">
            <span className="text-[10px] font-bold uppercase text-slate-400">Efetivo Auditado</span>
            <div className="text-xl font-black text-white">{summary.totalPeople}</div>
          </div>

          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 text-center">
            <span className="text-[10px] font-bold uppercase text-emerald-400">BIs Conformados</span>
            <div className="text-xl font-black text-emerald-300">
              {summary.validBiCount} / {summary.totalPeople}
            </div>
          </div>

          <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 text-center">
            <span className="text-[10px] font-bold uppercase text-amber-400">BIs Duplicados</span>
            <div className="text-xl font-black text-amber-300">{summary.duplicateBiList.length}</div>
          </div>

          <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-3 text-center">
            <span className="text-[10px] font-bold uppercase text-red-400">IBANs c/ Inconsistência</span>
            <div className="text-xl font-black text-red-300">{summary.invalidIbanCount}</div>
          </div>
        </div>

        {/* 1-Click Normalize & Fix Button */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-950/30 p-3.5">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-5 w-5 text-amber-400 flex-shrink-0" />
            <div>
              <div className="text-xs font-bold text-amber-300">Auto-Correção & Normalização dos Registos</div>
              <div className="text-[11px] text-slate-400">
                Ajusta maiúsculas/minúsculas, remove espaços acidentais em BIs e IBANs, e associa bancos automaticamente.
              </div>
            </div>
          </div>
          <button
            onClick={handleNormalizeAll}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400 shadow transition"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Normalizar Todos Agora</span>
          </button>
        </div>

        {/* Issues List with Filter */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Alertas Detectados ({displayedIssues.length})
            </h3>
            <div className="flex items-center gap-1.5 text-xs">
              <button
                onClick={() => setFilterSeverity('all')}
                className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                  filterSeverity === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Todos ({summary.totalIssues.length})
              </button>
              <button
                onClick={() => setFilterSeverity('error')}
                className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                  filterSeverity === 'error' ? 'bg-red-900 text-red-200' : 'text-slate-400 hover:text-white'
                }`}
              >
                Erros ({summary.totalIssues.filter((i) => i.severity === 'error').length})
              </button>
              <button
                onClick={() => setFilterSeverity('warning')}
                className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                  filterSeverity === 'warning' ? 'bg-amber-900 text-amber-200' : 'text-slate-400 hover:text-white'
                }`}
              >
                Avisos ({summary.totalIssues.filter((i) => i.severity === 'warning').length})
              </button>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto space-y-2 rounded-xl border border-slate-800 bg-slate-950/80 p-2">
            {displayedIssues.length === 0 ? (
              <div className="py-8 text-center text-xs text-emerald-400 font-semibold flex flex-col items-center gap-1.5">
                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                <span>Nenhuma inconformidade detetada com o filtro selecionado!</span>
              </div>
            ) : (
              displayedIssues.map((issue, idx) => {
                const person = allPeople.find((p) => p.id === issue.personId);
                return (
                  <div
                    key={`${issue.personId}_${idx}`}
                    className={`flex items-center justify-between rounded-xl border p-2.5 text-xs transition ${
                      issue.severity === 'error'
                        ? 'border-red-900/50 bg-red-950/20 text-red-200'
                        : 'border-amber-900/50 bg-amber-950/20 text-amber-200'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{issue.personName}</span>
                        <span className="rounded bg-slate-800 px-1.5 py-0.2 text-[10px] text-slate-400 font-medium">
                          {issue.coord}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-300">{issue.message}</div>
                    </div>

                    {person && (
                      <button
                        onClick={() => {
                          onClose();
                          onSelectPersonToEdit(person);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-700 transition"
                      >
                        <span>Corrigir</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-800 pt-3">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
