"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Colab = {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  razon_social: string | null;
  cif: string | null;
  web: string | null;
  num_trabajadores: number | null;
  activo: boolean;
};

export default function ColaboradorEditForm({ colab }: { colab: Colab }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    nombre: colab.nombre ?? "",
    email: colab.email ?? "",
    telefono: colab.telefono ?? "",
    razon_social: colab.razon_social ?? "",
    cif: colab.cif ?? "",
    web: colab.web ?? "",
    num_trabajadores: colab.num_trabajadores ? String(colab.num_trabajadores) : "",
    activo: colab.activo,
  });

  function set(k: string, v: string | boolean) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim() || !form.email.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/colaboradores/${colab.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          num_trabajadores: form.num_trabajadores ? Number(form.num_trabajadores) : null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Error al guardar");
        return;
      }
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
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-[#2E1A47] font-semibold border border-[#2E1A47]/30 px-3 py-1.5 hover:bg-[#EEEBF3] transition-colors"
      >
        Editar datos
      </button>
    );
  }

  return (
    <div className="bg-white border border-gray-200">
      <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Editar datos del colaborador</h3>
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700 text-lg leading-none">×</button>
      </div>
      <form onSubmit={handleSubmit} className="px-5 py-4 grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Nombre <span className="text-red-500">*</span></label>
          <input value={form.nombre} onChange={(e) => set("nombre", e.target.value)} required
            className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Email <span className="text-red-500">*</span></label>
          <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required
            className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Teléfono</label>
          <input value={form.telefono} onChange={(e) => set("telefono", e.target.value)}
            className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Web</label>
          <input value={form.web} onChange={(e) => set("web", e.target.value)}
            className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" placeholder="https://" />
        </div>
        <div className="col-span-2 border-t border-gray-100 pt-3">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Datos de empresa</p>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Razón social</label>
          <input value={form.razon_social} onChange={(e) => set("razon_social", e.target.value)}
            className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">CIF</label>
          <input value={form.cif} onChange={(e) => set("cif", e.target.value)}
            className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Nº trabajadores</label>
          <input type="number" value={form.num_trabajadores} onChange={(e) => set("num_trabajadores", e.target.value)}
            className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" />
        </div>
        <div className="flex items-center gap-3 self-end pb-2">
          <input type="checkbox" id="activo_check" checked={form.activo} onChange={(e) => set("activo", e.target.checked)}
            className="w-4 h-4 accent-[#2E1A47]" />
          <label htmlFor="activo_check" className="text-sm text-gray-700 cursor-pointer">Cuenta activa</label>
        </div>
        {error && <p className="col-span-2 text-xs text-red-600 font-semibold">{error}</p>}
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
