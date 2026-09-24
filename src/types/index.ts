export type PersonType = 'mob' | 'sup' | 'moto';

export type PersonStatus = 'NOVO' | 'Disponível' | 'Indisponível' | 'Substituído';

export interface Person {
  id: string;
  type: PersonType;
  nome: string;
  bi: string;
  sexo: 'F' | 'M';
  coord: string;
  dias: number; // Número de dias de trabalho (campo fundamental)
  iban: string;
  banco: string;
  contacto?: string;
  funcao?: string;
  marca?: string;     // Para motoqueiros
  matricula?: string; // Para motoqueiros
  nivelAcademico?: string; // Ex: Licenciatura, Técnico Médio, PUNIV, etc.
  areaFormacao?: string;   // Ex: Ciências da Saúde, Educação, etc.
  curso?: string;          // Ex: Enfermagem Geral, Análises Clínicas, etc.
  instituicao?: string;    // Instituição de ensino / Escola
  anoConclusao?: string;   // Ano de conclusão
  estado: PersonStatus;
  isNovo: boolean;
  obs?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Recarga {
  id: string;
  n: number;
  nome: string;
  funcao: string;
  coord: string;
  qtd: number;
  telefone: string;
  operadora?: string;
  assinatura?: string;
}

export interface HistoryItem {
  id: string;
  at: string;
  action: string;
  person: string;
  details?: string;
}

export interface AppState {
  mobs: Person[];
  sups: Person[];
  motos: Person[];
  recs: Recarga[];
  history: HistoryItem[];
  rondas: { id: string; nome: string; dataInicio: string; dataFim: string; status: 'Planeada' | 'Em Curso' | 'Concluída' }[];
  notificationsLog: { id: string; date: string; subject: string; recipients: string; body: string }[];
}

export interface ValidationIssue {
  personId: string;
  personName: string;
  personType: PersonType;
  coord: string;
  field: 'bi' | 'iban' | 'contacto' | 'dias' | 'matricula';
  severity: 'error' | 'warning';
  message: string;
}

export interface ValidationSummary {
  totalPeople: number;
  validBiCount: number;
  invalidBiCount: number;
  duplicateBiList: string[];
  validIbanCount: number;
  invalidIbanCount: number;
  duplicateIbanList: string[];
  missingContactCount: number;
  totalIssues: ValidationIssue[];
}

export type SupportedLanguage = 'pt' | 'en' | 'fr' | 'umb';

export interface ExportFilterOptions {
  items: ('mobilizadores' | 'supervisores' | 'motoqueiros' | 'recargas' | 'escala')[];
  coord: string; // '' for all
  state?: string; // '' for all, 'NOVO', 'Disponível', 'Substituído'
  onlyNew?: boolean;
}

export interface CalendarEventItem {
  id?: string;
  summary: string;
  description: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  location?: string;
}

export interface PaymentRatesConfig {
  mobRate: number;      // default: 5000
  mobDays: number;      // default: 5
  supAreaRate: number;  // default: 10000
  supAreaDays: number;  // default: 5
  supMunRate: number;   // default: 25000
  supMunDays: number;   // default: 7
  motoAreaRate: number; // default: 40000
  motoAreaDays: number; // default: 4
  motoMunRate: number;  // default: 100000
  motoMunDays: number;  // default: 5
  recUnitVal: number;   // default: 1000
  recDefaultQtd: number;// default: 2
}

export const DEFAULT_PAYMENT_RATES: PaymentRatesConfig = {
  mobRate: 5000,
  mobDays: 5,
  supAreaRate: 10000,
  supAreaDays: 5,
  supMunRate: 25000,
  supMunDays: 7,
  motoAreaRate: 40000,
  motoAreaDays: 4,
  motoMunRate: 100000,
  motoMunDays: 5,
  recUnitVal: 1000,
  recDefaultQtd: 2,
};
