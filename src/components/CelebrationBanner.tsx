"use client";

import { useEffect, useState } from "react";

export default function CelebrationBanner({ opNombre, clientNombre, colaboradorLogoUrl }: { opNombre: string; clientNombre: string; colaboradorLogoUrl?: string | null }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    // Fire confetti
    import("canvas-confetti").then(mod => {
      const confetti = mod.default;
      // Left cannon
      confetti({ particleCount: 80, spread: 70, origin: { x: 0.2, y: 0.6 }, colors: ["#2E1A47", "#EEEBF3", "#8b5cf6", "#10b981"] });
      // Right cannon
      setTimeout(() => {
        confetti({ particleCount: 80, spread: 70, origin: { x: 0.8, y: 0.6 }, colors: ["#2E1A47", "#EEEBF3", "#8b5cf6", "#10b981"] });
      }, 200);
      // Center burst
      setTimeout(() => {
        confetti({ particleCount: 120, spread: 100, origin: { x: 0.5, y: 0.5 }, colors: ["#2E1A47", "#EEEBF3", "#f59e0b", "#10b981"] });
      }, 500);
    });

    const timer = setTimeout(() => setShow(false), 15000);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <div className="mb-6 bg-gradient-to-r from-[#2E1A47] to-[#5a3d80] px-8 py-6 flex items-center justify-between relative overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute -top-4 -left-4 w-24 h-24 bg-white/5" style={{ borderRadius: "50%" }} />
      <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-white/5" style={{ borderRadius: "50%" }} />

      <div className="flex items-center gap-5 relative z-10">
        <div className="flex items-center gap-4">
          {/* BeGreat logo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/begreat-logo-blanco.png" alt="BeGreat" className="h-10 object-contain flex-shrink-0" />
          <span className="text-white/60 text-2xl font-thin">×</span>
          {/* Colaborador logo */}
          {colaboradorLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={colaboradorLogoUrl} alt="Colaborador" className="h-10 object-contain bg-white/10 px-2 flex-shrink-0" />
          ) : (
            <div className="h-10 w-10 bg-white/20 flex items-center justify-center text-white text-lg font-black flex-shrink-0">
              {clientNombre.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div>
          <p className="text-white text-xl font-black">¡Operación cerrada!</p>
          <p className="text-white/70 text-sm mt-0.5">{opNombre} — {clientNombre}</p>
        </div>
      </div>

      <button
        onClick={() => setShow(false)}
        className="text-white/40 hover:text-white text-lg relative z-10"
      >
        ×
      </button>
    </div>
  );
}
