"use client";

import { useState } from "react";
import NuevoClienteForm from "./NuevoClienteForm";

interface Colab { id: string; nombre: string; role?: string }

export function NuevoClienteButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="px-4 py-2 bg-[#2E1A47] text-white text-sm font-semibold hover:bg-[#3d2460] transition-colors">
      + Nuevo cliente
    </button>
  );
}

export default function NuevoClienteToggle({ colaboradores }: { colaboradores: Colab[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
        </div>
        <NuevoClienteButton onClick={() => setOpen(!open)} />
      </div>
      {open && <NuevoClienteForm colaboradores={colaboradores} onClose={() => setOpen(false)} />}
    </>
  );
}
