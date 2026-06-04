"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Persona {
  nombre: string;
  rol?: string | null;
  email?: string | null;
  telefono?: string | null;
  linkedin?: string | null;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelect: (persona: Persona) => void;
  searchUrl?: string;   // defaults to /api/admin/search/personas
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export default function ContactoAutocomplete({
  value,
  onChange,
  onSelect,
  searchUrl = "/api/admin/search/personas",
  placeholder = "Nombre...",
  required,
  className = "",
}: Props) {
  const [results, setResults] = useState<Persona[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`${searchUrl}?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data);
      setOpen(data.length > 0);
    } finally {
      setLoading(false);
    }
  }, [searchUrl]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    onChange(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => search(v), 250);
  }

  function handleSelect(p: Persona) {
    onChange(p.nombre);
    onSelect(p);
    setOpen(false);
    setResults([]);
  }

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onFocus={() => { if (results.length > 0) setOpen(true); }}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        className={`w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47] ${className}`}
      />
      {loading && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">buscando...</span>
      )}
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 shadow-lg max-h-52 overflow-y-auto">
          {results.map((p, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={() => handleSelect(p)}
              className="w-full text-left px-3 py-2.5 hover:bg-[#EEEBF3] transition-colors border-b border-gray-50 last:border-0"
            >
              <p className="text-sm font-semibold text-gray-900">{p.nombre}</p>
              <div className="flex gap-3 mt-0.5 flex-wrap">
                {p.rol && <span className="text-[10px] text-[#2E1A47] font-medium">{p.rol}</span>}
                {p.email && <span className="text-[10px] text-gray-400">{p.email}</span>}
                {p.telefono && <span className="text-[10px] text-gray-400">{p.telefono}</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
