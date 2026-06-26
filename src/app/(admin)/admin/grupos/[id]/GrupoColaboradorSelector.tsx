"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Colaborador { id: string; nombre: string }

export default function GrupoColaboradorSelector({
  grupoId,
  grupoNombre,
  currentCollaboratorId,
  colaboradores,
}: {
  grupoId: string;
  grupoNombre: string;
  currentCollaboratorId: string | null;
  colaboradores: Colaborador[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value || null;
    setSaving(true);
    await fetch(`/api/admin/grupos/${grupoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: grupoNombre, collaborator_id: value }),
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="py-2.5 flex flex-col gap-1">
      <span className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Colaborador vinculado</span>
      <select
        value={currentCollaboratorId ?? ""}
        onChange={handleChange}
        disabled={saving}
        className="text-sm border border-gray-200 px-2 py-1.5 bg-white focus:outline-none focus:border-[#2E1A47] disabled:opacity-50"
      >
        <option value="">Sin colaborador</option>
        {colaboradores.map(c => (
          <option key={c.id} value={c.id}>{c.nombre}</option>
        ))}
      </select>
    </div>
  );
}
