"use client";

import { useState, useRef, useEffect } from "react";
import { buscarCnaes, getCnaeByCode } from "@/lib/cnaes";

interface Props {
  value: string;       // código guardado, ej: "6209"
  onChange: (value: string) => void;
  placeholder?: string;
}

function getLabel(code: string): string {
  if (!code) return "";
  const cnae = getCnaeByCode(code);
  return cnae ? `${cnae.codigo} — ${cnae.titulo}` : code;
}

export default function CnaeAutocomplete({ value, onChange, placeholder = "Buscar CNAE..." }: Props) {
  // El input muestra el label completo, pero guardamos solo el código
  const [query, setQuery] = useState(() => getLabel(value));
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const resultados = buscarCnaes(query.split(" — ")[0] || query);

  // Sincronizar si el valor externo cambia (carga inicial)
  useEffect(() => {
    setQuery(getLabel(value));
  }, [value]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(cnae: { codigo: string; titulo: string }) {
    const label = `${cnae.codigo} — ${cnae.titulo}`;
    setQuery(label);
    onChange(cnae.codigo);
    setOpen(false);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    setOpen(true);
    if (!e.target.value) onChange("");
  }

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={query}
        onChange={handleChange}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]"
      />
      {open && resultados.length > 0 && (
        <div className="absolute z-50 w-full bg-white border border-gray-200 shadow-md max-h-60 overflow-y-auto">
          {resultados.map(cnae => (
            <button
              key={cnae.codigo}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(cnae); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-[#EEEBF3] border-b border-gray-50 last:border-0"
            >
              <span className="font-bold text-[#2E1A47]">{cnae.codigo}</span>
              <span className="text-gray-500"> — {cnae.titulo}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
