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
  group_id: string | null;
};

type Grupo = { id: string; nombre: string };

export default function ClienteEditForm({ client, grupos = [] }: { client: Client; grupos?: Grupo[] }) {
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
    group_id: client.group_id ?? "",
  });

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/clientes/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Error");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      setOpen(false);
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
        <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Editar datos del cliente</h3>
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700 text-lg leading-none">×</button>
      </div>
      <form onSubmit={handleSubmit} className="px-5 py-4 grid grid-cols-2 gap-3">

        <div className="col-span-2">
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Nombre legal <span className="text-red-500">*</span></label>
          <input value={form.nombre} onChange={(e) => set("nombre", e.target.value)} required
            className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" />
        </div>

        <div className="col-span-2">
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Nombre comercial</label>
          <input value={form.nombre_comercial} onChange={(e) => set("nombre_comercial", e.target.value)}
            className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">CIF / NIF</label>
          <input value={form.cif} onChange={(e) => set("cif", e.target.value)}
            className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Teléfono</label>
          <input value={form.telefono} onChange={(e) => set("telefono", e.target.value)}
            className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Email</label>
          <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)}
            className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Web</label>
          <input value={form.web} onChange={(e) => set("web", e.target.value)}
            className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" />
        </div>

        <div className="col-span-2">
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Dirección</label>
          <input value={form.direccion} onChange={(e) => set("direccion", e.target.value)}
            className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" />
        </div>

        <div className="col-span-2">
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">CNAE</label>
          <CnaeAutocomplete value={form.cnae} onChange={(v) => set("cnae", v)} />
        </div>

        <div className="col-span-2">
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Grupo empresarial</label>
          <select value={form.group_id} onChange={(e) => set("group_id", e.target.value)}
            className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47] bg-white">
            <option value="">— Sin grupo —</option>
            {grupos.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
          </select>
          <p className="text-[10px] text-gray-400 mt-1">Los grupos se gestionan en la sección &ldquo;Grupos empresariales&rdquo;.</p>
        </div>

        <div className="col-span-2">
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">LinkedIn</label>
          <input value={form.linkedin} onChange={(e) => set("linkedin", e.target.value)}
            className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" />
        </div>

        <div className="col-span-2 flex justify-end gap-2 pt-1">
          <button type="button" onClick={() => setOpen(false)}
            className="px-4 py-2 text-xs font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50">Cancelar</button>
          <button type="submit" disabled={saving}
            className="px-5 py-2 text-xs font-bold text-white bg-[#2E1A47] hover:bg-[#3d2460] disabled:opacity-50 uppercase tracking-wider">
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
        {saved && <p className="col-span-2 text-xs text-emerald-600 font-semibold text-center">Datos guardados ✓</p>}
      </form>
    </div>
  );
}
