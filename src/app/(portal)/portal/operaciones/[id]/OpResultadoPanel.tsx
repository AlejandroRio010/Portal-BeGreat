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
      <div className="relative overflow-hidden bg-gradient-to-r from-[#2E1A47] to-[#3d2460] px-4 py-3">
        <div className="absolute top-0 right-0 w-20 h-20 bg-[#D4AF37]/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-[#D4AF37]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold text-white">Operación ganada</p>
              <p className="text-[10px] text-[#D4AF37]">Cerrada con éxito</p>
            </div>
          </div>
          <button onClick={() => marcar("en_curso")} disabled={saving}
            className="text-[10px] text-white/50 border border-white/15 px-2.5 py-1 hover:bg-white/10 font-semibold transition-colors disabled:opacity-50 uppercase tracking-wider">
            Reabrir
          </button>
        </div>
      </div>
    );
  }

  if (currentResultado === "denegada") {
    return (
      <div className="relative overflow-hidden bg-gradient-to-r from-[#2E1A47] to-[#3d2460] px-4 py-3">
        <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold text-white">Operación denegada</p>
              {motivoDenegacion && <p className="text-[10px] text-red-300/80">Motivo: {motivoDenegacion}</p>}
            </div>
          </div>
          <button onClick={() => marcar("en_curso")} disabled={saving}
            className="text-[10px] text-white/50 border border-white/15 px-2.5 py-1 hover:bg-white/10 font-semibold transition-colors disabled:opacity-50 uppercase tracking-wider">
            Reabrir
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-[#2E1A47] to-[#3d2460]">
      <div className="absolute top-0 right-0 w-24 h-24 bg-[#D4AF37]/5 rounded-full -translate-y-1/2 translate-x-1/3" />
      <div className="relative px-4 py-3">
        <p className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-[0.2em] mb-3">Resultado de la operación</p>

        {!showDenegadaForm && !confirmGanada && (
          <div className="flex gap-2.5">
            <button onClick={() => setConfirmGanada(true)}
              className="flex-1 py-2.5 text-xs font-bold text-[#2E1A47] bg-[#D4AF37] hover:bg-[#e0be44] transition-all flex items-center justify-center gap-2 shadow-md shadow-[#D4AF37]/20">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Ganada
            </button>
            <button onClick={() => setShowDenegadaForm(true)}
              className="flex-1 py-2.5 text-xs font-bold text-white/70 border border-white/20 hover:bg-white/10 transition-all flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Denegada
            </button>
          </div>
        )}

        {confirmGanada && (
          <div className="space-y-3">
            <p className="text-xs text-white/80">¿Confirmas que esta operación se ha ganado?</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmGanada(false)}
                className="px-4 py-2 text-[11px] font-semibold text-white/50 border border-white/15 hover:bg-white/10 transition-colors">
                Cancelar
              </button>
              <button onClick={() => marcar("ganada")} disabled={saving}
                className="px-5 py-2 text-[11px] font-bold text-[#2E1A47] bg-[#D4AF37] hover:bg-[#e0be44] disabled:opacity-50 uppercase tracking-wider transition-colors">
                {saving ? "Guardando..." : "Confirmar ganada"}
              </button>
            </div>
          </div>
        )}

        {showDenegadaForm && (
          <div className="space-y-3">
            <p className="text-xs text-white/80 font-medium">¿Por qué se ha denegado?</p>
            <textarea value={motivo} onChange={e => setMotivo(e.target.value)}
              className="w-full bg-white/10 border border-white/15 px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#D4AF37]/50 resize-none"
              rows={2} placeholder="Motivo (opcional pero recomendado)..." />
            <div className="flex gap-2">
              <button onClick={() => setShowDenegadaForm(false)}
                className="px-4 py-2 text-[11px] font-semibold text-white/50 border border-white/15 hover:bg-white/10 transition-colors">
                Cancelar
              </button>
              <button onClick={() => marcar("denegada", motivo)} disabled={saving}
                className="px-5 py-2 text-[11px] font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 uppercase tracking-wider transition-colors">
                {saving ? "Guardando..." : "Confirmar denegada"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
