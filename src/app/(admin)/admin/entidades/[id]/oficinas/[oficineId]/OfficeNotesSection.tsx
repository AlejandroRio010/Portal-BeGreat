"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Note {
  id: string;
  author_name: string;
  texto: string;
  created_at: Date | string;
}

function AddNoteForm({ officeId }: { officeId: string }) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    setLoading(true);
    await fetch(`/api/admin/entidades/oficinas/${officeId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto }),
    });
    setTexto("");
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        value={texto}
        onChange={e => setTexto(e.target.value)}
        rows={3}
        placeholder="Añade una nota o actualización sobre esta oficina..."
        className="w-full px-3 py-2.5 border border-gray-200 text-sm focus:outline-none focus:border-[#2E1A47] resize-none"
      />
      <button
        type="submit"
        disabled={loading || !texto.trim()}
        className="bg-[#2E1A47] text-white px-4 py-2 text-sm font-semibold hover:bg-[#3d2460] transition-colors disabled:opacity-50"
      >
        {loading ? "Guardando..." : "Añadir nota"}
      </button>
    </form>
  );
}

export default function OfficeNotesSection({ notes, officeId }: { notes: Note[]; officeId: string }) {
  return (
    <div className="bg-white border border-gray-200 p-5">
      <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest mb-4 pb-3 border-b border-gray-100">
        Notas e historial
      </p>

      <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
        {notes.length === 0 ? (
          <div className="py-8 text-center border border-dashed border-gray-200">
            <p className="text-sm text-gray-400">Sin notas todavía.</p>
            <p className="text-xs text-gray-300 mt-1">Las notas quedan registradas con autor y fecha.</p>
          </div>
        ) : (
          notes.map(n => (
            <div key={n.id} className="border-l-2 border-[#2E1A47] pl-4 py-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-[#2E1A47]">{n.author_name}</span>
                <span className="text-xs text-gray-300">·</span>
                <span className="text-xs text-gray-400">
                  {new Date(n.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
              <p className="text-sm text-gray-700">{n.texto}</p>
            </div>
          ))
        )}
      </div>

      <AddNoteForm officeId={officeId} />
    </div>
  );
}
