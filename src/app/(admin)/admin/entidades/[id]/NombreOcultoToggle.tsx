"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NombreOcultoToggle({ entidadId, initialValue }: { entidadId: string; initialValue: boolean }) {
  const router = useRouter();
  const [oculto, setOculto] = useState(initialValue);
  const [saving, setSaving] = useState(false);

  async function toggle() {
    const next = !oculto;
    setOculto(next);
    setSaving(true);
    try {
      await fetch(`/api/admin/entidades/${entidadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre_oculto: next }),
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 px-5 py-3 flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold text-gray-800">Ocultar nombre para colaboradores nivel 4</p>
        <p className="text-xs text-gray-400 mt-0.5">Si está activo, los colaboradores con nivel 4 verán &quot;Confidencial&quot; en lugar del nombre de esta entidad.</p>
      </div>
      <button
        onClick={toggle}
        disabled={saving}
        className={`flex-shrink-0 relative inline-flex h-6 w-11 items-center transition-colors focus:outline-none disabled:opacity-50 ${
          oculto ? "bg-[#2E1A47]" : "bg-gray-200"
        }`}
      >
        <span className={`inline-block h-4 w-4 bg-white transition-transform ${oculto ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </div>
  );
}
