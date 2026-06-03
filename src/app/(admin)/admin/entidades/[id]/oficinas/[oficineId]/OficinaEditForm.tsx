"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Oficina = {
  id: string;
  nombre: string;
  ciudad: string | null;
  direccion: string | null;
  email: string | null;
  telefono: string | null;
  persona_contacto: string | null;
  contacto_email: string | null;
  contacto_telefono: string | null;
  notas: string | null;
};

export default function OficinaEditForm({ oficina }: { oficina: Oficina }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState({
    nombre: oficina.nombre ?? "",
    ciudad: oficina.ciudad ?? "",
    direccion: oficina.direccion ?? "",
    email: oficina.email ?? "",
    telefono: oficina.telefono ?? "",
    persona_contacto: oficina.persona_contacto ?? "",
    contacto_email: oficina.contacto_email ?? "",
    contacto_telefono: oficina.contacto_telefono ?? "",
    notas: oficina.notas ?? "",
  });

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim()) return;
    setSaving(true);
    try {
      await fetch(`/api/admin/entidades/oficinas/${oficina.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/entidades/oficinas/${oficina.id}`, { method: "DELETE" });
      if (res.ok) router.back();
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200">
      <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200">
        <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Editar oficina</h3>
      </div>
      <form onSubmit={handleSubmit} className="px-5 py-4 grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Nombre <span className="text-red-500">*</span></label>
          <input value={form.nombre} onChange={(e) => set("nombre", e.target.value)} required
            className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Ciudad</label>
          <input value={form.ciudad} onChange={(e) => set("ciudad", e.target.value)}
            className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Dirección</label>
          <input value={form.direccion} onChange={(e) => set("direccion", e.target.value)}
            className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Email</label>
          <input value={form.email} onChange={(e) => set("email", e.target.value)} type="email"
            className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Teléfono</label>
          <input value={form.telefono} onChange={(e) => set("telefono", e.target.value)}
            className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" />
        </div>

        <div className="col-span-2 border-t border-gray-100 pt-3">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Contacto principal</p>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Persona de contacto</label>
          <input value={form.persona_contacto} onChange={(e) => set("persona_contacto", e.target.value)}
            className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Email de contacto</label>
          <input value={form.contacto_email} onChange={(e) => set("contacto_email", e.target.value)} type="email"
            className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Teléfono de contacto</label>
          <input value={form.contacto_telefono} onChange={(e) => set("contacto_telefono", e.target.value)}
            className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]" />
        </div>
        <div className="col-span-2">
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Notas internas</label>
          <textarea value={form.notas} onChange={(e) => set("notas", e.target.value)} rows={4}
            className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47] resize-none"
            placeholder="Notas visibles solo para administradores..." />
        </div>

        <div className="col-span-2 flex items-center justify-between pt-1 border-t border-gray-100">
          <div>
            {!confirmDelete ? (
              <button type="button" onClick={() => setConfirmDelete(true)}
                className="text-xs text-red-400 hover:text-red-600 font-semibold">
                Eliminar oficina
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-600 font-semibold">¿Confirmar eliminación?</span>
                <button type="button" onClick={handleDelete} disabled={deleting}
                  className="px-3 py-1 text-xs font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50">
                  {deleting ? "..." : "Sí, eliminar"}
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1 text-xs font-semibold text-gray-500 border border-gray-200 hover:bg-gray-50">
                  Cancelar
                </button>
              </div>
            )}
          </div>
          <button type="submit" disabled={saving}
            className="px-5 py-2 text-xs font-bold text-white bg-[#2E1A47] hover:bg-[#3d2460] disabled:opacity-50 uppercase tracking-wider">
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}
