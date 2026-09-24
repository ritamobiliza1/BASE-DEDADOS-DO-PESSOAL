import React, { useState } from 'react';
import {
  X,
  Mail,
  Send,
  Copy,
  CheckCircle2,
  FileText,
  UserCheck,
  Calendar,
  Layers,
} from 'lucide-react';
import { Person, SupportedLanguage } from '../types';
import { translations } from '../utils/i18n';

interface EmailNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  allPeople: Person[];
  onLogNotification: (recipient: string, subject: string, template: string) => void;
  lang: SupportedLanguage;
}

interface TemplatePreset {
  id: string;
  name: string;
  subject: string;
  body: string;
}

const TEMPLATES: TemplatePreset[] = [
  {
    id: 'convocatoria',
    name: 'Convocatória para Campanha nOVP2',
    subject: 'CONVOCATÓRIA · Campanha de Vacinação contra a Pólio · Município do Sumbe',
    body: `Exmo(a). Coordenador(a) / Supervisor(a),\n\nVimos por este meio convocar a equipa da coordenação de {coordenacao} para a preparação da 3ª Ronda da Campanha de Vacinação contra a Pólio (nOVP2) no Município do Sumbe.\n\nEscala Atribuída: {dias} dias de trabalho de campo.\nPor favor confirmar a prontidão e presença de todos os mobilizadores e apoios logísticos.\n\nAtenciosamente,\nDirecção Municipal de Saúde do Sumbe\nCoordenação Geral de Mobilização Social`,
  },
  {
    id: 'regularizacao_bi',
    name: 'Regularização de BI / IBAN Pendente',
    subject: 'URGENTE: Regularização de Dados de Registo · Campanha do Sumbe',
    body: `Prezado(a) Agente de Mobilização Social,\n\nSolicitamos a apresentação urgente da cópia legível do Bilhete de Identidade e do comprovativo de IBAN junto da coordenação de {coordenacao}.\n\nA conformidade dos seus dados é estritamente necessária para validação formal das listas de presença e cumprimento dos {dias} dias de trabalho registados.\n\nDirecção Municipal de Saúde do Sumbe`,
  },
  {
    id: 'resumo_dias',
    name: 'Relatório de Cumprimento de Dias de Trabalho',
    subject: 'RELATÓRIO: Escala e Dias de Trabalho da Coordenação {coordenacao}',
    body: `Exmos. Senhores,\n\nSegue em anexo o resumo operacional referente à coordenação de {coordenacao}.\nTotal de efetivos mobilizados no terreno e registados na escala oficial: {dias} dias cumpridos na 3ª Ronda nOVP2.\n\nTodos os agentes encontram-se devidamente registados no Sistema de Mobilizadores do Sumbe.\n\nSumbe, {data_atual}.\nO Supervisor da Zona`,
  },
];

export const EmailNotificationModal: React.FC<EmailNotificationModalProps> = ({
  isOpen,
  onClose,
  allPeople,
  onLogNotification,
  lang,
}) => {
  const t = translations[lang];
  const [selectedTemplateId, setSelectedTemplateId] = useState(TEMPLATES[0].id);
  const [recipientFilter, setRecipientFilter] = useState('supervisores');
  const [selectedCoord, setSelectedCoord] = useState('all');
  const [customSubject, setCustomSubject] = useState(TEMPLATES[0].subject);
  const [customBody, setCustomBody] = useState(TEMPLATES[0].body);
  const [recipientEmails, setRecipientEmails] = useState('saude.sumbe@gov.ao');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const coords = Array.from(new Set(allPeople.map((p) => p.coord).filter(Boolean))).sort();

  const handleTemplateSelect = (tmpl: TemplatePreset) => {
    setSelectedTemplateId(tmpl.id);
    setCustomSubject(tmpl.subject);
    setCustomBody(tmpl.body);
  };

  // Preview body with sample replacement
  const todayStr = new Date().toLocaleDateString('pt-AO');
  const processedBody = customBody
    .replace(/{coordenacao}/g, selectedCoord === 'all' ? 'CHINGO 1' : selectedCoord)
    .replace(/{dias}/g, '5')
    .replace(/{data_atual}/g, todayStr)
    .replace(/{municipio}/g, 'Sumbe')
    .replace(/{ronda}/g, '3ª Ronda nOVP2');

  const processedSubject = customSubject
    .replace(/{coordenacao}/g, selectedCoord === 'all' ? 'Geral' : selectedCoord);

  const handleSendViaEmailClient = () => {
    const mailto = `mailto:${encodeURIComponent(recipientEmails)}?subject=${encodeURIComponent(
      processedSubject
    )}&body=${encodeURIComponent(processedBody)}`;

    window.open(mailto, '_blank');
    onLogNotification(recipientEmails, processedSubject, selectedTemplateId);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`Assunto: ${processedSubject}\n\n${processedBody}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    onLogNotification(recipientEmails, processedSubject, selectedTemplateId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-200 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-indigo-500/20 p-2 text-indigo-400">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Sistema de Notificações Personalizáveis por E-mail</h2>
              <p className="text-xs text-slate-400">
                Envie comunicados, convocações e alertas operacionais para equipas e coordenações
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

        {/* Templates Presets */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            Modelos de Mensagem Predefinidos
          </label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.id}
                type="button"
                onClick={() => handleTemplateSelect(tmpl)}
                className={`rounded-xl border p-2.5 text-left text-xs font-semibold transition ${
                  selectedTemplateId === tmpl.id
                    ? 'border-indigo-500 bg-indigo-950/40 text-white shadow'
                    : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:bg-slate-800'
                }`}
              >
                {tmpl.name}
              </button>
            ))}
          </div>
        </div>

        {/* Recipient Targeting */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Destinatários / Função
            </label>
            <select
              value={recipientFilter}
              onChange={(e) => setRecipientFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2 px-3 text-xs text-white outline-none"
            >
              <option value="supervisores">Supervisores de Mobilização</option>
              <option value="todos">Toda a Equipa Municipal</option>
              <option value="pendentes">Agentes com Pendência de BI/IBAN</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Coordenação Alvo
            </label>
            <select
              value={selectedCoord}
              onChange={(e) => setSelectedCoord(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2 px-3 text-xs text-white outline-none"
            >
              <option value="all">Todas as Coordenações</option>
              {coords.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Endereços de E-mail de Envio (separados por vírgula)
            </label>
            <input
              type="text"
              value={recipientEmails}
              onChange={(e) => setRecipientEmails(e.target.value)}
              placeholder="ex: saude.sumbe@gov.ao, supervisao.mobsoc@gmail.com"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2 px-3 text-xs text-white outline-none"
            />
          </div>
        </div>

        {/* Custom Subject & Body */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Assunto da Mensagem
            </label>
            <input
              type="text"
              value={customSubject}
              onChange={(e) => setCustomSubject(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2 px-3 text-xs text-white outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Corpo do E-mail
              </label>
              <span className="text-[10px] text-slate-400">
                Variáveis: {'{coordenacao}'}, {'{dias}'}, {'{data_atual}'}, {'{municipio}'}
              </span>
            </div>
            <textarea
              rows={6}
              value={customBody}
              onChange={(e) => setCustomBody(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2 px-3 text-xs text-white font-sans outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-3">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
          >
            {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? 'Copiado para a Área de Transferência!' : 'Copiar Texto Completo'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
            >
              Fechar
            </button>
            <button
              onClick={handleSendViaEmailClient}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-950/50 hover:from-indigo-500 hover:to-indigo-600 transition"
            >
              <Send className="h-4 w-4" />
              <span>Abrir no Cliente de E-mail</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
