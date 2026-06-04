"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ContactoAutocomplete from "@/components/ContactoAutocomplete";

export default function NuevoContactoForm({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nombre: "", rol: "", email: "", telefono: "" });
  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setForm({ nombre: "", rol: "", email: "", telefono: "" });
        setOpen(false);
        router.refresh();
      }
    } finally { setSaving(false); }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="w-full mt-3 text-xs text-[#2E1A47] font-semibold border border-dashed border-[#2E1A47]/30 px-3 py-2 hover:bg-[#EEEBF3] transition-colors">
        + Añadir contacto
      </button>
    );
  }

  return (
    <div className="mt-3 border border-gray-200">
      <div className="bg-[#EEEBF3] px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
        <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Nuevo contacto</p>
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700 text-lg leading-none">×</button>
      </div>
      <form onSubmit={handleSubmit} className="px-4 py-3 space-y-2.5">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Nombre *</label>
          <ContactoAutocomplete
            value={form.nombre}
            onChange={v => set("nombre", v)}
            onSelect={p => setForm(f => ({
              ...f,
              nombre: p.nombre,
              rol: p.rol ?? f.rol,
              email: p.email ?? f.email,
              telefono: p.telefono ?? f.telefono,
            }))}
            searchUrl="/api/search/personas"
            required
          />
        </div>
        {[["Cargo / Rol", "rol"], ["Email", "email"], ["Teléfono", "telefono"]].map(([lbl, key]) => (
          <div key={key}>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{lbl}</label>
            <input value={(form as any)[key]} onChange={e => set(key, e.target.value)}
              className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" />
          </div>
        ))}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2 text-xs font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50">Cancelar</button>
          <button type="submit" disabled={saving} className="flex-1 py-2 text-xs font-bold text-white bg-[#2E1A47] hover:bg-[#3d2460] disabled:opacity-50">
            {saving ? "..." : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}
