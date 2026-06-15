"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  contactoId: string;
  initial: {
    nombre: string;
    email: string | null;
    telefono: string | null;
    rol: string | null;
    linkedin: string | null;
  };
}

export default function ContactoEditForm({ contactoId, initial }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nombre: initial.nombre,
    email: initial.email ?? "",
    telefono: initial.telefono ?? "",
    rol: initial.rol ?? "",
    linkedin: initial.linkedin ?? "",
  });

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/contacts/${contactoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          email: form.email || null,
          telefono: form.telefono || null,
          rol: form.rol || null,
          linkedin: form.linkedin || null,
        }),
      });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]";
  const labelCls = "block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1";

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="text-xs text-[#2E1A47] font-semibold border border-[#2E1A47]/30 px-3 py-1.5 hover:bg-[#EEEBF3] transition-colors">
        Editar contacto
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border-t border-gray-100 pt-4">
      <div>
        <label className={labelCls}>Nombre *</label>
        <input value={form.nombre} onChange={e => set("nombre", e.target.value)} className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Puesto / Rol</label>
        <input value={form.rol} onChange={e => set("rol", e.target.value)} className={inputCls} placeholder="Administrador, CEO..." />
      </div>
      <div>
        <label className={labelCls}>Email</label>
        <input type="email" value={form.email} onChange={e => set("email", e.target.value)} className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Teléfono</label>
        <input value={form.telefono} onChange={e => set("telefono", e.target.value)} className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>LinkedIn</label>
        <input value={form.linkedin} onChange={e => set("linkedin", e.target.value)} className={inputCls} placeholder="https://linkedin.com/in/..." />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(false)}
          className="px-3 py-1.5 text-xs font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50">Cancelar</button>
        <button type="submit" disabled={saving}
          className="px-4 py-1.5 text-xs font-bold text-white bg-[#2E1A47] hover:bg-[#3d2460] disabled:opacity-50 uppercase tracking-wider">
          {saving ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </form>
  );
}
