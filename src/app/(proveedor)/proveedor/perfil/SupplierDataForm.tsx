"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  supplier: {
    id: string;
    nombre: string;
    email: string | null;
    telefono: string | null;
    web: string | null;
    cif: string | null;
    razon_social: string | null;
  };
  user: { id: string; nombre: string; email: string } | undefined;
}

export default function SupplierDataForm({ supplier, user }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    nombre: supplier.nombre ?? "",
    email: supplier.email ?? "",
    telefono: supplier.telefono ?? "",
    web: supplier.web ?? "",
    cif: supplier.cif ?? "",
    razon_social: supplier.razon_social ?? "",
  });

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null); setSaved(false);
    try {
      const res = await fetch("/api/proveedor/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const j = await res.json().catch(() => ({})); setError(j.error ?? "Error"); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]";
  const labelCls = "block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1";

  return (
    <div className="bg-white border border-gray-200">
      <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200">
        <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Datos de la empresa</h3>
      </div>
      <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
        {user && (
          <div className="bg-gray-50 border border-gray-100 px-4 py-3 mb-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tu cuenta</p>
            <p className="text-sm font-medium text-gray-800">{user.nombre}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Nombre comercial</label>
            <input value={form.nombre} onChange={e => set("nombre", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Razón social</label>
            <input value={form.razon_social} onChange={e => set("razon_social", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>CIF</label>
            <input value={form.cif} onChange={e => set("cif", e.target.value)} className={inputCls} />
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
            <label className={labelCls}>Web</label>
            <input value={form.web} onChange={e => set("web", e.target.value)} className={inputCls} placeholder="https://..." />
          </div>
        </div>
        {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}
        <div className="flex justify-end">
          <button type="submit" disabled={saving}
            className="px-5 py-2 text-xs font-bold text-white bg-[#2E1A47] hover:bg-[#3d2460] disabled:opacity-50 uppercase tracking-wider">
            {saving ? "Guardando..." : saved ? "Guardado" : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}
