"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const inp = "w-full px-3 py-2.5 border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-[#2E1A47] focus:border-[#2E1A47] bg-white";
const lbl = "block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5";

export default function ColaboradorEditModal({ colab }: { colab: { id: string; nombre: string; email: string; identificador: string; activo: boolean } }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const data = { nombre: form.get("nombre"), email: form.get("email") };

    const res = await fetch(`/api/admin/colaboradores/${colab.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    setLoading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Error al guardar");
    } else {
      setSaved(true);
      setTimeout(() => { setSaved(false); setOpen(false); router.refresh(); }, 1200);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-xs font-semibold text-[#2E1A47] hover:underline opacity-0 group-hover:opacity-100 transition-opacity">
        Editar →
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-white w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-bold text-[#2E1A47] uppercase tracking-wider">Editar colaborador</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700 text-lg leading-none">×</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={lbl}>Nombre</label>
                <input name="nombre" defaultValue={colab.nombre} required className={inp} />
              </div>
              <div>
                <label className={lbl}>Email</label>
                <input name="email" type="email" defaultValue={colab.email} required className={inp} />
                <p className="text-xs text-amber-600 mt-1">⚠ Cambiar el email modifica las credenciales de acceso del colaborador.</p>
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex items-center gap-3 pt-2">
                <button type="submit" disabled={loading} className="bg-[#2E1A47] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#5a3d80] transition-all disabled:opacity-60">
                  {loading ? "Guardando..." : "Guardar"}
                </button>
                {saved && <span className="text-sm text-emerald-600 font-medium">Guardado ✓</span>}
                <button type="button" onClick={() => setOpen(false)} className="text-sm text-gray-400 hover:text-gray-600 ml-auto">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
