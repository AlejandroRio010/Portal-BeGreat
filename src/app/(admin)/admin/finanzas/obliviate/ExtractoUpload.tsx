"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function ExtractoUpload() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [estado, setEstado] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);

  const subir = async (file: File) => {
    setSubiendo(true);
    setEstado(null);
    try {
      const fd = new FormData();
      fd.append("extracto", file);
      const res = await fetch("/api/admin/obliviate/extracto", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) setEstado(`⚠ ${data.error ?? "Error al importar"}`);
      else {
        setEstado(`✓ ${data.nuevos} movimiento${data.nuevos === 1 ? "" : "s"} nuevo${data.nuevos === 1 ? "" : "s"}${data.duplicados > 0 ? ` (${data.duplicados} ya estaban)` : ""}`);
        router.refresh();
      }
    } catch {
      setEstado("⚠ Error de red al subir el extracto");
    } finally {
      setSubiendo(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-3">
      <input ref={inputRef} type="file" accept=".xls,.xlsx" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) subir(f); }} />
      <button onClick={() => inputRef.current?.click()} disabled={subiendo}
        className="px-4 py-2 bg-[#2E1A47] text-white text-xs font-bold uppercase tracking-wide rounded-xl hover:bg-[#2E1A47]/90 disabled:opacity-50 transition-colors">
        {subiendo ? "Importando…" : "Subir extracto del Sabadell"}
      </button>
      {estado && <p className={`text-xs font-semibold ${estado.startsWith("✓") ? "text-emerald-700" : "text-amber-600"}`}>{estado}</p>}
    </div>
  );
}
