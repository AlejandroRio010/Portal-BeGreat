"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  opId: string;
  pipelineKey: string;
  currentResultado: "ganada" | "denegada" | "en_curso";
  motivoDenegacion?: string | null;
}

export default function OpResultadoPanel({ opId, pipelineKey, currentResultado, motivoDenegacion }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [showDenegadaForm, setShowDenegadaForm] = useState(false);
  const [motivo, setMotivo] = useState(motivoDenegacion ?? "");
  const [confirmGanada, setConfirmGanada] = useState(false);

  async function marcar(resultado: "ganada" | "denegada" | "en_curso", motivoText?: string) {
    setSaving(true);
    try {
      await fetch(`/api/operations/${opId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resultado,
          pipeline_key: pipelineKey,
          motivo_denegacion: resultado === "denegada" ? (motivoText || null) : null,
        }),
      });
      setShowDenegadaForm(false);
      setConfirmGanada(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (currentResultado === "ganada") {
    return (
      <div className="bg-emerald-50 border border-emerald-200 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎉</span>
          <div>
            <p className="text-sm font-bold text-emerald-800">Operación ganada</p>
            <p className="text-xs text-emerald-600">La operación se ha cerrado con éxito.</p>
          </div>
        </div>
        <button onClick={() => marcar("en_curso")} disabled={saving}
          className="text-xs text-emerald-700 border border-emerald-300 px-3 py-1.5 hover:bg-emerald-100 font-semibold transition-colors disabled:opacity-50">
          Reabrir operación
        </button>
      </div>
    );
  }

  if (currentResultado === "denegada") {
    return (
      <div className="bg-red-50 border border-red-200 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✗</span>
            <div>
              <p className="text-sm font-bold text-red-800">Operación denegada</p>
              {motivoDenegacion && <p className="text-xs text-red-600 mt-0.5">Motivo: {motivoDenegacion}</p>}
            </div>
          </div>
          <button onClick={() => marcar("en_curso")} disabled={saving}
            className="text-xs text-red-700 border border-red-300 px-3 py-1.5 hover:bg-red-100 font-semibold transition-colors disabled:opacity-50">
            Reabrir operación
          </button>
        </div>
      </div>
    );
  }

  // en_curso
  return (
    <div className="bg-white border border-gray-200">
      <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200">
        <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Resultado de la operación</h3>
      </div>
      <div className="px-5 py-4">
        {!showDenegadaForm && !confirmGanada && (
          <div className="flex gap-3">
            <button onClick={() => setConfirmGanada(true)}
              className="flex-1 py-3 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2">
              <span className="text-lg">✓</span> Marcar como ganada
            </button>
            <button onClick={() => setShowDenegadaForm(true)}
              className="flex-1 py-3 text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center gap-2">
              <span className="text-lg">✗</span> Marcar como denegada
            </button>
          </div>
        )}

        {confirmGanada && (
          <div className="space-y-3">
            <p className="text-sm text-gray-700">¿Confirmas que esta operación se ha ganado? Se moverá a la fase final automáticamente.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmGanada(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50">Cancelar</button>
              <button onClick={() => marcar("ganada")} disabled={saving}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 uppercase tracking-wider">
                {saving ? "Guardando..." : "Confirmar ganada"}
              </button>
            </div>
          </div>
        )}

        {showDenegadaForm && (
          <div className="space-y-3">
            <p className="text-sm text-gray-700 font-medium">¿Por qué se ha denegado la operación?</p>
            <textarea value={motivo} onChange={e => setMotivo(e.target.value)}
              className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47] resize-none"
              rows={3} placeholder="Motivo de la denegación (opcional pero recomendado)..." />
            <div className="flex gap-2">
              <button onClick={() => setShowDenegadaForm(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50">Cancelar</button>
              <button onClick={() => marcar("denegada", motivo)} disabled={saving}
                className="px-5 py-2 text-xs font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 uppercase tracking-wider">
                {saving ? "Guardando..." : "Confirmar denegada"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
