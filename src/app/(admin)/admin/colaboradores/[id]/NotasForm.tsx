"use client";

import { useState } from "react";

export default function NotasForm({ colaboradorId, initialNotas }: { colaboradorId: string; initialNotas: string | null }) {
  const [notas, setNotas] = useState(initialNotas ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await fetch(`/api/admin/colaboradores/${colaboradorId}/notas`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notas_internas: notas }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <textarea
        value={notas}
        onChange={(e) => setNotas(e.target.value)}
        rows={5}
        placeholder="Añade notas internas sobre este colaborador..."
        className="w-full border border-gray-200 p-3 text-sm text-gray-700 resize-y focus:outline-none focus:border-[#2E1A47] bg-white"
      />
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-[#2E1A47] text-white text-sm font-semibold hover:bg-[#3d2460] disabled:opacity-50 transition-colors"
        >
          {saving ? "Guardando..." : "Guardar nota"}
        </button>
        {saved && <span className="text-xs text-emerald-600 font-medium">Guardado</span>}
      </div>
    </div>
  );
}
