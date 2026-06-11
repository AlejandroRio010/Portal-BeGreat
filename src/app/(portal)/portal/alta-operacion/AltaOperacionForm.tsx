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

const inp = "w-full px-3 py-2.5 border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-[#2E1A47] focus:border-[#2E1A47] bg-white";
const labelCls = "block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5";

interface Props {
  nivelEntidades: number;
}

export default function AltaOperacionForm({ nivelEntidades }: Props) {
  const router = useRouter();
  const [pipeline, setPipeline] = useState<Pipeline>("consultoria");
  const [producto, setProducto] = useState("");

  // Client state
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any | null>(null);
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteEmail, setClienteEmail] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [clienteWeb, setClienteWeb] = useState("");
  const [clienteCnae, setClienteCnae] = useState("");
  const [esNuevoCliente, setEsNuevoCliente] = useState(false);
  const [clienteMissingData, setClienteMissingData] = useState<string[]>([]);

  // Contact state
  const [contactoNombre, setContactoNombre] = useState("");
  const [contactoPuesto, setContactoPuesto] = useState("");
  const [contactoEmail, setContactoEmail] = useState("");
  const [contactoTelefono, setContactoTelefono] = useState("");

  // Supplier state
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<any | null>(null);
  const [proveedorNombre, setProveedorNombre] = useState("");
  const [proveedorEmail, setProveedorEmail] = useState("");
  const [proveedorTelefono, setProveedorTelefono] = useState("");
  const [proveedorWeb, setProveedorWeb] = useState("");
  const [proveedorCnae, setProveedorCnae] = useState("");
  const [esNuevoProveedor, setEsNuevoProveedor] = useState(false);
  const [proveedorMissingData, setProveedorMissingData] = useState<string[]>([]);
  const [provContactoNombre, setProvContactoNombre] = useState("");
  const [provContactoPuesto, setProvContactoPuesto] = useState("");
  const [provContactoEmail, setProvContactoEmail] = useState("");
  const [provContactoTelefono, setProvContactoTelefono] = useState("");

  // Renovation
  const [esRenovacion, setEsRenovacion] = useState(false);
  const [renovBusqueda, setRenovBusqueda] = useState("");
  const [renovResultados, setRenovResultados] = useState<any[]>([]);
  const [renovSeleccionada, setRenovSeleccionada] = useState<any | null>(null);
  const [renovDropdown, setRenovDropdown] = useState(false);
  const renovTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Entity preference (only for nivel 3-4)
  const [entidadPreferencia, setEntidadPreferencia] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function fillCliente(c: any) {
    setClienteSeleccionado(c);
    setClienteNombre(c.nombre);
    setClienteEmail(c.email ?? "");
    setClienteTelefono(c.telefono ?? "");
    setClienteWeb(c.web ?? "");
    setClienteCnae(c.cnae ?? "");
    setEsNuevoCliente(false);

    // Check missing data
    const missing: string[] = [];
    if (!c.email) missing.push("email");
    if (!c.cnae) missing.push("CNAE");
    setClienteMissingData(missing);

    if (c.contacto_nombre) {
      setContactoNombre(c.contacto_nombre);
      setContactoEmail(c.contacto_email ?? "");
      setContactoTelefono(c.contacto_telefono ?? "");
      setContactoPuesto(c.contacto_puesto ?? "");
    } else {
      setContactoNombre("");
      setContactoEmail("");
      setContactoTelefono("");
      setContactoPuesto("");
      if (!missing.includes("persona de contacto")) missing.push("persona de contacto");
      setClienteMissingData([...missing]);
    }
  }

  function fillProveedor(p: any) {
    setProveedorSeleccionado(p);
    setProveedorNombre(p.nombre);
    setProveedorEmail(p.email ?? "");
    setProveedorTelefono(p.telefono ?? "");
    setProveedorWeb(p.web ?? "");
    setEsNuevoProveedor(false);

    const missing: string[] = [];
    if (!p.email) missing.push("email");
    setProveedorMissingData(missing);

    if (p.persona_contacto) {
      setProvContactoNombre(p.persona_contacto ?? "");
      setProvContactoEmail(p.contacto_email ?? "");
      setProvContactoTelefono(p.contacto_telefono ?? "");
    } else {
      setProvContactoNombre("");
      setProvContactoEmail("");
      setProvContactoTelefono("");
    }
  }

  function clearCliente() {
    setClienteSeleccionado(null);
    setEsNuevoCliente(false);
    setClienteEmail("");
    setClienteTelefono("");
    setClienteWeb("");
    setClienteCnae("");
    setContactoNombre("");
    setContactoPuesto("");
    setContactoEmail("");
    setContactoTelefono("");
    setClienteMissingData([]);
  }

  function clearProveedor() {
    setProveedorSeleccionado(null);
    setEsNuevoProveedor(false);
    setProveedorEmail("");
    setProveedorTelefono("");
    setProveedorWeb("");
    setProveedorCnae("");
    setProvContactoNombre("");
    setProvContactoPuesto("");
    setProvContactoEmail("");
    setProvContactoTelefono("");
    setProveedorMissingData([]);
  }

  // Renovation search
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

    // Validation
    if (!clienteNombre.trim()) { setError("El nombre de la empresa cliente es obligatorio."); setLoading(false); return; }
    if (!data.importe) { setError("El importe (sin IVA) es obligatorio."); setLoading(false); return; }
    if (pipeline === "consultoria" && !producto) { setError("Selecciona un producto de financiación."); setLoading(false); return; }
    if (pipeline === "renting" && !data.equipo_tipo) { setError("Selecciona el tipo de equipo."); setLoading(false); return; }
    if (pipeline === "renting" && !data.plazo_meses) { setError("Selecciona el plazo deseado."); setLoading(false); return; }

    if (esNuevoCliente) {
      if (!clienteEmail.trim()) { setError("El email de la empresa cliente es obligatorio."); setLoading(false); return; }
      if (!clienteCnae.trim()) { setError("El CNAE de la empresa cliente es obligatorio."); setLoading(false); return; }
      if (!contactoNombre.trim()) { setError("El nombre de la persona de contacto del cliente es obligatorio."); setLoading(false); return; }
      if (!contactoEmail.trim()) { setError("El email de la persona de contacto del cliente es obligatorio."); setLoading(false); return; }
      if (!contactoTelefono.trim()) { setError("El teléfono de la persona de contacto del cliente es obligatorio."); setLoading(false); return; }
    }

    if (pipeline === "renting" && esNuevoProveedor && proveedorNombre.trim()) {
      if (!proveedorEmail.trim()) { setError("El email del proveedor es obligatorio."); setLoading(false); return; }
    }

    const res = await fetch("/api/operations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        pipeline_key: pipeline,
        renting_rol: "colaborador",
        es_renovacion: esRenovacion,
        operacion_original_id: renovSeleccionada?.id ?? null,
        cliente_nombre: clienteNombre,
        cliente_email: clienteEmail || null,
        cliente_telefono: clienteTelefono || null,
        cliente_web: clienteWeb || null,
        cliente_cnae: clienteCnae || null,
        es_nuevo_cliente: esNuevoCliente,
        contacto_nombre: contactoNombre || null,
        contacto_puesto: contactoPuesto || null,
        contacto_email: contactoEmail || null,
        contacto_telefono: contactoTelefono || null,
        proveedor_nombre: proveedorNombre || null,
        proveedor_email: proveedorEmail || null,
        proveedor_telefono: proveedorTelefono || null,
        proveedor_web: proveedorWeb || null,
        proveedor_cnae: proveedorCnae || null,
        es_nuevo_proveedor: esNuevoProveedor,
        proveedor_contacto_nombre: provContactoNombre || null,
        proveedor_contacto_puesto: provContactoPuesto || null,
        proveedor_contacto_email: provContactoEmail || null,
        proveedor_contacto_telefono: provContactoTelefono || null,
        entidad_preferencia: entidadPreferencia || null,
        ...(esRenovacion && renovSeleccionada?.client_nombre ? { cliente_nombre: renovSeleccionada.client_nombre } : {}),
      }),
    });

    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Error al enviar la operación. Inténtalo de nuevo.");
      return;
    }
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
        <p className="text-xs text-gray-400 mt-2">El nombre de la operación se genera automáticamente: <span className="font-semibold text-gray-500">Empresa — OP N (Entidad)</span></p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tipo de operación */}
        <Section title="Tipo de operación">
          <div className="grid grid-cols-2 gap-0 border border-gray-300">
            {(["consultoria", "renting"] as Pipeline[]).map((p, i) => (
              <button key={p} type="button" onClick={() => setPipeline(p)}
                className={`py-4 text-sm font-semibold transition-all ${i === 0 ? "border-r border-gray-300" : ""} ${
                  pipeline === p ? "bg-[#2E1A47] text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                }`}>
                {p === "consultoria" ? "Consultoría financiera" : "Renting de equipos"}
              </button>
            ))}
          </div>
        </Section>

        {/* ── CONSULTORÍA ── */}
        {pipeline === "consultoria" && (
          <>
            <Section title="Producto solicitado *">
              <div className="grid grid-cols-3 gap-2">
                {PRODUCTOS_CONSULTORIA.map((p) => (
                  <label key={p} className={`flex items-center gap-2 px-3 py-3 border text-sm cursor-pointer transition-all ${
                    producto === p ? "border-[#2E1A47] bg-[#EEEBF3] font-semibold text-[#2E1A47]" : "border-gray-200 text-gray-700 hover:border-gray-400"
                  }`}>
                    <input type="radio" name="producto" value={p} required className="accent-[#2E1A47]" onChange={() => setProducto(p)} />
                    {p}
                  </label>
                ))}
              </div>
              {producto === "Otro" && (
                <div className="mt-3">
                  <label className={labelCls}>Describe qué necesita tu cliente *</label>
                  <textarea name="producto_otro" rows={2} required className={inp + " resize-none"}
                    placeholder="Describe brevemente el tipo de financiación o producto que busca tu cliente..." />
                </div>
              )}
            </Section>

            <Section title="¿Es una renovación?">
              <RenovacionBlock
                esRenovacion={esRenovacion}
                setEsRenovacion={setEsRenovacion}
                renovBusqueda={renovBusqueda}
                setRenovBusqueda={setRenovBusqueda}
                renovResultados={renovResultados}
                renovSeleccionada={renovSeleccionada}
                setRenovSeleccionada={setRenovSeleccionada}
                renovDropdown={renovDropdown}
                setRenovDropdown={setRenovDropdown}
                fillCliente={fillCliente}
                inp={inp}
                labelCls={labelCls}
              />
            </Section>

            <Section title="Datos del cliente">
              <ClienteSection
                clienteNombre={clienteNombre} setClienteNombre={setClienteNombre}
                clienteEmail={clienteEmail} setClienteEmail={setClienteEmail}
                clienteTelefono={clienteTelefono} setClienteTelefono={setClienteTelefono}
                clienteWeb={clienteWeb} setClienteWeb={setClienteWeb}
                clienteCnae={clienteCnae} setClienteCnae={setClienteCnae}
                clienteSeleccionado={clienteSeleccionado}
                esNuevoCliente={esNuevoCliente} setEsNuevoCliente={setEsNuevoCliente}
                clienteMissingData={clienteMissingData}
                onSelect={fillCliente} onClear={clearCliente}
                contactoNombre={contactoNombre} setContactoNombre={setContactoNombre}
                contactoPuesto={contactoPuesto} setContactoPuesto={setContactoPuesto}
                contactoEmail={contactoEmail} setContactoEmail={setContactoEmail}
                contactoTelefono={contactoTelefono} setContactoTelefono={setContactoTelefono}
                disabled={!!(esRenovacion && renovSeleccionada?.client_nombre)}
                inp={inp} labelCls={labelCls}
              />

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Importe (sin IVA) * €</label>
                  <input name="importe" type="number" step="any" inputMode="decimal" required className={inp} placeholder="50.000" />
                </div>
              </div>
            </Section>

            {/* Entity preference — only for nivel 3-4 */}
            {nivelEntidades >= 3 && (
              <Section title="¿Dónde quieres presentar la operación?">
                <div>
                  <label className={labelCls}>Entidad financiera preferida</label>
                  <input value={entidadPreferencia} onChange={e => setEntidadPreferencia(e.target.value)}
                    className={inp} placeholder="Ej: Banco Santander, CaixaBank..." />
                  <p className="text-xs text-gray-400 mt-1.5">Indica en qué entidad financiera te gustaría presentar esta operación.</p>
                </div>
              </Section>
            )}
          </>
        )}

        {/* ── RENTING ── */}
        {pipeline === "renting" && (
          <>
            <Section title="Datos del equipo">
              <div className="grid grid-cols-2 gap-0 border border-gray-300 mb-4">
                {[
                  { val: "industrial", label: "Industrial", desc: "Maquinaria, vehículos, producción" },
                  { val: "tecnologico", label: "Tecnológico", desc: "IT, servidores, impresoras" },
                ].map((t, i) => (
                  <label key={t.val} className={`flex items-start gap-3 p-4 cursor-pointer transition-all has-[:checked]:bg-[#EEEBF3] has-[:checked]:border-[#2E1A47] ${i === 0 ? "border-r border-gray-300" : ""}`}>
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
                  <label className={labelCls}>Importe (sin IVA) * €</label>
                  <input name="importe" type="number" step="any" inputMode="decimal" required className={inp} placeholder="10.000" />
                </div>
                <div>
                  <label className={labelCls}>Plazo deseado *</label>
                  <select name="plazo_meses" required className={inp}>
                    <option value="">Seleccionar</option>
                    {PLAZOS.map((m) => <option key={m} value={m}>{m} meses</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Lugar de instalación / entrega</label>
                  <input name="lugar_entrega" className={inp} placeholder="Dirección completa" />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Descripción del equipo a arrendar</label>
                  <textarea name="descripcion" rows={3} className={inp + " resize-none"}
                    placeholder="Describe brevemente el tipo de equipo, marca, modelo, características técnicas..." />
                </div>
              </div>
            </Section>

            <Section title="Datos del cliente">
              <ClienteSection
                clienteNombre={clienteNombre} setClienteNombre={setClienteNombre}
                clienteEmail={clienteEmail} setClienteEmail={setClienteEmail}
                clienteTelefono={clienteTelefono} setClienteTelefono={setClienteTelefono}
                clienteWeb={clienteWeb} setClienteWeb={setClienteWeb}
                clienteCnae={clienteCnae} setClienteCnae={setClienteCnae}
                clienteSeleccionado={clienteSeleccionado}
                esNuevoCliente={esNuevoCliente} setEsNuevoCliente={setEsNuevoCliente}
                clienteMissingData={clienteMissingData}
                onSelect={fillCliente} onClear={clearCliente}
                contactoNombre={contactoNombre} setContactoNombre={setContactoNombre}
                contactoPuesto={contactoPuesto} setContactoPuesto={setContactoPuesto}
                contactoEmail={contactoEmail} setContactoEmail={setContactoEmail}
                contactoTelefono={contactoTelefono} setContactoTelefono={setContactoTelefono}
                inp={inp} labelCls={labelCls}
              />
            </Section>

            <Section title="Proveedor de los equipos">
              <ProveedorSection
                proveedorNombre={proveedorNombre} setProveedorNombre={setProveedorNombre}
                proveedorEmail={proveedorEmail} setProveedorEmail={setProveedorEmail}
                proveedorTelefono={proveedorTelefono} setProveedorTelefono={setProveedorTelefono}
                proveedorWeb={proveedorWeb} setProveedorWeb={setProveedorWeb}
                proveedorCnae={proveedorCnae} setProveedorCnae={setProveedorCnae}
                proveedorSeleccionado={proveedorSeleccionado}
                esNuevoProveedor={esNuevoProveedor} setEsNuevoProveedor={setEsNuevoProveedor}
                proveedorMissingData={proveedorMissingData}
                onSelect={fillProveedor} onClear={clearProveedor}
                provContactoNombre={provContactoNombre} setProvContactoNombre={setProvContactoNombre}
                provContactoPuesto={provContactoPuesto} setProvContactoPuesto={setProvContactoPuesto}
                provContactoEmail={provContactoEmail} setProvContactoEmail={setProvContactoEmail}
                provContactoTelefono={provContactoTelefono} setProvContactoTelefono={setProvContactoTelefono}
                inp={inp} labelCls={labelCls}
              />
            </Section>

            {nivelEntidades >= 3 && (
              <Section title="¿Dónde quieres presentar la operación?">
                <div>
                  <label className={labelCls}>Entidad financiera preferida</label>
                  <input value={entidadPreferencia} onChange={e => setEntidadPreferencia(e.target.value)}
                    className={inp} placeholder="Ej: Banco Santander, CaixaBank..." />
                  <p className="text-xs text-gray-400 mt-1.5">Indica en qué entidad financiera te gustaría presentar esta operación.</p>
                </div>
              </Section>
            )}
          </>
        )}

        {pipeline === "consultoria" && (
          <Section title="Notas adicionales">
            <textarea name="descripcion" rows={4} className={inp + " resize-none"}
              placeholder="Cuéntanos el contexto de la operación, situación del cliente, urgencia, condiciones especiales..." />
          </Section>
        )}

        <Section title="Preferencia de comunicación con el cliente">
          <div className="border border-gray-200 divide-y divide-gray-100">
            <label className="flex items-start gap-4 p-4 cursor-pointer hover:bg-gray-50">
              <input type="radio" name="contacto_directo" value="false" defaultChecked className="mt-0.5 accent-[#2E1A47]" />
              <div>
                <p className="text-sm font-semibold text-gray-800">Yo gestiono la comunicación con el cliente</p>
                <p className="text-xs text-gray-400 mt-0.5">BeGreat me mantendrá informado del avance.</p>
              </div>
            </label>
            <label className="flex items-start gap-4 p-4 cursor-pointer hover:bg-gray-50">
              <input type="radio" name="contacto_directo" value="true" className="mt-0.5 accent-[#2E1A47]" />
              <div>
                <p className="text-sm font-semibold text-gray-800">Autorizo a BeGreat a contactar directamente con el cliente</p>
                <p className="text-xs text-gray-400 mt-0.5">BeGreat gestionará el contacto en tu nombre.</p>
              </div>
            </label>
          </div>
        </Section>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3">{error}</p>}

        <button type="submit" disabled={loading}
          className="w-full bg-[#2E1A47] text-white py-3.5 text-sm font-bold hover:bg-[#5a3d80] transition-colors disabled:opacity-60">
          {loading ? "Enviando operación..." : "Enviar operación a BeGreat"}
        </button>
      </form>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 p-6">
      <h2 className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest mb-5 pb-3 border-b border-gray-100">{title}</h2>
      {children}
    </div>
  );
}

function SearchableField({ value, onChange, onSelect, onNew, placeholder, searchUrl, nameField, label, inp, labelCls, required, disabled }: {
  value: string; onChange: (v: string) => void; onSelect: (item: any) => void; onNew: () => void;
  placeholder: string; searchUrl: string; nameField: string; label: string;
  inp: string; labelCls: string; required?: boolean; disabled?: boolean;
}) {
  const [resultados, setResultados] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [searched, setSearched] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function buscar(q: string) {
    onChange(q);
    if (timer.current) clearTimeout(timer.current);
    if (q.length < 2) { setResultados([]); setOpen(false); setSearched(false); return; }
    timer.current = setTimeout(async () => {
      const res = await fetch(`${searchUrl}?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResultados(data);
      setSearched(true);
      setOpen(true);
    }, 250);
  }

  return (
    <div className="relative">
      <label className={labelCls}>{label}</label>
      <input name={nameField} value={value} disabled={disabled}
        onChange={e => buscar(e.target.value)} required={required}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        className={inp + (disabled ? " bg-gray-50 text-gray-500" : "")}
        placeholder={placeholder} autoComplete="off" />
      {open && (
        <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-gray-200 shadow-lg max-h-64 overflow-y-auto">
          {resultados.map((c: any) => (
            <button key={c.id} type="button"
              onMouseDown={() => { onSelect(c); setResultados([]); setOpen(false); }}
              className="w-full text-left px-3 py-2.5 hover:bg-[#EEEBF3] border-b border-gray-50 last:border-0">
              <p className="text-sm font-semibold text-gray-800">{c.nombre}</p>
              <p className="text-xs text-gray-400 mt-0.5">{[c.codigo, c.cif, c.email].filter(Boolean).join(" · ")}</p>
            </button>
          ))}
          {searched && value.length >= 2 && (
            <button type="button" onMouseDown={onNew}
              className="w-full text-left px-3 py-3 hover:bg-emerald-50 border-t border-gray-100 flex items-center gap-2">
              <span className="w-5 h-5 bg-[#2E1A47] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">+</span>
              <span className="text-sm font-semibold text-[#2E1A47]">Añadir &quot;{value}&quot; como nueva empresa</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ClienteSection({ clienteNombre, setClienteNombre, clienteEmail, setClienteEmail, clienteTelefono, setClienteTelefono,
  clienteWeb, setClienteWeb, clienteCnae, setClienteCnae, clienteSeleccionado, esNuevoCliente, setEsNuevoCliente,
  clienteMissingData, onSelect, onClear, contactoNombre, setContactoNombre, contactoPuesto, setContactoPuesto,
  contactoEmail, setContactoEmail, contactoTelefono, setContactoTelefono, disabled, inp, labelCls,
}: any) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        {clienteSeleccionado ? (
          <div className="col-span-2">
            <label className={labelCls}>Empresa cliente *</label>
            <div className="flex items-center justify-between border border-[#2E1A47] bg-[#EEEBF3] px-3 py-2.5">
              <div>
                <p className="text-sm font-semibold text-[#2E1A47]">{clienteSeleccionado.nombre}</p>
                <p className="text-xs text-gray-500">{[clienteSeleccionado.codigo, clienteSeleccionado.email].filter(Boolean).join(" · ")}</p>
              </div>
              <button type="button" onClick={() => { onClear(); setClienteNombre(""); }}
                className="text-xs text-gray-400 hover:text-red-500 ml-3">✕ Cambiar</button>
            </div>
            {clienteMissingData.length > 0 && (
              <p className="text-xs text-amber-600 mt-1.5 bg-amber-50 border border-amber-200 px-3 py-2">
                Faltan datos por añadir en la ficha del cliente: <span className="font-semibold">{clienteMissingData.join(", ")}</span>. Por eso no se han rellenado automáticamente.
              </p>
            )}
          </div>
        ) : esNuevoCliente ? (
          <div className="col-span-2">
            <div className="border border-emerald-200 bg-emerald-50/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Nueva empresa cliente</p>
                <button type="button" onClick={() => { onClear(); setClienteNombre(""); }}
                  className="text-xs text-gray-400 hover:text-red-500">✕ Cancelar</button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Nombre *</label>
                  <input value={clienteNombre} onChange={e => setClienteNombre(e.target.value)} required className={inp} placeholder="Empresa S.L." />
                </div>
                <div>
                  <label className={labelCls}>Email *</label>
                  <input type="email" value={clienteEmail} onChange={e => setClienteEmail(e.target.value)} required className={inp} placeholder="info@empresa.es" />
                </div>
                <div>
                  <label className={labelCls}>CNAE *</label>
                  <input value={clienteCnae} onChange={e => setClienteCnae(e.target.value)} required className={inp} placeholder="4711" />
                </div>
                <div>
                  <label className={labelCls}>Web</label>
                  <input value={clienteWeb} onChange={e => setClienteWeb(e.target.value)} className={inp} placeholder="www.empresa.es" />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-emerald-200">
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-3">Persona de contacto</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Nombre *</label>
                    <input value={contactoNombre} onChange={(e: any) => setContactoNombre(e.target.value)} required className={inp} placeholder="Nombre completo" />
                  </div>
                  <div>
                    <label className={labelCls}>Puesto</label>
                    <input value={contactoPuesto} onChange={(e: any) => setContactoPuesto(e.target.value)} className={inp} placeholder="Director financiero" />
                  </div>
                  <div>
                    <label className={labelCls}>Email *</label>
                    <input type="email" value={contactoEmail} onChange={(e: any) => setContactoEmail(e.target.value)} required className={inp} placeholder="contacto@empresa.es" />
                  </div>
                  <div>
                    <label className={labelCls}>Teléfono *</label>
                    <input value={contactoTelefono} onChange={(e: any) => setContactoTelefono(e.target.value)} required className={inp} placeholder="612 345 678" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="col-span-2">
            <SearchableField value={clienteNombre} onChange={(v) => { setClienteNombre(v); onClear(); }}
              onSelect={onSelect}
              onNew={() => setEsNuevoCliente(true)}
              placeholder="Escribe para buscar o añadir nueva empresa..."
              searchUrl="/api/search/clientes" nameField="cliente_nombre"
              label="Empresa cliente *" inp={inp} labelCls={labelCls} required disabled={disabled} />
          </div>
        )}
      </div>

      {/* Existing client: show contact inline */}
      {clienteSeleccionado && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Persona de contacto</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Nombre</label>
              <input value={contactoNombre} onChange={(e: any) => setContactoNombre(e.target.value)} className={inp} placeholder="Nombre" />
            </div>
            <div>
              <label className={labelCls}>Puesto</label>
              <input value={contactoPuesto} onChange={(e: any) => setContactoPuesto(e.target.value)} className={inp} placeholder="Director financiero" />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" value={contactoEmail} onChange={(e: any) => setContactoEmail(e.target.value)} className={inp} placeholder="contacto@empresa.es" />
            </div>
            <div>
              <label className={labelCls}>Teléfono</label>
              <input value={contactoTelefono} onChange={(e: any) => setContactoTelefono(e.target.value)} className={inp} placeholder="612 345 678" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ProveedorSection({ proveedorNombre, setProveedorNombre, proveedorEmail, setProveedorEmail, proveedorTelefono, setProveedorTelefono,
  proveedorWeb, setProveedorWeb, proveedorCnae, setProveedorCnae, proveedorSeleccionado, esNuevoProveedor, setEsNuevoProveedor,
  proveedorMissingData, onSelect, onClear, provContactoNombre, setProvContactoNombre, provContactoPuesto, setProvContactoPuesto,
  provContactoEmail, setProvContactoEmail, provContactoTelefono, setProvContactoTelefono, inp, labelCls,
}: any) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        {proveedorSeleccionado ? (
          <div className="col-span-2">
            <label className={labelCls}>Proveedor</label>
            <div className="flex items-center justify-between border border-[#2E1A47] bg-[#EEEBF3] px-3 py-2.5">
              <div>
                <p className="text-sm font-semibold text-[#2E1A47]">{proveedorSeleccionado.nombre}</p>
                <p className="text-xs text-gray-500">{[proveedorSeleccionado.codigo, proveedorSeleccionado.email].filter(Boolean).join(" · ")}</p>
              </div>
              <button type="button" onClick={() => { onClear(); setProveedorNombre(""); }}
                className="text-xs text-gray-400 hover:text-red-500 ml-3">✕ Cambiar</button>
            </div>
            {proveedorMissingData.length > 0 && (
              <p className="text-xs text-amber-600 mt-1.5 bg-amber-50 border border-amber-200 px-3 py-2">
                Faltan datos por añadir en la ficha del proveedor: <span className="font-semibold">{proveedorMissingData.join(", ")}</span>. Por eso no se han rellenado automáticamente.
              </p>
            )}
          </div>
        ) : esNuevoProveedor ? (
          <div className="col-span-2">
            <div className="border border-emerald-200 bg-emerald-50/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Nuevo proveedor</p>
                <button type="button" onClick={() => { onClear(); setProveedorNombre(""); }}
                  className="text-xs text-gray-400 hover:text-red-500">✕ Cancelar</button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Nombre *</label>
                  <input value={proveedorNombre} onChange={e => setProveedorNombre(e.target.value)} required className={inp} placeholder="Proveedor S.A." />
                </div>
                <div>
                  <label className={labelCls}>Email *</label>
                  <input type="email" value={proveedorEmail} onChange={e => setProveedorEmail(e.target.value)} required className={inp} placeholder="info@proveedor.es" />
                </div>
                <div>
                  <label className={labelCls}>Teléfono</label>
                  <input value={proveedorTelefono} onChange={e => setProveedorTelefono(e.target.value)} className={inp} placeholder="612 345 678" />
                </div>
                <div>
                  <label className={labelCls}>Web</label>
                  <input value={proveedorWeb} onChange={e => setProveedorWeb(e.target.value)} className={inp} placeholder="www.proveedor.es" />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-emerald-200">
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-3">Persona de contacto <span className="text-gray-400 font-normal">(opcional)</span></p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Nombre</label>
                    <input value={provContactoNombre} onChange={(e: any) => setProvContactoNombre(e.target.value)} className={inp} placeholder="Nombre completo" />
                  </div>
                  <div>
                    <label className={labelCls}>Puesto</label>
                    <input value={provContactoPuesto} onChange={(e: any) => setProvContactoPuesto(e.target.value)} className={inp} placeholder="Comercial" />
                  </div>
                  <div>
                    <label className={labelCls}>Email</label>
                    <input type="email" value={provContactoEmail} onChange={(e: any) => setProvContactoEmail(e.target.value)} className={inp} placeholder="contacto@proveedor.es" />
                  </div>
                  <div>
                    <label className={labelCls}>Teléfono</label>
                    <input value={provContactoTelefono} onChange={(e: any) => setProvContactoTelefono(e.target.value)} className={inp} placeholder="612 345 678" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="col-span-2">
            <SearchableField value={proveedorNombre} onChange={(v) => { setProveedorNombre(v); onClear(); }}
              onSelect={onSelect}
              onNew={() => setEsNuevoProveedor(true)}
              placeholder="Escribe para buscar o añadir nuevo proveedor..."
              searchUrl="/api/search/proveedores" nameField="proveedor_nombre"
              label="Nombre del proveedor" inp={inp} labelCls={labelCls} />
          </div>
        )}
      </div>

      {/* Existing supplier: show contact inline */}
      {proveedorSeleccionado && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Persona de contacto <span className="text-gray-400 font-normal">(opcional)</span></p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Nombre</label>
              <input value={provContactoNombre} onChange={(e: any) => setProvContactoNombre(e.target.value)} className={inp} placeholder="Nombre" />
            </div>
            <div>
              <label className={labelCls}>Puesto</label>
              <input value={provContactoPuesto} onChange={(e: any) => setProvContactoPuesto(e.target.value)} className={inp} placeholder="Comercial" />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" value={provContactoEmail} onChange={(e: any) => setProvContactoEmail(e.target.value)} className={inp} placeholder="contacto@proveedor.es" />
            </div>
            <div>
              <label className={labelCls}>Teléfono</label>
              <input value={provContactoTelefono} onChange={(e: any) => setProvContactoTelefono(e.target.value)} className={inp} placeholder="612 345 678" />
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-3">
        Si el proveedor ya está registrado, búscalo por su nombre. Si es nuevo, haz clic en &quot;Añadir&quot; para darlo de alta.
      </p>
    </>
  );
}

function RenovacionBlock({ esRenovacion, setEsRenovacion, renovBusqueda, setRenovBusqueda, renovResultados,
  renovSeleccionada, setRenovSeleccionada, renovDropdown, setRenovDropdown, fillCliente, inp, labelCls }: any) {
  return (
    <>
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
          <label className={labelCls}>Buscar operación original</label>
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
              <input value={renovBusqueda} onChange={(e: any) => setRenovBusqueda(e.target.value)}
                onFocus={() => renovResultados.length > 0 && setRenovDropdown(true)}
                onBlur={() => setTimeout(() => setRenovDropdown(false), 150)}
                className={inp} placeholder="Escribe el nombre del cliente o de la operación..." autoComplete="off" />
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
                      <p className="text-xs text-gray-400 mt-0.5">{op.codigo} · {op.client_nombre}</p>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
