import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, Save, Clock, Shield, Bike, GraduationCap, BookOpen } from 'lucide-react';
import { Person, PersonType, PersonStatus, SupportedLanguage } from '../types';
import { translations } from '../utils/i18n';
import { validateAngolanBI, validateAngolanIBAN, getBankFromIban } from '../utils/validation';

interface PersonFormModalProps {
  isOpen: boolean;
  person: Person | null;
  defaultType: PersonType;
  availableCoords: string[];
  onClose: () => void;
  onSave: (data: Partial<Person>) => void;
  lang: SupportedLanguage;
}

export const PersonFormModal: React.FC<PersonFormModalProps> = ({
  isOpen,
  person,
  defaultType,
  availableCoords,
  onClose,
  onSave,
  lang,
}) => {
  const t = translations[lang];

  const [type, setType] = useState<PersonType>(defaultType);
  const [nome, setNome] = useState('');
  const [bi, setBi] = useState('');
  const [sexo, setSexo] = useState<'F' | 'M'>('F');
  const [coord, setCoord] = useState('');
  const [dias, setDias] = useState<number>(5);
  const [iban, setIban] = useState('');
  const [banco, setBanco] = useState('');
  const [contacto, setContacto] = useState('');
  const [funcao, setFuncao] = useState('Supervisor (a) de Mobsoc');
  const [marca, setMarca] = useState('');
  const [matricula, setMatricula] = useState('');
  const [nivelAcademico, setNivelAcademico] = useState('');
  const [areaFormacao, setAreaFormacao] = useState('');
  const [curso, setCurso] = useState('');
  const [instituicao, setInstituicao] = useState('');
  const [anoConclusao, setAnoConclusao] = useState('');
  const [estado, setEstado] = useState<PersonStatus>('NOVO');
  const [obs, setObs] = useState('');

  useEffect(() => {
    if (person) {
      setType(person.type);
      setNome(person.nome);
      setBi(person.bi);
      setSexo(person.sexo);
      setCoord(person.coord);
      setDias(person.dias || 5);
      setIban(person.iban || '');
      setBanco(person.banco || '');
      setContacto(person.contacto || '');
      setFuncao(person.funcao || 'Supervisor (a) de Mobsoc');
      setMarca(person.marca || '');
      setMatricula(person.matricula || '');
      setNivelAcademico(person.nivelAcademico || '');
      setAreaFormacao(person.areaFormacao || '');
      setCurso(person.curso || '');
      setInstituicao(person.instituicao || '');
      setAnoConclusao(person.anoConclusao || '');
      setEstado(person.estado);
      setObs(person.obs || '');
    } else {
      setType(defaultType);
      setNome('');
      setBi('');
      setSexo('F');
      setCoord(availableCoords[0] || 'CHINGO 1');
      setDias(defaultType === 'moto' ? 4 : defaultType === 'sup' ? 5 : 5);
      setIban('');
      setBanco('');
      setContacto('');
      setFuncao('Supervisor (a) de Mobsoc');
      setMarca('');
      setMatricula('');
      setNivelAcademico('Técnico Médio de Saúde (Enfermagem)');
      setAreaFormacao('Ciências da Saúde');
      setCurso('Enfermagem Geral');
      setInstituicao('');
      setAnoConclusao('');
      setEstado('NOVO'); // New records are always NOVO as requested
      setObs('');
    }
  }, [person, defaultType, isOpen, availableCoords]);

  if (!isOpen) return null;

  // Live validation calculations
  const biValidation = validateAngolanBI(bi);
  const ibanValidation = validateAngolanIBAN(iban);

  const handleIbanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().replace(/\s+/g, '');
    setIban(val);
    const detected = getBankFromIban(val);
    if (detected) {
      setBanco(detected);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !bi.trim() || !coord.trim()) {
      alert('Por favor, preencha os campos obrigatórios (Nome, BI e Coordenação).');
      return;
    }

    if (type === 'moto') {
      if (!marca.trim()) {
        alert('Atenção: Ao cadastrar o motoqueiro é obrigatório preencher a MARCA da motorizada ou viatura.');
        return;
      }
      if (!matricula.trim()) {
        alert('Atenção: Ao cadastrar o motoqueiro é obrigatório preencher a MATRÍCULA da motorizada ou viatura.');
        return;
      }
    }

    onSave({
      type,
      nome: nome.trim().toUpperCase(),
      bi: bi.trim().toUpperCase().replace(/[\s-]/g, ''),
      sexo,
      coord: coord.trim().toUpperCase(),
      dias: Number(dias) > 0 ? Number(dias) : 5,
      iban: iban.trim().toUpperCase(),
      banco: banco.trim() || getBankFromIban(iban),
      contacto: contacto.trim(),
      funcao: type === 'sup' ? funcao.trim() : undefined,
      marca: type === 'moto' ? marca.trim().toUpperCase() : undefined,
      matricula: type === 'moto' ? matricula.trim().toUpperCase() : undefined,
      nivelAcademico: nivelAcademico.trim(),
      areaFormacao: areaFormacao.trim(),
      curso: curso.trim(),
      instituicao: instituicao.trim(),
      anoConclusao: anoConclusao.trim(),
      estado,
      isNovo: !person ? true : estado === 'NOVO',
      obs: obs.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-200 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-400" />
              <span>{person ? 'Editar Cadastro' : 'Novo Cadastro'}</span>
            </h2>
            <p className="text-xs text-slate-400">
              {person ? 'Atualização de dados operacionais' : 'Novo agente registado automaticamente como '}
              <b className="text-amber-400">NOVO</b>. Sem campos de valores monetários.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Tipo de Agente */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Categoria / Função *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as PersonType)}
                disabled={!!person}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2 px-3 text-xs text-white outline-none focus:border-amber-500 disabled:opacity-60"
              >
                <option value="mob">Mobilizador Social (Comunitário)</option>
                <option value="sup">Supervisor de Mobilização</option>
                <option value="moto">Motoqueiro de Apoio Logístico</option>
              </select>
            </div>

            {/* Estado */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Estado Operacional
              </label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value as PersonStatus)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2 px-3 text-xs text-white outline-none focus:border-amber-500"
              >
                <option value="NOVO">🟡 NOVO (Pendente Revisão)</option>
                <option value="Disponível">🟢 Disponível (Ativo)</option>
                <option value="Indisponível">🔴 Indisponível</option>
                <option value="Substituído">⚪ Substituído</option>
              </select>
            </div>

            {/* Nome Completo */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Nome Completo *
              </label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: NAZARÉ MILAGRE QUELINHO SANTOS"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2 px-3 text-xs text-white outline-none focus:border-amber-500"
              />
            </div>

            {/* Bilhete de Identidade (BI) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  BI (Bilhete de Identidade) *
                </label>
                {bi && (
                  <span className={`text-[10px] flex items-center gap-1 ${biValidation.isValid ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {biValidation.isValid ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                    {biValidation.isValid ? 'Formato Válido' : 'Formato Inválido'}
                  </span>
                )}
              </div>
              <input
                type="text"
                required
                value={bi}
                onChange={(e) => setBi(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                placeholder="Ex: 005294346KS041 (14 caracteres)"
                className={`w-full rounded-xl border py-2 px-3 text-xs font-mono text-white outline-none ${
                  bi && !biValidation.isValid ? 'border-amber-500 bg-amber-950/20' : 'border-slate-700 bg-slate-800 focus:border-amber-500'
                }`}
              />
              {bi && !biValidation.isValid && (
                <p className="mt-1 text-[10px] text-amber-400">{biValidation.message}</p>
              )}
            </div>

            {/* Sexo */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Sexo *
              </label>
              <select
                value={sexo}
                onChange={(e) => setSexo(e.target.value as 'F' | 'M')}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2 px-3 text-xs text-white outline-none focus:border-amber-500"
              >
                <option value="F">Feminino (F)</option>
                <option value="M">Masculino (M)</option>
              </select>
            </div>

            {/* Coordenação */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Coordenação de Saúde *
              </label>
              <input
                type="text"
                required
                list="coordsDatalist"
                value={coord}
                onChange={(e) => setCoord(e.target.value.toUpperCase())}
                placeholder="Ex: CHINGO 1, ZONA ALTA 2..."
                className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2 px-3 text-xs text-white outline-none focus:border-amber-500"
              />
              <datalist id="coordsDatalist">
                {availableCoords.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            {/* DIAS DE TRABALHO (CAMPO FUNDAMENTAL) */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-red-400 mb-1 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>Dias de Trabalho (Total de Dias) *</span>
              </label>
              <input
                type="number"
                min="1"
                max="30"
                required
                value={dias}
                onChange={(e) => setDias(Number(e.target.value))}
                className="w-full rounded-xl border border-red-500/50 bg-slate-800 py-2 px-3 text-xs font-bold text-white outline-none focus:border-red-400"
              />
              <span className="text-[10px] text-slate-400">
                Padrão da campanha: 5 dias para mobilizadores, 4 a 7 dias para coordenação e motoqueiros
              </span>
            </div>

            {/* IBAN */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  IBAN (AO06 + 21 dígitos)
                </label>
                {iban && (
                  <span className={`text-[10px] flex items-center gap-1 ${ibanValidation.isValid ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {ibanValidation.isValid ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                    {ibanValidation.isValid ? 'IBAN Válido' : 'Inválido'}
                  </span>
                )}
              </div>
              <input
                type="text"
                value={iban}
                onChange={handleIbanChange}
                placeholder="Ex: AO06004000001469421210126"
                className={`w-full rounded-xl border py-2 px-3 text-xs font-mono text-white outline-none ${
                  iban && !ibanValidation.isValid ? 'border-amber-500 bg-amber-950/20' : 'border-slate-700 bg-slate-800 focus:border-amber-500'
                }`}
              />
            </div>

            {/* Banco */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Banco Comercial
              </label>
              <input
                type="text"
                value={banco}
                onChange={(e) => setBanco(e.target.value)}
                placeholder="Preenchido automaticamente pelo IBAN"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2 px-3 text-xs text-white outline-none focus:border-amber-500"
              />
            </div>

            {/* Contacto Telefónico */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Contacto Telefónico (9 dígitos)
              </label>
              <input
                type="text"
                value={contacto}
                onChange={(e) => setContacto(e.target.value)}
                placeholder="Ex: 928621619"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2 px-3 text-xs text-white outline-none focus:border-amber-500"
              />
            </div>

            {/* Campos Específicos para Supervisores */}
            {type === 'sup' && (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Função Específica
                </label>
                <input
                  type="text"
                  value={funcao}
                  onChange={(e) => setFuncao(e.target.value)}
                  placeholder="Ex: Supervisor (a) de Mobsoc"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2 px-3 text-xs text-white outline-none focus:border-amber-500"
                />
              </div>
            )}

            {/* Secção de Habilitações Literárias e Formação Académica */}
            <div className="sm:col-span-2 rounded-2xl border border-indigo-500/40 bg-indigo-950/20 p-4 space-y-4 shadow-lg">
              <div className="flex items-center justify-between border-b border-indigo-500/30 pb-2">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-indigo-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">
                    Habilitações Literárias & Formação Académica
                  </span>
                </div>
                <span className="rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-[10px] font-bold text-indigo-300">
                  Qualificação & Perfil Técnico
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nível Académico */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-300 mb-1">
                    Nível Académico
                  </label>
                  <select
                    value={nivelAcademico}
                    onChange={(e) => setNivelAcademico(e.target.value)}
                    className="w-full rounded-xl border border-indigo-500/40 bg-slate-800 py-2.5 px-3 text-xs font-semibold text-white outline-none focus:border-indigo-400"
                  >
                    <option value="">-- Selecione o Nível Académico --</option>
                    <option value="Ensino Primário (1ª à 6ª Classe)">Ensino Primário (1ª à 6ª Classe)</option>
                    <option value="Iº Ciclo do Ensino Secundário (7ª à 9ª Classe)">Iº Ciclo do Ensino Secundário (7ª à 9ª)</option>
                    <option value="IIº Ciclo / Ensino Médio Geral (PUNIV)">IIº Ciclo / Ensino Médio Geral (PUNIV)</option>
                    <option value="Técnico Médio de Saúde (Enfermagem)">Técnico Médio de Saúde (Enfermagem)</option>
                    <option value="Técnico Médio de Saúde (Análises / Farmácia)">Técnico Médio de Saúde (Análises/Farmácia)</option>
                    <option value="Técnico Médio Profissional / Politécnico">Técnico Médio Profissional / Politécnico</option>
                    <option value="Frequência Universitária (Estudante Superior)">Frequência Universitária (Estudante Superior)</option>
                    <option value="Bacharelato">Bacharelato</option>
                    <option value="Licenciatura (Ensino Superior Concluído)">Licenciatura (Ensino Superior Concluído)</option>
                    <option value="Pós-Graduação / Mestrado / Doutoramento">Pós-Graduação / Mestrado / Doutoramento</option>
                    <option value="Outro">Outro Nível Académico</option>
                  </select>
                </div>

                {/* Área de Formação */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-300 mb-1">
                    Área de Formação
                  </label>
                  <input
                    type="text"
                    list="areaFormacaoDatalist"
                    value={areaFormacao}
                    onChange={(e) => setAreaFormacao(e.target.value)}
                    placeholder="Ex: Ciências da Saúde, Pedagogia, etc."
                    className="w-full rounded-xl border border-indigo-500/40 bg-slate-800 py-2.5 px-3 text-xs font-semibold text-white outline-none focus:border-indigo-400"
                  />
                  <datalist id="areaFormacaoDatalist">
                    <option value="Ciências da Saúde" />
                    <option value="Ciências da Educação / Magistério / Pedagogia" />
                    <option value="Ciências Físicas e Biológicas" />
                    <option value="Ciências Sociais e Humanas" />
                    <option value="Ciências Económicas / Gestão / Contabilidade" />
                    <option value="Ciências Exactas e Tecnologias / Informática" />
                    <option value="Artes e Ofícios / Mecânica / Transportes" />
                    <option value="Geral / Outra Área" />
                  </datalist>
                </div>

                {/* Curso Feito / Especialidade */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5 text-indigo-400" />
                      <span>Com que Curso Fez (Especialidade / Curso Concluído)</span>
                    </label>
                    <span className="text-[10px] text-slate-400">Sugestões rápidas</span>
                  </div>
                  <input
                    type="text"
                    value={curso}
                    onChange={(e) => setCurso(e.target.value)}
                    placeholder="Ex: Enfermagem Geral, Saúde Comunitária, Análises Clínicas, Pedagogia..."
                    className="w-full rounded-xl border border-indigo-500/40 bg-slate-800 py-2.5 px-3 text-xs font-bold text-white outline-none focus:border-indigo-400"
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[
                      'Enfermagem Geral',
                      'Saúde Comunitária',
                      'Análises Clínicas',
                      'Farmácia',
                      'Ciências Físicas e Biológicas',
                      'Pedagogia / Magistério',
                      'Contabilidade e Gestão',
                      'Informática',
                      'Mecânica Auto',
                      'Psicologia',
                      'Língua Portuguesa',
                    ].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          setCurso(c);
                          if (['Enfermagem Geral', 'Saúde Comunitária', 'Análises Clínicas', 'Farmácia'].includes(c)) {
                            setAreaFormacao('Ciências da Saúde');
                            if (!nivelAcademico) setNivelAcademico('Técnico Médio de Saúde (Enfermagem)');
                          } else if (c.includes('Pedagogia') || c.includes('Magistério')) {
                            setAreaFormacao('Ciências da Educação / Magistério / Pedagogia');
                          } else if (c.includes('Contabilidade')) {
                            setAreaFormacao('Ciências Económicas / Gestão / Contabilidade');
                          }
                        }}
                        className="rounded-lg px-2 py-0.5 text-[10px] font-semibold bg-slate-800 hover:bg-indigo-900/60 text-indigo-200 border border-indigo-500/30 transition"
                      >
                        + {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Instituição de Ensino */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Instituição de Ensino / Escola
                  </label>
                  <input
                    type="text"
                    value={instituicao}
                    onChange={(e) => setInstituicao(e.target.value)}
                    placeholder="Ex: Instituto Médio de Saúde do Sumbe, ISP Sumbe..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2 px-3 text-xs text-white outline-none focus:border-indigo-400"
                  />
                </div>

                {/* Ano de Conclusão */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Ano de Conclusão (Opcional)
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={anoConclusao}
                    onChange={(e) => setAnoConclusao(e.target.value)}
                    placeholder="Ex: 2023"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2 px-3 text-xs font-mono text-white outline-none focus:border-indigo-400"
                  />
                </div>
              </div>
            </div>

            {/* Campos Específicos para Motoqueiros - Destaque Obrigatório de Marca e Matrícula */}
            {type === 'moto' && (
              <div className="sm:col-span-2 rounded-2xl border border-teal-500/50 bg-teal-950/20 p-4 space-y-3 shadow-lg">
                <div className="flex items-center justify-between border-b border-teal-500/30 pb-2">
                  <div className="flex items-center gap-2">
                    <Bike className="h-4 w-4 text-teal-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-300">
                      Identificação da Motorizada / Viatura de Apoio *
                    </span>
                  </div>
                  <span className="rounded-full bg-teal-500/20 px-2 py-0.5 text-[10px] font-black text-teal-300">
                    Obrigatório no Mapa de Pagamento
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-teal-300 mb-1">
                      Marca da Motorizada / Veículo *
                    </label>
                    <input
                      type="text"
                      required
                      value={marca}
                      onChange={(e) => setMarca(e.target.value.toUpperCase())}
                      placeholder="Ex: LINGKEN, HAOJUE, KTM, BAJAJ, FORD"
                      className="w-full rounded-xl border border-teal-500/50 bg-slate-800 py-2.5 px-3 text-xs font-bold text-white outline-none focus:border-teal-400"
                    />
                    <div className="mt-2 flex flex-wrap gap-1">
                      {['LINGKEN', 'HAOJUE', 'KTM', 'HERO', 'BAJAJ', 'YAMAHA', 'HONDA', 'DAYUN', 'FORD'].map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setMarca(b)}
                          className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-slate-800 hover:bg-teal-800/60 text-slate-300 hover:text-teal-200 transition border border-slate-700"
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-teal-300 mb-1">
                      Matrícula Oficial do Veículo *
                    </label>
                    <input
                      type="text"
                      required
                      value={matricula}
                      onChange={(e) => setMatricula(e.target.value.toUpperCase())}
                      placeholder="Ex: LD-66-99-HK, CS-10-20-AA ou 107/2024"
                      className="w-full rounded-xl border border-teal-500/50 bg-slate-800 py-2.5 px-3 text-xs font-mono font-bold text-white outline-none focus:border-teal-400"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Formato oficial angolano com traços ou registo da campanha
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Observações */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Observações Operacionais
              </label>
              <textarea
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                placeholder="Notas de terreno, substituição ou justificação..."
                rows={2}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2 px-3 text-xs text-white outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-red-950/50 hover:from-red-500 hover:to-amber-500 transition"
            >
              <Save className="h-4 w-4" />
              <span>Guardar Registo</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
