"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function EliminarEntidadBtn({ entidadId }: { entidadId: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/entidades/${entidadId}`, { method: "DELETE" });
      if (res.ok) router.push("/admin/entidades");
    } finally {
      setDeleting(false);
      setConfirm(false);
    }
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
      <span className="text-xs text-red-600 font-semibold">¿Seguro?</span>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="px-3 py-1.5 text-xs font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50"
      >
        {deleting ? "Eliminando..." : "Sí, eliminar"}
      </button>
      <button
        onClick={() => setConfirm(false)}
        className="px-3 py-1.5 text-xs font-semibold text-gray-500 border border-gray-200 hover:bg-gray-50"
      >
        Cancelar
      </button>
    </div>
  );
}
