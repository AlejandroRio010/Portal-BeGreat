"use client";

import { useState } from "react";
import Link from "next/link";

interface Proveedor {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  web: string | null;
  persona_contacto: string | null;
  codigo: string | null;
}

export default function ProveedoresBuscador({ proveedores }: { proveedores: Proveedor[] }) {
  const [q, setQ] = useState("");

  const filtered = q.trim().length < 1
    ? proveedores
    : proveedores.filter(p =>
        p.nombre.toLowerCase().includes(q.toLowerCase()) ||
        (p.email ?? "").toLowerCase().includes(q.toLowerCase()) ||
        (p.persona_contacto ?? "").toLowerCase().includes(q.toLowerCase()) ||
        (p.codigo ?? "").toLowerCase().includes(q.toLowerCase())
      );

  return (
    <>
      <div className="mb-4">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Buscar por nombre, email o persona de contacto..."
          className="w-full px-4 py-2.5 border border-gray-200 text-sm focus:outline-none focus:border-[#2E1A47] bg-white"
        />
      </div>
      <div className="bg-white border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-gray-400 text-sm">No se encontraron proveedores con ese criterio.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-[#EEEBF3] border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Nombre</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Email</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Teléfono</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Contacto</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-[#EEEBF3]/30 transition-colors group">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-2">
                      <Link href={`/portal/proveedores/${p.id}`} className="font-semibold text-gray-900 hover:text-[#2E1A47] hover:underline">
                        {p.nombre}
                      </Link>
                      {p.codigo && <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5">{p.codigo}</span>}
                    </div>
                    {p.web && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[220px]">{p.web}</p>}
                  </td>
                  <td className="px-6 py-3.5 text-sm text-gray-500">{p.email ?? "—"}</td>
                  <td className="px-6 py-3.5 text-sm text-gray-500">{p.telefono ?? "—"}</td>
                  <td className="px-6 py-3.5 text-sm text-gray-500">{p.persona_contacto ?? "—"}</td>
                  <td className="px-6 py-3.5 text-right">
                    <Link href={`/portal/proveedores/${p.id}`} className="text-[#2E1A47] text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity hover:underline">
                      Ver →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
