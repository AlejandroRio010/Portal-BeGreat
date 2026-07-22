"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setSaldoInicial } from "./actions";

const eur = (n: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

/** Saldo de los bancos a 1 de enero, editable en línea. Sin él, la caja del
 *  diario solo puede mostrarse como variación acumulada del año. */
export default function SaldoInicialEdit({ anyo, valor }: { anyo: number; valor: number | null }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  function guardar() {
    setEditing(false);
    const n = Number(v.replace(/\./g, "").replace(",", "."));
    if (v.trim() === "" || Number.isNaN(n)) return;
    start(async () => { await setSaldoInicial(anyo, n); router.refresh(); });
  }

  if (editing) {
    return (
      <input autoFocus type="text" inputMode="decimal" value={v} onChange={e => setV(e.target.value)}
        onBlur={guardar} onKeyDown={e => { if (e.key === "Enter") guardar(); if (e.key === "Escape") setEditing(false); }}
        placeholder="0,00" className="w-32 border border-[#2E1A47]/30 rounded-lg px-2 py-1 text-sm font-bold text-[#2E1A47] focus:outline-none" />
    );
  }
  return (
    <button type="button" disabled={pending}
      onClick={() => { setV(valor != null ? String(valor).replace(".", ",") : ""); setEditing(true); }}
      title={`Saldo de los bancos a 1 de enero de ${anyo} (editar)`}
      className={`text-xs font-semibold hover:underline ${valor != null ? "text-gray-500" : "text-[#2E1A47]"}`}>
      {pending ? "…" : valor != null ? `Saldo a 1 ene: ${eur(valor)}` : "+ Poner saldo inicial de bancos"}
    </button>
  );
}
