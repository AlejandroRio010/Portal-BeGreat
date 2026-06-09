"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

const PRODUCTOS_CONSULTORIA = [
  "Póliza de crédito",
  "Leasing",
  "Préstamo",
  "Confirming",
  "Factoring",
  "Otro",
];

const PLAZOS = [12, 24, 36, 48, 60, 72];

type Pipeline = "consultoria" | "renting";
type RentingRol = "proveedor" | "colaborador";

const inp = "w-full px-3 py-2.5 border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-[#2E1A47] focus:border-[#2E1A47] bg-white";
const label = "block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5";

export default function AltaOperacionPage() {
  const router = useRouter();
  const [pipeline, setPipeline] = useState<Pipeline>("consultoria");
  const rentingRol: RentingRol = "colaborador";
  const [producto, setProducto] = useState("");
  const [esRenovacion, setEsRenovacion] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any | null>(null);
  const [contactoNombre, setContactoNombre] = useState("");
  const [contactoEmail, setContactoEmail] = useState("");
  const [contactoTelefono, setContactoTelefono] = useState("");
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteEmail, setClienteEmail] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [clienteWeb, setClienteWeb] = useState("");
  const [proveedorNombre, setProveedorNombre] = useState("");
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<any | null>(null);
  const [renovBusqueda, setRenovBusqueda] = useState("");
  const [renovResultados, setRenovResultados] = useState<any[]>([]);
  const [renovSeleccionada, setRenovSeleccionada] = useState<any | null>(null);
  const [renovDropdown, setRenovDropdown] = useState(false);
  const renovTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function fillCliente(c: any) {
    setClienteSeleccionado(c);
    setClienteNombre(c.nombre);
    setClienteEmail(c.email ?? "");
    setClienteTelefono(c.telefono ?? "");
    setClienteWeb(c.web ?? "");
  }

  // Autocompletar búsqueda de renovación
  useEffect(() => {
    if (!esRenovacion) return;
    if (renovTimer.current) clearTimeout(renovTimer.current);
    if (renovBusqueda.length < 2) { setRenovResultados([]); return; }
    renovTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/operations/search?q=${encodeURIComponent(renovBusqueda)}`);
      const data = await res.json();
      setRenovResultados(data);
      setRenovDropdown(true);
    }, 300);
  }, [renovBusqueda, esRenovacion]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const data: Record<string, string> = {};
    form.forEach((v, k) => { data[k] = v as string; });

    const res = await fetch("/api/operations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        pipeline_key: pipeline,
        renting_rol: rentingRol,
        es_renovacion: esRenovacion,
        operacion_original_id: renovSeleccionada?.id ?? null,
        proveedor_nombre: proveedorNombre || null,
        // Si es renovación y hay cliente seleccionado, aseguramos que se envía el nombre
        ...(esRenovacion && renovSeleccionada?.client_nombre ? { cliente_nombre: renovSeleccionada.client_nombre } : {}),
      }),
    });

    setLoading(false);
    if (!res.ok) { setError("Error al enviar la operación. Inténtalo de nuevo."); return; }
    router.push(pipeline === "consultoria" ? "/portal/operaciones/consultoria" : "/portal/operaciones/renting");
  }

  return (
    <div className="mx-auto" style={{ maxWidth: 680 }}>
      <div className="mb-8 pb-5 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">Alta nueva operación</h1>
        <p className="text-sm text-gray-500 mt-1">
          La operación quedará en estado{" "}
          <span className="inline-block bg-amber-50 text-amber-700 text-xs font-semibold px-2 py-0.5 border border-amber-200">
            Pendiente de validar
          </span>{" "}
          hasta que BeGreat la revise y confirme.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Tipo de operación */}
        <Section title="Tipo de operación">
          <div className="grid grid-cols-2 gap-0 border border-gray-300">
            {(["consultoria", "renting"] as Pipeline[]).map((p, i) => (
              <button
                key={p}
                type="button"
                onClick={() => setPipeline(p)}
                className={`py-4 text-sm font-semibold transition-all ${i === 0 ? "border-r border-gray-300" : ""} ${
                  pipeline === p
                    ? "bg-[#2E1A47] text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {p === "consultoria" ? "Consultoría financiera" : "Renting de equipos"}
              </button>
            ))}
          </div>
        </Section>

        {/* Nombre de la operación */}
        <Section title="Nombre de la operación">
          <div>
            <label className={label}>Nombre identificativo *</label>
            <input
              name="nombre"
              required
              className={inp}
              placeholder="Ej: Empresa S.L. — Op01 — Banco Santander"
            />
            <p className="text-xs text-gray-400 mt-1.5">Un nombre que te ayude a identificar esta operación fácilmente. Puedes usar el formato: Nombre comercial — Nº op — Entidad financiera.</p>
          </div>
        </Section>

        {/* ── CONSULTORÍA ──────────────────────────────────────────────── */}
        {pipeline === "consultoria" && (
          <>
            <Section title="Producto solicitado">
              <div className="grid grid-cols-3 gap-2">
                {PRODUCTOS_CONSULTORIA.map((p) => (
                  <label
                    key={p}
                    className={`flex items-center gap-2 px-3 py-3 border text-sm cursor-pointer transition-all ${
                      producto === p
                        ? "border-[#2E1A47] bg-[#EEEBF3] font-semibold text-[#2E1A47]"
                        : "border-gray-200 text-gray-700 hover:border-gray-400"
                    }`}
                  >
                    <input
                      type="radio"
                      name="producto"
                      value={p}
                      required
                      className="accent-[#2E1A47]"
                      onChange={() => setProducto(p)}
                    />
                    {p}
                  </label>
                ))}
              </div>
              {producto === "Otro" && (
                <div className="mt-3">
                  <label className={label}>Describe qué necesita tu cliente</label>
                  <textarea
                    name="producto_otro"
                    rows={2}
                    required
                    className={inp + " resize-none"}
                    placeholder="Describe brevemente el tipo de financiación o producto que busca tu cliente..."
                  />
                </div>
              )}
            </Section>

            <Section title="¿Es una renovación?">
              <div className="border border-gray-200 divide-y divide-gray-100">
                <label className="flex items-start gap-4 p-4 cursor-pointer hover:bg-gray-50">
                  <input type="radio" name="renovacion_tipo" value="nueva" defaultChecked className="mt-0.5 accent-[#2E1A47]"
                    onChange={() => { setEsRenovacion(false); setRenovSeleccionada(null); setRenovBusqueda(""); }} />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Nueva operación</p>
                    <p className="text-xs text-gray-400 mt-0.5">El cliente no ha operado con nosotros anteriormente para este producto.</p>
                  </div>
                </label>
                <label className="flex items-start gap-4 p-4 cursor-pointer hover:bg-gray-50">
                  <input type="radio" name="renovacion_tipo" value="renovacion" className="mt-0.5 accent-[#2E1A47]"
                    onChange={() => setEsRenovacion(true)} />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Renovación de una operación anterior</p>
                    <p className="text-xs text-gray-400 mt-0.5">Ya trabajamos con este cliente para este producto y vamos a renovar o ampliar.</p>
                  </div>
                </label>
              </div>

              {esRenovacion && (
                <div className="mt-4 relative">
                  <label className={label}>Buscar operación original</label>
                  {renovSeleccionada ? (
                    <div className="flex items-center justify-between border border-[#2E1A47] bg-[#EEEBF3] px-3 py-2.5">
                      <div>
                        <p className="text-sm font-semibold text-[#2E1A47]">{renovSeleccionada.nombre ?? renovSeleccionada.client_nombre}</p>
                        <p className="text-xs text-gray-500">{renovSeleccionada.codigo} · {renovSeleccionada.client_nombre}</p>
                      </div>
                      <button type="button" onClick={() => { setRenovSeleccionada(null); setRenovBusqueda(""); }}
                        className="text-xs text-gray-400 hover:text-red-500 ml-3">✕ Cambiar</button>
                    </div>
                  ) : (
                    <>
                      <input
                        value={renovBusqueda}
                        onChange={e => setRenovBusqueda(e.target.value)}
                        onFocus={() => renovResultados.length > 0 && setRenovDropdown(true)}
                        onBlur={() => setTimeout(() => setRenovDropdown(false), 150)}
                        className={inp}
                        placeholder="Escribe el nombre del cliente o de la operación..."
                        autoComplete="off"
                      />
                      {renovDropdown && renovResultados.length > 0 && (
                        <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-200 shadow-lg max-h-64 overflow-y-auto">
                          {renovResultados.map((op: any) => (
                            <button key={op.id} type="button"
                              onMouseDown={() => {
                                setRenovSeleccionada(op);
                                if (op.client_nombre) fillCliente({ nombre: op.client_nombre, email: op.client_email, telefono: op.client_telefono, web: op.client_web });
                                setRenovBusqueda("");
                                setRenovDropdown(false);
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-[#EEEBF3] border-b border-gray-50 last:border-0">
                              <p className="text-sm font-semibold text-gray-800">{op.nombre ?? op.client_nombre}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{op.codigo} · {op.client_nombre} · {op.pipeline_key === "consultoria" ? "Consultoría" : "Renting"}</p>
                            </button>
                          ))}
                        </div>
                      )}
                      {renovBusqueda.length >= 2 && renovResultados.length === 0 && (
                        <p className="text-xs text-gray-400 mt-1.5">No se encontraron operaciones con ese nombre.</p>
                      )}
                    </>
                  )}
                  {/* Campo oculto con el ID de la op original */}
                  <input type="hidden" name="operacion_original_id" value={renovSeleccionada?.id ?? ""} />
                </div>
              )}
            </Section>

            <Section title="Datos del cliente">
              <div className="grid grid-cols-2 gap-4">
                <EmpresaBuscadorField
                  nombre={clienteNombre} setNombre={setClienteNombre}
                  onSelect={fillCliente}
                  onClearLink={() => setClienteSeleccionado(null)}
                  disabled={!!(esRenovacion && renovSeleccionada?.client_nombre)}
                  label={label} inp={inp}
                />
                <div>
                  <label className={label}>Importe (€)</label>
                  <input name="importe" type="number" step="1000" className={inp} placeholder="50.000" />
                </div>
                <div>
                  <label className={label}>Email</label>
                  <input name="cliente_email" type="email" value={clienteEmail} onChange={e => setClienteEmail(e.target.value)} className={inp} placeholder="contacto@empresa.es" />
                </div>
                <div>
                  <label className={label}>Teléfono</label>
                  <input name="cliente_telefono" value={clienteTelefono} onChange={e => setClienteTelefono(e.target.value)} className={inp} placeholder="612 345 678" />
                </div>
              </div>
            </Section>
          </>
        )}

        {/* ── RENTING ──────────────────────────────────────────────────── */}
        {pipeline === "renting" && (
          <>
            <Section title="Datos del equipo">
              <div className="grid grid-cols-2 gap-0 border border-gray-300 mb-4">
                {[
                  { val: "industrial", label: "Industrial", desc: "Maquinaria, vehículos, producción" },
                  { val: "tecnologico", label: "Tecnológico", desc: "IT, servidores, impresoras" },
                ].map((t, i) => (
                  <label
                    key={t.val}
                    className={`flex items-start gap-3 p-4 cursor-pointer transition-all has-[:checked]:bg-[#EEEBF3] has-[:checked]:border-[#2E1A47] ${i === 0 ? "border-r border-gray-300" : ""}`}
                  >
                    <input type="radio" name="equipo_tipo" value={t.val} required className="mt-0.5 accent-[#2E1A47]" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{t.label}</p>
                      <p className="text-xs text-gray-400">{t.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={label}>Importe (€)</label>
                  <input name="importe" type="number" step="1000" className={inp} placeholder="10.000" />
                </div>
                <div>
                  <label className={label}>Plazo deseado</label>
                  <select name="plazo_meses" className={inp}>
                    <option value="">Seleccionar</option>
                    {PLAZOS.map((m) => <option key={m} value={m}>{m} meses</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className={label}>Lugar de instalación / entrega</label>
                  <input name="lugar_entrega" className={inp} placeholder="Dirección completa" />
                </div>
                <div className="col-span-2">
                  <label className={label}>Descripción del equipo a arrendar</label>
                  <textarea
                    name="descripcion"
                    rows={3}
                    className={inp + " resize-none"}
                    placeholder="Describe brevemente el tipo de equipo, marca, modelo, características técnicas..."
                  />
                </div>
              </div>
            </Section>

            <Section title="Datos del cliente">
              <div className="grid grid-cols-2 gap-4">
                <EmpresaBuscadorField
                  nombre={clienteNombre} setNombre={setClienteNombre}
                  onSelect={fillCliente}
                  onClearLink={() => setClienteSeleccionado(null)}
                  label={label} inp={inp}
                />
                <div>
                  <label className={label}>Email</label>
                  <input name="cliente_email" type="email" value={clienteEmail} onChange={e => setClienteEmail(e.target.value)} className={inp} placeholder="info@empresa.es" />
                </div>
                <div>
                  <label className={label}>Teléfono</label>
                  <input name="cliente_telefono" value={clienteTelefono} onChange={e => setClienteTelefono(e.target.value)} className={inp} placeholder="612 345 678" />
                </div>
                <div>
                  <label className={label}>Web</label>
                  <input name="cliente_web" value={clienteWeb} onChange={e => setClienteWeb(e.target.value)} className={inp} placeholder="www.empresa.es" />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Persona de contacto</p>
                <ContactoInline
                  nombre={contactoNombre} setNombre={setContactoNombre}
                  email={contactoEmail} setEmail={setContactoEmail}
                  telefono={contactoTelefono} setTelefono={setContactoTelefono}
                  inp={inp}
                />
              </div>
            </Section>

            <Section title="Proveedor de los equipos">
              <ProveedorBuscadorField
                nombre={proveedorNombre} setNombre={setProveedorNombre}
                onSelect={setProveedorSeleccionado}
                onClearLink={() => setProveedorSeleccionado(null)}
                label={label} inp={inp}
              />
              <p className="text-xs text-gray-400 mt-2">
                Si el proveedor ya está registrado, búscalo por su nombre. Si es nuevo, escríbelo y se dará de alta automáticamente.
              </p>
            </Section>
          </>
        )}

        {/* Notas y comunicación - solo consultoría (renting usa descripcion en equipo) */}
        {pipeline === "consultoria" && (
          <Section title="Notas adicionales">
            <textarea
              name="descripcion"
              rows={4}
              className={inp + " resize-none"}
              placeholder="Cuéntanos el contexto de la operación, situación del cliente, urgencia, condiciones especiales..."
            />
          </Section>
        )}

        <Section title="Preferencia de comunicación con el cliente">
          <div className="border border-gray-200 divide-y divide-gray-100">
            <label className="flex items-start gap-4 p-4 cursor-pointer hover:bg-gray-50">
              <input type="radio" name="contacto_directo" value="false" defaultChecked className="mt-0.5 accent-[#2E1A47]" />
              <div>
                <p className="text-sm font-semibold text-gray-800">Yo gestiono la comunicación con el cliente</p>
                <p className="text-xs text-gray-400 mt-0.5">BeGreat me mantendrá informado del avance. En cualquier caso, antes de la firma siempre nos pondremos en contacto contigo para coordinar.</p>
              </div>
            </label>
            <label className="flex items-start gap-4 p-4 cursor-pointer hover:bg-gray-50">
              <input type="radio" name="contacto_directo" value="true" className="mt-0.5 accent-[#2E1A47]" />
              <div>
                <p className="text-sm font-semibold text-gray-800">Autorizo a BeGreat a contactar directamente con el cliente</p>
                <p className="text-xs text-gray-400 mt-0.5">BeGreat gestionará el contacto en tu nombre. Te mantendremos informado en todo momento y, antes de cualquier firma, nos coordinaremos contigo.</p>
              </div>
            </label>
          </div>
        </Section>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#2E1A47] text-white py-3.5 text-sm font-bold hover:bg-[#5a3d80] transition-colors disabled:opacity-60"
        >
          {loading ? "Enviando operación..." : "Enviar operación a BeGreat"}
        </button>
      </form>
    </div>
  );
}

function ContactoInline({ nombre, setNombre, email, setEmail, telefono, setTelefono, inp }: {
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
        <input
          name="contacto_nombre"
          value={nombre}
          onChange={e => buscar(e.target.value)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className={inp}
          placeholder="Nombre"
          autoComplete="off"
        />
        {open && resultados.length > 0 && (
          <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-200 shadow-lg max-h-48 overflow-y-auto">
            {resultados.map((p: any, i: number) => (
              <button key={i} type="button"
                onMouseDown={() => seleccionar(p)}
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 p-6">
      <h2 className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest mb-5 pb-3 border-b border-gray-100">{title}</h2>
      {children}
    </div>
  );
}

// Campo "Nombre de la empresa" que actúa también de buscador de clientes existentes
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

// Campo "Nombre del proveedor" que actúa también de buscador de proveedores existentes
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
