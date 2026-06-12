"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Note {
  id: string;
  author_id: string;
  author_name: string;
  texto: string;
  pinned?: boolean;
  created_at: Date | string;
}

interface Props {
  notes: Note[];
  apiUrl: string;
  placeholder?: string;
  currentUserId?: string;
  isAdmin?: boolean;
  canPin?: boolean;
  readOnly?: boolean;
}

function AddNoteForm({ apiUrl, placeholder }: { apiUrl: string; placeholder: string }) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!texto.trim()) { setError("Escribe algo antes de guardar."); return; }
    setLoading(true);
    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: texto.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `Error ${res.status}`);
        return;
      }
      setTexto("");
      router.refresh();
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={3}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 border border-gray-200 text-sm focus:outline-none focus:border-[#2E1A47] resize-none"
      />
      {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}
      <button type="submit" disabled={loading || !texto.trim()}
        className="bg-[#2E1A47] text-white px-4 py-2 text-sm font-semibold hover:bg-[#3d2460] transition-colors disabled:opacity-50">
        {loading ? "Guardando…" : "Añadir nota"}
      </button>
    </form>
  );
}

function NoteItem({ note, apiUrl, canEdit, canPin }: { note: Note; apiUrl: string; canEdit: boolean; canPin: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [editTexto, setEditTexto] = useState(note.texto);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!editTexto.trim() || editTexto.trim() === note.texto.trim()) { setEditing(false); return; }
    setSaving(true);
    await fetch(apiUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteId: note.id, texto: editTexto.trim() }),
    });
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  async function togglePin() {
    await fetch(apiUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteId: note.id, pinned: !note.pinned }),
    });
    router.refresh();
  }

  const plainText = note.texto.replace(/<[^>]*>/g, "");

  return (
    <div className={`group relative border p-3.5 transition-colors ${note.pinned ? "bg-[#EEEBF3]/50 border-[#2E1A47]/20" : "bg-white border-gray-100 hover:border-gray-200"}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 bg-[#2E1A47] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 uppercase">
          {note.author_name.charAt(0)}
        </div>
        <span className="text-xs font-bold text-[#2E1A47]">{note.author_name}</span>
        <span className="text-xs text-gray-300">·</span>
        <span className="text-xs text-gray-400">
          {new Date(note.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
        </span>
        {note.pinned && (
          <span className="text-[9px] font-bold text-[#2E1A47] bg-[#2E1A47]/10 px-1.5 py-0.5 uppercase tracking-wide flex items-center gap-1">Fijada</span>
        )}
        <div className="ml-auto flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {canPin && (
            <button onClick={togglePin} className="text-[10px] text-gray-400 hover:text-[#2E1A47] font-semibold">
              {note.pinned ? "Soltar" : "Fijar"}
            </button>
          )}
          {canEdit && !editing && (
            <button onClick={() => { setEditTexto(plainText); setEditing(true); }} className="text-[10px] text-gray-400 hover:text-[#2E1A47] font-semibold">
              Editar
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <div className="space-y-2">
          <textarea value={editTexto} onChange={e => setEditTexto(e.target.value)} rows={3}
            className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#2E1A47] resize-none" />
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-xs font-semibold text-gray-500 border border-gray-200 hover:bg-gray-50">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-1.5 text-xs font-bold text-white bg-[#2E1A47] hover:bg-[#3d2460] disabled:opacity-50">
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{plainText}</p>
      )}
    </div>
  );
}

export default function NotesSection({ notes, apiUrl, placeholder = "Añade una nota…", currentUserId, isAdmin, canPin = false, readOnly = false }: Props) {
  const ordenadas = [...notes].sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="bg-white border border-gray-200 p-5">
      <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest mb-4 pb-3 border-b border-gray-100">
        Notas e historial
      </p>

      {!readOnly && (
        <div className="mb-5">
          <AddNoteForm apiUrl={apiUrl} placeholder={placeholder} />
        </div>
      )}

      <div className="space-y-2.5 max-h-[480px] overflow-y-auto">
        {ordenadas.length === 0 ? (
          <div className="py-8 text-center border border-dashed border-gray-200">
            <p className="text-sm text-gray-400">Sin notas todavía.</p>
            <p className="text-xs text-gray-300 mt-1">Las notas quedan registradas con autor y fecha.</p>
          </div>
        ) : (
          ordenadas.map(n => {
            const canEdit = readOnly ? false : (isAdmin || (!!currentUserId && n.author_id === currentUserId));
            return <NoteItem key={n.id} note={n} apiUrl={apiUrl} canEdit={canEdit} canPin={canPin} />;
          })
        )}
      </div>
    </div>
  );
}
