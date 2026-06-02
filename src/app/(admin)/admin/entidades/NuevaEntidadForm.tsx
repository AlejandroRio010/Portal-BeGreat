"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const inp = "w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#2E1A47] bg-white";
const lbl = "block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1";

export default function NuevaEntidadForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
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

    const res = await fetch("/api/admin/entidades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    setLoading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Error al crear la entidad");
    } else {
      setOpen(false);
      router.refresh();
    }
  }

  return (
    <div className="bg-white border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest">Añadir entidad financiera</p>
        <button
          onClick={() => setOpen(o => !o)}
          className="text-xs font-semibold text-[#2E1A47] hover:underline"
        >
          {open ? "Cerrar ↑" : "Abrir formulario ↓"}
        </button>
      </div>

      {open && (
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Nombre *</label>
              <input name="nombre" required className={inp} placeholder="Banco Santander" />
            </div>
            <div>
              <label className={lbl}>Tipo *</label>
              <select name="tipo" required className={inp}>
                <option value="banco">Banco</option>
                <option value="alternativa_financiera">Financiación alternativa</option>
                <option value="renting">Entidad de renting</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={lbl}>Email general</label>
              <input name="email" type="email" className={inp} placeholder="info@banco.es" />
            </div>
            <div>
              <label className={lbl}>Teléfono</label>
              <input name="telefono" className={inp} placeholder="900 000 000" />
            </div>
            <div>
              <label className={lbl}>Web</label>
              <input name="web" className={inp} placeholder="https://banco.es" />
            </div>
          </div>

          <div>
            <label className={lbl}>LinkedIn</label>
            <input name="linkedin" className={inp} placeholder="https://linkedin.com/company/..." />
          </div>

          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider pt-2 border-t border-gray-100">Persona de contacto</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={lbl}>Nombre</label>
              <input name="persona_contacto" className={inp} placeholder="Ana García" />
            </div>
            <div>
              <label className={lbl}>Email</label>
              <input name="contacto_email" type="email" className={inp} placeholder="a.garcia@banco.es" />
            </div>
            <div>
              <label className={lbl}>Teléfono</label>
              <input name="contacto_telefono" className={inp} placeholder="612 000 000" />
            </div>
          </div>

          <div>
            <label className={lbl}>Notas internas</label>
            <textarea name="notas" rows={3} className={inp} placeholder="Condiciones, observaciones..." />
          </div>

          {error && <p className="text-xs text-red-600 font-semibold bg-red-50 border border-red-200 px-3 py-2">{error}</p>}

          <div className="flex items-center gap-3 pt-1">
            <button type="submit" disabled={loading} className="px-5 py-2.5 bg-[#2E1A47] text-white text-sm font-semibold hover:bg-[#3d2460] transition-colors disabled:opacity-50">
              {loading ? "Guardando..." : "Crear entidad"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="text-sm text-gray-400 hover:text-gray-600">Cancelar</button>
          </div>
        </form>
      )}
    </div>
  );
}
