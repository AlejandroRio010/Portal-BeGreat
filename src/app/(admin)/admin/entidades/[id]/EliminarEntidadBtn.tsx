"use client";

import { useState } from "react";
import { eliminarEntidad } from "../actions";

export default function EliminarEntidadBtn({ entidadId }: { entidadId: string }) {
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    await eliminarEntidad(entidadId);
  }

  if (!confirm) {
    return (
      <button
        onClick={() => setConfirm(true)}
        className="text-xs text-red-400 hover:text-red-600 font-semibold border border-red-200 px-3 py-1.5 hover:bg-red-50 transition-colors"
      >
        Eliminar entidad
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-red-300 font-semibold">¿Seguro?</span>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="px-3 py-1.5 text-xs font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50"
      >
        {deleting ? "Eliminando..." : "Sí, eliminar"}
      </button>
      <button
        onClick={() => setConfirm(false)}
        className="px-3 py-1.5 text-xs font-semibold text-gray-300 border border-white/20 hover:bg-white/10"
      >
        Cancelar
      </button>
    </div>
  );
}
