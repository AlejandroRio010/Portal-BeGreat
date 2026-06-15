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
      <div className="relative overflow-hidden bg-gradient-to-r from-[#2E1A47] to-[#3d2460] px-6 py-5">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#C9A84C]/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-20 w-20 h-20 bg-[#C9A84C]/5 rounded-full translate-y-1/2" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-[#C9A84C]/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-[#C9A84C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-white tracking-wide">Operación ganada</p>
              <p className="text-xs text-[#C9A84C] mt-0.5">La operación se ha cerrado con éxito</p>
            </div>
          </div>
          <button onClick={() => marcar("en_curso")} disabled={saving}
            className="text-[11px] text-white/60 border border-white/20 px-3 py-1.5 hover:bg-white/10 font-semibold transition-colors disabled:opacity-50 uppercase tracking-wider">
            Reabrir
          </button>
        </div>
      </div>
    );
  }

  if (currentResultado === "denegada") {
    return (
      <div className="relative overflow-hidden bg-gradient-to-r from-[#2E1A47] to-[#3d2460] px-6 py-5">
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-white tracking-wide">Operación denegada</p>
                {motivoDenegacion && <p className="text-xs text-red-300/80 mt-0.5">Motivo: {motivoDenegacion}</p>}
              </div>
            </div>
            <button onClick={() => marcar("en_curso")} disabled={saving}
              className="text-[11px] text-white/60 border border-white/20 px-3 py-1.5 hover:bg-white/10 font-semibold transition-colors disabled:opacity-50 uppercase tracking-wider">
              Reabrir
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-[#2E1A47] to-[#3d2460]">
      <div className="absolute top-0 right-0 w-40 h-40 bg-[#C9A84C]/5 rounded-full -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-10 w-24 h-24 bg-[#C9A84C]/5 rounded-full translate-y-1/2" />
      <div className="relative px-6 py-5">
        <p className="text-[10px] font-bold text-[#C9A84C] uppercase tracking-[0.2em] mb-4">Resultado de la operación</p>

        {!showDenegadaForm && !confirmGanada && (
          <div className="flex gap-3">
            <button onClick={() => setConfirmGanada(true)}
              className="flex-1 py-3.5 text-sm font-bold text-[#2E1A47] bg-[#C9A84C] hover:bg-[#d4b55c] transition-all flex items-center justify-center gap-2.5 shadow-lg shadow-[#C9A84C]/20">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Marcar como ganada
            </button>
            <button onClick={() => setShowDenegadaForm(true)}
              className="flex-1 py-3.5 text-sm font-bold text-white/80 border border-white/20 hover:bg-white/10 transition-all flex items-center justify-center gap-2.5">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Marcar como denegada
            </button>
          </div>
        )}

        {confirmGanada && (
          <div className="space-y-4">
            <p className="text-sm text-white/80">¿Confirmas que esta operación se ha ganado? Se moverá a la fase final automáticamente.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmGanada(false)}
                className="px-5 py-2.5 text-xs font-semibold text-white/60 border border-white/20 hover:bg-white/10 transition-colors">
                Cancelar
              </button>
              <button onClick={() => marcar("ganada")} disabled={saving}
                className="px-6 py-2.5 text-xs font-bold text-[#2E1A47] bg-[#C9A84C] hover:bg-[#d4b55c] disabled:opacity-50 uppercase tracking-wider transition-colors shadow-lg shadow-[#C9A84C]/20">
                {saving ? "Guardando..." : "Confirmar ganada"}
              </button>
            </div>
          </div>
        )}

        {showDenegadaForm && (
          <div className="space-y-4">
            <p className="text-sm text-white/80 font-medium">¿Por qué se ha denegado la operación?</p>
            <textarea value={motivo} onChange={e => setMotivo(e.target.value)}
              className="w-full bg-white/10 border border-white/20 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#C9A84C]/50 resize-none"
              rows={3} placeholder="Motivo de la denegación (opcional pero recomendado)..." />
            <div className="flex gap-3">
              <button onClick={() => setShowDenegadaForm(false)}
                className="px-5 py-2.5 text-xs font-semibold text-white/60 border border-white/20 hover:bg-white/10 transition-colors">
                Cancelar
              </button>
              <button onClick={() => marcar("denegada", motivo)} disabled={saving}
                className="px-6 py-2.5 text-xs font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 uppercase tracking-wider transition-colors">
                {saving ? "Guardando..." : "Confirmar denegada"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
