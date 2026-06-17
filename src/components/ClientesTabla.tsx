"use client";

import { useState } from "react";
import Link from "next/link";

export interface ClienteRow {
  id: string;
  nombre: string;
  codigo: string | null;
  cif: string | null;
  email: string | null;
  colaborador_nombre?: string | null;
  ops: number;
  esAvalista?: boolean;
}

export default function ClientesTabla({ clientes, esAdmin, hrefBase }: { clientes: ClienteRow[]; esAdmin: boolean; hrefBase: string }) {
  const [q, setQ] = useState("");
  const [soloAvalistas, setSoloAvalistas] = useState(false);
  const ql = q.toLowerCase().trim();
  const hayAvalistas = clientes.some(c => c.esAvalista);
  let filtered = ql
    ? clientes.filter(c =>
        c.nombre.toLowerCase().includes(ql) ||
        (c.cif ?? "").toLowerCase().includes(ql) ||
        (c.email ?? "").toLowerCase().includes(ql) ||
        (c.codigo ?? "").toLowerCase().includes(ql) ||
        (c.colaborador_nombre ?? "").toLowerCase().includes(ql))
    : clientes;
  if (soloAvalistas) filtered = filtered.filter(c => c.esAvalista && c.ops === 0);

  return (
    <div>
      <div className="mb-4 flex gap-3">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Buscar por nombre, código, CIF o email..."
          className="flex-1 px-4 py-2.5 border border-gray-200 text-sm focus:outline-none focus:border-[#2E1A47] bg-white"
        />
        {hayAvalistas && (
          <button type="button" onClick={() => setSoloAvalistas(v => !v)}
            className={`px-4 py-2.5 text-xs font-semibold border transition-colors whitespace-nowrap ${
              soloAvalistas ? "bg-amber-100 border-amber-300 text-amber-800" : "bg-white border-gray-200 text-gray-500 hover:border-amber-300 hover:text-amber-700"
            }`}>
            Solo avalistas
          </button>
        )}
      </div>
      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 p-10 text-center"><p className="text-gray-400 text-sm">No se encontraron clientes.</p></div>
      ) : (
        <div className="bg-white border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-[#EEEBF3] border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Código</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Empresa</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">CIF</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Email</th>
                {esAdmin && <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Colaborador</th>}
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Ops</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-[#EEEBF3]/30 transition-colors group">
                  <td className="px-6 py-3.5 text-xs font-mono text-gray-400 whitespace-nowrap">{c.codigo ?? "—"}</td>
                  <td className="px-6 py-3.5">
                    <Link href={`${hrefBase}/${c.id}`} className="text-sm font-semibold text-gray-900 hover:text-[#2E1A47] hover:underline">{c.nombre}</Link>
                    {c.esAvalista && c.ops === 0 && <span className="ml-2 px-1.5 py-0.5 text-[9px] font-bold uppercase bg-amber-100 text-amber-700 rounded">Avalista</span>}
                  </td>
                  <td className="px-6 py-3.5 text-sm text-gray-500 font-mono whitespace-nowrap">{c.cif ?? "—"}</td>
                  <td className="px-6 py-3.5 text-sm text-gray-500">{c.email ?? "—"}</td>
                  {esAdmin && <td className="px-6 py-3.5 text-sm text-gray-600">{c.colaborador_nombre ?? "—"}</td>}
                  <td className="px-6 py-3.5 text-sm text-gray-600">{c.ops}</td>
                  <td className="px-6 py-3.5 text-right whitespace-nowrap">
                    <Link href={`${hrefBase}/${c.id}`} className="text-[#2E1A47] text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity hover:underline">Ver →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
