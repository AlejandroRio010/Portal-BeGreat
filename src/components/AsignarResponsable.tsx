"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface Props {
  currentId: string | null;
  currentNombre: string | null;
  patchUrl: string;
  fieldName?: string;
}

type User = { id: string; nombre: string; role: string };

export default function AsignarResponsable({ currentId, currentNombre, patchUrl, fieldName = "collaborator_id" }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(currentId ?? "");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/admin/users-list")
      .then(r => r.json())
      .then(setUsers)
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function save() {
    setSaving(true);
    await fetch(patchUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [fieldName]: selected || null }),
    });
    setSaving(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="relative inline-block" ref={ref}>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-800">{currentNombre ?? "Sin asignar"}</span>
        <button onClick={() => { setOpen(!open); setSelected(currentId ?? ""); }}
          className="text-[10px] text-[#2E1A47] font-semibold border border-[#2E1A47]/30 px-1.5 py-0.5 hover:bg-[#EEEBF3] transition-colors">
          ✎
        </button>
      </div>
      {open && (
        <div className="absolute z-40 top-full left-0 mt-1 bg-white border border-gray-200 shadow-lg p-3 space-y-2 min-w-[240px]">
          {loading ? (
            <p className="text-xs text-gray-400">Cargando...</p>
          ) : (
            <select value={selected} onChange={e => setSelected(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-200 focus:outline-none focus:border-[#2E1A47]">
              <option value="">Sin asignar</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.nombre}{u.role === "admin" ? " (Admin)" : ""}</option>)}
            </select>
          )}
          <div className="flex gap-2">
            <button onClick={save} disabled={saving}
              className="px-3 py-1 bg-[#2E1A47] text-white text-xs font-semibold hover:bg-[#3d2460] disabled:opacity-50">
              {saving ? "..." : "Guardar"}
            </button>
            <button onClick={() => setOpen(false)}
              className="px-3 py-1 border border-gray-200 text-xs text-gray-500 hover:bg-gray-50">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
