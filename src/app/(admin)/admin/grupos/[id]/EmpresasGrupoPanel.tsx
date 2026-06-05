"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Empresa { id: string; nombre: string; codigo: string | null; cif: string | null }

export default function EmpresasGrupoPanel({
  grupoId, empresas, disponibles,
}: {
  grupoId: string;
  empresas: Empresa[];
  disponibles: Empresa[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState("");
  const [saving, setSaving] = useState(false);

  async function asignar() {
    if (!selected) return;
    setSaving(true);
    await fetch(`/api/admin/grupos/${grupoId}/empresas`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: selected }),
    });
    setSaving(false); setSelected(""); setAdding(false);
    router.refresh();
  }

  async function quitar(clientId: string) {
    await fetch(`/api/admin/grupos/${grupoId}/empresas`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId }),
    });
    router.refresh();
  }

  return (
    <div className="bg-white border border-gray-200">
      <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Empresas del grupo ({empresas.length})</h3>
        {!adding && <button onClick={() => setAdding(true)} className="text-xs text-[#2E1A47] font-semibold hover:underline">+ Añadir empresa</button>}
      </div>

      {adding && (
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
          <select value={selected} onChange={e => setSelected(e.target.value)}
            className="flex-1 border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47] bg-white">
            <option value="">Selecciona una empresa...</option>
            {disponibles.map(c => <option key={c.id} value={c.id}>{c.nombre}{c.codigo ? ` (${c.codigo})` : ""}</option>)}
          </select>
          <button onClick={asignar} disabled={saving || !selected} className="px-4 py-2 text-xs font-bold text-white bg-[#2E1A47] hover:bg-[#3d2460] disabled:opacity-50">
            {saving ? "..." : "Añadir"}
          </button>
          <button onClick={() => { setAdding(false); setSelected(""); }} className="text-gray-400 hover:text-gray-700 text-lg leading-none px-2">×</button>
        </div>
      )}

      <div className="divide-y divide-gray-50">
        {empresas.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 text-center">Ninguna empresa asignada todavía.</p>
        ) : empresas.map(c => (
          <div key={c.id} className="px-5 py-3 flex items-center justify-between group">
            <Link href={`/admin/clientes/${c.id}`} className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 hover:text-[#2E1A47]">{c.nombre}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {c.codigo && <span className="text-[10px] font-mono text-gray-400">{c.codigo}</span>}
                {c.cif && <span className="text-[10px] text-gray-400">{c.cif}</span>}
              </div>
            </Link>
            <button onClick={() => quitar(c.id)} className="text-[10px] text-red-400 hover:text-red-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
              Quitar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
