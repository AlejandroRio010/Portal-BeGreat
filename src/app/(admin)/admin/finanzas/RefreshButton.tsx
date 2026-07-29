"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { refreshHolded } from "./refreshHolded";

// Fuerza la recarga de los datos de Holded (que van cacheados 5 min).
export default function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  const refrescar = () => startTransition(async () => {
    await refreshHolded();
    router.refresh();
    setDone(true);
    setTimeout(() => setDone(false), 3000);
  });

  return (
    <button onClick={refrescar} disabled={pending} title="Vuelve a leer Holded ahora (los datos van cacheados 5 minutos)"
      className="px-3 py-1.5 text-[11px] font-semibold rounded-xl border border-gray-200 bg-white text-gray-500 hover:text-[#2E1A47] hover:border-[#2E1A47]/40 transition-colors disabled:opacity-50 whitespace-nowrap">
      {pending ? "Leyendo Holded…" : done ? "✓ Al día" : "⟳ Refrescar datos"}
    </button>
  );
}
