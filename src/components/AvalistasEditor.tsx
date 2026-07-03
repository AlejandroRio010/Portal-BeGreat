"use client";

import { useRef, useState } from "react";
import EmpresaSearchInput from "@/components/EmpresaSearchInput";
import { formatDocId } from "@/lib/format";

export interface AvalistaForm {
  /** Clave estable que vincula al avalista con sus documentos */
  key?: string | null;
  tipo: "persona_fisica" | "empresa";
  nombre: string;
  email: string;
  telefono: string;
  persona_contacto: string;
  dni: string;
  empresa: string;
  contact_id: string | null;
  client_id: string | null;
  cif: string;
  direccion: string;
  cnae: string;
  web: string;
  empresaNueva?: boolean;
}

export function emptyAvalista(): AvalistaForm {
  return {
    tipo: "persona_fisica", nombre: "", email: "", telefono: "", persona_contacto: "",
    dni: "", empresa: "", contact_id: null, client_id: null,
    cif: "", direccion: "", cnae: "", web: "", empresaNueva: false,
  };
}

export function avalistaFormFrom(s: {
  tipo?: string | null; nombre?: string | null; email?: string | null; telefono?: string | null;
  persona_contacto?: string | null; dni?: string | null; empresa?: string | null;
  contact_id?: string | null; client_id?: string | null;
}): AvalistaForm {
  return {
    ...emptyAvalista(),
    tipo: s.tipo === "empresa" ? "empresa" : "persona_fisica",
    nombre: s.nombre ?? "",
    email: s.email ?? "",
    telefono: s.telefono ?? "",
    persona_contacto: s.persona_contacto ?? "",
    dni: s.dni ?? "",
    empresa: s.empresa ?? "",
    contact_id: s.contact_id ?? null,
    client_id: s.client_id ?? null,
  };
}

/** Payload que esperan las APIs PATCH en el campo `avalistas`. */
export function avalistasPayload(avalistas: AvalistaForm[]) {
  return avalistas
    .filter(a => a.nombre.trim())
    .map(a => ({
      key: a.key ?? null,
      tipo: a.tipo,
      nombre: a.nombre.trim(),
      email: a.email || null,
      telefono: a.telefono || null,
      persona_contacto: a.persona_contacto || null,
      dni: a.tipo === "persona_fisica" ? (a.dni || null) : null,
      empresa: a.tipo === "persona_fisica" ? (a.empresa || null) : null,
      contact_id: a.tipo === "persona_fisica" ? a.contact_id : null,
      client_id: a.tipo === "empresa" ? a.client_id : null,
      cif: a.tipo === "empresa" ? (a.cif || null) : null,
      direccion: a.tipo === "empresa" ? (a.direccion || null) : null,
      cnae: a.tipo === "empresa" ? (a.cnae || null) : null,
      web: a.tipo === "empresa" ? (a.web || null) : null,
    }));
}

type Dropdown = { idx: number; kind: "persona" | "empresa" | "pfEmpresa" } | null;

