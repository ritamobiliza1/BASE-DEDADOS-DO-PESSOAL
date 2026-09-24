import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  Users,
  UserCheck,
  Bike,
  CalendarDays,
  Smartphone,
  ShieldAlert,
  Database,
  Printer,
  FileText,
  FileSpreadsheet,
  AlertTriangle,
  TrendingUp,
  UserPlus,
  Coins,
} from 'lucide-react';
import {
  AppState,
  Person,
  PersonType,
  PersonStatus,
  Recarga,
  ExportFilterOptions,
  SupportedLanguage,
} from './types';
import { loadAppState, saveAppState, logHistory, getInitialState } from './utils/storage';
import { translations, getSavedLanguage, saveLanguage } from './utils/i18n';
import { auditAllPeople, autoNormalizePerson } from './utils/validation';
import { generateAutomatedPDF } from './utils/pdfExport';
import {
  subscribeToPeople,
  savePersonToFirestore,
  deletePersonFromFirestore,
  subscribeToRecargas,
  saveRecargaToFirestore,
  syncInitialDataToFirestoreIfEmpty,
} from './utils/firebase';

// Components
import { Header } from './components/Header';
import { ProductivityDashboard } from './components/ProductivityDashboard';
import { EscalaDiasTable } from './components/EscalaDiasTable';
import { PeopleTable } from './components/PeopleTable';
import { RecargasTable } from './components/RecargasTable';
import { PersonFormModal } from './components/PersonFormModal';
import { ValidationAuditModal } from './components/ValidationAuditModal';
import { ExportPrintModal } from './components/ExportPrintModal';
import { EmailNotificationModal } from './components/EmailNotificationModal';
import { GoogleCalendarModal } from './components/GoogleCalendarModal';
import { HistoryAndBackupView } from './components/HistoryAndBackupView';
import { PrintView } from './components/PrintView';
import { NovosAndSubstituicaoManager } from './components/NovosAndSubstituicaoManager';
import { ListaPresencaView } from './components/ListaPresencaView';
import { MapaPagamentoView } from './components/MapaPagamentoView';

