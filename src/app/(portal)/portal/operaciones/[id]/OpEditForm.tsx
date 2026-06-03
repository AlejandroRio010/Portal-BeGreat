"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  opId: string;
  pipelineKey: string;
  initialProducto: string | null;
  initialImporte: string | null;
  initialDescripcion: string | null;
  initialPlazoMeses: number | null;
  initialLugarEntrega: string | null;
  initialEquipoTipo: string | null;
}

export default function OpEditForm({
  opId, pipelineKey,
  initialProducto, initialImporte, initialDescripcion,
  initialPlazoMeses, initialLugarEntrega, initialEquipoTipo,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    producto: initialProducto ?? "",
    importe: initialImporte ?? "",
    descripcion: initialDescripcion ?? "",
    plazo_meses: initialPlazoMeses ? String(initialPlazoMeses) : "",
    lugar_entrega: initialLugarEntrega ?? "",
    equipo_tipo: initialEquipoTipo ?? "",
  });

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null); setSaved(false);
    try {
      const res = await fetch(`/api/operations/${opId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          producto: form.producto || null,
          importe: form.importe || null,
          descripcion: form.descripcion || null,
          plazo_meses: form.plazo_meses || null,
          lugar_entrega: form.lugar_entrega || null,
          equipo_tipo: form.equipo_tipo || null,
        }),
      });
      if (!res.ok) { const j = await res.json().catch(() => ({})); setError(j.error ?? "Error"); return; }
      setSaved(true);
      setTimeout(() => { setSaved(false); setOpen(false); }, 1500);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="text-xs text-[#2E1A47] font-semibold border border-[#2E1A47]/30 px-3 py-1.5 hover:bg-[#EEEBF3] transition-colors">
        Editar datos
      </button>
    );
  }

  return (
    <div className="bg-white border border-gray-200">
      <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Editar datos de la operación</h3>
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700 text-lg leading-none">×</button>
      </div>
      <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Importe (€)</label>
            <input type="number" step="0.01" value={form.importe} onChange={e => set("importe", e.target.value)}
              className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" placeholder="0.00" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
              {pipelineKey === "renting" ? "Tipo de equipo" : "Producto financiero"}
            </label>
            <input value={pipelineKey === "renting" ? form.equipo_tipo : form.producto}
              onChange={e => set(pipelineKey === "renting" ? "equipo_tipo" : "producto", e.target.value)}
              className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]"
              placeholder={pipelineKey === "renting" ? "Vehículos, maquinaria..." : "Leasing, póliza crédito..."} />
          </div>
          {pipelineKey === "renting" && (
            <>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Plazo (meses)</label>
                <input type="number" value={form.plazo_meses} onChange={e => set("plazo_meses", e.target.value)}
                  className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" placeholder="24" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Lugar de entrega</label>
                <input value={form.lugar_entrega} onChange={e => set("lugar_entrega", e.target.value)}
                  className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" />
              </div>
            </>
          )}
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Descripción</label>
          <textarea value={form.descripcion} onChange={e => set("descripcion", e.target.value)} rows={3}
            className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47] resize-none" />
        </div>
        {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setOpen(false)}
            className="px-4 py-2 text-xs font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50">Cancelar</button>
          <button type="submit" disabled={saving}
            className="px-5 py-2 text-xs font-bold text-white bg-[#2E1A47] hover:bg-[#3d2460] disabled:opacity-50 uppercase tracking-wider">
            {saving ? "Guardando..." : saved ? "¡Guardado ✓" : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}
