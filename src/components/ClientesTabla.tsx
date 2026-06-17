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

function TablaRows({ rows, hrefBase, esAdmin }: { rows: ClienteRow[]; hrefBase: string; esAdmin: boolean }) {
  return (
    <>
      {rows.map(c => (
        <tr key={c.id} className="hover:bg-[#EEEBF3]/30 transition-colors group">
          <td className="px-6 py-3.5 text-xs font-mono text-gray-400 whitespace-nowrap">{c.codigo ?? "—"}</td>
          <td className="px-6 py-3.5">
            <Link href={`${hrefBase}/${c.id}`} className="text-sm font-semibold text-gray-900 hover:text-[#2E1A47] hover:underline">{c.nombre}</Link>
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
    </>
  );
}

function TablaHead({ esAdmin }: { esAdmin: boolean }) {
  return (
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
  );
}

export default function ClientesTabla({ clientes, esAdmin, hrefBase }: { clientes: ClienteRow[]; esAdmin: boolean; hrefBase: string }) {
  const [q, setQ] = useState("");
  const ql = q.toLowerCase().trim();

  let filtered = ql
    ? clientes.filter(c =>
        c.nombre.toLowerCase().includes(ql) ||
        (c.cif ?? "").toLowerCase().includes(ql) ||
        (c.email ?? "").toLowerCase().includes(ql) ||
        (c.codigo ?? "").toLowerCase().includes(ql) ||
        (c.colaborador_nombre ?? "").toLowerCase().includes(ql))
    : clientes;

  const clientesNormales = filtered.filter(c => !(c.esAvalista && c.ops === 0));
  const soloAvalistas = filtered.filter(c => c.esAvalista && c.ops === 0);

  return (
    <div>
      <div className="mb-4">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Buscar por nombre, código, CIF o email..."
          className="w-full px-4 py-2.5 border border-gray-200 text-sm focus:outline-none focus:border-[#2E1A47] bg-white"
        />
      </div>

      {clientesNormales.length === 0 && soloAvalistas.length === 0 ? (
        <div className="bg-white border border-gray-200 p-10 text-center"><p className="text-gray-400 text-sm">No se encontraron clientes.</p></div>
      ) : (
        <>
          {clientesNormales.length > 0 && (
            <div className="bg-white border border-gray-200 overflow-hidden">
              <table className="w-full">
                <TablaHead esAdmin={esAdmin} />
                <tbody className="divide-y divide-gray-50">
                  <TablaRows rows={clientesNormales} hrefBase={hrefBase} esAdmin={esAdmin} />
                </tbody>
              </table>
            </div>
          )}

          {soloAvalistas.length > 0 && (
            <div className="mt-8">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-amber-400 rounded-full" />
                Solo avalistas ({soloAvalistas.length})
              </p>
              <div className="bg-white border border-amber-200 overflow-hidden">
                <table className="w-full">
                  <TablaHead esAdmin={esAdmin} />
                  <tbody className="divide-y divide-gray-50">
                    <TablaRows rows={soloAvalistas} hrefBase={hrefBase} esAdmin={esAdmin} />
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
