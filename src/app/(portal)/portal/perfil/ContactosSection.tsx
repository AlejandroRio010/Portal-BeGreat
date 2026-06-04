"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const input = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2E1A47]/30 focus:border-[#2E1A47] bg-gray-50";

export default function ContactosSection({ contactos }: { contactos: any[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ nombre: "", email: "", telefono: "", rol: "" });

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre) return;
    setLoading(true);

    await fetch("/api/perfil/contactos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setLoading(false);
    setAdding(false);
    setForm({ nombre: "", email: "", telefono: "", rol: "" });
    router.refresh();
  }

  async function handleDelete(id: string) {
    await fetch("/api/perfil/contactos", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    router.refresh();
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-sm font-bold text-[#2E1A47] uppercase tracking-wider">Personas de contacto</h2>
          <p className="text-xs text-gray-400 mt-0.5">Equipo de tu empresa que trabaja con BeGreat</p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="bg-[#EEEBF3] text-[#2E1A47] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#2E1A47] hover:text-white transition-colors"
        >
          + Añadir persona
        </button>
      </div>

      {/* Contact list */}
      {contactos.length === 0 && !adding ? (
        <div className="text-center py-8 text-gray-400">
          <span className="text-3xl block mb-2">👥</span>
          <p className="text-sm">Aún no has añadido personas de contacto</p>
        </div>
      ) : (
        <div className="space-y-3 mb-4">
          {contactos.map((c) => (
            <div key={c.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#2E1A47] flex items-center justify-center text-white text-sm font-bold">
                  {c.nombre.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{c.nombre}</p>
                  {c.rol && <p className="text-xs text-[#5a3d80] font-medium">{c.rol}</p>}
                  <div className="flex items-center gap-3 mt-0.5">
                    {c.email && <p className="text-xs text-gray-400">{c.email}</p>}
                    {c.telefono && <p className="text-xs text-gray-400">{c.telefono}</p>}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleDelete(c.id)}
                className="text-gray-300 hover:text-red-400 transition-colors text-lg opacity-0 group-hover:opacity-100"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {adding && (
        <form onSubmit={handleAdd} className="border-t border-gray-100 pt-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Nueva persona de contacto</p>
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Nombre completo *"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              required
              className={input}
            />
            <input
              placeholder="Puesto en la empresa"
              value={form.rol}
              onChange={(e) => setForm({ ...form, rol: e.target.value })}
              className={input}
            />
            <input
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={input}
            />
            <input
              placeholder="Teléfono"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              className={input}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-[#2E1A47] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#5a3d80] transition-colors disabled:opacity-60"
            >
              {loading ? "Guardando..." : "Añadir"}
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="text-gray-400 hover:text-gray-600 px-4 py-2 text-sm"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
