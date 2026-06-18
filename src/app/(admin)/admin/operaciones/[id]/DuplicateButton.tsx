"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DuplicateButton({ opId }: { opId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDuplicate() {
    if (!confirm("¿Duplicar esta operación? Se creará una copia con el siguiente número de OP.")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/operations/${opId}/duplicate`, { method: "POST" });
      if (res.ok) {
        const newOp = await res.json();
        router.push(`/admin/operaciones/${newOp.id}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDuplicate}
      disabled={loading}
      className="px-3 py-1.5 text-xs font-semibold border border-[#2E1A47] text-[#2E1A47] hover:bg-[#EEEBF3] transition-colors disabled:opacity-50"
    >
      {loading ? "Duplicando…" : "Duplicar operación"}
    </button>
  );
}
