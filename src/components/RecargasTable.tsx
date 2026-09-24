import React, { useState } from 'react';
import { Phone, Search, Edit2, Plus, Smartphone, CheckCircle } from 'lucide-react';
import { Recarga, SupportedLanguage } from '../types';
import { translations } from '../utils/i18n';

interface RecargasTableProps {
  recargas: Recarga[];
  onUpdateRecarga: (id: string, updated: Partial<Recarga>) => void;
  onAddRecarga: (newRec: Recarga) => void;
  lang: SupportedLanguage;
}

export const RecargasTable: React.FC<RecargasTableProps> = ({
  recargas,
  onUpdateRecarga,
  onAddRecarga,
  lang,
}) => {
  const t = translations[lang];
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPhone, setEditPhone] = useState('');
  const [editQtd, setEditQtd] = useState(2);

  const filtered = recargas.filter((r) => {
    const q = searchTerm.toLowerCase();
    return (
      !q ||
      r.nome.toLowerCase().includes(q) ||
      r.coord.toLowerCase().includes(q) ||
      r.telefone.toLowerCase().includes(q)
    );
  });

  const totalCartoes = recargas.reduce((acc, r) => acc + (Number(r.qtd) || 0), 0);

  const startEdit = (r: Recarga) => {
    setEditingId(r.id);
    setEditPhone(r.telefone);
    setEditQtd(r.qtd);
  };

  const saveEdit = (id: string) => {
    onUpdateRecarga(id, {
      telefone: editPhone.trim(),
      qtd: editQtd,
    });
    setEditingId(null);
  };

  return (
    <div className="space-y-4">
      {/* Top Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <Smartphone className="h-5 w-5 text-indigo-400" />
              <span>{t.recargas} · Comunicação Operacional</span>
            </h2>
            <p className="text-xs text-slate-400">
              Distribuição física de cartões de recarga para supervisores municipais e coordenadores (sem dados monetários)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/40 px-3.5 py-1.5 text-center">
              <span className="text-[10px] font-bold uppercase text-indigo-400">Total de Cartões</span>
              <div className="text-xl font-black text-white">{totalCartoes} unidades</div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por supervisor, coordenação ou telefone..."
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-400 outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-amber-400">
            <tr>
              <th className="py-3 px-3 text-center">Nº</th>
              <th className="py-3 px-3">Nome do Beneficiário</th>
              <th className="py-3 px-3">Função na Campanha</th>
              <th className="py-3 px-3">Coordenação</th>
              <th className="py-3 px-3 text-center">Quantidade (Cartões)</th>
              <th className="py-3 px-3">Número de Telefone</th>
              <th className="py-3 px-3">Operadora</th>
              <th className="py-3 px-3 text-center">Assinatura / Recibo</th>
              <th className="py-3 px-3 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filtered.map((r, idx) => {
              const isEditing = editingId === r.id;
              return (
                <tr key={r.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-2.5 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                  <td className="py-2.5 px-3 font-bold text-white">{r.nome}</td>
                  <td className="py-2.5 px-3 text-slate-300">{r.funcao}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-300">{r.coord}</td>

                  {/* Quantidade */}
                  <td className="py-2.5 px-3 text-center">
                    {isEditing ? (
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={editQtd}
                        onChange={(e) => setEditQtd(Number(e.target.value))}
                        className="w-16 rounded border border-slate-600 bg-slate-800 px-1 py-0.5 text-center text-xs text-white"
                      />
                    ) : (
                      <span className="rounded-full bg-indigo-950 border border-indigo-500/40 px-2.5 py-0.5 font-bold text-indigo-300">
                        {r.qtd} cartões
                      </span>
                    )}
                  </td>

                  {/* Telefone */}
                  <td className="py-2.5 px-3 font-mono">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="ex: 928621619"
                        className="w-28 rounded border border-slate-600 bg-slate-800 px-1 py-0.5 text-xs text-white font-mono"
                      />
                    ) : r.telefone ? (
                      <span className="text-slate-200">{r.telefone}</span>
                    ) : (
                      <span className="text-amber-400 italic">Pendente</span>
                    )}
                  </td>

                  <td className="py-2.5 px-3 text-slate-400">{r.operadora || 'Unitel'}</td>

                  <td className="py-2.5 px-3 text-center">
                    <span className="inline-block border-b border-dashed border-slate-600 w-24 text-[10px] text-slate-500">
                      .......................
                    </span>
                  </td>

                  <td className="py-2.5 px-3 text-right">
                    {isEditing ? (
                      <button
                        onClick={() => saveEdit(r.id)}
                        className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-500 transition"
                      >
                        Gravar
                      </button>
                    ) : (
                      <button
                        onClick={() => startEdit(r)}
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                        title="Editar telefone ou quantidade"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
