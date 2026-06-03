"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  colaboradorId: string;
  puedeEditarOps: boolean;
  puedeVerEntidades: boolean;
}

export default function PermisosForm({ colaboradorId, puedeEditarOps, puedeVerEntidades }: Props) {
  const router = useRouter();
  const [editarOps, setEditarOps] = useState(puedeEditarOps);
  const [verEntidades, setVerEntidades] = useState(puedeVerEntidades);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function toggle(field: "puede_editar_ops" | "puede_ver_entidades", value: boolean) {
    if (field === "puede_editar_ops") setEditarOps(value);
    else setVerEntidades(value);

    setSaving(true);
    setSaved(false);
    try {
      await fetch(`/api/admin/colaboradores/${colaboradorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200">
      <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Permisos especiales</h3>
        {saving && <span className="text-[10px] text-gray-400">Guardando...</span>}
        {saved && <span className="text-[10px] text-emerald-600 font-semibold">Guardado ✓</span>}
      </div>
      <div className="px-5 py-4 space-y-4">

        {/* Puede editar ops */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-800">Puede editar operaciones y clientes</p>
            <p className="text-xs text-gray-400 mt-0.5">Permite al colaborador editar los datos de sus propias operaciones y clientes, y añadir personas de contacto.</p>
          </div>
          <button
            onClick={() => toggle("puede_editar_ops", !editarOps)}
            disabled={saving}
            className={`flex-shrink-0 relative inline-flex h-6 w-11 items-center transition-colors focus:outline-none disabled:opacity-50 ${
              editarOps ? "bg-[#2E1A47]" : "bg-gray-200"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 bg-white transition-transform ${
                editarOps ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        <div className="border-t border-gray-100" />

        {/* Puede ver entidades */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-800">Puede ver entidades financieras</p>
            <p className="text-xs text-gray-400 mt-0.5">Da acceso a la sección de entidades financieras, incluyendo fichas de oficinas y personas de contacto. Solo para colaboradores internos.</p>
          </div>
          <button
            onClick={() => toggle("puede_ver_entidades", !verEntidades)}
            disabled={saving}
            className={`flex-shrink-0 relative inline-flex h-6 w-11 items-center transition-colors focus:outline-none disabled:opacity-50 ${
              verEntidades ? "bg-[#2E1A47]" : "bg-gray-200"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 bg-white transition-transform ${
                verEntidades ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

      </div>
    </div>
  );
}
