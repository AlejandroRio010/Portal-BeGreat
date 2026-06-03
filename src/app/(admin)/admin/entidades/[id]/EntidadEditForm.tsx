"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const inp = "w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#2E1A47] bg-white";
const lbl = "block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1";

interface Entidad {
  id: string;
  nombre: string;
  tipo: "banco" | "alternativa_financiera" | "renting";
  email: string | null;
  telefono: string | null;
  web: string | null;
  linkedin: string | null;
  persona_contacto: string | null;
  contacto_email: string | null;
  contacto_telefono: string | null;
  notas: string | null;
}

export default function EntidadEditForm({ entidad }: { entidad: Entidad }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/entidades/${entidad.id}`, { method: "DELETE" });
      if (res.ok) router.push("/admin/entidades");
    } finally { setDeleting(false); setConfirmDelete(false); }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const data = {
      nombre: form.get("nombre"),
      tipo: form.get("tipo"),
      email: form.get("email") || null,
      telefono: form.get("telefono") || null,
      web: form.get("web") || null,
      linkedin: form.get("linkedin") || null,
      persona_contacto: form.get("persona_contacto") || null,
      contacto_email: form.get("contacto_email") || null,
      contacto_telefono: form.get("contacto_telefono") || null,
      notas: form.get("notas") || null,
    };

    const res = await fetch(`/api/admin/entidades/${entidad.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Error al guardar");
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      router.refresh();
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
        <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Editar entidad</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700 text-lg leading-none">×</button>
      </div>

      <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Nombre *</label>
            <input name="nombre" required defaultValue={entidad.nombre} className={inp} />
          </div>
          <div>
            <label className={lbl}>Tipo *</label>
            <select name="tipo" defaultValue={entidad.tipo} className={inp}>
              <option value="banco">Banco</option>
              <option value="alternativa_financiera">Financiación alternativa</option>
              <option value="renting">Entidad de renting</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={lbl}>Email general</label>
            <input name="email" type="email" defaultValue={entidad.email ?? ""} className={inp} />
          </div>
          <div>
            <label className={lbl}>Teléfono</label>
            <input name="telefono" defaultValue={entidad.telefono ?? ""} className={inp} />
          </div>
          <div>
            <label className={lbl}>Web</label>
            <input name="web" defaultValue={entidad.web ?? ""} className={inp} />
          </div>
        </div>

        <div>
          <label className={lbl}>LinkedIn</label>
          <input name="linkedin" defaultValue={entidad.linkedin ?? ""} className={inp} />
        </div>

        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Persona de contacto</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={lbl}>Nombre</label>
              <input name="persona_contacto" defaultValue={entidad.persona_contacto ?? ""} className={inp} />
            </div>
            <div>
              <label className={lbl}>Email</label>
              <input name="contacto_email" type="email" defaultValue={entidad.contacto_email ?? ""} className={inp} />
            </div>
            <div>
              <label className={lbl}>Teléfono</label>
              <input name="contacto_telefono" defaultValue={entidad.contacto_telefono ?? ""} className={inp} />
            </div>
          </div>
        </div>

        <div>
          <label className={lbl}>Notas internas</label>
          <textarea name="notas" rows={4} defaultValue={entidad.notas ?? ""} className={inp} />
        </div>

        {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2">{error}</p>}

        <div className="flex items-center justify-between pt-1 border-t border-gray-100">
          <div>
            {!confirmDelete ? (
              <button type="button" onClick={() => setConfirmDelete(true)} className="text-xs text-red-400 hover:text-red-600 font-semibold">
                Eliminar entidad
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-600 font-semibold">¿Confirmar?</span>
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
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving} className="px-5 py-2.5 bg-[#2E1A47] text-white text-sm font-semibold hover:bg-[#3d2460] transition-colors disabled:opacity-50">
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
            {saved && <span className="text-sm text-emerald-600 font-medium">Guardado ✓</span>}
          </div>
        </div>
      </form>
    </div>
  );
}
