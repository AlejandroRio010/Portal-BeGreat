"use client";

interface Props {
  currentResultado: "ganada" | "denegada" | "en_curso";
  motivoDenegacion?: string | null;
}

export default function OpResultadoPanel({ currentResultado, motivoDenegacion }: Props) {
  if (currentResultado === "ganada") {
    return (
      <div className="relative overflow-hidden bg-gradient-to-r from-[#2E1A47] to-[#3d2460] px-4 py-3 mb-6">
        <div className="absolute top-0 right-0 w-20 h-20 bg-[#D4AF37]/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex items-center gap-3">
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
      </div>
    );
  }

  if (currentResultado === "denegada") {
    return (
      <div className="relative overflow-hidden bg-gradient-to-r from-[#2E1A47] to-[#3d2460] px-4 py-3 mb-6">
        <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex items-center gap-3">
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
      </div>
    );
  }

  return null;
}
