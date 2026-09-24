import React, { useState } from 'react';
import {
  Shield,
  Wifi,
  WifiOff,
  Download,
  Calendar,
  Printer,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  Database,
  Languages,
  PlusCircle,
  Mail,
} from 'lucide-react';
import { SupportedLanguage } from '../types';
import { translations } from '../utils/i18n';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface HeaderProps {
  lang: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  onOpenNewPerson: (type: 'mob' | 'sup' | 'moto') => void;
  onOpenExportModal: (mode: 'export' | 'print' | 'pdf') => void;
  onOpenValidationModal: () => void;
  onOpenGoogleCalendar: () => void;
  onOpenEmailModal: () => void;
  onQuickGeneratePDF: () => void;
  hasValidationIssues: boolean;
  issuesCount: number;
  newStaffCount: number;
  googleUserEmail: string | null;
  isFirebaseSynced?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  onLanguageChange,
  onOpenNewPerson,
  onOpenExportModal,
  onOpenValidationModal,
  onOpenGoogleCalendar,
  onOpenEmailModal,
  onQuickGeneratePDF,
  hasValidationIssues,
  issuesCount,
  newStaffCount,
  googleUserEmail,
  isFirebaseSynced,
}) => {
  const t = translations[lang];
  const isOnline = useOnlineStatus();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  return (
    <header className="sticky top-2 z-40 mb-4 rounded-2xl border border-slate-700/80 bg-slate-900/90 p-4 shadow-2xl backdrop-blur-xl transition">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Brand identity */}
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 via-amber-600 to-amber-400 p-2 shadow-lg shadow-red-950/40 ring-1 ring-amber-400/40">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="bg-gradient-to-r from-white via-amber-200 to-red-400 bg-clip-text text-xl font-black tracking-tight text-transparent">
                {t.appTitle}
              </h1>
              {/* Online/Offline status pill */}
              <div
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 transition ${
                  isOnline
                    ? 'bg-emerald-950/60 text-emerald-300 ring-emerald-500/40'
                    : 'bg-amber-950/70 text-amber-300 ring-amber-500/50 animate-pulse'
                }`}
                title={isOnline ? t.onlineNotice : t.offlineNotice}
              >
                {isOnline ? (
                  <>
                    <Wifi className="h-3 w-3 text-emerald-400" />
                    <span>Online</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3 text-amber-400" />
                    <span>100% Offline (Local)</span>
                  </>
                )}
              </div>

              {/* Firebase Cloud status indicator */}
              <div
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 transition ${
                  isFirebaseSynced
                    ? 'bg-amber-950/60 text-amber-300 ring-amber-500/40'
                    : 'bg-slate-800/80 text-slate-300 ring-slate-600/40'
                }`}
                title="Sincronização na nuvem com Firebase Firestore"
              >
                <Database className="h-3 w-3 text-amber-400" />
                <span>{isFirebaseSynced ? 'Firebase Conectado' : 'Firebase Pronto'}</span>
              </div>
            </div>
            <p className="text-xs text-slate-400">{t.appSubtitle}</p>
          </div>
        </div>

        {/* Global Toolbar and Utilities - Grouped neatly */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Grupo 1: Documentos e Exportações */}
          <div className="flex items-center rounded-xl border border-slate-800 bg-slate-950/80 p-0.5 shadow-inner">
            <button
              onClick={() => onOpenExportModal('export')}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-950/60 hover:text-emerald-200 transition"
              title="Exportar dados para Excel (.xls)"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
              <span>Excel</span>
            </button>
            <div className="h-4 w-px bg-slate-800" />
            <button
              onClick={() => onOpenExportModal('print')}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-950/60 hover:text-amber-200 transition"
              title="Imprimir com cabeçalho oficial"
            >
              <Printer className="h-3.5 w-3.5 text-amber-400" />
              <span>Imprimir</span>
            </button>
            <div className="h-4 w-px bg-slate-800" />
            <button
              onClick={onQuickGeneratePDF}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-950/60 hover:text-white transition"
              title="Gerar relatório em PDF formal automático"
            >
              <FileText className="h-3.5 w-3.5 text-red-400" />
              <span>PDF Oficial</span>
            </button>
          </div>

          {/* Grupo 2: Integrações & Auditoria */}
          <div className="flex items-center rounded-xl border border-slate-800 bg-slate-950/80 p-0.5 shadow-inner">
            <button
              onClick={onOpenGoogleCalendar}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                googleUserEmail
                  ? 'text-emerald-300 hover:bg-emerald-950/50'
                  : 'text-blue-300 hover:bg-blue-950/50 hover:text-white'
              }`}
              title="Sincronizar datas com Google Agenda"
            >
              <Calendar className="h-3.5 w-3.5 text-blue-400" />
              <span>{googleUserEmail ? 'Agenda OK' : 'Google Agenda'}</span>
            </button>
            <div className="h-4 w-px bg-slate-800" />
            <button
              onClick={onOpenEmailModal}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-950/50 hover:text-white transition"
              title="Notificações por e-mail"
            >
              <Mail className="h-3.5 w-3.5 text-indigo-400" />
              <span>E-mail</span>
            </button>
            <div className="h-4 w-px bg-slate-800" />
            <button
              onClick={onOpenValidationModal}
              className={`relative inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                hasValidationIssues
                  ? 'text-amber-300 hover:bg-amber-950/60'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
              title="Auditoria de BI, IBAN e telefones"
            >
              <AlertTriangle className={`h-3.5 w-3.5 ${hasValidationIssues ? 'text-amber-400' : 'text-slate-400'}`} />
              <span>Auditoria</span>
              {issuesCount > 0 && (
                <span className="rounded-full bg-amber-500 px-1.5 py-0.2 text-[10px] font-black text-slate-950">
                  {issuesCount}
                </span>
              )}
            </button>
          </div>

          {/* Grupo 3: PWA & Idioma */}
          <div className="flex items-center gap-2">
            {isInstallable && (
              <button
                onClick={install}
                className="inline-flex items-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-950/60 px-2.5 py-1.5 text-xs font-semibold text-sky-200 shadow hover:bg-sky-900/60 hover:text-white transition"
                title="Instalar como aplicativo no computador ou telemóvel"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t.installApp}</span>
              </button>
            )}

            {isIOS && !isInstalled && (
              <button
                onClick={() => setShowIOSGuide(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-600 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 transition"
              >
                <Download className="h-3.5 w-3.5" />
                <span>iOS</span>
              </button>
            )}

            <div className="relative inline-flex items-center rounded-xl border border-slate-700 bg-slate-800/90 px-2 py-1 text-xs">
              <Languages className="mr-1.5 h-3.5 w-3.5 text-slate-400" />
              <select
                value={lang}
                onChange={(e) => onLanguageChange(e.target.value as SupportedLanguage)}
                aria-label="Selecionar Idioma"
                className="bg-transparent font-medium text-slate-200 outline-none cursor-pointer text-xs"
              >
                <option value="pt" className="bg-slate-900 text-slate-200">PT</option>
                <option value="en" className="bg-slate-900 text-slate-200">EN</option>
                <option value="fr" className="bg-slate-900 text-slate-200">FR</option>
                <option value="umb" className="bg-slate-900 text-slate-200">UMB</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Add Bar with automatic NOVO flag */}
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-400 mr-1 hidden sm:inline">Adicionar ao Efetivo:</span>
          <button
            onClick={() => onOpenNewPerson('mob')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-red-950/50 hover:from-red-500 hover:to-red-600 transition"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>+ Mobilizador</span>
          </button>

          <button
            onClick={() => onOpenNewPerson('sup')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-blue-950/50 hover:from-blue-500 hover:to-blue-600 transition"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>+ Supervisor</span>
          </button>

          <button
            onClick={() => onOpenNewPerson('moto')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-teal-950/50 hover:from-teal-500 hover:to-cyan-500 transition"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>+ Motoqueiro</span>
          </button>
        </div>

        {newStaffCount > 0 && (
          <div className="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-950/30 px-3 py-1 text-xs text-amber-300">
            <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-ping" />
            <span>
              <b>{newStaffCount}</b> novos cadastros pendentes de validação
            </span>
          </div>
        )}
      </div>

      {/* iOS Safari Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-200 shadow-2xl">
            <h3 className="text-base font-bold text-white">Instalar no iPhone / iPad</h3>
            <p className="mt-2 text-xs text-slate-400">
              1. Toque no botão <strong>Partilhar (Share)</strong> na barra inferior do Safari.<br />
              2. Deslize para baixo e toque em <strong>Ecrã Principal (Add to Home Screen)</strong>.<br />
              3. O aplicativo funcionará totalmente offline mesmo sem ligação à Internet.
            </p>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-4 w-full rounded-xl bg-slate-800 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
