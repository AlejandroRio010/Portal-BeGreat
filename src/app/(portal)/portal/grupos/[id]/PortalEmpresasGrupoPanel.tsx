"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Empresa { id: string; nombre: string; codigo: string | null; cif: string | null }

export default function PortalEmpresasGrupoPanel({
  grupoId, empresas, disponibles,
}: {
  grupoId: string;
  empresas: Empresa[];
  disponibles: Empresa[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [selected, setSelected] = useState<Empresa | null>(null);
  const [saving, setSaving] = useState(false);

  const filtradas = busqueda.length < 1
    ? disponibles
    : disponibles.filter(c =>
        c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (c.codigo ?? "").toLowerCase().includes(busqueda.toLowerCase()) ||
        (c.cif ?? "").toLowerCase().includes(busqueda.toLowerCase())
      );

  async function asignar() {
    if (!selected) return;
    setSaving(true);
    await fetch(`/api/portal/grupos/${grupoId}/empresas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: selected.id }),
    });
    setSaving(false); setSelected(null); setBusqueda(""); setAdding(false);
    router.refresh();
  }

  async function quitar(clientId: string) {
    if (!confirm("¿Quitar esta empresa del grupo?")) return;
    await fetch(`/api/portal/grupos/${grupoId}/empresas`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId }),
    });
    router.refresh();
  }

  return (
    <div className="bg-white border border-gray-200">
      <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">
          Mis empresas en este grupo ({empresas.length})
        </h3>
        {!adding && disponibles.length > 0 && (
          <button onClick={() => setAdding(true)} className="text-xs text-[#2E1A47] font-semibold hover:underline">
            + Añadir empresa
          </button>
        )}
      </div>

      {adding && (
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 space-y-3">
          <div className="flex items-center gap-2">
            <input
              value={busqueda}
              onChange={e => { setBusqueda(e.target.value); setSelected(null); }}
              placeholder="Buscar por nombre, código o CIF..."
              className="flex-1 border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47] bg-white"
              autoFocus
            />
            <button onClick={() => { setAdding(false); setBusqueda(""); setSelected(null); }}
              className="text-gray-400 hover:text-gray-700 text-xl leading-none px-2">×</button>
          </div>

          {selected ? (
            <div className="flex items-center justify-between bg-[#EEEBF3] border border-[#2E1A47]/20 px-3 py-2">
              <div>
                <p className="text-sm font-semibold text-[#2E1A47]">{selected.nombre}</p>
                <p className="text-xs text-gray-400">{[selected.codigo, selected.cif].filter(Boolean).join(" · ")}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setSelected(null)} className="text-xs text-gray-400 hover:text-gray-600">Cambiar</button>
                <button onClick={asignar} disabled={saving}
                  className="text-xs font-bold text-white bg-[#2E1A47] px-4 py-1.5 hover:bg-[#3d2460] disabled:opacity-50">
                  {saving ? "..." : "Añadir al grupo"}
                </button>
              </div>
            </div>
          ) : (
            <div className="border border-gray-200 bg-white max-h-48 overflow-y-auto">
              {filtradas.length === 0 ? (
                <p className="px-4 py-3 text-xs text-gray-400 text-center">
                  {busqueda ? "No se encontraron empresas con ese criterio." : "Todos tus clientes ya tienen grupo asignado."}
                </p>
              ) : filtradas.map(c => (
                <button key={c.id} type="button" onClick={() => setSelected(c)}
                  className="w-full text-left px-4 py-2.5 hover:bg-[#EEEBF3] border-b border-gray-50 last:border-0 transition-colors">
                  <p className="text-sm font-semibold text-gray-800">{c.nombre}</p>
                  <p className="text-xs text-gray-400">{[c.codigo, c.cif].filter(Boolean).join(" · ")}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="divide-y divide-gray-50">
        {empresas.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 text-center">Ninguna de tus empresas está en este grupo todavía.</p>
        ) : empresas.map(c => (
          <div key={c.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-[#EEEBF3]/30 transition-colors group">
            <Link href={`/portal/clientes/${c.id}`} className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 group-hover:text-[#2E1A47]">{c.nombre}</p>
              <div className="flex items-center gap-3 mt-0.5">
                {c.codigo && <span className="text-[10px] font-mono text-gray-400">{c.codigo}</span>}
                {c.cif && <span className="text-[10px] text-gray-400">{c.cif}</span>}
              </div>
            </Link>
            <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <Link href={`/portal/clientes/${c.id}`} className="text-xs text-[#2E1A47] font-semibold hover:underline">Ver →</Link>
              <button onClick={() => quitar(c.id)} className="text-[10px] text-red-400 hover:text-red-600 font-semibold">
                Quitar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
