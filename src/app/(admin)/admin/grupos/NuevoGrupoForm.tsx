"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDocId } from "@/lib/format";

export default function NuevoGrupoForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ nombre: "", descripcion: "", web: "", cif_matriz: "" });

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim()) return;
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/admin/grupos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const j = await res.json().catch(() => ({})); setError(j.error ?? "Error"); return; }
      setForm({ nombre: "", descripcion: "", web: "", cif_matriz: "" });
      setOpen(false);
      router.refresh();
    } finally { setSaving(false); }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 bg-[#2E1A47] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#3d2460] transition-colors">
        + Nuevo grupo
      </button>
    );
  }

  return (
    <div className="bg-white border border-gray-200 mb-6">
      <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Nuevo grupo empresarial</h3>
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700 text-lg leading-none">×</button>
      </div>
      <form onSubmit={handleSubmit} className="px-5 py-4 grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Nombre del grupo <span className="text-red-500">*</span></label>
          <input value={form.nombre} onChange={e => set("nombre", e.target.value)} required placeholder="Ej: Grupo Cibernos"
            className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Web</label>
          <input value={form.web} onChange={e => set("web", e.target.value)}
            className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">CIF matriz</label>
          <input value={form.cif_matriz} onChange={e => set("cif_matriz", e.target.value)}
            onBlur={e => set("cif_matriz", formatDocId(e.target.value))}
            className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" />
        </div>
        <div className="col-span-2">
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Descripción</label>
          <textarea value={form.descripcion} onChange={e => set("descripcion", e.target.value)} rows={2}
            className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47] resize-none" />
        </div>
        {error && <p className="col-span-2 text-xs text-red-600 font-semibold">{error}</p>}
        <div className="col-span-2 flex justify-end gap-2">
          <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-xs font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50">Cancelar</button>
          <button type="submit" disabled={saving} className="px-5 py-2 text-xs font-bold text-white bg-[#2E1A47] hover:bg-[#3d2460] disabled:opacity-50 uppercase tracking-wider">
            {saving ? "Creando..." : "Crear grupo"}
          </button>
        </div>
      </form>
    </div>
  );
}
