"use client";

import { useState, useRef } from "react";

// Campo "Nombre de la empresa" que también busca clientes existentes
export function EmpresaBuscadorField({ nombre, setNombre, onSelect, onClearLink, disabled, label, inp, searchUrl = "/api/search/clientes" }: {
  nombre: string;
  setNombre: (v: string) => void;
  onSelect: (c: any) => void;
  onClearLink: () => void;
  disabled?: boolean;
  label: string;
  inp: string;
  searchUrl?: string;
}) {
  const [resultados, setResultados] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function buscar(q: string) {
    setNombre(q);
    onClearLink();
    if (timer.current) clearTimeout(timer.current);
    if (q.length < 2) { setResultados([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      const res = await fetch(`${searchUrl}?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResultados(data);
      setOpen(data.length > 0);
    }, 250);
  }

  return (
    <div className="relative">
      <label className={label}>Nombre de la empresa *</label>
      <input
        name="cliente_nombre"
        required
        value={nombre}
        disabled={disabled}
        onChange={e => buscar(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className={inp + (disabled ? " bg-gray-50 text-gray-500" : "")}
        placeholder="Empresa S.L. — escribe para buscar existentes"
        autoComplete="off"
      />
      {open && resultados.length > 0 && (
        <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-gray-200 shadow-lg max-h-48 overflow-y-auto">
          {resultados.map((c: any) => (
            <button key={c.id} type="button"
              onMouseDown={() => { onSelect(c); setResultados([]); setOpen(false); }}
              className="w-full text-left px-3 py-2.5 hover:bg-[#EEEBF3] border-b border-gray-50 last:border-0">
              <p className="text-sm font-semibold text-gray-800">{c.nombre}</p>
              <p className="text-xs text-gray-400 mt-0.5">{[c.codigo, c.cif, c.email].filter(Boolean).join(" · ")}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Campo "Nombre del proveedor" que también busca proveedores existentes
export function ProveedorBuscadorField({ nombre, setNombre, onSelect, onClearLink, label, inp, searchUrl = "/api/search/proveedores" }: {
  nombre: string;
  setNombre: (v: string) => void;
  onSelect: (p: any) => void;
  onClearLink: () => void;
  label: string;
  inp: string;
  searchUrl?: string;
}) {
  const [resultados, setResultados] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function buscar(q: string) {
    setNombre(q);
    onClearLink();
    if (timer.current) clearTimeout(timer.current);
    if (q.length < 2) { setResultados([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      const res = await fetch(`${searchUrl}?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResultados(data);
      setOpen(data.length > 0);
    }, 250);
  }

  return (
    <div className="relative">
      <label className={label}>Nombre del proveedor</label>
      <input
        name="proveedor_nombre"
        value={nombre}
        onChange={e => buscar(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className={inp}
        placeholder="Proveedor S.A. — escribe para buscar existentes"
        autoComplete="off"
      />
      {open && resultados.length > 0 && (
        <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-gray-200 shadow-lg max-h-48 overflow-y-auto">
          {resultados.map((p: any) => (
            <button key={p.id} type="button"
              onMouseDown={() => { onSelect(p); setResultados([]); setOpen(false); }}
              className="w-full text-left px-3 py-2.5 hover:bg-[#EEEBF3] border-b border-gray-50 last:border-0">
              <p className="text-sm font-semibold text-gray-800">{p.nombre}</p>
              <p className="text-xs text-gray-400 mt-0.5">{[p.codigo, p.persona_contacto, p.email].filter(Boolean).join(" · ")}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Persona de contacto con autocompletado por nombre
export function ContactoInline({ nombre, setNombre, email, setEmail, telefono, setTelefono, inp }: {
  nombre: string; setNombre: (v: string) => void;
  email: string; setEmail: (v: string) => void;
  telefono: string; setTelefono: (v: string) => void;
  inp: string;
}) {
  const [resultados, setResultados] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function buscar(q: string) {
    setNombre(q);
    if (timer.current) clearTimeout(timer.current);
    if (q.length < 2) { setResultados([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      const res = await fetch(`/api/search/personas?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResultados(data);
      setOpen(data.length > 0);
    }, 250);
  }

  function seleccionar(p: any) {
    setNombre(p.nombre);
    setEmail(p.email ?? "");
    setTelefono(p.telefono ?? "");
    setResultados([]);
    setOpen(false);
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="relative">
        <input name="contacto_nombre" value={nombre} onChange={e => buscar(e.target.value)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className={inp} placeholder="Nombre" autoComplete="off" />
        {open && resultados.length > 0 && (
          <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-gray-200 shadow-lg max-h-48 overflow-y-auto">
            {resultados.map((p: any, i: number) => (
              <button key={i} type="button" onMouseDown={() => seleccionar(p)}
                className="w-full text-left px-3 py-2.5 hover:bg-[#EEEBF3] border-b border-gray-50 last:border-0">
                <p className="text-sm font-semibold text-gray-800">{p.nombre}</p>
                <p className="text-xs text-gray-400 mt-0.5">{[p.rol, p.email, p.telefono].filter(Boolean).join(" · ")}</p>
              </button>
            ))}
          </div>
        )}
      </div>
      <input name="contacto_email" type="email" value={email} onChange={e => setEmail(e.target.value)} className={inp} placeholder="Email" />
      <input name="contacto_telefono" value={telefono} onChange={e => setTelefono(e.target.value)} className={inp} placeholder="Teléfono" />
    </div>
  );
}
