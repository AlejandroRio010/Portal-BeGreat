"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NuevoProveedorForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    nombre: "", email: "", telefono: "", web: "",
    persona_contacto: "", contacto_email: "", contacto_telefono: "",
  });

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim()) return;
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      if (!res.ok) { const j = await res.json().catch(() => ({})); setError(j.error ?? "Error"); return; }
      setForm({ nombre: "", email: "", telefono: "", web: "", persona_contacto: "", contacto_email: "", contacto_telefono: "" });
      setOpen(false);
      router.refresh();
    } finally { setSaving(false); }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="inline-flex flex-shrink-0 items-center gap-2 bg-[#2E1A47] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#3d2460] transition-colors whitespace-nowrap">
        + Nuevo proveedor
      </button>
    );
  }

  return (
    <div className="bg-white border border-gray-200 mb-6">
      <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Nuevo proveedor</h3>
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700 text-lg leading-none">×</button>
      </div>
      <form onSubmit={handleSubmit} className="px-5 py-4 grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Nombre <span className="text-red-500">*</span></label>
          <input value={form.nombre} onChange={e => set("nombre", e.target.value)} required placeholder="Proveedor S.A."
            className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Email</label>
          <input type="email" value={form.email} onChange={e => set("email", e.target.value)}
            className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Teléfono</label>
          <input value={form.telefono} onChange={e => set("telefono", e.target.value)}
            className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" />
        </div>
        <div className="col-span-2">
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Web</label>
          <input value={form.web} onChange={e => set("web", e.target.value)} placeholder="https://"
            className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" />
        </div>
        <div className="col-span-2 border-t border-gray-100 pt-3"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Persona de contacto</p></div>
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Nombre</label>
          <input value={form.persona_contacto} onChange={e => set("persona_contacto", e.target.value)}
            className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Email contacto</label>
          <input type="email" value={form.contacto_email} onChange={e => set("contacto_email", e.target.value)}
            className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" />
        </div>
        <div className="col-span-2">
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Teléfono contacto</label>
          <input value={form.contacto_telefono} onChange={e => set("contacto_telefono", e.target.value)}
            className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" />
        </div>
        {error && <p className="col-span-2 text-xs text-red-600 font-semibold">{error}</p>}
        <div className="col-span-2 flex justify-end gap-2">
          <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-xs font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50">Cancelar</button>
          <button type="submit" disabled={saving} className="px-5 py-2 text-xs font-bold text-white bg-[#2E1A47] hover:bg-[#3d2460] disabled:opacity-50 uppercase tracking-wider">
            {saving ? "Creando..." : "Crear proveedor"}
          </button>
        </div>
      </form>
    </div>
  );
}
