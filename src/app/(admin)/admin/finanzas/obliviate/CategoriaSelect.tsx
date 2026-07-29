"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIAS_OBLIVIATE, type CategoriaObliviate } from "@/lib/obliviate";

export default function CategoriaSelect({ id, categoria }: { id: string; categoria: CategoriaObliviate }) {
  const router = useRouter();
  const [val, setVal] = useState(categoria);
  const [saving, setSaving] = useState(false);

  const cambiar = async (nueva: string) => {
    const prev = val;
    setVal(nueva as CategoriaObliviate);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/obliviate/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoria: nueva }),
      });
      if (!res.ok) { setVal(prev); }
      else router.refresh();
    } catch { setVal(prev); }
    finally { setSaving(false); }
  };

  return (
    <select
      value={val}
      disabled={saving}
      onClick={e => e.stopPropagation()}
      onChange={e => cambiar(e.target.value)}
      className="text-[9px] font-bold uppercase tracking-wide border border-gray-200 rounded-full px-1.5 py-0.5 bg-white text-gray-600 hover:border-[#2E1A47]/40 cursor-pointer disabled:opacity-50"
    >
      {CATEGORIAS_OBLIVIATE.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
    </select>
  );
}
