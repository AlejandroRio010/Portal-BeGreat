"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Props {
  opId: string;
  pipelineKey: string;
  initialProducto: string | null;
  initialImporte: string | null;
  initialDescripcion: string | null;
  initialPlazoMeses: number | null;
  initialLugarEntrega: string | null;
  initialEquipoTipo: string | null;
  initialEsRenovacion?: boolean;
  initialOpOriginal?: { id: string; codigo: string | null; nombre: string | null } | null;
  initialNecesidad?: string | null;
  initialTieneAval?: boolean;
  initialAvalTipo?: string | null;
  initialAvalNombre?: string | null;
  initialAvalEmail?: string | null;
  initialAvalTelefono?: string | null;
  initialAvalPersonaContacto?: string | null;
  initialAvalDni?: string | null;
  initialAvalEmpresa?: string | null;
  initialAvalContactId?: string | null;
  initialAvalClientId?: string | null;
  initialModalidadRenting?: string | null;
}

export default function OpEditForm({
  opId, pipelineKey,
  initialProducto, initialImporte, initialDescripcion,
  initialPlazoMeses, initialLugarEntrega, initialEquipoTipo,
  initialEsRenovacion, initialOpOriginal,
  initialNecesidad, initialTieneAval, initialAvalTipo,
  initialAvalNombre, initialAvalEmail, initialAvalTelefono,
  initialAvalPersonaContacto, initialAvalDni, initialAvalEmpresa,
  initialAvalContactId, initialAvalClientId,
  initialModalidadRenting,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    producto: initialProducto ?? "",
    importe: initialImporte ?? "",
    descripcion: initialDescripcion ?? "",
    plazo_meses: initialPlazoMeses ? String(initialPlazoMeses) : "",
    lugar_entrega: initialLugarEntrega ?? "",
    equipo_tipo: initialEquipoTipo ?? "",
    necesidad: initialNecesidad ?? "",
    modalidad_renting: initialModalidadRenting ?? "",
  });
  const [esRenov, setEsRenov] = useState(!!initialEsRenovacion);
  const [opOriginal, setOpOriginal] = useState(initialOpOriginal ?? null);
  const [renovBusq, setRenovBusq] = useState("");
  const [renovRes, setRenovRes] = useState<any[]>([]);
  const [renovOpen, setRenovOpen] = useState(false);
  const renovTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Aval state
  const [tieneAval, setTieneAval] = useState(!!initialTieneAval);
  const [avalTipo, setAvalTipo] = useState(initialAvalTipo ?? "persona_fisica");
  const [avalNombre, setAvalNombre] = useState(initialAvalNombre ?? "");
  const [avalEmail, setAvalEmail] = useState(initialAvalEmail ?? "");
  const [avalTelefono, setAvalTelefono] = useState(initialAvalTelefono ?? "");
  const [avalPersonaContacto, setAvalPersonaContacto] = useState(initialAvalPersonaContacto ?? "");
  const [avalDni, setAvalDni] = useState(initialAvalDni ?? "");
  const [avalEmpresa, setAvalEmpresa] = useState(initialAvalEmpresa ?? "");
  const [avalContactId, setAvalContactId] = useState(initialAvalContactId ?? null);
  const [avalClientId, setAvalClientId] = useState(initialAvalClientId ?? null);

  // Aval search state
  const [avalSearchResults, setAvalSearchResults] = useState<any[]>([]);
  const [avalSearchOpen, setAvalSearchOpen] = useState(false);
  const avalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Aval empresa search
  const [avalEmpresaResults, setAvalEmpresaResults] = useState<any[]>([]);
  const [avalEmpresaOpen, setAvalEmpresaOpen] = useState(false);
  const [avalEmpresaApiResults, setAvalEmpresaApiResults] = useState<any[]>([]);
  const avalEmpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  // Search personas for persona física avalista
  function buscarPersona(q: string) {
    setAvalNombre(q);
    setAvalContactId(null);
    if (avalTimer.current) clearTimeout(avalTimer.current);
    if (q.length < 2) { setAvalSearchResults([]); setAvalSearchOpen(false); return; }
    avalTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/search/personas?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setAvalSearchResults(data);
      setAvalSearchOpen(data.length > 0);
    }, 250);
  }

  function selectPersona(p: any) {
    setAvalNombre(p.nombre);
    setAvalEmail(p.email ?? "");
    setAvalTelefono(p.telefono ?? "");
    setAvalEmpresa(p.empresa ?? p.client_nombre ?? "");
    setAvalPersonaContacto(p.rol ?? "");
    setAvalContactId(p.id ?? null);
    setAvalSearchResults([]);
    setAvalSearchOpen(false);
  }

  // Search clients/empresas for empresa avalista
  function buscarEmpresaAval(q: string) {
    setAvalNombre(q);
    setAvalClientId(null);
    if (avalEmpTimer.current) clearTimeout(avalEmpTimer.current);
    if (q.length < 2) { setAvalEmpresaResults([]); setAvalEmpresaApiResults([]); setAvalEmpresaOpen(false); return; }
    avalEmpTimer.current = setTimeout(async () => {
      // Search DB clients
      const [dbRes, apiRes] = await Promise.all([
        fetch(`/api/search/clientes?q=${encodeURIComponent(q)}`).then(r => r.json()).catch(() => []),
        fetch(`/api/search/empresas?q=${encodeURIComponent(q)}`).then(r => r.json()).catch(() => []),
      ]);
      setAvalEmpresaResults(dbRes);
      setAvalEmpresaApiResults(apiRes);
      setAvalEmpresaOpen(dbRes.length > 0 || apiRes.length > 0);
    }, 300);
  }

  function selectClienteAval(c: any) {
    setAvalNombre(c.nombre);
    setAvalEmail(c.email ?? "");
    setAvalTelefono(c.telefono ?? "");
    setAvalPersonaContacto(c.contacto_nombre ?? "");
    setAvalClientId(c.id ?? null);
    setAvalEmpresaResults([]);
    setAvalEmpresaApiResults([]);
    setAvalEmpresaOpen(false);
  }

  function selectApiEmpresaAval(e: any) {
    setAvalNombre(e.nombre ?? "");
    setAvalEmail(e.email ?? "");
    setAvalTelefono(e.telefono ?? "");
    setAvalClientId(null);
    setAvalEmpresaResults([]);
    setAvalEmpresaApiResults([]);
    setAvalEmpresaOpen(false);
  }

  useEffect(() => {
    if (renovTimer.current) clearTimeout(renovTimer.current);
    if (renovBusq.length < 2) { setRenovRes([]); return; }
    renovTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/operations/search?q=${encodeURIComponent(renovBusq)}`);
      setRenovRes(await res.json()); setRenovOpen(true);
    }, 250);
  }, [renovBusq]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null); setSaved(false);
    try {
      const res = await fetch(`/api/operations/${opId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          producto: form.producto || null,
          importe: form.importe || null,
          descripcion: form.descripcion || null,
          plazo_meses: form.plazo_meses || null,
          lugar_entrega: form.lugar_entrega || null,
          equipo_tipo: form.equipo_tipo || null,
          necesidad: form.necesidad || null,
          modalidad_renting: form.modalidad_renting || null,
          es_renovacion: esRenov,
          operacion_original_id: esRenov ? (opOriginal?.id ?? null) : null,
          tiene_aval: tieneAval,
          aval_tipo: tieneAval ? avalTipo : null,
          aval_nombre: tieneAval ? (avalNombre || null) : null,
          aval_email: tieneAval ? (avalEmail || null) : null,
          aval_telefono: tieneAval ? (avalTelefono || null) : null,
          aval_persona_contacto: tieneAval ? (avalPersonaContacto || null) : null,
          aval_dni: tieneAval && avalTipo === "persona_fisica" ? (avalDni || null) : null,
          aval_empresa: tieneAval && avalTipo === "persona_fisica" ? (avalEmpresa || null) : null,
          aval_contact_id: tieneAval && avalTipo === "persona_fisica" ? (avalContactId || null) : null,
          aval_client_id: tieneAval && avalTipo === "empresa" ? (avalClientId || null) : null,
        }),
      });
      if (!res.ok) { const j = await res.json().catch(() => ({})); setError(j.error ?? "Error"); return; }
      setSaved(true);
      setTimeout(() => { setSaved(false); setOpen(false); }, 1500);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]";
  const labelCls = "block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1";

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="text-xs text-[#2E1A47] font-semibold border border-[#2E1A47]/30 px-3 py-1.5 hover:bg-[#EEEBF3] transition-colors">
        Editar datos
      </button>
    );
  }

  return (
    <div className="bg-white border border-gray-200">
      <div className="bg-[#EEEBF3] px-5 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Editar datos de la operación</h3>
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700 text-lg leading-none">×</button>
      </div>
      <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Importe (€)</label>
            <input type="number" step="0.01" value={form.importe} onChange={e => set("importe", e.target.value)}
              className={inputCls} placeholder="0.00" />
          </div>
          <div>
            <label className={labelCls}>
              {pipelineKey === "renting" ? "Tipo de equipo" : "Producto financiero"}
            </label>
            <input value={pipelineKey === "renting" ? form.equipo_tipo : form.producto}
              onChange={e => set(pipelineKey === "renting" ? "equipo_tipo" : "producto", e.target.value)}
              className={inputCls}
              placeholder={pipelineKey === "renting" ? "Vehículos, maquinaria..." : "Leasing, póliza crédito..."} />
          </div>
          {pipelineKey === "renting" && (
            <>
              <div>
                <label className={labelCls}>Plazo (meses)</label>
                <input type="number" value={form.plazo_meses} onChange={e => set("plazo_meses", e.target.value)}
                  className={inputCls} placeholder="24" />
              </div>
              <div>
                <label className={labelCls}>Lugar de entrega</label>
                <input value={form.lugar_entrega} onChange={e => set("lugar_entrega", e.target.value)}
                  className={inputCls} />
              </div>
            </>
          )}
        </div>

        {/* Necesidad / Descripción */}
        <div>
          <label className={labelCls}>{pipelineKey === "consultoria" ? "Necesidad del cliente" : "Descripción del equipo"}</label>
          <textarea value={pipelineKey === "consultoria" ? form.necesidad : form.descripcion}
            onChange={e => set(pipelineKey === "consultoria" ? "necesidad" : "descripcion", e.target.value)} rows={3}
            className={inputCls + " resize-none"}
            placeholder={pipelineKey === "consultoria" ? "Describe brevemente la necesidad del cliente..." : "Descripción del equipo a arrendar..."} />
        </div>

        {/* Modalidad renting */}
        {pipelineKey === "renting" && (
          <div>
            <label className={labelCls}>Modalidad</label>
            <div className="grid grid-cols-3 gap-0 border border-gray-200">
              {([
                ["begreat_comisiona", "BeGreat comisiona"],
                ["begreat_factura", "BeGreat factura"],
                ["begreat_factura_comisiona", "Factura & comisiona"],
              ] as const).map(([val, lbl], i) => (
                <button key={val} type="button" onClick={() => set("modalidad_renting", val)}
                  className={`py-2 text-[11px] font-semibold transition-all ${i > 0 ? "border-l border-gray-200" : ""} ${
                    form.modalidad_renting === val ? "bg-[#2E1A47] text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}>{lbl}</button>
              ))}
            </div>
          </div>
        )}

        {/* Aval */}
        <div className="pt-3 border-t border-gray-100">
          <label className={labelCls}>¿Aporta aval?</label>
          <div className="grid grid-cols-2 gap-0 border border-gray-200 mb-3">
            <button type="button" onClick={() => setTieneAval(false)}
              className={`py-2 text-xs font-semibold transition-all ${!tieneAval ? "bg-[#2E1A47] text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>No</button>
            <button type="button" onClick={() => setTieneAval(true)}
              className={`py-2 text-xs font-semibold transition-all border-l border-gray-200 ${tieneAval ? "bg-[#2E1A47] text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>Sí</button>
          </div>
          {tieneAval && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-0 border border-gray-200">
                <button type="button" onClick={() => { setAvalTipo("persona_fisica"); setAvalNombre(""); setAvalEmail(""); setAvalTelefono(""); setAvalPersonaContacto(""); setAvalDni(""); setAvalEmpresa(""); setAvalContactId(null); setAvalClientId(null); }}
                  className={`py-2 text-xs font-semibold transition-all ${avalTipo === "persona_fisica" ? "bg-[#2E1A47] text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>Persona física</button>
                <button type="button" onClick={() => { setAvalTipo("empresa"); setAvalNombre(""); setAvalEmail(""); setAvalTelefono(""); setAvalPersonaContacto(""); setAvalDni(""); setAvalEmpresa(""); setAvalContactId(null); setAvalClientId(null); }}
                  className={`py-2 text-xs font-semibold transition-all border-l border-gray-200 ${avalTipo === "empresa" ? "bg-[#2E1A47] text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>Empresa</button>
              </div>

              {avalTipo === "persona_fisica" ? (
                <>
                  <div className="relative">
                    <label className={labelCls}>Nombre del avalista</label>
                    <input value={avalNombre} onChange={e => buscarPersona(e.target.value)}
                      onBlur={() => setTimeout(() => setAvalSearchOpen(false), 200)}
                      className={inputCls} placeholder="Buscar persona de contacto..." autoComplete="off" />
                    {avalSearchOpen && avalSearchResults.length > 0 && (
                      <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-gray-200 shadow-lg max-h-48 overflow-y-auto">
                        {avalSearchResults.map((p: any, i: number) => (
                          <button key={i} type="button" onMouseDown={() => selectPersona(p)}
                            className="w-full text-left px-3 py-2 hover:bg-[#EEEBF3] border-b border-gray-50 last:border-0">
                            <p className="text-xs font-semibold text-gray-800">{p.nombre}</p>
                            <p className="text-[10px] text-gray-400">{[p.rol, p.email, p.empresa || p.client_nombre].filter(Boolean).join(" · ")}</p>
                          </button>
                        ))}
                      </div>
                    )}
                    {avalContactId && (
                      <p className="text-[10px] text-emerald-600 mt-1">Vinculado a contacto existente</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>DNI / NIF</label>
                      <input value={avalDni} onChange={e => setAvalDni(e.target.value)} className={inputCls} placeholder="12345678A" />
                    </div>
                    <div>
                      <label className={labelCls}>Empresa</label>
                      <input value={avalEmpresa} onChange={e => setAvalEmpresa(e.target.value)} className={inputCls} placeholder="Empresa del avalista" />
                    </div>
                    <div>
                      <label className={labelCls}>Email</label>
                      <input type="email" value={avalEmail} onChange={e => setAvalEmail(e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Teléfono</label>
                      <input value={avalTelefono} onChange={e => setAvalTelefono(e.target.value)} className={inputCls} />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="relative">
                    <label className={labelCls}>Nombre de la empresa avalista</label>
                    <input value={avalNombre} onChange={e => buscarEmpresaAval(e.target.value)}
                      onBlur={() => setTimeout(() => setAvalEmpresaOpen(false), 200)}
                      className={inputCls} placeholder="Buscar empresa en base de datos o API..." autoComplete="off" />
                    {avalEmpresaOpen && (avalEmpresaResults.length > 0 || avalEmpresaApiResults.length > 0) && (
                      <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-gray-200 shadow-lg max-h-60 overflow-y-auto">
                        {avalEmpresaResults.length > 0 && (
                          <>
                            <p className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase bg-gray-50">Base de datos</p>
                            {avalEmpresaResults.map((c: any) => (
                              <button key={c.id} type="button" onMouseDown={() => selectClienteAval(c)}
                                className="w-full text-left px-3 py-2 hover:bg-[#EEEBF3] border-b border-gray-50 last:border-0">
                                <p className="text-xs font-semibold text-gray-800">{c.nombre}</p>
                                <p className="text-[10px] text-gray-400">{[c.codigo, c.cif, c.email].filter(Boolean).join(" · ")}</p>
                              </button>
                            ))}
                          </>
                        )}
                        {avalEmpresaApiResults.length > 0 && (
                          <>
                            <p className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase bg-gray-50 border-t border-gray-200">Registro mercantil</p>
                            {avalEmpresaApiResults.map((e: any, i: number) => (
                              <button key={i} type="button" onMouseDown={() => selectApiEmpresaAval(e)}
                                className="w-full text-left px-3 py-2 hover:bg-[#EEEBF3] border-b border-gray-50 last:border-0">
                                <p className="text-xs font-semibold text-gray-800">{e.nombre}</p>
                                <p className="text-[10px] text-gray-400">{[e.cif, e.provincia].filter(Boolean).join(" · ")}</p>
                              </button>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                    {avalClientId && (
                      <p className="text-[10px] text-emerald-600 mt-1">Vinculado a cliente existente</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Persona de contacto</label>
                      <input value={avalPersonaContacto} onChange={e => setAvalPersonaContacto(e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Email</label>
                      <input type="email" value={avalEmail} onChange={e => setAvalEmail(e.target.value)} className={inputCls} />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Renovación */}
        <div className="pt-3 border-t border-gray-100">
          <label className="flex items-center gap-2 cursor-pointer mb-2">
            <input type="checkbox" checked={esRenov} onChange={e => setEsRenov(e.target.checked)} className="w-4 h-4 accent-[#2E1A47]" />
            <span className="text-xs font-semibold text-gray-700">Es una renovación de una operación anterior</span>
          </label>
          {esRenov && (
            <div className="relative">
              {opOriginal ? (
                <div className="flex items-center justify-between border border-[#2E1A47] bg-[#EEEBF3] px-3 py-2">
                  <span className="text-xs font-semibold text-[#2E1A47]">{opOriginal.codigo} — {opOriginal.nombre}</span>
                  <button type="button" onClick={() => setOpOriginal(null)} className="text-[10px] text-gray-400 hover:text-red-500">✕ Cambiar</button>
                </div>
              ) : (
                <>
                  <input value={renovBusq} onChange={e => setRenovBusq(e.target.value)}
                    onBlur={() => setTimeout(() => setRenovOpen(false), 150)}
                    className={inputCls}
                    placeholder="Buscar operación a vincular..." autoComplete="off" />
                  {renovOpen && renovRes.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-200 shadow-lg max-h-48 overflow-y-auto">
                      {renovRes.filter((o: any) => o.id !== opId).map((o: any) => (
                        <button key={o.id} type="button" onMouseDown={() => { setOpOriginal(o); setRenovBusq(""); setRenovOpen(false); }}
                          className="w-full text-left px-3 py-2 hover:bg-[#EEEBF3] border-b border-gray-50 last:border-0">
                          <p className="text-xs font-semibold text-gray-800">{o.nombre ?? o.client_nombre}</p>
                          <p className="text-[10px] text-gray-400">{o.codigo} · {o.client_nombre}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setOpen(false)}
            className="px-4 py-2 text-xs font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50">Cancelar</button>
          <button type="submit" disabled={saving}
            className="px-5 py-2 text-xs font-bold text-white bg-[#2E1A47] hover:bg-[#3d2460] disabled:opacity-50 uppercase tracking-wider">
            {saving ? "Guardando..." : saved ? "¡Guardado ✓" : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}
