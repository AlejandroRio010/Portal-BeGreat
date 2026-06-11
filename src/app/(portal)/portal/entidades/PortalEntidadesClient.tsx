"use client";

import { useState } from "react";
import Link from "next/link";

interface Entidad {
  id: string;
  nombre: string;
  tipo: string;
  logo_url: string | null;
  web: string | null;
  officesCount: number;
  opsCount: number;
}

const TIPO_TABS = [
  { key: "banco",                 label: "Bancos" },
  { key: "alternativa_financiera", label: "Alternativas" },
  { key: "renting",               label: "Renting" },
] as const;

const TIPO_ACCENT: Record<string, string> = {
  banco:                  "border-t-blue-400",
  alternativa_financiera: "border-t-amber-400",
  renting:                "border-t-violet-500",
};

export default function PortalEntidadesClient({ entidades, nivel = 2 }: { entidades: Entidad[]; nivel?: number }) {
  const [tab, setTab] = useState<string>("banco");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ nombre: "", tipo: "banco", email: "", telefono: "", web: "", linkedin: "" });
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!formData.nombre.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/portal/entidades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        window.location.reload();
      }
    } finally { setCreating(false); }
  }

  const filtered = entidades.filter(e => e.tipo === tab);

  return (
    <div>
      {nivel === 1 && (
        <div className="mb-4">
          {!showForm ? (
            <button onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-[#2E1A47] text-white text-sm font-semibold hover:bg-[#3d2460] transition-colors">
              + Nueva entidad
            </button>
          ) : (
            <div className="bg-white border border-gray-200 p-5 space-y-3">
              <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest">Nueva entidad financiera</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">Nombre *</label>
                  <input value={formData.nombre} onChange={e => setFormData(d => ({ ...d, nombre: e.target.value }))}
                    className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">Tipo *</label>
                  <select value={formData.tipo} onChange={e => setFormData(d => ({ ...d, tipo: e.target.value }))}
                    className="w-full border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#2E1A47]">
                    <option value="banco">Banco</option>
                    <option value="alternativa_financiera">Alternativa financiera</option>
                    <option value="renting">Renting</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">Email</label>
                  <input value={formData.email} onChange={e => setFormData(d => ({ ...d, email: e.target.value }))}
                    className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">Teléfono</label>
                  <input value={formData.telefono} onChange={e => setFormData(d => ({ ...d, telefono: e.target.value }))}
                    className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">Web</label>
                  <input value={formData.web} onChange={e => setFormData(d => ({ ...d, web: e.target.value }))}
                    className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleCreate} disabled={creating || !formData.nombre.trim()}
                  className="px-4 py-2 bg-[#2E1A47] text-white text-sm font-semibold hover:bg-[#3d2460] disabled:opacity-50">
                  {creating ? "Creando..." : "Crear entidad"}
                </button>
                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 hover:bg-gray-50">Cancelar</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0 mb-6 border-b border-gray-200">
        {TIPO_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-6 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? "border-[#2E1A47] text-[#2E1A47]"
                : "border-transparent text-gray-400 hover:text-[#2E1A47]"
            }`}
          >
            {t.label}
            <span className="ml-2 text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 font-semibold">
              {entidades.filter(e => e.tipo === t.key).length}
            </span>
          </button>
        ))}
      </div>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">Sin entidades de este tipo todavía.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(e => {
            const inicial = e.nombre.charAt(0).toUpperCase();
            const accent = TIPO_ACCENT[e.tipo] ?? "border-t-gray-300";
            return (
              <Link
                key={e.id}
                href={`/portal/entidades/${e.id}`}
                className={`bg-white border border-gray-200 border-t-[3px] ${accent} p-5 hover:shadow-md hover:border-gray-300 transition-all group flex flex-col gap-3`}
              >
                {/* Logo / inicial */}
                <div className="flex items-start justify-between">
                  {e.logo_url ? (
                    <img src={e.logo_url} alt={e.nombre} className="h-10 w-10 object-contain" />
                  ) : (
                    <div className="h-10 w-10 bg-[#EEEBF3] flex items-center justify-center text-[#2E1A47] text-lg font-bold">
                      {inicial}
                    </div>
                  )}
                  <span className="text-[#2E1A47] text-xs opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                </div>

                {/* Nombre */}
                <p className="text-sm font-bold text-gray-900 group-hover:text-[#2E1A47] leading-tight">{e.nombre}</p>

                {/* Stats */}
                <div className="flex gap-4 mt-auto">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Oficinas</p>
                    <p className="text-sm font-black text-[#2E1A47]">{e.officesCount}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Ops</p>
                    <p className="text-sm font-black text-[#2E1A47]">{e.opsCount}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
