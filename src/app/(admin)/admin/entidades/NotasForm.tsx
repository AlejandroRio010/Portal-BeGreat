"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NotasForm({
  entityId,
  officeId,
  initialNotas,
}: {
  entityId?: string;
  officeId?: string;
  initialNotas: string | null;
}) {
  const router = useRouter();
  const [notas, setNotas] = useState(initialNotas ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    const url = officeId
      ? `/api/admin/entidades/oficinas/${officeId}`
      : `/api/admin/entidades/${entityId}`;

    // We need nombre+tipo for entity PATCH, so for notas-only we extend the API
    // Use a dedicated notas-only endpoint
    const res = await fetch(`${url}/notas`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notas: notas || null }),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      router.refresh();
    }
    setSaving(false);
  }

  return (
    <div className="bg-white border border-gray-200">
      <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Notas internas</h3>
        {saved && <span className="text-[10px] text-emerald-600 font-semibold">Guardado ✓</span>}
      </div>
      <div className="px-5 py-4">
        <textarea
          value={notas}
          onChange={e => setNotas(e.target.value)}
          rows={4}
          placeholder="Características, condiciones, notas importantes..."
          className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47] resize-none"
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-2 w-full py-2 text-xs font-bold text-white bg-[#2E1A47] hover:bg-[#3d2460] disabled:opacity-50 uppercase tracking-wider"
        >
          {saving ? "Guardando..." : "Guardar notas"}
        </button>
      </div>
    </div>
  );
}
