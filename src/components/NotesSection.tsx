"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Note {
  id: string;
  author_id: string;
  author_name: string;
  texto: string;
  created_at: Date | string;
}

interface Props {
  notes: Note[];
  apiUrl: string;
  placeholder?: string;
  currentUserId?: string;
  isAdmin?: boolean;
}

function AddNoteForm({ apiUrl, placeholder }: { apiUrl: string; placeholder: string }) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    setLoading(true);
    await fetch(apiUrl, {
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
        placeholder={placeholder}
        className="w-full px-3 py-2.5 border border-gray-200 text-sm focus:outline-none focus:border-[#2E1A47] resize-none"
      />
      <button type="submit" disabled={loading || !texto.trim()}
        className="bg-[#2E1A47] text-white px-4 py-2 text-sm font-semibold hover:bg-[#3d2460] transition-colors disabled:opacity-50">
        {loading ? "Guardando..." : "Añadir nota"}
      </button>
    </form>
  );
}

function NoteItem({ note, apiUrl, canEdit }: { note: Note; apiUrl: string; canEdit: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [texto, setTexto] = useState(note.texto);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!texto.trim() || texto === note.texto) { setEditing(false); return; }
    setSaving(true);
    await fetch(apiUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteId: note.id, texto }),
    });
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  return (
    <div className="border-l-2 border-[#2E1A47] pl-4 py-1 group">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-bold text-[#2E1A47]">{note.author_name}</span>
        <span className="text-xs text-gray-300">·</span>
        <span className="text-xs text-gray-400">
          {new Date(note.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
        </span>
        {canEdit && !editing && (
          <button onClick={() => setEditing(true)}
            className="ml-auto text-[10px] text-gray-300 hover:text-[#2E1A47] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
            Editar
          </button>
        )}
      </div>
      {editing ? (
        <div className="space-y-2">
          <textarea
            value={texto}
            onChange={e => setTexto(e.target.value)}
            rows={3}
            autoFocus
            className="w-full px-3 py-2 border border-[#2E1A47]/40 text-sm focus:outline-none focus:border-[#2E1A47] resize-none"
          />
          <div className="flex gap-2">
            <button onClick={() => { setEditing(false); setTexto(note.texto); }}
              className="px-3 py-1.5 text-xs font-semibold text-gray-500 border border-gray-200 hover:bg-gray-50">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving || !texto.trim()}
              className="px-4 py-1.5 text-xs font-bold text-white bg-[#2E1A47] hover:bg-[#3d2460] disabled:opacity-50">
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-700">{note.texto}</p>
      )}
    </div>
  );
}

export default function NotesSection({ notes, apiUrl, placeholder = "Añade una nota...", currentUserId, isAdmin }: Props) {
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
          notes.map(n => {
            const canEdit = isAdmin || (!!currentUserId && n.author_id === currentUserId);
            return (
              <NoteItem key={n.id} note={n} apiUrl={apiUrl} canEdit={canEdit} />
            );
          })
        )}
      </div>

      <AddNoteForm apiUrl={apiUrl} placeholder={placeholder} />
    </div>
  );
}
