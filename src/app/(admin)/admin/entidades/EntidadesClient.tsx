"use client";

import { useState } from "react";
import Link from "next/link";

interface Entidad {
  id: string;
  nombre: string;
  tipo: string;
  logo_url: string | null;
  web: string | null;
  officesCount: number;
  opsCount: number;
}

const TIPO_TABS = [
  { key: "banco",                 label: "Bancos" },
  { key: "alternativa_financiera", label: "Alternativas" },
  { key: "renting",               label: "Renting" },
] as const;

const TIPO_ACCENT: Record<string, string> = {
  banco:                  "border-t-blue-400",
  alternativa_financiera: "border-t-amber-400",
  renting:                "border-t-violet-500",
};

export default function EntidadesClient({ entidades }: { entidades: Entidad[] }) {
  const [tab, setTab] = useState<string>("banco");

  const filtered = entidades.filter(e => e.tipo === tab);

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-0 mb-6 border-b border-gray-200">
        {TIPO_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-6 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? "border-[#2E1A47] text-[#2E1A47]"
                : "border-transparent text-gray-400 hover:text-[#2E1A47]"
            }`}
          >
            {t.label}
            <span className="ml-2 text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 font-semibold">
              {entidades.filter(e => e.tipo === t.key).length}
            </span>
          </button>
        ))}
      </div>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">Sin entidades de este tipo todavía.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(e => {
            const inicial = e.nombre.charAt(0).toUpperCase();
            const accent = TIPO_ACCENT[e.tipo] ?? "border-t-gray-300";
            return (
              <Link
                key={e.id}
                href={`/admin/entidades/${e.id}`}
                className={`bg-white border border-gray-200 border-t-[3px] ${accent} p-5 hover:shadow-md hover:border-gray-300 transition-all group flex flex-col gap-3`}
              >
                {/* Logo / inicial */}
                <div className="flex items-start justify-between">
                  {e.logo_url ? (
                    <img src={e.logo_url} alt={e.nombre} className="h-10 w-10 object-contain" />
                  ) : (
                    <div className="h-10 w-10 bg-[#EEEBF3] flex items-center justify-center text-[#2E1A47] text-lg font-bold">
                      {inicial}
                    </div>
                  )}
                  <span className="text-[#2E1A47] text-xs opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                </div>

                {/* Nombre */}
                <p className="text-sm font-bold text-gray-900 group-hover:text-[#2E1A47] leading-tight">{e.nombre}</p>

                {/* Stats */}
                <div className="flex gap-4 mt-auto">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Oficinas</p>
                    <p className="text-sm font-black text-[#2E1A47]">{e.officesCount}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Ops</p>
                    <p className="text-sm font-black text-[#2E1A47]">{e.opsCount}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
