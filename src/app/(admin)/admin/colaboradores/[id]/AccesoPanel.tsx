"use client";

import { useState } from "react";

export default function AccesoPanel({ colaboradorId, nombre, activo }: { colaboradorId: string; nombre: string; activo: boolean }) {
  const [generando, setGenerando] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [error, setError] = useState("");

  async function generarEnlace(tipo: "invitacion" | "reset") {
    setGenerando(true);
    setError("");
    setLink(null);
    setCopiado(false);
    try {
      const res = await fetch(`/api/admin/colaboradores/${colaboradorId}/access-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Error al generar el enlace.");
        return;
      }
      const { url } = await res.json();
      setLink(url);
    } catch {
      setError("Error de conexión.");
    } finally {
      setGenerando(false);
    }
  }

  function copiar() {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  }

  return (
    <div className="bg-white border border-gray-200">
      <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200">
        <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Acceso al portal</h3>
      </div>
      <div className="px-5 py-4 space-y-3">
        {!activo && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-2">
            Este colaborador está inactivo. Actívalo primero antes de enviarle un enlace de acceso.
          </p>
        )}

        <div className="flex gap-2">
          <button onClick={() => generarEnlace("invitacion")} disabled={generando || !activo}
            className="flex-1 py-2.5 bg-[#2E1A47] text-white text-xs font-semibold hover:bg-[#3d2460] transition-colors disabled:opacity-50">
            {generando ? "Generando..." : "Generar enlace de acceso"}
          </button>
          <button onClick={() => generarEnlace("reset")} disabled={generando || !activo}
            className="flex-1 py-2.5 border border-[#2E1A47] text-[#2E1A47] text-xs font-semibold hover:bg-[#EEEBF3] transition-colors disabled:opacity-50">
            {generando ? "Generando..." : "Resetear contraseña"}
          </button>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        {link && (
          <div className="border border-emerald-200 bg-emerald-50 p-3 space-y-2">
            <p className="text-xs font-semibold text-emerald-700">
              Enlace generado — válido durante 48 horas
            </p>
            <p className="text-xs text-gray-500">
              Envía este enlace a {nombre} para que establezca su contraseña:
            </p>
            <div className="flex gap-2 items-center">
              <input readOnly value={link}
                className="flex-1 px-3 py-2 text-xs text-gray-700 bg-white border border-gray-200 font-mono select-all focus:outline-none" />
              <button onClick={copiar}
                className={`px-3 py-2 text-xs font-semibold transition-colors ${
                  copiado ? "bg-emerald-600 text-white" : "bg-[#2E1A47] text-white hover:bg-[#3d2460]"
                }`}>
                {copiado ? "Copiado" : "Copiar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
