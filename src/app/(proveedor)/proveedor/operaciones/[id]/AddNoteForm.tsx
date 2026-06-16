"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddNoteForm({ operationId }: { operationId: string }) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/proveedor/operations/${operationId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Error al guardar la nota");
        return;
      }

      setTexto("");
      router.refresh();
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={3}
        placeholder="Añade una nota o actualización..."
        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2E1A47]/30 focus:border-[#2E1A47] resize-none"
      />
      {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}
      <button
        type="submit"
        disabled={loading || !texto.trim()}
        className="bg-[#2E1A47] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#5a3d80] transition-colors disabled:opacity-50"
      >
        {loading ? "Guardando..." : "Añadir nota"}
      </button>
    </form>
  );
}
