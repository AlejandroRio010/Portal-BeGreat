"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const inp = "w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-[#2E1A47] focus:border-[#2E1A47] bg-white";
const lbl = "block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1";

interface Contact {
  id: string;
  nombre: string;
  email?: string | null;
  telefono?: string | null;
  rol?: string | null;
  linkedin?: string | null;
  notas?: string | null;
}

export default function ContactoPanel({ contact }: { contact: Contact }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  // local state for editing
  const [data, setData] = useState({ ...contact });

  async function handleSave() {
    setLoading(true);
    await fetch(`/api/contacts/${contact.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setLoading(false);
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  return (
    <>
      {/* Trigger: nombre clickable */}
      <button
        onClick={() => setOpen(true)}
        className="text-sm font-semibold text-[#2E1A47] hover:underline text-left"
      >
        {contact.nombre}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => { setOpen(false); setEditing(false); }} />
          {/* Slide-over panel */}
          <div className="relative bg-white h-full w-full max-w-sm shadow-2xl flex flex-col overflow-y-auto">
            {/* Header */}
            <div className="bg-[#2E1A47] px-6 py-5 flex items-center justify-between flex-shrink-0">
              <div>
                <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-0.5">Persona de contacto</p>
                <p className="text-white font-bold text-lg leading-tight">{data.nombre}</p>
                {data.rol && <p className="text-white/60 text-xs mt-0.5">{data.rol}</p>}
              </div>
              <button onClick={() => { setOpen(false); setEditing(false); }} className="text-white/50 hover:text-white text-xl leading-none ml-4">×</button>
            </div>

            {/* Body */}
            <div className="flex-1 p-6 space-y-5">
              {!editing ? (
                <>
                  {/* Datos */}
                  <div className="space-y-4">
                    {data.email && (
                      <div>
                        <p className={lbl}>Email</p>
                        <a href={`mailto:${data.email}`} className="text-sm text-[#2E1A47] hover:underline">{data.email}</a>
                      </div>
                    )}
                    {data.telefono && (
                      <div>
                        <p className={lbl}>Teléfono</p>
                        <p className="text-sm text-gray-800">{data.telefono}</p>
                      </div>
                    )}
                    {data.rol && (
                      <div>
                        <p className={lbl}>Puesto / Rol</p>
                        <p className="text-sm text-gray-800">{data.rol}</p>
                      </div>
                    )}
                    {data.linkedin && (
                      <div>
                        <p className={lbl}>LinkedIn</p>
                        <a href={data.linkedin} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline break-all">
                          {data.linkedin}
                        </a>
                      </div>
                    )}
                    {(!data.email && !data.telefono && !data.rol && !data.linkedin) && (
                      <p className="text-xs text-gray-300">Sin datos de contacto registrados.</p>
                    )}
                  </div>

                  {/* Notas */}
                  <div className="border-t border-gray-100 pt-4">
                    <p className={lbl}>Notas</p>
                    {data.notas ? (
                      <p className="text-sm text-gray-700 whitespace-pre-wrap bg-[#EEEBF3]/40 p-3 border-l-2 border-[#2E1A47]">{data.notas}</p>
                    ) : (
                      <p className="text-xs text-gray-300">Sin notas.</p>
                    )}
                  </div>

                  <button
                    onClick={() => setEditing(true)}
                    className="w-full bg-[#2E1A47] text-white py-2.5 text-sm font-semibold hover:bg-[#5a3d80] transition-colors"
                  >
                    Editar datos
                  </button>
                  {saved && <p className="text-center text-xs text-emerald-600 font-semibold">Guardado ✓</p>}
                </>
              ) : (
                <>
                  {/* Formulario edición */}
                  <div className="space-y-3">
                    <div>
                      <label className={lbl}>Nombre *</label>
                      <input className={inp} value={data.nombre} onChange={e => setData(d => ({ ...d, nombre: e.target.value }))} />
                    </div>
                    <div>
                      <label className={lbl}>Puesto / Rol</label>
                      <input className={inp} value={data.rol ?? ""} onChange={e => setData(d => ({ ...d, rol: e.target.value }))} />
                    </div>
                    <div>
                      <label className={lbl}>Email</label>
                      <input type="email" className={inp} value={data.email ?? ""} onChange={e => setData(d => ({ ...d, email: e.target.value }))} />
                    </div>
                    <div>
                      <label className={lbl}>Teléfono</label>
                      <input className={inp} value={data.telefono ?? ""} onChange={e => setData(d => ({ ...d, telefono: e.target.value }))} />
                    </div>
                    <div>
                      <label className={lbl}>LinkedIn</label>
                      <input className={inp} value={data.linkedin ?? ""} placeholder="https://linkedin.com/in/..." onChange={e => setData(d => ({ ...d, linkedin: e.target.value }))} />
                    </div>
                    <div>
                      <label className={lbl}>Notas</label>
                      <textarea rows={4} className={inp + " resize-none"} value={data.notas ?? ""} onChange={e => setData(d => ({ ...d, notas: e.target.value }))} placeholder="Cualquier anotación relevante..." />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button onClick={handleSave} disabled={loading} className="flex-1 bg-[#2E1A47] text-white py-2.5 text-sm font-semibold hover:bg-[#5a3d80] transition-colors disabled:opacity-60">
                      {loading ? "Guardando..." : "Guardar"}
                    </button>
                    <button onClick={() => { setEditing(false); setData({ ...contact }); }} className="text-sm text-gray-400 hover:text-gray-700 px-4">
                      Cancelar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
