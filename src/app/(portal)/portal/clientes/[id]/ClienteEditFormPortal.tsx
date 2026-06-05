"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CnaeAutocomplete from "@/components/CnaeAutocomplete";

type Client = {
  id: string;
  nombre: string;
  cif: string | null;
  email: string | null;
  telefono: string | null;
  web: string | null;
  linkedin: string | null;
  nombre_comercial: string | null;
  direccion: string | null;
  cnae: string | null;
  grupo_empresarial: string | null;
};

export default function ClienteEditFormPortal({ client }: { client: Client }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    nombre: client.nombre ?? "",
    nombre_comercial: client.nombre_comercial ?? "",
    cif: client.cif ?? "",
    email: client.email ?? "",
    telefono: client.telefono ?? "",
    web: client.web ?? "",
    linkedin: client.linkedin ?? "",
    direccion: client.direccion ?? "",
    cnae: client.cnae ?? "",
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
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
        setOpen(false);
        router.refresh();
      }
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

        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Nombre legal *</label>
          <input value={form.nombre} onChange={e => set("nombre", e.target.value)} required
            className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Nombre comercial</label>
          <input value={form.nombre_comercial} onChange={e => set("nombre_comercial", e.target.value)}
            className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">CIF / NIF</label>
          <input value={form.cif} onChange={e => set("cif", e.target.value)}
            className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Teléfono</label>
          <input value={form.telefono} onChange={e => set("telefono", e.target.value)}
            className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Email</label>
          <input type="email" value={form.email} onChange={e => set("email", e.target.value)}
            className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Web</label>
          <input value={form.web} onChange={e => set("web", e.target.value)}
            className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Dirección</label>
          <input value={form.direccion} onChange={e => set("direccion", e.target.value)}
            className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">CNAE</label>
          <CnaeAutocomplete value={form.cnae} onChange={(v) => set("cnae", v)} />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">LinkedIn</label>
          <input value={form.linkedin} onChange={e => set("linkedin", e.target.value)}
            className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" />
        </div>

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2 text-xs font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50">Cancelar</button>
          <button type="submit" disabled={saving} className="flex-1 py-2 text-xs font-bold text-white bg-[#2E1A47] hover:bg-[#3d2460] disabled:opacity-50">
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
        {saved && <p className="text-xs text-emerald-600 font-semibold text-center pt-1">Datos guardados ✓</p>}
      </form>
    </div>
  );
}
