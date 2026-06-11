"use client";

import { useState } from "react";

export default function AccesoPanel({ colaboradorId, nombre, email, activo }: { colaboradorId: string; nombre: string; email: string; activo: boolean }) {
  const [generando, setGenerando] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [emailEnviado, setEmailEnviado] = useState(false);
  const [enviandoEmail, setEnviandoEmail] = useState(false);
  const [error, setError] = useState("");
  const [tipoActual, setTipoActual] = useState<"invitacion" | "reset">("invitacion");

  async function generarEnlace(tipo: "invitacion" | "reset", enviarEmail = false) {
    if (enviarEmail) {
      setEnviandoEmail(true);
    } else {
      setGenerando(true);
    }
    setError("");
    setLink(null);
    setCopiado(false);
    setEmailEnviado(false);
    setTipoActual(tipo);
    try {
      const res = await fetch(`/api/admin/colaboradores/${colaboradorId}/access-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, enviarEmail }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Error al generar el enlace.");
        return;
      }
      const data = await res.json();
      setLink(data.url);
      if (data.emailSent) setEmailEnviado(true);
    } catch {
      setError("Error de conexión.");
    } finally {
      setGenerando(false);
      setEnviandoEmail(false);
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

        <p className="text-xs text-gray-500">Invitación inicial o reset de contraseña para <span className="font-semibold text-gray-700">{email}</span></p>

        {/* Invitación */}
        <div className="border border-gray-100 p-3 space-y-2">
          <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Enlace de acceso</p>
          <p className="text-[11px] text-gray-400">Para la primera vez o si quieres que se ponga una contraseña nueva.</p>
          <div className="flex gap-2">
            <button onClick={() => generarEnlace("invitacion", true)} disabled={generando || enviandoEmail || !activo}
              className="flex-1 py-2 bg-[#2E1A47] text-white text-xs font-semibold hover:bg-[#3d2460] transition-colors disabled:opacity-50">
              {enviandoEmail && tipoActual === "invitacion" ? "Enviando..." : "Enviar por email"}
            </button>
            <button onClick={() => generarEnlace("invitacion", false)} disabled={generando || enviandoEmail || !activo}
              className="py-2 px-3 border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
              {generando && tipoActual === "invitacion" ? "..." : "Solo enlace"}
            </button>
          </div>
        </div>

        {/* Reset */}
        <div className="border border-gray-100 p-3 space-y-2">
          <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Resetear contraseña</p>
          <p className="text-[11px] text-gray-400">Genera un enlace para que cambie su contraseña actual.</p>
          <div className="flex gap-2">
            <button onClick={() => generarEnlace("reset", true)} disabled={generando || enviandoEmail || !activo}
              className="flex-1 py-2 border border-[#2E1A47] text-[#2E1A47] text-xs font-semibold hover:bg-[#EEEBF3] transition-colors disabled:opacity-50">
              {enviandoEmail && tipoActual === "reset" ? "Enviando..." : "Enviar por email"}
            </button>
            <button onClick={() => generarEnlace("reset", false)} disabled={generando || enviandoEmail || !activo}
              className="py-2 px-3 border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
              {generando && tipoActual === "reset" ? "..." : "Solo enlace"}
            </button>
          </div>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        {emailEnviado && (
          <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 font-semibold">
            Email enviado a {email}
          </p>
        )}

        {link && (
          <div className="border border-gray-200 bg-gray-50 p-3 space-y-2">
            <p className="text-xs font-semibold text-gray-600">
              Enlace generado — válido 48 horas
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
