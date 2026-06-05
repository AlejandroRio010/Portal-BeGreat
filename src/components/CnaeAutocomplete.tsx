"use client";

import { useState, useRef, useEffect } from "react";
import { buscarCnaes, formatCnae } from "@/lib/cnaes";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function CnaeAutocomplete({ value, onChange, placeholder = "Buscar CNAE..." }: Props) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const resultados = buscarCnaes(query);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Si el valor externo cambia (ej. carga inicial), sincronizar el query
  useEffect(() => {
    if (value && value !== query) setQuery(value);
  }, [value]);

  function handleSelect(cnae: { codigo: string; titulo: string }) {
    const formatted = formatCnae(cnae);
    setQuery(formatted);
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
        onFocus={() => query.length >= 2 && setOpen(true)}
        placeholder={placeholder}
        className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]"
      />
      {open && resultados.length > 0 && (
        <div className="absolute z-50 w-full bg-white border border-gray-200 shadow-md max-h-60 overflow-y-auto">
          {resultados.map(cnae => (
            <button
              key={cnae.codigo}
              type="button"
              onClick={() => handleSelect(cnae)}
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
