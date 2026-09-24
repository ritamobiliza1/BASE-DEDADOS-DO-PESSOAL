import React, { useRef } from 'react';
import {
  Download,
  Upload,
  RotateCcw,
  History,
  CheckCircle2,
  Calendar,
  Database,
  ShieldCheck,
} from 'lucide-react';
import { AppState, SupportedLanguage } from '../types';
import { translations } from '../utils/i18n';
import { exportBackupJSON, getInitialState, saveAppState } from '../utils/storage';

interface HistoryAndBackupViewProps {
  state: AppState;
  onRestoreState: (newState: AppState) => void;
  lang: SupportedLanguage;
}

export const HistoryAndBackupView: React.FC<HistoryAndBackupViewProps> = ({
  state,
  onRestoreState,
  lang,
}) => {
  const t = translations[lang];
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    exportBackupJSON(state);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.mobs && Array.isArray(parsed.mobs)) {
          if (confirm('Deseja restaurar a cópia de segurança selecionada? Os dados atuais serão substituídos pelos do ficheiro.')) {
            onRestoreState(parsed);
            alert('Cópia de segurança restaurada com sucesso!');
          }
        } else {
          alert('Ficheiro inválido: Formato de base de dados não reconhecido.');
        }
      } catch (err) {
        alert('Erro ao ler ficheiro JSON.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleResetToFactory = () => {
    if (
      confirm(
        'Atenção: Tem a certeza de que deseja repor os dados de fábrica? Todos os novos cadastros criados serão reiniciados para a base original da 3ª Ronda (157 Mobs, 15 Sups, 15 Motos).'
      )
    ) {
      const initial = getInitialState();
      saveAppState(initial);
      onRestoreState(initial);
    }
  };

  return (
    <div className="space-y-6">
      {/* Backup and Local Persistence Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <div className="rounded-xl bg-amber-500/20 p-2 text-amber-400">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Armazenamento Offline & Cópias de Segurança</h2>
            <p className="text-xs text-slate-400">
              Todos os dados ficam guardados localmente no seu dispositivo. Guarde ou restaure ficheiros quando necessário.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Download JSON */}
          <button
            onClick={handleExport}
            className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-4 text-xs font-bold text-emerald-200 hover:bg-emerald-900/40 hover:text-white transition shadow"
          >
            <Download className="h-5 w-5 text-emerald-400" />
            <div className="text-left">
              <div>Exportar Backup JSON</div>
              <div className="text-[10px] text-slate-400 font-normal">Ficheiro completo de segurança</div>
            </div>
          </button>

          {/* Upload JSON */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 rounded-xl border border-blue-500/40 bg-blue-950/40 p-4 text-xs font-bold text-blue-200 hover:bg-blue-900/40 hover:text-white transition shadow"
          >
            <Upload className="h-5 w-5 text-blue-400" />
            <div className="text-left">
              <div>Restaurar Ficheiro Backup</div>
              <div className="text-[10px] text-slate-400 font-normal">Carregar base salva anteriormente</div>
            </div>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />

          {/* Reset to Seed Data */}
          <button
            onClick={handleResetToFactory}
            className="flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-950/30 p-4 text-xs font-bold text-red-200 hover:bg-red-900/40 hover:text-white transition shadow"
          >
            <RotateCcw className="h-5 w-5 text-red-400" />
            <div className="text-left">
              <div>Repor Base Inicial</div>
              <div className="text-[10px] text-slate-400 font-normal">157 Mobs / 15 Sups / 15 Motos</div>
            </div>
          </button>
        </div>
      </div>

      {/* Campaign Rounds Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <Calendar className="h-5 w-5 text-red-400" />
            <h3 className="text-sm font-bold text-white">Rondas da Campanha nOVP2 · Município do Sumbe</h3>
          </div>
          <span className="rounded-full bg-red-950/60 border border-red-500/30 px-2.5 py-0.5 text-[10px] font-bold text-red-300">
            3ª Ronda em Curso
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {state.rondas.map((ronda) => (
            <div
              key={ronda.id}
              className={`rounded-xl border p-3 text-xs transition ${
                ronda.status === 'Em Curso'
                  ? 'border-red-500/60 bg-red-950/30 shadow-lg'
                  : 'border-slate-800 bg-slate-800/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">{ronda.nome}</span>
                <span
                  className={`rounded-full px-2 py-0.2 text-[9px] font-bold ${
                    ronda.status === 'Em Curso'
                      ? 'bg-red-500 text-white'
                      : ronda.status === 'Concluída'
                      ? 'bg-slate-700 text-slate-300'
                      : 'bg-blue-900 text-blue-200'
                  }`}
                >
                  {ronda.status}
                </span>
              </div>
              <div className="mt-2 text-[11px] text-slate-400">
                {ronda.dataInicio} até {ronda.dataFim}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* History and Activity Audit Trail */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <History className="h-5 w-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Histórico de Alterações & Operações</h3>
          </div>
          <span className="text-xs text-slate-400">{state.history.length} registos no histórico</span>
        </div>

        <div className="mt-4 max-h-72 overflow-y-auto space-y-2 rounded-xl border border-slate-800 bg-slate-950/80 p-3">
          {state.history.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500">
              Nenhuma alteração registada nesta sessão.
            </div>
          ) : (
            state.history.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between rounded-lg border border-slate-800/80 bg-slate-900/60 p-2.5 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-400">{item.action}</span>
                    <span className="text-slate-300 font-semibold">{item.person}</span>
                  </div>
                  {item.details && <div className="text-[11px] text-slate-400">{item.details}</div>}
                </div>
                <div className="text-[10px] text-slate-500 font-mono whitespace-nowrap ml-3">
                  {item.at}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
