"use client";

import { useState } from "react";
import Link from "next/link";

interface ContactoUnificado {
  id: string;
  nombre: string;
  empresa: string;
  empresaId: string;
  puesto: string | null;
  email: string | null;
  telefono: string | null;
  linkedin: string | null;
  oficina: string | null;
  tipo: "cliente" | "entidad" | "proveedor";
  href: string;
}

const TABS = [
  { key: "todos", label: "Todos" },
  { key: "cliente", label: "Clientes" },
  { key: "entidad", label: "Entidades financieras" },
  { key: "proveedor", label: "Proveedores" },
] as const;

export default function ContactosListClient({ contactos, role }: { contactos: ContactoUnificado[]; role: "admin" | "colaborador" }) {
  const [tab, setTab] = useState<string>("todos");
  const [search, setSearch] = useState("");

  const filtered = contactos.filter(c => {
    if (tab !== "todos" && c.tipo !== tab) return false;
    if (search.length >= 2) {
      const q = search.toLowerCase();
      return c.nombre.toLowerCase().includes(q) || c.empresa.toLowerCase().includes(q) || (c.email ?? "").toLowerCase().includes(q);
    }
    return true;
  });

  const tipoBadge: Record<string, string> = {
    cliente: "bg-blue-50 text-blue-700 border-blue-200",
    entidad: "bg-emerald-50 text-emerald-700 border-emerald-200",
    proveedor: "bg-amber-50 text-amber-700 border-amber-200",
  };
  const tipoLabel: Record<string, string> = {
    cliente: "Cliente",
    entidad: "Entidad",
    proveedor: "Proveedor",
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex bg-white border border-gray-200">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-xs font-semibold transition-colors ${
                tab === t.key
                  ? "bg-[#2E1A47] text-white"
                  : "text-gray-500 hover:bg-[#EEEBF3] hover:text-[#2E1A47]"
              }`}
            >
              {t.label}
              <span className="ml-1.5 text-[10px] opacity-60">
                {t.key === "todos" ? contactos.length : contactos.filter(c => c.tipo === t.key).length}
              </span>
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, empresa o email..."
          className="flex-1 border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]"
        />
      </div>

      <div className="bg-white border border-gray-200">
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_100px] gap-0 bg-[#EEEBF3] px-5 py-2.5 border-b border-gray-200">
          <span className="text-[10px] font-bold text-[#2E1A47] uppercase tracking-wider">Nombre</span>
          <span className="text-[10px] font-bold text-[#2E1A47] uppercase tracking-wider">Empresa</span>
          <span className="text-[10px] font-bold text-[#2E1A47] uppercase tracking-wider">Puesto</span>
          <span className="text-[10px] font-bold text-[#2E1A47] uppercase tracking-wider">Contacto</span>
          <span className="text-[10px] font-bold text-[#2E1A47] uppercase tracking-wider">Tipo</span>
        </div>
        {filtered.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 text-center">Sin resultados.</p>
        ) : (
          filtered.map(c => (
            <Link
              key={`${c.tipo}-${c.id}`}
              href={c.href}
              className="grid grid-cols-[1fr_1fr_1fr_1fr_100px] gap-0 px-5 py-3 border-b border-gray-50 last:border-0 hover:bg-[#f8f7fb] transition-colors items-center"
            >
              <span className="text-sm font-semibold text-gray-800 truncate">{c.nombre}</span>
              <div className="min-w-0">
                <span className="text-sm text-gray-600 truncate block">{c.empresa}</span>
                {c.oficina && <span className="text-[10px] text-gray-400 truncate block">{c.oficina}</span>}
              </div>
              <span className="text-xs text-gray-500 truncate">{c.puesto ?? "—"}</span>
              <div className="flex flex-col gap-0.5 min-w-0">
                {c.email && <span className="text-xs text-gray-500 truncate">{c.email}</span>}
                {c.telefono && <span className="text-xs text-gray-400 truncate">{c.telefono}</span>}
              </div>
              <span className={`text-[10px] font-semibold border px-2 py-0.5 w-fit ${tipoBadge[c.tipo]}`}>
                {tipoLabel[c.tipo]}
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
