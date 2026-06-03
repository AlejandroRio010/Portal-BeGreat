"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Client = { id: string; nombre: string; cif: string | null; email: string | null; telefono: string | null; web: string | null; linkedin: string | null };

export default function ClienteEditFormPortal({ client }: { client: Client }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nombre: client.nombre ?? "",
    cif: client.cif ?? "",
    email: client.email ?? "",
    telefono: client.telefono ?? "",
    web: client.web ?? "",
    linkedin: client.linkedin ?? "",
  });

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) { setOpen(false); router.refresh(); }
    } finally { setSaving(false); }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="text-xs text-[#2E1A47] font-semibold border border-[#2E1A47]/30 px-3 py-1.5 hover:bg-[#EEEBF3] transition-colors w-full mt-3">
        Editar datos
      </button>
    );
  }

  return (
    <div className="mt-3 border border-gray-200">
      <div className="bg-[#EEEBF3] px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
        <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Editar datos</p>
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700 text-lg leading-none">×</button>
      </div>
      <form onSubmit={handleSubmit} className="px-4 py-3 space-y-2.5">
        {[["Nombre *", "nombre", "text"], ["CIF", "cif", "text"], ["Email", "email", "email"], ["Teléfono", "telefono", "text"], ["Web", "web", "text"], ["LinkedIn", "linkedin", "text"]].map(([lbl, key, type]) => (
          <div key={key}>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{lbl}</label>
            <input type={type} value={(form as any)[key]} onChange={e => set(key, e.target.value)} required={key === "nombre"}
              className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" />
          </div>
        ))}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2 text-xs font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50">Cancelar</button>
          <button type="submit" disabled={saving} className="flex-1 py-2 text-xs font-bold text-white bg-[#2E1A47] hover:bg-[#3d2460] disabled:opacity-50">
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}
