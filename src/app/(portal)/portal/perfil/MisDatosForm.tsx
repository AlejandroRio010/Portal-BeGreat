"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const inp = "w-full px-3 py-2.5 border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-[#2E1A47] focus:border-[#2E1A47] bg-white";
const lbl = "block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5";

export default function MisDatosForm({ user }: { user: { id: string; nombre: string; email: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);

    await fetch("/api/perfil/mis-datos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: form.get("nombre"),
        email: form.get("email"),
      }),
    });

    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="bg-white border border-gray-200 p-6 mb-5 space-y-4">
        <h2 className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest pb-3 border-b border-gray-100">Mis datos</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Nombre *</label>
            <input name="nombre" defaultValue={user.nombre} required className={inp} placeholder="Tu nombre" />
          </div>
          <div>
            <label className={lbl}>Email de acceso</label>
            <input name="email" defaultValue={user.email} className={inp} placeholder="tu@email.com" readOnly />
            <p className="text-[11px] text-gray-400 mt-1">Para cambiar el email contacta con el administrador</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <button
          type="submit"
          disabled={loading}
          className="bg-[#2E1A47] text-white px-6 py-2.5 text-sm font-semibold hover:bg-[#5a3d80] transition-all disabled:opacity-60"
        >
          {loading ? "Guardando..." : "Guardar mis datos"}
        </button>
        {saved && (
          <span className="text-sm text-emerald-600 font-medium">Guardado correctamente</span>
        )}
      </div>
    </form>
  );
}
