"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { crearCategoria, borrarCategoria, renombrarCategoria } from "./actions";

// ─── Alta de categoría ────────────────────────────────────────────────────────
export function AddCategoriaForm({ tipo = "gasto" }: { tipo?: "gasto" | "ingreso" }) {
  const [nombre, setNombre] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  function guardar() {
    const n = nombre.trim();
    if (!n) return;
    start(async () => { await crearCategoria(tipo, n); setNombre(""); router.refresh(); });
  }

  return (
    <div className="flex items-center gap-2">
      <input value={nombre} onChange={e => setNombre(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") guardar(); }}
        placeholder="Nueva categoría…"
        className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[#2E1A47]/40" />
      <button onClick={guardar} disabled={pending || !nombre.trim()}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-[#2E1A47] hover:bg-[#3d2560] rounded-xl px-4 py-2.5 disabled:opacity-50 transition-colors">
        <span className="leading-none">＋</span> Añadir
      </button>
    </div>
  );
}

// ─── Fila de categoría (renombrar inline + quitar) ────────────────────────────
export function CategoriaRow({ id, nombre, usos }: { id: string; nombre: string; usos: number }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(nombre);
  const [pending, start] = useTransition();
  const router = useRouter();

  function guardar() {
    setEditing(false);
    const n = val.trim();
    if (!n || n === nombre) return;
    start(async () => { await renombrarCategoria(id, n); router.refresh(); });
  }
  function quitar() {
    const aviso = usos > 0
      ? `¿Quitar la categoría "${nombre}"? La usan ${usos} gasto${usos !== 1 ? "s" : ""} fijo${usos !== 1 ? "s" : ""} — conservarán el texto pero ya no aparecerá en el selector.`
      : `¿Quitar la categoría "${nombre}"?`;
    if (!confirm(aviso)) return;
    start(async () => { await borrarCategoria(id); router.refresh(); });
  }

  return (
    <div className="group flex items-center gap-2 px-3 py-2.5 hover:bg-[#EEEBF3]/30 rounded-xl">
      {editing ? (
        <input autoFocus value={val} onChange={e => setVal(e.target.value)} onBlur={guardar}
          onKeyDown={e => { if (e.key === "Enter") guardar(); if (e.key === "Escape") { setEditing(false); setVal(nombre); } }}
          className="flex-1 border border-[#2E1A47]/40 rounded-lg px-2 py-1 text-sm focus:outline-none" />
      ) : (
        <button type="button" onClick={() => { setVal(nombre); setEditing(true); }}
          title="Renombrar" className="flex-1 text-left text-sm font-medium text-gray-800 flex items-center gap-1.5">
          {pending ? "…" : nombre}
          <span className="opacity-0 group-hover:opacity-100 text-gray-300 text-[10px] transition-opacity">editar</span>
        </button>
      )}
      {usos > 0 && !editing && (
        <span className="text-[10px] text-gray-400 whitespace-nowrap">{usos} en uso</span>
      )}
      <button type="button" onClick={quitar} disabled={pending}
        title="Quitar categoría"
        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 text-[10px] font-semibold transition-all disabled:opacity-40">Quitar</button>
    </div>
  );
}
