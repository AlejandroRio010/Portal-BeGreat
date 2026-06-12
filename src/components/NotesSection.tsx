"use client";

import { useState, useCallback } from "react";
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

// ─── Rich text editor with toolbar ───────────────────────────────────────────
function RichEditor({ initialHtml, placeholder, editorId }: { initialHtml?: string; placeholder: string; editorId: string }) {
  const [active, setActive] = useState<Record<string, boolean>>({});

  function updateActive() {
    setActive({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      insertUnorderedList: document.queryCommandState("insertUnorderedList"),
      insertOrderedList: document.queryCommandState("insertOrderedList"),
    });
  }

  function cmd(command: string) {
    document.execCommand(command, false);
    document.getElementById(editorId)?.focus();
    updateActive();
  }

  const btnCls = (command: string) =>
    `w-7 h-7 flex items-center justify-center text-sm transition-colors ${
      active[command] ? "bg-[#2E1A47] text-white" : "text-gray-600 hover:bg-[#EEEBF3] hover:text-[#2E1A47]"
    }`;

  return (
    <div className="border border-gray-200 focus-within:border-[#2E1A47] transition-colors">
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-100 bg-gray-50">
        <button type="button" onMouseDown={(e) => { e.preventDefault(); cmd("bold"); }}
          className={`${btnCls("bold")} font-bold`} title="Negrita">B</button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); cmd("italic"); }}
          className={`${btnCls("italic")} italic`} title="Cursiva">I</button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); cmd("underline"); }}
          className={`${btnCls("underline")} underline`} title="Subrayado">U</button>
        <div className="w-px h-4 bg-gray-200 mx-0.5" />
        <button type="button" onMouseDown={(e) => { e.preventDefault(); cmd("insertUnorderedList"); }}
          className={btnCls("insertUnorderedList")} title="Lista con viñetas">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1.5" fill="currentColor"/><circle cx="4" cy="12" r="1.5" fill="currentColor"/><circle cx="4" cy="18" r="1.5" fill="currentColor"/></svg>
        </button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); cmd("insertOrderedList"); }}
          className={`${btnCls("insertOrderedList")} text-[11px] font-bold`} title="Lista numerada">1.</button>
      </div>
      <div
        id={editorId}
        contentEditable
        data-placeholder={placeholder}
        dangerouslySetInnerHTML={{ __html: initialHtml ?? "" }}
        onKeyUp={updateActive}
        onMouseUp={updateActive}
        className="notes-editor min-h-[80px] px-3 py-2.5 text-sm text-gray-800 focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-300"
        suppressContentEditableWarning
      />
    </div>
  );
}

function getEditorHtml(editorId: string): string {
  const el = document.getElementById(editorId);
  return el?.innerHTML?.trim() ?? "";
}

function clearEditor(editorId: string) {
  const el = document.getElementById(editorId);
  if (el) el.innerHTML = "";
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

// ─── Add note form ───────────────────────────────────────────────────────────
function AddNoteForm({ apiUrl, placeholder }: { apiUrl: string; placeholder: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const editorId = "notes-add-editor";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const html = getEditorHtml(editorId);
    const text = stripHtml(html);
    if (!text) { setError("Escribe algo antes de guardar."); return; }
    setLoading(true);
    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: html }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `Error ${res.status}`);
        return;
      }
      clearEditor(editorId);
      router.refresh();
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <RichEditor placeholder={placeholder} editorId={editorId} />
      {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}
      <button type="submit" disabled={loading}
        className="bg-[#2E1A47] text-white px-4 py-2 text-sm font-semibold hover:bg-[#3d2460] transition-colors disabled:opacity-50">
        {loading ? "Guardando…" : "Añadir nota"}
      </button>
    </form>
  );
}

// ─── Note item ───────────────────────────────────────────────────────────────
function NoteItem({ note, apiUrl, canEdit, canPin, idx }: { note: Note; apiUrl: string; canEdit: boolean; canPin: boolean; idx: number }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const editEditorId = `notes-edit-${idx}`;

  async function handleSave() {
    const html = getEditorHtml(editEditorId);
    const text = stripHtml(html);
    if (!text) { setEditing(false); return; }
    setSaving(true);
    await fetch(apiUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteId: note.id, texto: html }),
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
            <button onClick={() => setEditing(true)} className="text-[10px] text-gray-400 hover:text-[#2E1A47] font-semibold">
              Editar
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <div className="space-y-2">
          <RichEditor initialHtml={note.texto} placeholder="Edita la nota…" editorId={editEditorId} />
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-xs font-semibold text-gray-500 border border-gray-200 hover:bg-gray-50">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-1.5 text-xs font-bold text-white bg-[#2E1A47] hover:bg-[#3d2460] disabled:opacity-50">
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      ) : (
        <div className="notes-content text-sm text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: note.texto }} />
      )}
    </div>
  );
}

// ─── Main section ────────────────────────────────────────────────────────────
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
          ordenadas.map((n, i) => {
            const canEdit = readOnly ? false : (isAdmin || (!!currentUserId && n.author_id === currentUserId));
            return <NoteItem key={n.id} note={n} apiUrl={apiUrl} canEdit={canEdit} canPin={canPin} idx={i} />;
          })
        )}
      </div>
    </div>
  );
}