export default function App() {
  const [lang, setLang] = useState<SupportedLanguage>(getSavedLanguage());
  const [state, setState] = useState<AppState>(loadAppState);
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'mobs' | 'sups' | 'motos' | 'dias' | 'presenca' | 'pagamentos' | 'substituicoes' | 'recargas' | 'auditoria' | 'dados'
  >('dashboard');

  // Modals state
  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [defaultPersonType, setDefaultPersonType] = useState<PersonType>('mob');

  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportModalMode, setExportModalMode] = useState<'export' | 'print' | 'pdf'>('export');
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isGoogleCalendarOpen, setIsGoogleCalendarOpen] = useState(false);

  // Print view state
  const [printOptions, setPrintOptions] = useState<ExportFilterOptions | null>(null);

  // Google user email
  const [googleUserEmail, setGoogleUserEmail] = useState<string | null>(null);
  const [isFirebaseSynced, setIsFirebaseSynced] = useState<boolean>(false);

  // Sincronização em tempo real com Firebase Cloud Firestore
  useEffect(() => {
    let isMounted = true;

    // Se o Firestore estiver vazio pela primeira vez, faz o upload inicial
    syncInitialDataToFirestoreIfEmpty(state).then((seeded) => {
      if (seeded) {
        console.log('Dados da campanha migrados e guardados com sucesso no Firebase Firestore.');
      }
    });

    // Escutar pessoas (Mobilizadores, Supervisores, Motoqueiros)
    const unsubPeople = subscribeToPeople(
      (firestorePeople) => {
        if (!isMounted) return;
        if (firestorePeople && firestorePeople.length > 0) {
          setState((prev) => {
            const mobs = firestorePeople.filter((p) => p.type === 'mob');
            const sups = firestorePeople.filter((p) => p.type === 'sup');
            const motos = firestorePeople.filter((p) => p.type === 'moto');
            const updated = { ...prev, mobs, sups, motos };
            saveAppState(updated);
            return updated;
          });
          setIsFirebaseSynced(true);
        }
      },
      (err) => {
        console.warn('Firebase sync offline ou em cache local:', err);
      }
    );

    // Escutar recargas telefónicas
    const unsubRecs = subscribeToRecargas(
      (firestoreRecs) => {
        if (!isMounted) return;
        if (firestoreRecs && firestoreRecs.length > 0) {
          setState((prev) => {
            const updated = { ...prev, recs: firestoreRecs };
            saveAppState(updated);
            return updated;
          });
        }
      },
      (err) => {
        console.warn('Firebase recargas sync offline:', err);
      }
    );

    return () => {
      isMounted = false;
      unsubPeople();
      unsubRecs();
    };
  }, []);

  const t = translations[lang];

  // Consolidar todas as pessoas para filtros e validação
  const allPeople = useMemo(
    () => [...state.mobs, ...state.sups, ...state.motos],
    [state.mobs, state.sups, state.motos]
  );

  // Lista de coordenações existentes
  const availableCoords = useMemo(
    () => Array.from(new Set(allPeople.map((p) => p.coord).filter(Boolean))).sort(),
    [allPeople]
  );

  // Auditoria de dados para alertas no Header
  const auditSummary = useMemo(() => auditAllPeople(allPeople), [allPeople]);
  const newStaffCount = useMemo(
    () => allPeople.filter((p) => p.isNovo || p.estado === 'NOVO').length,
    [allPeople]
  );

  const handleLanguageChange = (newLang: SupportedLanguage) => {
    setLang(newLang);
    saveLanguage(newLang);
  };

  // Manipulação de Pessoas (CRUD)
  const handleOpenNewPerson = (type: PersonType) => {
    setEditingPerson(null);
    setDefaultPersonType(type);
    setIsPersonModalOpen(true);
  };

  const handleEditPerson = (person: Person) => {
    setEditingPerson(person);
    setDefaultPersonType(person.type);
    setIsPersonModalOpen(true);
  };

  const handleSavePerson = (data: Partial<Person>) => {
    const isNew = !editingPerson;
    const personId = editingPerson ? editingPerson.id : 'id_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);

    const updatedPerson: Person = {
      id: personId,
      type: data.type || defaultPersonType,
      nome: data.nome || '',
      bi: data.bi || '',
      sexo: data.sexo || 'F',
      coord: data.coord || 'CHINGO 1',
      dias: data.dias || 5, // Dias de trabalho preservados
      iban: data.iban || '',
      banco: data.banco || '',
      contacto: data.contacto || '',
      funcao: data.funcao,
      marca: data.marca,
      matricula: data.matricula,
      estado: data.estado || 'NOVO',
      isNovo: isNew ? true : data.isNovo ?? (data.estado === 'NOVO'),
      obs: data.obs,
      createdAt: editingPerson?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let nextState = { ...state };

    if (isNew) {
      if (updatedPerson.type === 'mob') {
        nextState.mobs = [updatedPerson, ...nextState.mobs];
      } else if (updatedPerson.type === 'sup') {
        nextState.sups = [updatedPerson, ...nextState.sups];
      } else {
        nextState.motos = [updatedPerson, ...nextState.motos];
      }
      nextState = logHistory(
        nextState,
        'Novo Registo Criado',
        updatedPerson.nome,
        `Cadastrado como ${updatedPerson.type.toUpperCase()} na coordenação ${updatedPerson.coord} com ${updatedPerson.dias} dias.`
      );
    } else {
      const replaceInList = (list: Person[]) =>
        list.map((p) => (p.id === updatedPerson.id ? updatedPerson : p));

      if (updatedPerson.type === 'mob') nextState.mobs = replaceInList(nextState.mobs);
      if (updatedPerson.type === 'sup') nextState.sups = replaceInList(nextState.sups);
      if (updatedPerson.type === 'moto') nextState.motos = replaceInList(nextState.motos);

      nextState = logHistory(
        nextState,
        'Registo Atualizado',
        updatedPerson.nome,
        `Alteração de dados operacionais (Dias: ${updatedPerson.dias}, Coord: ${updatedPerson.coord}).`
      );
    }

    setState(nextState);
    saveAppState(nextState);
    setIsPersonModalOpen(false);

    // Salvar no Firebase Firestore
    savePersonToFirestore(updatedPerson).catch((err) => {
      console.warn('Erro ao guardar no Firebase:', err);
    });
  };

  const handleDeletePerson = (id: string) => {
    const person = allPeople.find((p) => p.id === id);
    if (!person) return;

    if (confirm(`Tem a certeza que deseja eliminar o registo de ${person.nome}?`)) {
      let nextState = { ...state };
      if (person.type === 'mob') nextState.mobs = nextState.mobs.filter((p) => p.id !== id);
      if (person.type === 'sup') nextState.sups = nextState.sups.filter((p) => p.id !== id);
      if (person.type === 'moto') nextState.motos = nextState.motos.filter((p) => p.id !== id);

      nextState = logHistory(nextState, 'Registo Eliminado', person.nome, `Removido da coordenação ${person.coord}.`);
      setState(nextState);
      saveAppState(nextState);

      // Remover do Firebase Firestore
      deletePersonFromFirestore(id).catch((err) => {
        console.warn('Erro ao remover do Firebase:', err);
      });
    }
  };

  const handleToggleStatus = (id: string) => {
    const person = allPeople.find((p) => p.id === id);
    if (!person) return;

    const nextStatus: PersonStatus =
      person.estado === 'NOVO'
        ? 'Disponível'
        : person.estado === 'Disponível'
        ? 'Indisponível'
        : person.estado === 'Indisponível'
        ? 'Substituído'
        : 'Disponível';

    const updated: Person = { ...person, estado: nextStatus, isNovo: false };

    let nextState = { ...state };
    const updateList = (list: Person[]) => list.map((p) => (p.id === id ? updated : p));
    if (person.type === 'mob') nextState.mobs = updateList(nextState.mobs);
    if (person.type === 'sup') nextState.sups = updateList(nextState.sups);
    if (person.type === 'moto') nextState.motos = updateList(nextState.motos);

    nextState = logHistory(nextState, 'Estado Alterado', person.nome, `Alterado para ${nextStatus}`);
    setState(nextState);
    saveAppState(nextState);

    // Atualizar no Firebase
    savePersonToFirestore(updated).catch((err) => {
      console.warn('Erro ao sincronizar status no Firebase:', err);
    });
  };

  const handleUpdateDays = (personId: string, newDays: number) => {
    const person = allPeople.find((p) => p.id === personId);
    if (!person) return;

    const updated = { ...person, dias: newDays };
    let nextState = { ...state };
    const updateList = (list: Person[]) => list.map((p) => (p.id === personId ? updated : p));
    if (person.type === 'mob') nextState.mobs = updateList(nextState.mobs);
    if (person.type === 'sup') nextState.sups = updateList(nextState.sups);
    if (person.type === 'moto') nextState.motos = updateList(nextState.motos);

    nextState = logHistory(nextState, 'Dias de Trabalho Atualizados', person.nome, `Alterado para ${newDays} dias`);
    setState(nextState);
    saveAppState(nextState);

    // Atualizar dias no Firebase
    savePersonToFirestore(updated).catch((err) => {
      console.warn('Erro ao atualizar dias no Firebase:', err);
    });
  };

  const handleBulkUpdateDays = (
    targetRole: PersonType | 'all',
    newDays: number,
    targetCoord?: string
  ): number => {
    let affectedCount = 0;
    const updateList = (list: Person[]) =>
      list.map((p) => {
        const matchCoord = !targetCoord || p.coord.toUpperCase() === targetCoord.toUpperCase();
        if (matchCoord && p.estado !== 'Substituído') {
          affectedCount++;
          return { ...p, dias: newDays, updatedAt: new Date().toISOString() };
        }
        return p;
      });

    let nextState = { ...state };
    if (targetRole === 'all' || targetRole === 'mob') {
      nextState.mobs = updateList(nextState.mobs);
    }
    if (targetRole === 'all' || targetRole === 'sup') {
      nextState.sups = updateList(nextState.sups);
    }
    if (targetRole === 'all' || targetRole === 'moto') {
      nextState.motos = updateList(nextState.motos);
    }

    const roleLabel =
      targetRole === 'all'
        ? 'Todos os Agentes'
        : targetRole === 'mob'
        ? 'Mobilizadores'
        : targetRole === 'sup'
        ? 'Supervisores'
        : 'Motoqueiros';
    const coordLabel = targetCoord ? ` (${targetCoord})` : ' (Todas Coordenações)';

    nextState = logHistory(
      nextState,
      'Atualização em Massa de Dias',
      `${roleLabel}${coordLabel}`,
      `${affectedCount} pessoas alteradas para ${newDays} dias de trabalho`
    );
    setState(nextState);
    saveAppState(nextState);

    // Atualizar em lote no Firebase
    const updatedPersons = [...nextState.mobs, ...nextState.sups, ...nextState.motos].filter((p) => {
      const matchRole = targetRole === 'all' || p.type === targetRole;
      const matchCoord = !targetCoord || p.coord.toUpperCase() === targetCoord.toUpperCase();
      return matchRole && matchCoord;
    });
    updatedPersons.forEach((p) => {
      savePersonToFirestore(p).catch(console.warn);
    });

    return affectedCount;
  };

  const handleNormalizePerson = (person: Person) => {
    const normalized = autoNormalizePerson(person);
    let nextState = { ...state };
    const updateList = (list: Person[]) => list.map((p) => (p.id === person.id ? normalized : p));
    if (person.type === 'mob') nextState.mobs = updateList(nextState.mobs);
    if (person.type === 'sup') nextState.sups = updateList(nextState.sups);
    if (person.type === 'moto') nextState.motos = updateList(nextState.motos);

    nextState = logHistory(nextState, 'Normalização de Dados', person.nome, 'Espaços e maiúsculas padronizados');
    setState(nextState);
    saveAppState(nextState);

    savePersonToFirestore(normalized).catch(console.warn);
  };

  const handleBatchNormalize = (normalizedPeople: Person[]) => {
    const mobs = normalizedPeople.filter((p) => p.type === 'mob');
    const sups = normalizedPeople.filter((p) => p.type === 'sup');
    const motos = normalizedPeople.filter((p) => p.type === 'moto');

    let nextState = { ...state, mobs, sups, motos };
    nextState = logHistory(nextState, 'Normalização Geral', 'Base de Dados Consolidada', 'Todos os registos foram limpos e padronizados');
    setState(nextState);
    saveAppState(nextState);

    normalizedPeople.forEach((p) => savePersonToFirestore(p).catch(console.warn));
  };

  const handleExecuteSubstitution = (
    originalPersonId: string,
    substitutePersonId: string,
    reason: string,
    assignedDays: number
  ) => {
    const original = allPeople.find((p) => p.id === originalPersonId);
    const substitute = allPeople.find((p) => p.id === substitutePersonId);
    if (!original || !substitute) return;

    const outgoing: Person = {
      ...original,
      estado: 'Substituído',
      isNovo: false,
      obs: `Substituído por ${substitute.nome} em ${new Date().toLocaleDateString('pt-AO')} - Motivo: ${reason}`,
      updatedAt: new Date().toISOString(),
    };

    const incoming: Person = {
      ...substitute,
      coord: original.coord, // Assume a coordenação do substituído
      dias: assignedDays,
      estado: 'Disponível',
      isNovo: false,
      obs: `Substituiu ${original.nome} (${original.type.toUpperCase()}) em ${new Date().toLocaleDateString('pt-AO')} - Motivo: ${reason}`,
      updatedAt: new Date().toISOString(),
    };

    let nextState = { ...state };
    const updateOrAdd = (list: Person[], updated: Person) => {
      const exists = list.some((p) => p.id === updated.id);
      if (exists) {
        return list.map((p) => (p.id === updated.id ? updated : p));
      }
      return [updated, ...list];
    };

    if (outgoing.type === 'mob') nextState.mobs = nextState.mobs.map((p) => (p.id === outgoing.id ? outgoing : p));
    if (outgoing.type === 'sup') nextState.sups = nextState.sups.map((p) => (p.id === outgoing.id ? outgoing : p));
    if (outgoing.type === 'moto') nextState.motos = nextState.motos.map((p) => (p.id === outgoing.id ? outgoing : p));

    if (incoming.type === 'mob') nextState.mobs = updateOrAdd(nextState.mobs, incoming);
    if (incoming.type === 'sup') nextState.sups = updateOrAdd(nextState.sups, incoming);
    if (incoming.type === 'moto') nextState.motos = updateOrAdd(nextState.motos, incoming);

    nextState = logHistory(
      nextState,
      'Substituição de Efetivo Realizada',
      `${original.nome} -> ${substitute.nome}`,
      `Coord: ${original.coord} | Motivo: ${reason} | Dias atribuídos: ${assignedDays}d`
    );

    setState(nextState);
    saveAppState(nextState);

    // Sincronizar substituição no Firebase Firestore
    savePersonToFirestore(outgoing).catch(console.warn);
    savePersonToFirestore(incoming).catch(console.warn);
  };

  // Recargas
  const handleUpdateRecarga = (id: string, updated: Partial<Recarga>) => {
    const nextRecs = state.recs.map((r) => (r.id === id ? { ...r, ...updated } : r));
    const nextState = { ...state, recs: nextRecs };
    setState(nextState);
    saveAppState(nextState);

    const changed = nextRecs.find((r) => r.id === id);
    if (changed) {
      saveRecargaToFirestore(changed).catch(console.warn);
    }
  };

  const handleAddRecarga = (newRec: Recarga) => {
    const nextRecs = [newRec, ...state.recs];
    const nextState = { ...state, recs: nextRecs };
    setState(nextState);
    saveAppState(nextState);

    saveRecargaToFirestore(newRec).catch(console.warn);
  };

  // Log Notification
  const handleLogNotification = (recipient: string, subject: string, template: string) => {
    const nextState = logHistory(
      state,
      'Notificação E-mail Preparada',
      recipient,
      `Assunto: "${subject}" (Modelo: ${template})`
    );
    setState(nextState);
    saveAppState(nextState);
  };

  // 1-Click Quick PDF Generation
  const handleQuickGeneratePDF = () => {
    generateAutomatedPDF(allPeople, state.recs, {
      items: ['mobilizadores', 'supervisores', 'motoqueiros'],
      coord: '',
    });
  };

  // Open Export Modal
  const handleOpenExportModal = (mode: 'export' | 'print' | 'pdf') => {
    setExportModalMode(mode);
    setIsExportModalOpen(true);
  };

  // Trigger Print View
  const handleTriggerDirectPrint = (options: ExportFilterOptions) => {
    setPrintOptions(options);
  };

  // Restore State
  const handleRestoreState = (newState: AppState) => {
    setState(newState);
    saveAppState(newState);
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 antialiased selection:bg-red-600 selection:text-white pb-12">
      {/* Background Subtle Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-red-950/20 blur-3xl" />
        <div className="absolute top-1/3 right-1/4 h-96 w-96 rounded-full bg-amber-950/15 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-6 pt-3">
        {/* App Header */}
        <Header
          lang={lang}
          onLanguageChange={handleLanguageChange}
          onOpenNewPerson={handleOpenNewPerson}
          onOpenExportModal={handleOpenExportModal}
          onOpenValidationModal={() => setIsValidationModalOpen(true)}
          onOpenGoogleCalendar={() => setIsGoogleCalendarOpen(true)}
          onOpenEmailModal={() => setIsEmailModalOpen(true)}
          onQuickGeneratePDF={handleQuickGeneratePDF}
          hasValidationIssues={auditSummary.totalIssues.length > 0}
          issuesCount={auditSummary.totalIssues.length}
          newStaffCount={newStaffCount}
          googleUserEmail={googleUserEmail}
          isFirebaseSynced={isFirebaseSynced}
        />

        {/* Navigation Bar - 4 Pilares Operacionais com Sub-Abas Organizadas */}
        {(() => {
          type SectionModule = 'efetivo' | 'operacoes' | 'pagamentos' | 'gestao';
          const getModuleForTab = (tab: typeof activeTab): SectionModule => {
            if (['mobs', 'sups', 'motos', 'substituicoes'].includes(tab)) return 'efetivo';
            if (['dias', 'presenca'].includes(tab)) return 'operacoes';
            if (['pagamentos', 'recargas'].includes(tab)) return 'pagamentos';
            return 'gestao';
          };
          const activeModule = getModuleForTab(activeTab);

          const handleSelectModule = (mod: SectionModule) => {
            if (mod === 'efetivo') setActiveTab('mobs');
            else if (mod === 'operacoes') setActiveTab('dias');
            else if (mod === 'pagamentos') setActiveTab('pagamentos');
            else if (mod === 'gestao') setActiveTab('dashboard');
          };

          return (
            <div className="mb-5 space-y-2">
              {/* Nível 1: Os 4 Módulos Estruturados da Aplicação */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 rounded-2xl border border-slate-800 bg-slate-900/90 p-1.5 shadow-xl">
                <button
                  onClick={() => handleSelectModule('efetivo')}
                  className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-bold transition ${
                    activeModule === 'efetivo'
                      ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-md shadow-red-950/50 ring-1 ring-red-400/50'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-red-400" />
                    <span>Efetivo de Campo</span>
                  </span>
                  <span className="rounded-full bg-slate-950/40 px-2 py-0.5 text-[10px] font-black">
                    {allPeople.length}
                  </span>
                </button>

                <button
                  onClick={() => handleSelectModule('operacoes')}
                  className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-bold transition ${
                    activeModule === 'operacoes'
                      ? 'bg-gradient-to-r from-amber-600 to-orange-700 text-white shadow-md shadow-amber-950/50 ring-1 ring-amber-400/50'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-amber-400" />
                    <span>Campo & Operações</span>
                  </span>
                  <span className="rounded-full bg-slate-950/40 px-2 py-0.5 text-[10px] font-black">
                    Escala
                  </span>
                </button>

                <button
                  onClick={() => handleSelectModule('pagamentos')}
                  className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-bold transition ${
                    activeModule === 'pagamentos'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-950/50 ring-1 ring-emerald-400/50'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-emerald-400" />
                    <span>Finanças & Pagamento</span>
                  </span>
                  <span className="rounded-full bg-slate-950/40 px-2 py-0.5 text-[10px] font-black">
                    Oficial
                  </span>
                </button>

                <button
                  onClick={() => handleSelectModule('gestao')}
                  className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-bold transition ${
                    activeModule === 'gestao'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-700 text-white shadow-md shadow-indigo-950/50 ring-1 ring-indigo-400/50'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-indigo-400" />
                    <span>Gestão & Auditoria</span>
                  </span>
                  {auditSummary.totalIssues.length > 0 ? (
                    <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-black text-slate-950">
                      {auditSummary.totalIssues.length}
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-950/40 px-2 py-0.5 text-[10px] font-black">
                      OK
                    </span>
                  )}
                </button>
              </div>

              {/* Nível 2: Sub-Abas focadas no Módulo Selecionado */}
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800/80 bg-slate-950/60 p-2 shadow-inner">
                {activeModule === 'efetivo' && (
                  <>
                    <button
                      onClick={() => setActiveTab('mobs')}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        activeTab === 'mobs'
                          ? 'bg-red-600 text-white shadow'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Users className="h-3.5 w-3.5" />
                      <span>Mobilizadores ({state.mobs.length})</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('sups')}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        activeTab === 'sups'
                          ? 'bg-blue-600 text-white shadow'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      <span>Supervisores ({state.sups.length})</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('motos')}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        activeTab === 'motos'
                          ? 'bg-teal-600 text-white shadow'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Bike className="h-3.5 w-3.5" />
                      <span>Motoqueiros ({state.motos.length})</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('substituicoes')}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        activeTab === 'substituicoes'
                          ? 'bg-amber-500 text-slate-950 shadow'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      <span>Novos & Substituições</span>
                      {newStaffCount > 0 && (
                        <span className="rounded-full bg-red-600 px-1.5 py-0.2 text-[10px] font-black text-white">
                          {newStaffCount}
                        </span>
                      )}
                    </button>
                  </>
                )}

                {activeModule === 'operacoes' && (
                  <>
                    <button
                      onClick={() => setActiveTab('dias')}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        activeTab === 'dias'
                          ? 'bg-amber-500 text-slate-950 shadow font-black'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <CalendarDays className="h-3.5 w-3.5" />
                      <span>Escala & Controlo de Dias de Trabalho</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('presenca')}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        activeTab === 'presenca'
                          ? 'bg-emerald-600 text-white shadow'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>Lista de Presença para Campo (Com/Sem Nomes)</span>
                    </button>
                  </>
                )}

                {activeModule === 'pagamentos' && (
                  <>
                    <button
                      onClick={() => setActiveTab('pagamentos')}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        activeTab === 'pagamentos'
                          ? 'bg-emerald-500 text-slate-950 shadow font-black'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Coins className="h-3.5 w-3.5" />
                      <span>Mapas Oficiais de Pagamento (Sumbe nOVP2)</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('recargas')}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        activeTab === 'recargas'
                          ? 'bg-indigo-600 text-white shadow'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Smartphone className="h-3.5 w-3.5" />
                      <span>Mapa de Recargas Telefónicas ({state.recs.length})</span>
                    </button>
                  </>
                )}

                {activeModule === 'gestao' && (
                  <>
                    <button
                      onClick={() => setActiveTab('dashboard')}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        activeTab === 'dashboard'
                          ? 'bg-indigo-600 text-white shadow'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <TrendingUp className="h-3.5 w-3.5" />
                      <span>Dashboard de Produtividade</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('auditoria')}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        activeTab === 'auditoria'
                          ? 'bg-amber-500 text-slate-950 shadow font-black'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <ShieldAlert className="h-3.5 w-3.5" />
                      <span>Auditoria & Validação de Dados</span>
                      {auditSummary.totalIssues.length > 0 && (
                        <span className="rounded-full bg-red-600 px-1.5 py-0.2 text-[10px] font-black text-white">
                          {auditSummary.totalIssues.length}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => setActiveTab('dados')}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        activeTab === 'dados'
                          ? 'bg-slate-700 text-white shadow'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Database className="h-3.5 w-3.5" />
                      <span>Histórico & Backup</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })()}

        {/* Tab Views */}
        <main>
          {activeTab === 'dashboard' && (
            <ProductivityDashboard allPeople={allPeople} lang={lang} />
          )}

          {activeTab === 'mobs' && (
            <PeopleTable
              type="mob"
              people={state.mobs}
              allPeople={allPeople}
              onEdit={handleEditPerson}
              onDelete={handleDeletePerson}
              onToggleStatus={handleToggleStatus}
              onNormalize={handleNormalizePerson}
              onOpenNew={handleOpenNewPerson}
              lang={lang}
            />
          )}

          {activeTab === 'sups' && (
            <PeopleTable
              type="sup"
              people={state.sups}
              allPeople={allPeople}
              onEdit={handleEditPerson}
              onDelete={handleDeletePerson}
              onToggleStatus={handleToggleStatus}
              onNormalize={handleNormalizePerson}
              onOpenNew={handleOpenNewPerson}
              lang={lang}
            />
          )}

          {activeTab === 'motos' && (
            <PeopleTable
              type="moto"
              people={state.motos}
              allPeople={allPeople}
              onEdit={handleEditPerson}
              onDelete={handleDeletePerson}
              onToggleStatus={handleToggleStatus}
              onNormalize={handleNormalizePerson}
              onOpenNew={handleOpenNewPerson}
              lang={lang}
            />
          )}

          {activeTab === 'dias' && (
            <EscalaDiasTable
              allPeople={allPeople}
              onUpdateDays={handleUpdateDays}
              onBulkUpdateDays={handleBulkUpdateDays}
              lang={lang}
              onOpenExportModal={handleOpenExportModal}
            />
          )}

          {activeTab === 'presenca' && (
            <ListaPresencaView allPeople={allPeople} lang={lang} />
          )}

          {activeTab === 'pagamentos' && (
            <MapaPagamentoView
              allPeople={allPeople}
              recargas={state.recs}
              lang={lang}
              onBulkUpdateDays={handleBulkUpdateDays}
            />
          )}

          {activeTab === 'substituicoes' && (
            <NovosAndSubstituicaoManager
              allPeople={allPeople}
              onSavePerson={handleSavePerson}
              onDeletePerson={handleDeletePerson}
              onExecuteSubstitution={handleExecuteSubstitution}
              availableCoords={availableCoords}
              lang={lang}
            />
          )}

          {activeTab === 'recargas' && (
            <RecargasTable
              recargas={state.recs}
              onUpdateRecarga={handleUpdateRecarga}
              onAddRecarga={handleAddRecarga}
              lang={lang}
            />
          )}

          {activeTab === 'auditoria' && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-amber-400" />
                    <span>Auditoria & Verificação de Integridade dos Agentes</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Inspeção contínua de duplicados, formato oficial do BI angolano e consistência de IBAN
                  </p>
                </div>
                <button
                  onClick={() => setIsValidationModalOpen(true)}
                  className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition"
                >
                  Abrir Painel Completo de Correção
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="text-xs text-slate-400 uppercase font-bold">Total Efetivo Auditado</div>
                  <div className="text-2xl font-black text-white mt-1">{auditSummary.totalPeople} agentes</div>
                  <div className="text-[11px] text-emerald-400 mt-1">100% dos dados salvos offline</div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="text-xs text-slate-400 uppercase font-bold">BIs Duplicados Detetados</div>
                  <div className="text-2xl font-black text-amber-400 mt-1">{auditSummary.duplicateBiList.length}</div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {auditSummary.duplicateBiList.length > 0 ? 'Requer revisão nas coordenações' : 'Sem duplicações'}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="text-xs text-slate-400 uppercase font-bold">IBANs Inválidos / Incompletos</div>
                  <div className="text-2xl font-black text-red-400 mt-1">{auditSummary.invalidIbanCount}</div>
                  <div className="text-[11px] text-slate-400 mt-1">Validação com prefixo AO06 + 21 dígitos</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'dados' && (
            <HistoryAndBackupView
              state={state}
              onRestoreState={handleRestoreState}
              lang={lang}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <PersonFormModal
        isOpen={isPersonModalOpen}
        person={editingPerson}
        defaultType={defaultPersonType}
        availableCoords={availableCoords}
        onClose={() => setIsPersonModalOpen(false)}
        onSave={handleSavePerson}
        lang={lang}
      />

      <ValidationAuditModal
        isOpen={isValidationModalOpen}
        onClose={() => setIsValidationModalOpen(false)}
        allPeople={allPeople}
        onBatchNormalize={handleBatchNormalize}
        onSelectPersonToEdit={handleEditPerson}
        lang={lang}
      />

      <ExportPrintModal
        isOpen={isExportModalOpen}
        mode={exportModalMode}
        onClose={() => setIsExportModalOpen(false)}
        allPeople={allPeople}
        recs={state.recs}
        onTriggerDirectPrint={handleTriggerDirectPrint}
        lang={lang}
      />

      <EmailNotificationModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        allPeople={allPeople}
        onLogNotification={handleLogNotification}
        lang={lang}
      />

      <GoogleCalendarModal
        isOpen={isGoogleCalendarOpen}
        onClose={() => setIsGoogleCalendarOpen(false)}
        lang={lang}
        onUserChanged={(email) => setGoogleUserEmail(email)}
      />

      {/* Direct Fullscreen Print View when triggered */}
      {printOptions && (
        <PrintView
          allPeople={allPeople}
          options={printOptions}
          onClose={() => setPrintOptions(null)}
        />
      )}
    </div>
  );
}
