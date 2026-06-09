"use client";

import { useState } from "react";
import Link from "next/link";

export interface ProveedorRow {
  id: string;
  nombre: string;
  codigo: string | null;
  email: string | null;
  telefono: string | null;
  web: string | null;
  persona_contacto: string | null;
  colaborador_id?: string | null;
  colaborador_nombre?: string | null;
}

export default function ProveedoresTabla({ proveedores, esAdmin, hrefBase, colaboradores }: {
  proveedores: ProveedorRow[];
  esAdmin: boolean;
  hrefBase: string;
  colaboradores?: { id: string; nombre: string }[];
}) {
  const [q, setQ] = useState("");
  const [colab, setColab] = useState("");
  const ql = q.toLowerCase().trim();

  const filtered = proveedores.filter(p => {
    if (colab && p.colaborador_id !== colab) return false;
    if (!ql) return true;
    return p.nombre.toLowerCase().includes(ql) ||
      (p.email ?? "").toLowerCase().includes(ql) ||
      (p.persona_contacto ?? "").toLowerCase().includes(ql) ||
      (p.codigo ?? "").toLowerCase().includes(ql);
  });

  return (
    <div>
      <div className="mb-4 flex gap-3">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Buscar por nombre, email o persona de contacto..."
          className="flex-1 px-4 py-2.5 border border-gray-200 text-sm focus:outline-none focus:border-[#2E1A47] bg-white"
        />
        {esAdmin && colaboradores && (
          <select value={colab} onChange={e => setColab(e.target.value)}
            className="px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#2E1A47] bg-white">
            <option value="">Todos los colaboradores</option>
            {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        )}
      </div>
      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 p-10 text-center"><p className="text-gray-400 text-sm">No se encontraron proveedores.</p></div>
      ) : (
        <div className="bg-white border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-[#EEEBF3] border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Nombre</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Email</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Teléfono</th>
                {esAdmin && <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Colaborador</th>}
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Web</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-[#EEEBF3]/30 transition-colors group">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-2">
                      <Link href={`${hrefBase}/${p.id}`} className="text-sm font-semibold text-gray-900 hover:text-[#2E1A47] hover:underline">{p.nombre}</Link>
                      {p.codigo && <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5">{p.codigo}</span>}
                    </div>
                    {p.persona_contacto && <p className="text-xs text-gray-400 mt-0.5">{p.persona_contacto}</p>}
                  </td>
                  <td className="px-6 py-3.5 text-sm text-gray-500">{p.email ?? "—"}</td>
                  <td className="px-6 py-3.5 text-sm text-gray-500">{p.telefono ?? "—"}</td>
                  {esAdmin && <td className="px-6 py-3.5 text-sm text-gray-600">{p.colaborador_nombre ?? "—"}</td>}
                  <td className="px-6 py-3.5 text-sm text-gray-500">
                    {p.web ? <a href={p.web} target="_blank" rel="noopener noreferrer" className="text-[#2E1A47] hover:underline">{p.web}</a> : "—"}
                  </td>
                  <td className="px-6 py-3.5 text-right whitespace-nowrap">
                    <Link href={`${hrefBase}/${p.id}`} className="text-[#2E1A47] text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity hover:underline">Ver →</Link>
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
