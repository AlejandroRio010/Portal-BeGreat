"use client";

import { useState, useEffect, useRef } from "react";

interface EmpresaResult {
  cif: string | null;
  nombre: string | null;
  direccion: string | null;
  provincia: string | null;
  cnae: string | null;
  cnae_label: string | null;
  telefono: string | null;
  email: string | null;
  web: string | null;
}

interface Props {
  onSelect: (data: {
    nombre: string;
    cif: string;
    direccion?: string;
    provincia?: string;
    cnae?: string;
    cnae_label?: string;
    telefono?: string;
    email?: string;
    web?: string;
  }) => void;
  onCifDuplicate?: (nombre: string) => void;
  inp: string;
  labelCls: string;
  value: string;
  onChange: (v: string) => void;
}

export default function EmpresaSearchInput({ onSelect, onCifDuplicate, inp, labelCls, value, onChange }: Props) {
  const [results, setResults] = useState<EmpresaResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cifWarning, setCifWarning] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value || value.length < 3) { setResults([]); setOpen(false); return; }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search/empresas?q=${encodeURIComponent(value)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
          setOpen(data.length > 0);
        }
      } catch { /* ignore */ }
      setLoading(false);
    }, 400);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [value]);

  async function checkCifDuplicate(cif: string): Promise<boolean> {
    try {
      const res = await fetch("/api/search/empresas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cif }),
      });
      if (res.ok) {
        const { exists, nombre } = await res.json();
        if (exists) {
          setCifWarning(`Esta empresa (${nombre}) ya existe en tu base de datos con CIF ${cif}.`);
          onCifDuplicate?.(nombre);
          return true;
        }
      }
    } catch { /* ignore */ }
    setCifWarning("");
    return false;
  }

  async function handleSelect(empresa: EmpresaResult) {
    setOpen(false);
    setResults([]);

    if (empresa.cif) {
      const isDupe = await checkCifDuplicate(empresa.cif);
      if (isDupe) return;
    }

    onSelect({
      nombre: empresa.nombre ?? value,
      cif: empresa.cif ?? "",
      direccion: empresa.direccion ?? "",
      provincia: empresa.provincia ?? "",
      cnae: empresa.cnae ?? "",
      cnae_label: empresa.cnae_label ?? "",
      telefono: empresa.telefono ?? "",
      email: empresa.email ?? "",
      web: empresa.web ?? "",
    });
  }

  return (
    <div ref={containerRef} className="relative">
      <label className={labelCls}>Nombre empresa *</label>
      <div className="relative">
        <input
          value={value}
          onChange={e => { onChange(e.target.value); setCifWarning(""); }}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          className={inp}
          placeholder="Buscar empresa por nombre..."
          autoComplete="off"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-[#2E1A47] animate-spin" style={{ borderRadius: "50%" }} />
          </div>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-40 left-0 right-0 top-full mt-1 bg-white border border-gray-200 shadow-lg max-h-60 overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={() => handleSelect(r)}
              className="w-full text-left px-3 py-2.5 hover:bg-[#EEEBF3] border-b border-gray-50 last:border-0"
            >
              <p className="text-sm font-semibold text-gray-800">{r.nombre}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {[r.cif, r.provincia, r.cnae_label || r.cnae].filter(Boolean).join(" · ")}
              </p>
              {r.direccion && <p className="text-xs text-gray-300 mt-0.5">{r.direccion}</p>}
            </button>
          ))}
        </div>
      )}

      {cifWarning && (
        <p className="text-xs text-amber-600 mt-1.5 bg-amber-50 border border-amber-200 px-3 py-2 font-semibold">
          {cifWarning}
        </p>
      )}
    </div>
  );
}
