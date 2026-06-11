"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddOfficeButton({ entityId }: { entityId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nombre: "", ciudad: "", direccion: "", email: "", telefono: "", persona_contacto: "" });

  async function handleSave() {
    if (!form.nombre.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/portal/oficinas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity_id: entityId, ...form }),
      });
      if (res.ok) {
        setOpen(false);
        setForm({ nombre: "", ciudad: "", direccion: "", email: "", telefono: "", persona_contacto: "" });
        router.refresh();
      }
    } finally { setSaving(false); }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="px-3 py-1.5 bg-[#2E1A47] text-white text-xs font-semibold hover:bg-[#3d2460] transition-colors">
        + Añadir oficina
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setOpen(false)}>
      <div className="bg-white border border-gray-200 p-6 w-full max-w-md space-y-3" onClick={e => e.stopPropagation()}>
        <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest mb-3">Nueva oficina</p>
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">Nombre *</label>
          <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
            className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">Ciudad</label>
            <input value={form.ciudad} onChange={e => setForm(f => ({ ...f, ciudad: e.target.value }))}
              className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">Teléfono</label>
            <input value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
              className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">Dirección</label>
          <input value={form.direccion} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))}
            className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">Email</label>
            <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">Persona de contacto</label>
            <input value={form.persona_contacto} onChange={e => setForm(f => ({ ...f, persona_contacto: e.target.value }))}
              className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" />
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={handleSave} disabled={saving || !form.nombre.trim()}
            className="flex-1 py-2 bg-[#2E1A47] text-white text-sm font-semibold hover:bg-[#3d2460] disabled:opacity-50">
            {saving ? "Creando..." : "Crear oficina"}
          </button>
          <button onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 hover:bg-gray-50">Cancelar</button>
        </div>
      </div>
    </div>
  );
}
