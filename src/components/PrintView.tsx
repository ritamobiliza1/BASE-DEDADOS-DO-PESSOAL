import React from 'react';
import { Printer, X } from 'lucide-react';
import { Person, ExportFilterOptions } from '../types';
import { normalizeCoordName } from '../utils/validation';

interface PrintViewProps {
  allPeople: Person[];
  options: ExportFilterOptions;
  onClose: () => void;
}

export const PrintView: React.FC<PrintViewProps> = ({ allPeople, options, onClose }) => {
  const coord = normalizeCoordName(options.coord);
  const filtered = allPeople.filter((p) => {
    const matchCoord = !coord || normalizeCoordName(p.coord) === coord;
    const matchState = !options.state || p.estado === options.state || (options.state === 'NOVO' && p.isNovo);
    const matchType =
      (p.type === 'mob' && options.items.includes('mobilizadores')) ||
      (p.type === 'sup' && options.items.includes('supervisores')) ||
      (p.type === 'moto' && options.items.includes('motoqueiros'));

    return matchCoord && matchState && matchType;
  });

  const totalDias = filtered.reduce((acc, p) => acc + Number(p.dias || 0), 0);
  const totalF = filtered.filter((p) => p.sexo === 'F').length;
  const totalM = filtered.filter((p) => p.sexo === 'M').length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-white text-black p-6">
      {/* On-screen controls (hidden when printing) */}
      <div className="print:hidden mb-6 flex items-center justify-between rounded-xl border border-slate-300 bg-slate-100 p-4 shadow">
        <div>
          <h2 className="font-bold text-slate-800">Visualização de Impressão Oficial</h2>
          <p className="text-xs text-slate-600">
            Formato configurado para papel A4 em modo paisagem (Landscape).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-700 px-4 py-2 text-xs font-bold text-white shadow hover:bg-red-800 transition"
          >
            <Printer className="h-4 w-4" />
            <span>Confirmar e Imprimir</span>
          </button>
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* Official Printable Document */}
      <div className="max-w-[1100px] mx-auto text-[11px] font-sans">
        {/* Republic of Angola Header */}
        <div className="text-center border-b-2 border-black pb-3 mb-3">
          <div className="font-bold tracking-widest text-xs uppercase">REPÚBLICA DE ANGOLA</div>
          <div className="font-bold text-sm tracking-wide">GOVERNO DA PROVÍNCIA DO CUANZA-SUL</div>
          <div className="font-bold text-xs">ADMINISTRAÇÃO MUNICIPAL DO SUMBE · DIRECÇÃO MUNICIPAL DE SAÚDE</div>
          <div className="text-[10px] mt-1 text-slate-700">
            CAMPANHA NACIONAL DE VACINAÇÃO CONTRA A POLIOMIELITE · nOVP2 · 3ª RONDA
          </div>
          <div className="font-black text-sm mt-2 tracking-wide uppercase">
            {coord ? `MAPA OPERACIONAL DA COORDENAÇÃO: ${coord}` : 'MAPA GERAL DE EFETIVOS E DIAS DE TRABALHO'}
          </div>
        </div>

        {/* Summary Badges */}
        <div className="grid grid-cols-4 gap-2 mb-3 text-center border border-slate-300 p-2 bg-slate-50 text-[10px]">
          <div>
            <span className="font-bold text-slate-600 uppercase">Total Efetivo:</span>
            <div className="font-black text-xs">{filtered.length} Agentes</div>
          </div>
          <div>
            <span className="font-bold text-slate-600 uppercase">Dias de Trabalho:</span>
            <div className="font-black text-xs text-red-700">{totalDias} Dias Totais</div>
          </div>
          <div>
            <span className="font-bold text-slate-600 uppercase">Género:</span>
            <div className="font-bold">{totalF} Mulheres / {totalM} Homens</div>
          </div>
          <div>
            <span className="font-bold text-slate-600 uppercase">Data de Emissão:</span>
            <div className="font-bold">{new Date().toLocaleDateString('pt-AO')}</div>
          </div>
        </div>

        {/* Table without monetary values */}
        <table className="w-full border-collapse border border-black text-[9.5px]">
          <thead>
            <tr className="bg-slate-200 border-b border-black text-center font-bold">
              <th className="border border-black p-1 w-6">Nº</th>
              <th className="border border-black p-1 text-left">NOME COMPLETO</th>
              <th className="border border-black p-1 w-24">BI</th>
              <th className="border border-black p-1 w-8">SEXO</th>
              <th className="border border-black p-1">COORDENAÇÃO</th>
              <th className="border border-black p-1">FUNÇÃO / VEÍCULO</th>
              <th className="border border-black p-1 font-bold text-black w-20">DIAS TRABALHO</th>
              <th className="border border-black p-1">IBAN</th>
              <th className="border border-black p-1">BANCO</th>
              <th className="border border-black p-1 w-28">ASSINATURA</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, idx) => (
              <tr key={p.id} className="border-b border-slate-300">
                <td className="border border-black p-1 text-center font-mono">{idx + 1}</td>
                <td className="border border-black p-1 font-bold">{p.nome}</td>
                <td className="border border-black p-1 font-mono text-center">{p.bi}</td>
                <td className="border border-black p-1 text-center font-bold">{p.sexo}</td>
                <td className="border border-black p-1">{p.coord}</td>
                <td className="border border-black p-1">
                  <div>
                    {p.type === 'moto'
                      ? `${p.marca || ''} ${p.matricula || ''}`
                      : p.funcao || (p.type === 'mob' ? 'Mobilizador' : 'Supervisor')}
                  </div>
                  {p.curso && (
                    <div className="text-[8px] text-slate-600 font-medium">
                      🎓 {p.curso} {p.nivelAcademico ? `· ${p.nivelAcademico}` : ''}
                    </div>
                  )}
                </td>
                <td className="border border-black p-1 text-center font-black">
                  {p.dias} dias
                </td>
                <td className="border border-black p-1 font-mono text-[8.5px]">{p.iban || '—'}</td>
                <td className="border border-black p-1">{p.banco || '—'}</td>
                <td className="border border-black p-1 text-center">
                  <span className="inline-block border-b border-dotted border-black w-24 text-[8px] text-slate-400">
                    ...................
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Signature Blocks */}
        <div className="mt-12 grid grid-cols-3 gap-6 text-center text-[10px] pt-4 break-inside-avoid">
          <div>
            <div className="border-t border-black pt-1 font-bold">O Coordenador de Área / Zona</div>
            <div className="text-slate-600 text-[9px] mt-0.5">Assinatura e Carimbo</div>
          </div>
          <div>
            <div className="border-t border-black pt-1 font-bold">O Supervisor Municipal da Mobilização</div>
            <div className="text-slate-600 text-[9px] mt-0.5">Victória Canhanga / André de Melo</div>
          </div>
          <div>
            <div className="border-t border-black pt-1 font-bold">A Direcção Municipal de Saúde</div>
            <div className="text-slate-600 text-[9px] mt-0.5">Município do Sumbe · Cuanza-Sul</div>
          </div>
        </div>
      </div>
    </div>
  );
};
