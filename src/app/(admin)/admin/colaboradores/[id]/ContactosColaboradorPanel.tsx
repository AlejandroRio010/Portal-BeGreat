"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Contacto {
  id: string;
  nombre: string;
  rol: string | null;
  email: string | null;
  telefono: string | null;
}

function ContactoRow({ c }: { c: Contacto }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/admin/colaboradores/contactos/${c.id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
    else setDeleting(false);
    setConfirm(false);
  }

  return (
    <div className="px-5 py-3 flex items-start justify-between gap-4 group">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800">{c.nombre}</p>
        {c.rol && <p className="text-xs text-[#2E1A47] font-medium mt-0.5">{c.rol}</p>}
        {c.email && <a href={`mailto:${c.email}`} className="block text-xs text-gray-500 hover:text-[#2E1A47]">{c.email}</a>}
        {c.telefono && <p className="text-xs text-gray-500">{c.telefono}</p>}
      </div>
      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {!confirm ? (
          <button onClick={() => setConfirm(true)} className="text-[10px] text-red-400 hover:text-red-600 font-semibold border border-red-200 px-2 py-0.5 hover:bg-red-50">
            Eliminar
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <button onClick={handleDelete} disabled={deleting} className="text-[10px] font-bold text-white bg-red-500 px-2 py-0.5 hover:bg-red-600 disabled:opacity-50">
              {deleting ? "..." : "Sí"}
            </button>
            <button onClick={() => setConfirm(false)} className="text-[10px] font-semibold text-gray-500 border border-gray-200 px-2 py-0.5 hover:bg-gray-50">
              No
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function NuevoContactoForm({ colaboradorId }: { colaboradorId: string }) {
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
      const res = await fetch(`/api/admin/colaboradores/${colaboradorId}/contactos`, {
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
      <button onClick={() => setOpen(true)} className="w-full mt-3 text-xs text-[#2E1A47] font-semibold border border-dashed border-[#2E1A47]/30 px-3 py-2 hover:bg-[#EEEBF3] transition-colors">
        + Añadir contacto
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 border border-gray-200 bg-gray-50">
      <div className="bg-[#EEEBF3] px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
        <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Nuevo contacto</p>
        <button type="button" onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700 text-lg leading-none">×</button>
      </div>
      <div className="px-4 py-3 space-y-2">
        {[["Nombre *", "nombre"], ["Puesto en la empresa", "rol"], ["Email", "email"], ["Teléfono", "telefono"]].map(([lbl, key]) => (
          <div key={key}>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{lbl}</label>
            <input value={(form as any)[key]} onChange={e => set(key, e.target.value)} required={key === "nombre"}
              className="w-full border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:border-[#2E1A47] bg-white" />
          </div>
        ))}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={() => setOpen(false)} className="flex-1 py-1.5 text-xs font-semibold text-gray-600 border border-gray-200 hover:bg-gray-100">Cancelar</button>
          <button type="submit" disabled={saving} className="flex-1 py-1.5 text-xs font-bold text-white bg-[#2E1A47] hover:bg-[#3d2460] disabled:opacity-50">
            {saving ? "..." : "Guardar"}
          </button>
        </div>
      </div>
    </form>
  );
}

export default function ContactosColaboradorPanel({ contactos, colaboradorId }: { contactos: Contacto[]; colaboradorId: string }) {
  return (
    <div className="bg-white border border-gray-200">
      <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200">
        <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Personas de contacto ({contactos.length})</h3>
      </div>
      <div className="px-5 py-3">
        {contactos.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">Sin contactos registrados.</p>
        ) : (
          <div className="divide-y divide-gray-50 -mx-5">
            {contactos.map(c => <ContactoRow key={c.id} c={c} />)}
          </div>
        )}
        <NuevoContactoForm colaboradorId={colaboradorId} />
      </div>
    </div>
  );
}