export default function AvalistasEditor({
  avalistas,
  onChange,
  inputCls = "w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]",
  labelCls = "block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1",
}: {
  avalistas: AvalistaForm[];
  onChange: (next: AvalistaForm[]) => void;
  inputCls?: string;
  labelCls?: string;
}) {
  const [results, setResults] = useState<any[]>([]);
  const [dropdown, setDropdown] = useState<Dropdown>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function patch(i: number, partial: Partial<AvalistaForm>) {
    onChange(avalistas.map((a, idx) => (idx === i ? { ...a, ...partial } : a)));
  }

  function remove(i: number) {
    onChange(avalistas.filter((_, idx) => idx !== i));
  }

  function search(i: number, kind: NonNullable<Dropdown>["kind"], q: string) {
    if (timer.current) clearTimeout(timer.current);
    if (q.length < 2) { setResults([]); setDropdown(null); return; }
    timer.current = setTimeout(async () => {
      const url = kind === "persona"
        ? `/api/search/personas?q=${encodeURIComponent(q)}`
        : `/api/search/clientes?q=${encodeURIComponent(q)}`;
      const data = await fetch(url).then(r => r.json()).catch(() => []);
      setResults(data);
      setDropdown({ idx: i, kind });
    }, 250);
  }

  const closeDropdown = () => setTimeout(() => setDropdown(null), 200);

  return (
    <div className="space-y-3">
      {avalistas.map((a, i) => (
        <div key={i} className="border border-gray-200 p-3 space-y-3 bg-gray-50/40">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Avalista {i + 1}</p>
            <button type="button" onClick={() => remove(i)} className="text-[10px] text-gray-400 hover:text-red-500 font-semibold">✕ Quitar</button>
          </div>

          {/* Tipo */}
          <div className="grid grid-cols-2 gap-0 border border-gray-200">
            <button type="button" onClick={() => patch(i, { tipo: "persona_fisica" })}
              className={`py-2 text-xs font-semibold transition-all ${a.tipo === "persona_fisica" ? "bg-[#2E1A47] text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>Persona física</button>
            <button type="button" onClick={() => patch(i, { tipo: "empresa" })}
              className={`py-2 text-xs font-semibold transition-all border-l border-gray-200 ${a.tipo === "empresa" ? "bg-[#2E1A47] text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>Empresa</button>
          </div>

          {a.tipo === "persona_fisica" ? (
            <>
              <div className="relative">
                <label className={labelCls}>Nombre del avalista</label>
                <input value={a.nombre}
                  onChange={e => { patch(i, { nombre: e.target.value, contact_id: null }); search(i, "persona", e.target.value); }}
                  onBlur={closeDropdown}
                  className={inputCls} placeholder="Buscar persona de contacto..." autoComplete="off" />
                {dropdown?.idx === i && dropdown.kind === "persona" && results.length > 0 && (
                  <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-gray-200 shadow-lg max-h-48 overflow-y-auto">
                    {results.map((p: any, ri: number) => (
                      <button key={ri} type="button"
                        onMouseDown={() => {
                          patch(i, {
                            nombre: p.nombre, email: p.email ?? "", telefono: p.telefono ?? "",
                            empresa: p.empresa ?? p.client_nombre ?? "", persona_contacto: p.rol ?? "",
                            contact_id: p.id ?? null,
                          });
                          setDropdown(null); setResults([]);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-[#EEEBF3] border-b border-gray-50 last:border-0">
                        <p className="text-xs font-semibold text-gray-800">{p.nombre}</p>
                      </button>
                    ))}
                  </div>
                )}
                {a.contact_id && <p className="text-[10px] text-emerald-600 mt-1">Vinculado a contacto existente</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>DNI / NIF</label>
                  <input value={a.dni} onChange={e => patch(i, { dni: e.target.value })}
                    onBlur={e => patch(i, { dni: formatDocId(e.target.value) })}
                    className={inputCls} placeholder="12345678A" />
                </div>
                <div className="relative">
                  <label className={labelCls}>Empresa</label>
                  <input value={a.empresa}
                    onChange={e => { patch(i, { empresa: e.target.value }); search(i, "pfEmpresa", e.target.value); }}
                    onBlur={closeDropdown}
                    className={inputCls} placeholder="Buscar empresa..." />
                  {dropdown?.idx === i && dropdown.kind === "pfEmpresa" && results.length > 0 && (
                    <div className="absolute z-30 left-0 right-0 top-full bg-white border border-gray-200 shadow-lg max-h-40 overflow-y-auto">
                      {results.map((c: any) => (
                        <button key={c.id} type="button"
                          onMouseDown={() => { patch(i, { empresa: c.nombre }); setDropdown(null); }}
                          className="w-full text-left px-3 py-2 hover:bg-[#EEEBF3] border-b border-gray-50 last:border-0">
                          <p className="text-xs font-semibold text-gray-800">{c.nombre}</p>
                          {c.cif && <p className="text-[10px] text-gray-400">{c.cif}</p>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <input type="email" value={a.email} onChange={e => patch(i, { email: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Teléfono</label>
                  <input value={a.telefono} onChange={e => patch(i, { telefono: e.target.value })} className={inputCls} />
                </div>
              </div>
            </>
          ) : (
            <>
              {a.client_id ? (
                <div className="flex items-center justify-between border border-[#2E1A47] bg-[#EEEBF3] px-3 py-2">
                  <div>
                    <p className="text-xs font-semibold text-[#2E1A47]">{a.nombre}</p>
                    <p className="text-[10px] text-gray-500">{[a.email, a.telefono].filter(Boolean).join(" · ")}</p>
                  </div>
                  <button type="button" onClick={() => patch(i, { ...emptyAvalista(), tipo: "empresa", key: a.key })}
                    className="text-[10px] text-gray-400 hover:text-red-500">✕ Cambiar</button>
                </div>
              ) : a.empresaNueva ? (
                <div className="border border-emerald-200 bg-emerald-50/50 p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Nueva empresa avalista</p>
                    <button type="button" onClick={() => patch(i, { ...emptyAvalista(), tipo: "empresa", key: a.key })}
                      className="text-[10px] text-gray-400 hover:text-red-500">✕ Cancelar</button>
                  </div>
                  <EmpresaSearchInput
                    value={a.nombre}
                    onChange={(v: string) => patch(i, { nombre: v })}
                    inp={inputCls}
                    labelCls={labelCls}
                    onSelect={(data: any) => {
                      patch(i, {
                        nombre: data.nombre,
                        email: data.email || a.email,
                        telefono: data.telefono || a.telefono,
                        cif: data.cif || a.cif,
                        direccion: data.direccion || a.direccion,
                        cnae: data.cnae || a.cnae,
                        web: data.web || a.web,
                      });
                    }}
                    onCifDuplicate={() => {}}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Persona de contacto</label>
                      <input value={a.persona_contacto} onChange={e => patch(i, { persona_contacto: e.target.value })} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Email</label>
                      <input type="email" value={a.email} onChange={e => patch(i, { email: e.target.value })} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Teléfono</label>
                      <input value={a.telefono} onChange={e => patch(i, { telefono: e.target.value })} className={inputCls} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <label className={labelCls}>Empresa avalista</label>
                  <input value={a.nombre}
                    onChange={e => { patch(i, { nombre: e.target.value, client_id: null }); search(i, "empresa", e.target.value); }}
                    onBlur={closeDropdown}
                    className={inputCls} placeholder="Buscar empresa..." autoComplete="off" />
                  {dropdown?.idx === i && dropdown.kind === "empresa" && (
                    <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-gray-200 shadow-lg max-h-60 overflow-y-auto">
                      {results.map((c: any) => (
                        <button key={c.id} type="button"
                          onMouseDown={() => {
                            patch(i, {
                              nombre: c.nombre, email: c.email ?? "", telefono: c.telefono ?? "",
                              persona_contacto: c.contacto_nombre ?? "", client_id: c.id ?? null, empresaNueva: false,
                            });
                            setDropdown(null); setResults([]);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-[#EEEBF3] border-b border-gray-50 last:border-0">
                          <p className="text-xs font-semibold text-gray-800">{c.nombre}</p>
                          <p className="text-[10px] text-gray-400">{[c.codigo, c.cif].filter(Boolean).join(" · ")}</p>
                        </button>
                      ))}
                      <button type="button" onMouseDown={() => { patch(i, { empresaNueva: true }); setDropdown(null); }}
                        className="w-full text-left px-3 py-2.5 bg-emerald-50 hover:bg-emerald-100 border-t border-gray-200">
                        <p className="text-xs font-bold text-emerald-700">+ Nueva empresa (buscar en API)</p>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      ))}

      <button type="button" onClick={() => onChange([...avalistas, emptyAvalista()])}
        className="text-[10px] font-semibold text-[#2E1A47] hover:underline">+ Añadir avalista</button>
    </div>
  );
}
