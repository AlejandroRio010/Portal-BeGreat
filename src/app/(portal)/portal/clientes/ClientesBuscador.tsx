"use client";

import { useState } from "react";
import Link from "next/link";

interface Cliente {
  id: string;
  nombre: string;
  cif: string | null;
  email: string | null;
  web: string | null;
  codigo: string | null;
  ops_activas: number;
  ops_totales: number;
}

export default function ClientesBuscador({ clientes }: { clientes: Cliente[] }) {
  const [q, setQ] = useState("");

  const filtered = q.trim().length < 1
    ? clientes
    : clientes.filter(c =>
        c.nombre.toLowerCase().includes(q.toLowerCase()) ||
        (c.cif ?? "").toLowerCase().includes(q.toLowerCase()) ||
        (c.email ?? "").toLowerCase().includes(q.toLowerCase()) ||
        (c.codigo ?? "").toLowerCase().includes(q.toLowerCase())
      );

  return (
    <>
      <div className="mb-4">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Buscar por nombre, CIF, email o código..."
          className="w-full px-4 py-2.5 border border-gray-200 text-sm focus:outline-none focus:border-[#2E1A47] bg-white"
        />
      </div>
      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 p-10 text-center">
          <p className="text-gray-400 text-sm">No se encontraron clientes con ese criterio.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-[#EEEBF3] border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Empresa</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">CIF</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Email</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Ops activas</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Total ops</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-[#EEEBF3]/30 transition-colors group">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-2">
                      <Link href={`/portal/clientes/${c.id}`} className="font-semibold text-gray-900 hover:text-[#2E1A47] hover:underline transition-colors">
                        {c.nombre}
                      </Link>
                      {c.codigo && <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5">{c.codigo}</span>}
                    </div>
                    {c.web && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[220px]">{c.web}</p>}
                  </td>
                  <td className="px-6 py-3.5 text-sm text-gray-500 font-mono">{c.cif ?? "—"}</td>
                  <td className="px-6 py-3.5 text-sm text-gray-500">{c.email ?? "—"}</td>
                  <td className="px-6 py-3.5">
                    <span className={`inline-block px-2 py-0.5 text-xs font-bold ${c.ops_activas > 0 ? "bg-blue-50 text-blue-700" : "text-gray-300"}`}>
                      {c.ops_activas}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-sm text-gray-400">{c.ops_totales}</td>
                  <td className="px-6 py-3.5 text-right">
                    <Link href={`/portal/clientes/${c.id}`} className="text-[#2E1A47] text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity hover:underline">
                      Ver →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
