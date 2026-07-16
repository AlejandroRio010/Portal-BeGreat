"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { crearColaboradorRapido } from "./actions";

export default function AddColaboradorButton() {
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [cif, setCif] = useState("");
  const [esAutonomo, setEsAutonomo] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  function guardar() {
    if (!nombre.trim()) { setError("El nombre es obligatorio"); return; }
    setError("");
    start(async () => {
      try {
        await crearColaboradorRapido({ nombre, cif, es_autonomo: esAutonomo });
        setNombre(""); setCif(""); setEsAutonomo(false); setOpen(false);
        router.refresh();
      } catch (e: any) {
        setError(e?.message ?? "Error al crear");
      }
    });
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 bg-[#2E1A47] text-white text-sm font-semibold rounded-xl px-4 py-2 hover:bg-[#3d2560] transition-colors">
        <span className="text-base leading-none">＋</span> Añadir colaborador
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-xl mt-[10vh]" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-[#2E1A47]">Añadir colaborador</h2>
              <p className="text-xs text-gray-400 mt-0.5">Alta rápida para poder atribuirle comisiones. Sin acceso al portal hasta configurar sus credenciales en la ficha.</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Nombre *</label>
                <input autoFocus value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Fosterman, Krattos…"
                  onKeyDown={e => { if (e.key === "Enter") guardar(); }}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[#2E1A47]/40" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">CIF / NIF <span className="text-gray-300 font-normal">(opcional)</span></label>
                <input value={cif} onChange={e => setCif(e.target.value)} placeholder="B12345678"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[#2E1A47]/40" />
              </div>
              <label className="flex items-start gap-2.5 cursor-pointer bg-[#EEEBF3]/50 rounded-xl px-4 py-3">
                <input type="checkbox" checked={esAutonomo} onChange={e => setEsAutonomo(e.target.checked)} className="mt-0.5 accent-[#2E1A47]" />
                <span className="text-xs text-gray-600">
                  <b className="text-[#2E1A47]">Es autónomo</b> — sus facturas llevan <b>IVA 21% y retención de IRPF 7%</b>. Se tiene en cuenta al buscar su pago y para el cálculo de impuestos.
                </span>
              </label>
              {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-3">
              <button onClick={guardar} disabled={pending}
                className="bg-[#2E1A47] text-white px-5 py-2.5 text-sm font-semibold rounded-xl hover:bg-[#3d2560] transition-colors disabled:opacity-60">
                {pending ? "Creando…" : "Crear colaborador"}
              </button>
              <button onClick={() => setOpen(false)} className="text-sm text-gray-400 hover:text-gray-600 ml-auto">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
