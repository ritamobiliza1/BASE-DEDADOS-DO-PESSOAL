import React, { useState, useMemo } from 'react';
import {
  UserPlus,
  RefreshCw,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Users,
  Search,
  ArrowRight,
  Shield,
  Trash2,
  Edit2,
  Sparkles,
  Filter,
  CheckSquare,
  GraduationCap,
  BookOpen,
} from 'lucide-react';
import { Person, PersonType, PersonStatus, SupportedLanguage } from '../types';
import { translations } from '../utils/i18n';
import { validateAngolanBI, validateAngolanIBAN, normalizeCoordName } from '../utils/validation';

interface NovosAndSubstituicaoManagerProps {
  allPeople: Person[];
  onSavePerson: (data: Partial<Person>) => void;
  onDeletePerson: (id: string) => void;
  onExecuteSubstitution: (
    originalPersonId: string,
    substitutePersonId: string,
    reason: string,
    assignedDays: number
  ) => void;
  availableCoords: string[];
  lang: SupportedLanguage;
}

export const NovosAndSubstituicaoManager: React.FC<NovosAndSubstituicaoManagerProps> = ({
  allPeople,
  onSavePerson,
  onDeletePerson,
  onExecuteSubstitution,
  availableCoords,
  lang,
}) => {
  const t = translations[lang];
  const [subTab, setSubTab] = useState<'novos' | 'substituir'>('novos');

  // New Candidate Quick Form state
  const [novoNome, setNovoNome] = useState('');
  const [novoBi, setNovoBi] = useState('');
  const [novoSexo, setNovoSexo] = useState<'F' | 'M'>('F');
  const [novoType, setNovoType] = useState<PersonType>('mob');
  const [novoCoord, setNovoCoord] = useState('CHINGO 1');
  const [novoDias, setNovoDias] = useState(5);
  const [novoContacto, setNovoContacto] = useState('');
  const [novoIban, setNovoIban] = useState('');
  const [novoMarca, setNovoMarca] = useState('');
  const [novoMatricula, setNovoMatricula] = useState('');
  const [novoNivelAcademico, setNovoNivelAcademico] = useState('Técnico Médio de Saúde (Enfermagem)');
  const [novoAreaFormacao, setNovoAreaFormacao] = useState('Ciências da Saúde');
  const [novoCurso, setNovoCurso] = useState('Enfermagem Geral');
  const [novoObs, setNovoObs] = useState('');
  const [novoSuccessNotice, setNovoSuccessNotice] = useState<string | null>(null);

  // Substitution Form State
  const [selectedOriginalId, setSelectedOriginalId] = useState<string>('');
  const [selectedSubstituteId, setSelectedSubstituteId] = useState<string>('');
  const [subReason, setSubReason] = useState<string>('Falta / Ausência no terreno');
  const [subCustomReason, setSubCustomReason] = useState<string>('');
  const [subDays, setSubDays] = useState<number>(5);
  const [substitutionNotice, setSubstitutionNotice] = useState<string | null>(null);
  const [filterCoordOriginal, setFilterCoordOriginal] = useState<string>('');
  const [searchOriginal, setSearchOriginal] = useState<string>('');

  // Filter lists
  const candidatosNovos = useMemo(() => {
    return allPeople.filter((p) => p.isNovo || p.estado === 'NOVO');
  }, [allPeople]);

  const activeStaff = useMemo(() => {
    return allPeople.filter((p) => p.estado !== 'Substituído');
  }, [allPeople]);

  const alreadySubstituted = useMemo(() => {
    return allPeople.filter((p) => p.estado === 'Substituído');
  }, [allPeople]);

  // Handle Quick Add New
  const handleCreateNovo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim()) {
      alert('Por favor insira o nome completo do candidato.');
      return;
    }

    const cleanBi = novoBi.trim().toUpperCase();
    const biVal = validateAngolanBI(cleanBi);
    if (cleanBi && !biVal.isValid) {
      if (!confirm(`Aviso sobre o BI: ${biVal.message}. Deseja guardar mesmo assim para posterior retificação?`)) {
        return;
      }
    }

    if (novoType === 'moto') {
      if (!novoMarca.trim()) {
        alert('Atenção: Ao cadastrar o motoqueiro é obrigatório indicar a MARCA da motorizada ou viatura.');
        return;
      }
      if (!novoMatricula.trim()) {
        alert('Atenção: Ao cadastrar o motoqueiro é obrigatório indicar a MATRÍCULA da motorizada ou viatura.');
        return;
      }
    }

    onSavePerson({
      nome: novoNome.trim(),
      bi: cleanBi,
      sexo: novoSexo,
      type: novoType,
      coord: normalizeCoordName(novoCoord),
      dias: Number(novoDias) || 5,
      contacto: novoContacto.trim(),
      iban: novoIban.trim().toUpperCase(),
      marca: novoType === 'moto' ? novoMarca.trim().toUpperCase() : undefined,
      matricula: novoType === 'moto' ? novoMatricula.trim().toUpperCase() : undefined,
      nivelAcademico: novoNivelAcademico.trim(),
      areaFormacao: novoAreaFormacao.trim(),
      curso: novoCurso.trim(),
      obs: novoObs.trim() || 'Cadastrado no Banco de Reserva / Novos',
      estado: 'NOVO',
      isNovo: true,
    });

    setNovoSuccessNotice(`Candidato(a) ${novoNome.trim()} cadastrado com sucesso no Banco de Novos!`);
    setTimeout(() => setNovoSuccessNotice(null), 4000);

    // Reset form
    setNovoNome('');
    setNovoBi('');
    setNovoContacto('');
    setNovoIban('');
    setNovoMarca('');
    setNovoMatricula('');
    setNovoCurso('Enfermagem Geral');
    setNovoAreaFormacao('Ciências da Saúde');
    setNovoNivelAcademico('Técnico Médio de Saúde (Enfermagem)');
    setNovoObs('');
  };

  // Perform substitution
  const handlePerformSubstitution = () => {
    if (!selectedOriginalId) {
      alert('Por favor selecione o agente a ser substituído.');
      return;
    }
    if (!selectedSubstituteId) {
      alert('Por favor selecione o novo agente substituto.');
      return;
    }
    if (selectedOriginalId === selectedSubstituteId) {
      alert('O agente original e o substituto não podem ser a mesma pessoa.');
      return;
    }

    const finalReason = subReason === 'Outro' && subCustomReason.trim() ? subCustomReason.trim() : subReason;
    const originalPerson = allPeople.find((p) => p.id === selectedOriginalId);
    const substitutePerson = allPeople.find((p) => p.id === selectedSubstituteId);

    if (!originalPerson || !substitutePerson) return;

    if (
      confirm(
        `Confirma a substituição de:\n\n` +
          `• Agente a sair: ${originalPerson.nome} (${originalPerson.coord} - ${originalPerson.type.toUpperCase()})\n` +
          `• Novo Substituto: ${substitutePerson.nome}\n` +
          `• Motivo: ${finalReason}\n` +
          `• Dias de Trabalho Atribuídos: ${subDays} dias`
      )
    ) {
      onExecuteSubstitution(selectedOriginalId, selectedSubstituteId, finalReason, subDays);
      setSubstitutionNotice(
        `Substituição concluída com sucesso! ${substitutePerson.nome} assumiu a vaga em ${originalPerson.coord}.`
      );
      setSelectedOriginalId('');
      setSelectedSubstituteId('');
      setTimeout(() => setSubstitutionNotice(null), 5000);
    }
  };

  // Filtered original agents for the substitution picker
  const filteredOriginals = activeStaff.filter((p) => {
    const matchCoord = !filterCoordOriginal || normalizeCoordName(p.coord) === normalizeCoordName(filterCoordOriginal);
    const q = searchOriginal.toLowerCase();
    const matchQuery = !q || p.nome.toLowerCase().includes(q) || p.bi.toLowerCase().includes(q);
    return matchCoord && matchQuery;
  });

  const selectedOriginalPerson = allPeople.find((p) => p.id === selectedOriginalId);
  const selectedSubstitutePerson = allPeople.find((p) => p.id === selectedSubstituteId);

  return (
    <div className="space-y-6">
      {/* Sub-tabs header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-3 shadow-xl">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubTab('novos')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              subTab === 'novos'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950/40'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <UserPlus className="h-4 w-4" />
            <span>Cadastrar & Gerir Novos ({candidatosNovos.length})</span>
          </button>

          <button
            onClick={() => setSubTab('substituir')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              subTab === 'substituir'
                ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-md shadow-red-950/40'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <RefreshCw className="h-4 w-4" />
            <span>Centro de Substituições ({alreadySubstituted.length} Substituídos)</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Shield className="h-4 w-4 text-emerald-400" />
          <span>Controlo operacional com rastreio de dias de trabalho e histórico</span>
        </div>
      </div>

      {/* TAB 1: CADASTRO E GESTÃO DE NOVOS */}
      {subTab === 'novos' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Form on left (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-2xl space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-amber-400" />
                <span>Cadastro Rápido de Novos Efetivos</span>
              </h2>
              <p className="text-xs text-slate-400">
                Cadastre mobilizadores, supervisores ou motoqueiros novos para reserva ou entrada imediata
              </p>
            </div>

            {novoSuccessNotice && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-3 text-xs text-emerald-300">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                <span>{novoSuccessNotice}</span>
              </div>
            )}

            <form onSubmit={handleCreateNovo} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  placeholder="ex: MARIA JOÃO ANTÓNIO"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/90 p-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">
                    BI Angolano
                  </label>
                  <input
                    type="text"
                    maxLength={14}
                    value={novoBi}
                    onChange={(e) => setNovoBi(e.target.value)}
                    placeholder="005294346KS041"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/90 p-2 text-xs font-mono uppercase text-white outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Género
                  </label>
                  <select
                    value={novoSexo}
                    onChange={(e) => setNovoSexo(e.target.value as 'F' | 'M')}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/90 p-2 text-xs text-white outline-none focus:border-amber-500"
                  >
                    <option value="F">Feminino (F)</option>
                    <option value="M">Masculino (M)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Função na Campanha
                  </label>
                  <select
                    value={novoType}
                    onChange={(e) => setNovoType(e.target.value as PersonType)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/90 p-2 text-xs text-white outline-none focus:border-amber-500"
                  >
                    <option value="mob">👥 Mobilizador Social</option>
                    <option value="sup">🎯 Supervisor</option>
                    <option value="moto">🏍️ Motoqueiro / Apoio</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Coordenação
                  </label>
                  <select
                    value={novoCoord}
                    onChange={(e) => setNovoCoord(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/90 p-2 text-xs text-white outline-none focus:border-amber-500"
                  >
                    {availableCoords.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value="BANCO DE RESERVA">BANCO DE RESERVA (Geral)</option>
                  </select>
                </div>
              </div>

              {/* Working days - critical metric */}
              <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-amber-300 uppercase tracking-wider">
                    Dias de Trabalho Previstos
                  </label>
                  <span className="font-black text-white text-sm">{novoDias} dias</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {[4, 5, 7].map((d) => (
                    <button
                      type="button"
                      key={d}
                      onClick={() => setNovoDias(d)}
                      className={`flex-1 rounded-lg py-1 text-center font-bold transition ${
                        novoDias === d
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {d} dias
                    </button>
                  ))}
                  <input
                    type="number"
                    min="1"
                    max="15"
                    value={novoDias}
                    onChange={(e) => setNovoDias(Number(e.target.value))}
                    className="w-16 rounded-lg border border-slate-700 bg-slate-800 py-1 text-center font-bold text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    value={novoContacto}
                    onChange={(e) => setNovoContacto(e.target.value)}
                    placeholder="923 000 000"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/90 p-2 text-xs text-white outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">
                    IBAN (opcional)
                  </label>
                  <input
                    type="text"
                    value={novoIban}
                    onChange={(e) => setNovoIban(e.target.value)}
                    placeholder="AO06..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/90 p-2 text-xs font-mono uppercase text-white outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Se for Motoqueiro: Marca e Matrícula Obrigatórios */}
              {novoType === 'moto' && (
                <div className="rounded-xl border border-teal-500/50 bg-teal-950/20 p-3 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-teal-500/30 pb-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-300">
                      🏍️ Dados da Motorizada / Viatura *
                    </span>
                    <span className="rounded-full bg-teal-500/20 px-2 py-0.5 text-[9px] font-black text-teal-300">
                      Obrigatório
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-teal-300 mb-1">
                        Marca *
                      </label>
                      <input
                        type="text"
                        value={novoMarca}
                        onChange={(e) => setNovoMarca(e.target.value.toUpperCase())}
                        placeholder="Ex: LINGKEN, HAOJUE"
                        className="w-full rounded-xl border border-teal-500/40 bg-slate-800 p-2 text-xs font-bold text-white outline-none focus:border-teal-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-teal-300 mb-1">
                        Matrícula *
                      </label>
                      <input
                        type="text"
                        value={novoMatricula}
                        onChange={(e) => setNovoMatricula(e.target.value.toUpperCase())}
                        placeholder="Ex: LD-66-99-HK"
                        className="w-full rounded-xl border border-teal-500/40 bg-slate-800 p-2 text-xs font-mono font-bold text-white outline-none focus:border-teal-400"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {['LINGKEN', 'HAOJUE', 'KTM', 'HERO', 'BAJAJ', 'YAMAHA', 'FORD'].map((b) => (
                      <button
                        type="button"
                        key={b}
                        onClick={() => setNovoMarca(b)}
                        className="rounded px-1.5 py-0.5 text-[9px] font-semibold bg-slate-800 hover:bg-teal-800 text-slate-300 border border-slate-700"
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Formação & Habilitações Académicas */}
              <div className="rounded-xl border border-indigo-500/40 bg-indigo-950/20 p-3 space-y-2">
                <div className="flex items-center justify-between border-b border-indigo-500/30 pb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                    <GraduationCap className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Habilitações & Formação Académica</span>
                  </span>
                  <span className="text-[10px] text-indigo-300/80 font-medium">Perfil</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-300 mb-1">
                      Nível Académico
                    </label>
                    <select
                      value={novoNivelAcademico}
                      onChange={(e) => setNovoNivelAcademico(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800/90 p-2 text-xs text-white outline-none focus:border-indigo-400"
                    >
                      <option value="Ensino Primário (1ª à 6ª Classe)">Ensino Primário</option>
                      <option value="Iº Ciclo do Ensino Secundário (7ª à 9ª Classe)">Iº Ciclo (7ª à 9ª)</option>
                      <option value="IIº Ciclo / Ensino Médio Geral (PUNIV)">IIº Ciclo / PUNIV</option>
                      <option value="Técnico Médio de Saúde (Enfermagem)">Técnico Médio de Saúde</option>
                      <option value="Técnico Médio Profissional / Politécnico">Técnico Médio Profissional</option>
                      <option value="Frequência Universitária (Estudante Superior)">Frequência Universitária</option>
                      <option value="Licenciatura (Ensino Superior Concluído)">Licenciatura (Superior)</option>
                      <option value="Pós-Graduação / Mestrado / Doutoramento">Pós-Graduação / Mestrado</option>
                      <option value="Outro">Outro Nível</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-300 mb-1">
                      Área de Formação
                    </label>
                    <input
                      type="text"
                      value={novoAreaFormacao}
                      onChange={(e) => setNovoAreaFormacao(e.target.value)}
                      placeholder="Ex: Ciências da Saúde"
                      className="w-full rounded-xl border border-slate-700 bg-slate-800/90 p-2 text-xs text-white outline-none focus:border-indigo-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-300 mb-1">
                    Com que Curso Fez (Especialidade)
                  </label>
                  <input
                    type="text"
                    value={novoCurso}
                    onChange={(e) => setNovoCurso(e.target.value)}
                    placeholder="Ex: Enfermagem Geral, Pedagogia..."
                    className="w-full rounded-xl border border-indigo-500/40 bg-slate-800/90 p-2 text-xs font-bold text-white outline-none focus:border-indigo-400"
                  />
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {['Enfermagem Geral', 'Saúde Comunitária', 'Análises Clínicas', 'Pedagogia', 'Contabilidade', 'Informática'].map((c) => (
                      <button
                        type="button"
                        key={c}
                        onClick={() => {
                          setNovoCurso(c);
                          if (['Enfermagem Geral', 'Saúde Comunitária', 'Análises Clínicas'].includes(c)) {
                            setNovoAreaFormacao('Ciências da Saúde');
                            setNovoNivelAcademico('Técnico Médio de Saúde (Enfermagem)');
                          } else if (c === 'Pedagogia') {
                            setNovoAreaFormacao('Ciências da Educação / Pedagogia');
                          } else if (c === 'Contabilidade') {
                            setNovoAreaFormacao('Ciências Económicas / Gestão');
                          }
                        }}
                        className="rounded px-1.5 py-0.5 text-[9px] font-semibold bg-slate-800 hover:bg-indigo-900/60 text-indigo-200 border border-slate-700"
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Observações / Disponibilidade
                </label>
                <input
                  type="text"
                  value={novoObs}
                  onChange={(e) => setNovoObs(e.target.value)}
                  placeholder="ex: Disponibilidade imediata para substituições no Chingo"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/90 p-2 text-xs text-white outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 py-2.5 font-bold text-slate-950 shadow-lg hover:from-amber-400 hover:to-amber-500 transition flex items-center justify-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                <span>Guardar Novo Agente no Banco</span>
              </button>
            </form>
          </div>

          {/* List of Newly Registered Candidates on right (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-400" />
                    <span>Candidatos Registados como NOVOS ({candidatosNovos.length})</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Estes agentes estão identificados para reforço ou para entrar em substituições imediatas
                  </p>
                </div>
                <button
                  onClick={() => setSubTab('substituir')}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-500 transition shadow"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Substituir Alguém</span>
                </button>
              </div>

              <div className="mt-4 max-h-[600px] overflow-y-auto space-y-2.5 pr-1">
                {candidatosNovos.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500">
                    Nenhum novo candidato registado no momento. Use o formulário à esquerda para cadastrar novos agentes!
                  </div>
                ) : (
                  candidatosNovos.map((cand) => (
                    <div
                      key={cand.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-slate-950/70 p-3 text-xs hover:border-amber-500/60 transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-amber-500 px-1.5 py-0.2 text-[10px] font-black text-slate-950">
                            NOVO
                          </span>
                          <span className="font-bold text-white text-sm">{cand.nome}</span>
                          <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300 font-semibold">
                            {cand.type === 'mob' ? 'Mobilizador' : cand.type === 'sup' ? 'Supervisor' : 'Motoqueiro'}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-400 text-[11px]">
                          <span>BI: <strong className="text-slate-200">{cand.bi || 'Não fornecido'}</strong></span>
                          <span>Coordenação: <strong className="text-amber-400">{cand.coord}</strong></span>
                          <span>Dias de Trabalho: <strong className="text-white">{cand.dias} dias</strong></span>
                          {cand.contacto && <span>Tel: <strong className="text-slate-200">{cand.contacto}</strong></span>}
                        </div>

                        {(cand.curso || cand.nivelAcademico) && (
                          <div className="flex items-center gap-1.5 text-[11px] text-indigo-300 font-medium pt-0.5">
                            <GraduationCap className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                            <span><strong>{cand.curso || cand.nivelAcademico}</strong></span>
                            {cand.nivelAcademico && cand.curso && (
                              <span className="text-slate-400">· {cand.nivelAcademico}</span>
                            )}
                            {cand.areaFormacao && (
                              <span className="text-slate-500">({cand.areaFormacao})</span>
                            )}
                          </div>
                        )}

                        {cand.obs && <div className="text-[11px] text-slate-400 italic">Nota: {cand.obs}</div>}
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={() => {
                            setSelectedSubstituteId(cand.id);
                            setSubTab('substituir');
                          }}
                          className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 transition shadow"
                          title="Usar este agente para substituir alguém"
                        >
                          <RefreshCw className="h-3 w-3" />
                          <span>Usar para Substituir</span>
                        </button>

                        <button
                          onClick={() => onDeletePerson(cand.id)}
                          className="rounded-xl border border-red-500/30 bg-red-950/30 p-1.5 text-red-400 hover:bg-red-900/40 hover:text-white transition"
                          title="Eliminar candidato"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CENTRO DE SUBSTITUIÇÕES */}
      {subTab === 'substituir' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-red-400" />
              <span>Centro Oficial de Substituição de Efetivo</span>
            </h2>
            <p className="text-xs text-slate-400">
              Substitua agentes faltosos, doentes ou desistentes por candidatos novos sem perder o histórico nem desregular os dias de trabalho
            </p>
          </div>

          {substitutionNotice && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/50 bg-emerald-950/40 p-4 text-xs font-semibold text-emerald-300">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
              <span>{substitutionNotice}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Step 1: Agente a Substituir (Quem sai) */}
            <div className="rounded-xl border border-red-500/40 bg-red-950/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-red-400">
                  Passo 1: Agente a ser Substituído (Afastado)
                </span>
                <span className="rounded-full bg-red-900/60 px-2 py-0.5 text-[10px] text-red-200">
                  Efetivo Atual
                </span>
              </div>

              {/* Filter controls */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <select
                  value={filterCoordOriginal}
                  onChange={(e) => setFilterCoordOriginal(e.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none"
                >
                  <option value="">Todas as Zonas</option>
                  {availableCoords.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <div className="relative">
                  <input
                    type="text"
                    value={searchOriginal}
                    onChange={(e) => setSearchOriginal(e.target.value)}
                    placeholder="Pesquisar por nome..."
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-3 pr-2 text-xs text-white outline-none"
                  />
                </div>
              </div>

              {/* Select dropdown */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Selecione o Agente Atual *
                </label>
                <select
                  value={selectedOriginalId}
                  onChange={(e) => {
                    setSelectedOriginalId(e.target.value);
                    const p = allPeople.find((item) => item.id === e.target.value);
                    if (p) setSubDays(p.dias || 5);
                  }}
                  className="w-full rounded-xl border border-red-500/40 bg-slate-800 p-2.5 text-xs text-white outline-none focus:border-red-400 font-semibold"
                >
                  <option value="">-- Escolha o agente que será substituído --</option>
                  {filteredOriginals.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.coord} · {p.nome} ({p.type.toUpperCase()} - {p.dias} dias)
                    </option>
                  ))}
                </select>
              </div>

              {selectedOriginalPerson && (
                <div className="rounded-xl border border-red-900/60 bg-red-950/40 p-3 text-xs space-y-1 text-slate-300">
                  <div className="font-bold text-white text-sm">{selectedOriginalPerson.nome}</div>
                  <div>BI: <strong className="text-white font-mono">{selectedOriginalPerson.bi}</strong></div>
                  <div>Coordenação: <strong className="text-amber-300">{selectedOriginalPerson.coord}</strong></div>
                  <div>Dias de Trabalho registados: <strong className="text-white">{selectedOriginalPerson.dias} dias</strong></div>
                  <div>Função: <strong className="text-white">{selectedOriginalPerson.funcao || selectedOriginalPerson.type.toUpperCase()}</strong></div>
                  {(selectedOriginalPerson.curso || selectedOriginalPerson.nivelAcademico) && (
                    <div className="flex items-center gap-1.5 text-indigo-300 pt-0.5">
                      <GraduationCap className="h-3.5 w-3.5 text-indigo-400" />
                      <span>{selectedOriginalPerson.curso || selectedOriginalPerson.nivelAcademico}</span>
                      {selectedOriginalPerson.areaFormacao && <span className="text-slate-400">({selectedOriginalPerson.areaFormacao})</span>}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Step 2: Agente Substituto (Quem entra) */}
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Passo 2: Novo Substituto (Quem assume a vaga)
                </span>
                <span className="rounded-full bg-emerald-900/60 px-2 py-0.5 text-[10px] text-emerald-200">
                  Banco de Novos ({candidatosNovos.length})
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Selecione o Novo Agente *
                </label>
                <select
                  value={selectedSubstituteId}
                  onChange={(e) => setSelectedSubstituteId(e.target.value)}
                  className="w-full rounded-xl border border-emerald-500/40 bg-slate-800 p-2.5 text-xs text-white outline-none focus:border-emerald-400 font-semibold"
                >
                  <option value="">-- Escolha um candidato do Banco de Novos --</option>
                  {candidatosNovos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} ({c.type.toUpperCase()} · {c.coord} · {c.bi || 's/ BI'})
                    </option>
                  ))}
                </select>
              </div>

              {candidatosNovos.length === 0 && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-950/30 p-2 text-[11px] text-amber-300">
                  Nenhum novo registado ainda. Vá à aba "Cadastrar & Gerir Novos" para cadastrar candidatos de reserva.
                </div>
              )}

              {selectedSubstitutePerson && (
                <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/40 p-3 text-xs space-y-1 text-slate-300">
                  <div className="font-bold text-white text-sm">{selectedSubstitutePerson.nome}</div>
                  <div>BI: <strong className="text-white font-mono">{selectedSubstitutePerson.bi || 'Pendente'}</strong></div>
                  <div>Contacto: <strong className="text-white">{selectedSubstitutePerson.contacto || 'Pendente'}</strong></div>
                  <div>Coordenação atual: <strong className="text-amber-300">{selectedSubstitutePerson.coord}</strong></div>
                  {(selectedSubstitutePerson.curso || selectedSubstitutePerson.nivelAcademico) && (
                    <div className="flex items-center gap-1.5 text-indigo-300 pt-0.5">
                      <GraduationCap className="h-3.5 w-3.5 text-indigo-400" />
                      <span>{selectedSubstitutePerson.curso || selectedSubstitutePerson.nivelAcademico}</span>
                      {selectedSubstitutePerson.areaFormacao && <span className="text-slate-400">({selectedSubstitutePerson.areaFormacao})</span>}
                    </div>
                  )}
                </div>
              )}

              {/* Working days for substitute */}
              <div className="pt-2 border-t border-emerald-900/40">
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Dias de Trabalho a Atribuir ao Substituto
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="15"
                    value={subDays}
                    onChange={(e) => setSubDays(Number(e.target.value))}
                    className="w-24 rounded-lg border border-slate-700 bg-slate-800 py-1.5 text-center font-black text-white text-sm outline-none"
                  />
                  <span className="text-xs text-slate-400">
                    dias oficiais de trabalho de campo na campanha
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Motivo da Substituição */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Passo 3: Motivo Oficial da Substituição
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs">
              {[
                'Falta / Ausência no terreno',
                'Doença / Atestado Médico',
                'Desistência voluntária',
                'Incompatibilidade de horário',
                'Problema disciplinar',
                'Duplicação de registo',
                'Transferência de zona',
                'Outro',
              ].map((motivo) => (
                <button
                  type="button"
                  key={motivo}
                  onClick={() => setSubReason(motivo)}
                  className={`rounded-xl border p-2 text-left font-semibold transition ${
                    subReason === motivo
                      ? 'border-amber-500 bg-amber-950/40 text-amber-300'
                      : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {motivo}
                </button>
              ))}
            </div>

            {subReason === 'Outro' && (
              <input
                type="text"
                value={subCustomReason}
                onChange={(e) => setSubCustomReason(e.target.value)}
                placeholder="Especifique o motivo da substituição..."
                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2 text-xs text-white outline-none"
              />
            )}
          </div>

          {/* Confirm Button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handlePerformSubstitution}
              disabled={!selectedOriginalId || !selectedSubstituteId}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-amber-600 px-6 py-3 text-sm font-bold text-white shadow-xl shadow-red-950/50 hover:from-red-500 hover:to-amber-500 disabled:opacity-40 transition"
            >
              <RefreshCw className="h-5 w-5" />
              <span>Confirmar & Executar Substituição Oficial</span>
            </button>
          </div>

          {/* Table of Past Substitutions */}
          {alreadySubstituted.length > 0 && (
            <div className="pt-6 border-t border-slate-800 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-400" />
                <span>Histórico de Agentes Substituídos ({alreadySubstituted.length})</span>
              </h3>
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-2.5">Agente Afastado</th>
                      <th className="p-2.5">BI</th>
                      <th className="p-2.5">Coordenação</th>
                      <th className="p-2.5">Dias Originais</th>
                      <th className="p-2.5">Estado / Motivo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {alreadySubstituted.map((p) => (
                      <tr key={p.id}>
                        <td className="p-2.5 font-bold text-white">{p.nome}</td>
                        <td className="p-2.5 font-mono">{p.bi}</td>
                        <td className="p-2.5 font-semibold text-amber-300">{p.coord}</td>
                        <td className="p-2.5">{p.dias} dias</td>
                        <td className="p-2.5 text-[11px] text-red-300">{p.obs || 'Substituído'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
