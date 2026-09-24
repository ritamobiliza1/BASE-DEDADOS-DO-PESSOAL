import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  LogIn,
  LogOut,
  Plus,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import {
  googleSignIn,
  logoutGoogle,
  fetchCalendarEvents,
  createCalendarEvent,
  auth,
} from '../services/calendarService';
import { CalendarEventItem, SupportedLanguage } from '../types';
import { translations } from '../utils/i18n';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface GoogleCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: SupportedLanguage;
  onUserChanged: (email: string | null) => void;
}

export const GoogleCalendarModal: React.FC<GoogleCalendarModalProps> = ({
  isOpen,
  onClose,
  lang,
  onUserChanged,
}) => {
  const t = translations[lang];
  const isOnline = useOnlineStatus();
  const [user, setUser] = useState(auth.currentUser);
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Confirmation state for adding event
  const [confirmEvent, setConfirmEvent] = useState<CalendarEventItem | null>(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((curr) => {
      setUser(curr);
      onUserChanged(curr?.email || null);
      if (curr && isOnline) {
        loadEvents();
      }
    });
    return () => unsub();
  }, [isOnline]);

  if (!isOpen) return null;

  const loadEvents = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const evs = await fetchCalendarEvents();
      setEvents(evs);
    } catch (err: any) {
      console.warn('Erro ao carregar eventos:', err);
      setErrorMsg(err.message || 'Falha ao comunicar com o Google Calendar');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await googleSignIn();
      if (res?.user) {
        setUser(res.user);
        onUserChanged(res.user.email || null);
        await loadEvents();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao autenticar com o Google');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logoutGoogle();
    setUser(null);
    setEvents([]);
    onUserChanged(null);
  };

  const requestCreateEvent = (event: CalendarEventItem) => {
    setConfirmEvent(event);
  };

  const executeCreateEvent = async () => {
    if (!confirmEvent) return;
    try {
      setLoading(true);
      setErrorMsg(null);
      await createCalendarEvent(confirmEvent);
      setSuccessMsg(`Evento "${confirmEvent.summary}" adicionado com sucesso à sua Google Agenda!`);
      setConfirmEvent(null);
      await loadEvents();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao criar evento');
    } finally {
      setLoading(false);
    }
  };

  // Pre-configured campaign milestones
  const campaignMilestones: CalendarEventItem[] = [
    {
      summary: '3ª Ronda nOVP2 · Campanha de Vacinação do Sumbe',
      description: 'Período operacional intensivo de mobilização social e vacinação porta-a-porta no Sumbe (Cuanza-Sul). Efetivo de 157 mobilizadores e 15 supervisores.',
      start: { date: '2026-10-02' },
      end: { date: '2026-10-07' },
      location: 'Município do Sumbe, Cuanza-Sul, Angola',
    },
    {
      summary: 'Reunião Diária de Avaliação de Mobilizadores (17h00)',
      description: 'Reunião diária de balanço entre supervisores e coordenadores municipais de saúde.',
      start: { dateTime: '2026-10-02T17:00:00+01:00' },
      end: { dateTime: '2026-10-02T18:30:00+01:00' },
      location: 'Direcção Municipal de Saúde do Sumbe',
    },
    {
      summary: 'Fecho e Auditoria de Listas de Presença nOVP2',
      description: 'Validação final de dias de trabalho cumpridos pelos mobilizadores e motoqueiros.',
      start: { date: '2026-10-07' },
      end: { date: '2026-10-08' },
      location: 'Gabinete Municipal de Saúde do Sumbe',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-200 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-blue-500/20 p-2 text-blue-400">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Integração com Google Agenda</h2>
              <p className="text-xs text-slate-400">
                Sincronize as rondas da campanha, reuniões de coordenação e dias de campo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Offline Warning */}
        {!isOnline && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-950/40 p-3 text-xs text-amber-300">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>
              O seu dispositivo está atualmente sem ligação à Internet. A sincronização com a Google Agenda necessita de rede. Todos os seus dados locais continuam seguros.
            </span>
          </div>
        )}

        {/* Auth Status Panel */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          {user ? (
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || ''} className="h-10 w-10 rounded-full border border-blue-500" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 font-bold text-white">
                  {(user.displayName || user.email || 'G')[0].toUpperCase()}
                </div>
              )}
              <div>
                <div className="text-xs font-bold text-white">{user.displayName || 'Utilizador Google'}</div>
                <div className="text-[11px] text-slate-400">{user.email}</div>
              </div>
            </div>
          ) : (
            <div>
              <div className="text-xs font-bold text-white">Conta Google não vinculada</div>
              <div className="text-[11px] text-slate-400">
                Inicie sessão para enviar datas operacionais para a sua agenda
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <button
                  onClick={loadEvents}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Atualizar</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-950/40 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-900/50"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sair</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleLogin}
                disabled={loading || !isOnline}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 shadow disabled:opacity-50"
              >
                <LogIn className="h-4 w-4" />
                <span>Conectar com o Google</span>
              </button>
            )}
          </div>
        </div>

        {/* Success or Error Feedback */}
        {successMsg && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-3 text-xs text-emerald-300">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-xs text-red-300">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Confirmation Modal Box */}
        {confirmEvent && (
          <div className="rounded-xl border border-amber-500/50 bg-amber-950/30 p-4 space-y-3">
            <div className="text-xs font-bold text-amber-300">
              Confirmação Necessária: Adicionar evento à Google Agenda?
            </div>
            <div className="text-xs text-slate-300 space-y-1">
              <div><strong>Título:</strong> {confirmEvent.summary}</div>
              <div><strong>Descrição:</strong> {confirmEvent.description}</div>
              <div><strong>Data:</strong> {confirmEvent.start?.date || confirmEvent.start?.dateTime}</div>
              <div><strong>Local:</strong> {confirmEvent.location}</div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-amber-500/20">
              <button
                onClick={() => setConfirmEvent(null)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={executeCreateEvent}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500"
              >
                Confirmar e Adicionar
              </button>
            </div>
          </div>
        )}

        {/* Milestones to Synchronize */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Marcos da Campanha Prontos para Sincronização
          </h3>
          <div className="space-y-2">
            {campaignMilestones.map((ms, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-800/40 p-3 text-xs"
              >
                <div>
                  <div className="font-bold text-white">{ms.summary}</div>
                  <div className="text-[11px] text-slate-400">
                    {ms.start?.date || ms.start?.dateTime?.slice(0, 10)} · {ms.location}
                  </div>
                </div>

                <button
                  onClick={() => requestCreateEvent(ms)}
                  disabled={!user || loading || !isOnline}
                  className="inline-flex items-center gap-1 rounded-lg border border-blue-500/40 bg-blue-950/60 px-2.5 py-1 text-[11px] font-semibold text-blue-200 hover:bg-blue-900/60 disabled:opacity-40"
                >
                  <Plus className="h-3 w-3" />
                  <span>Sincronizar</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Current Events from Google Calendar */}
        {user && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Próximos Eventos na sua Google Agenda ({events.length})
            </h3>
            <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-xl border border-slate-800 bg-slate-950/80 p-2">
              {events.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  Nenhum evento futuro encontrado ou carregando...
                </div>
              ) : (
                events.map((ev) => (
                  <div key={ev.id} className="rounded-lg border border-slate-800/80 bg-slate-900/70 p-2 text-xs">
                    <div className="font-bold text-slate-200">{ev.summary}</div>
                    <div className="text-[10px] text-slate-400">
                      {ev.start?.dateTime?.slice(0, 16).replace('T', ' ') || ev.start?.date}
                      {ev.location ? ` · ${ev.location}` : ''}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

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
