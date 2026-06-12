"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface InfoRequest {
  id: string;
  author_name: string;
  mensaje: string;
  respuesta: string | null;
  respondido: boolean;
  created_at: Date | string;
  responded_at: Date | string | null;
}

interface Props {
  requests: InfoRequest[];
  apiUrl: string;
  isAdmin: boolean;
}

function AddRequestForm({ apiUrl }: { apiUrl: string }) {
  const router = useRouter();
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!mensaje.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensaje: mensaje.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `Error ${res.status}`);
        return;
      }
      setMensaje("");
      router.refresh();
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 mb-4">
      <textarea
        value={mensaje}
        onChange={(e) => setMensaje(e.target.value)}
        placeholder="Escribe qué información necesitas del colaborador..."
        className="w-full border border-gray-200 px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-[#2E1A47] min-h-[70px] resize-y"
      />
      {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}
      <button
        type="submit"
        disabled={loading || !mensaje.trim()}
        className="bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg>
        {loading ? "Enviando…" : "Solicitar información"}
      </button>
    </form>
  );
}

function RespondForm({ apiUrl, requestId }: { apiUrl: string; requestId: string }) {
  const router = useRouter();
  const [respuesta, setRespuesta] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs font-semibold text-blue-600 hover:text-blue-800 mt-2">
        Responder
      </button>
    );
  }

  async function handleSubmit() {
    if (!respuesta.trim()) return;
    setLoading(true);
    await fetch(apiUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, respuesta: respuesta.trim() }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="mt-2 space-y-2">
      <textarea
        value={respuesta}
        onChange={(e) => setRespuesta(e.target.value)}
        placeholder="Tu respuesta..."
        className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500 min-h-[50px] resize-y"
      />
      <div className="flex gap-2">
        <button onClick={() => setOpen(false)} className="px-3 py-1.5 text-xs font-semibold text-gray-500 border border-gray-200 hover:bg-gray-50">Cancelar</button>
        <button onClick={handleSubmit} disabled={loading || !respuesta.trim()} className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
          {loading ? "Enviando…" : "Enviar respuesta"}
        </button>
      </div>
    </div>
  );
}

export default function InfoRequestsSection({ requests, apiUrl, isAdmin }: Props) {
  return (
    <div className="bg-white border border-gray-200 p-5">
      <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-4 pb-3 border-b border-gray-100 flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        Solicitudes de información
      </p>

      {isAdmin && <AddRequestForm apiUrl={apiUrl} />}

      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {requests.length === 0 ? (
          <div className="py-6 text-center border border-dashed border-gray-200">
            <p className="text-sm text-gray-400">Sin solicitudes de información.</p>
          </div>
        ) : (
          requests.map((r) => (
            <div key={r.id} className={`border p-3.5 ${r.respondido ? "bg-green-50/50 border-green-200/50" : "bg-blue-50/30 border-blue-200"}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 ${r.respondido ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                  {r.respondido ? "Respondida" : "Pendiente"}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(r.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
                </span>
                <span className="text-xs text-gray-300">·</span>
                <span className="text-xs font-semibold text-gray-500">{r.author_name}</span>
              </div>
              <p className="text-sm text-gray-700 mb-1">{r.mensaje}</p>
              {r.respuesta && (
                <div className="mt-2 pl-3 border-l-2 border-green-300">
                  <p className="text-xs font-bold text-green-700 mb-0.5">Respuesta:</p>
                  <p className="text-sm text-gray-700">{r.respuesta}</p>
                  {r.responded_at && (
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(r.responded_at).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  )}
                </div>
              )}
              {!r.respondido && !isAdmin && <RespondForm apiUrl={apiUrl} requestId={r.id} />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
