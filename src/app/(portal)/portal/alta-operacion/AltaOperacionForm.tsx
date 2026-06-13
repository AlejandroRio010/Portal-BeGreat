"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import EmpresaSearchInput from "@/components/EmpresaSearchInput";

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
  const [clienteCif, setClienteCif] = useState("");
  const [clienteCnae, setClienteCnae] = useState("");
  const [clienteProvincia, setClienteProvincia] = useState("");
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

  const clienteListo = !!(clienteSeleccionado || (esNuevoCliente && clienteNombre.trim() && clienteCif.trim() && contactoNombre.trim() && contactoTelefono.trim()));
  const clientePendiente = esNuevoCliente && !clienteListo;

  function fillCliente(c: any) {
    setClienteSeleccionado(c);
    setClienteNombre(c.nombre);
    setClienteEmail(c.email ?? "");
    setClienteTelefono(c.telefono ?? "");
    setClienteWeb(c.web ?? "");
    setClienteCif(c.cif ?? "");
    setClienteCnae(c.cnae ?? "");
    setEsNuevoCliente(false);

    // Check missing data
    const missing: string[] = [];
    if (!c.email) missing.push("email");
    if (!c.cif) missing.push("CIF");

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
      missing.push("persona de contacto");
    }
    setClienteMissingData(missing);
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
    setClienteCif("");
    setClienteCnae("");
    setClienteProvincia("");
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

    // Validation — client must be either selected from DB or fully filled as new
    if (!clienteSeleccionado && !esNuevoCliente) { setError("Busca y selecciona una empresa cliente, o da de alta una nueva."); setLoading(false); return; }
    if (!clienteNombre.trim()) { setError("El nombre de la empresa cliente es obligatorio."); setLoading(false); return; }
    if (!data.importe) { setError("El importe (sin IVA) es obligatorio."); setLoading(false); return; }
    if (pipeline === "consultoria" && !producto) { setError("Selecciona un producto de financiación."); setLoading(false); return; }
    if (pipeline === "consultoria" && producto === "Otro" && !data.producto_otro?.trim()) { setError("Describe qué producto necesita tu cliente."); setLoading(false); return; }
    if (pipeline === "renting" && !data.equipo_tipo) { setError("Selecciona el tipo de equipo."); setLoading(false); return; }
    if (pipeline === "renting" && !data.plazo_meses) { setError("Selecciona el plazo deseado."); setLoading(false); return; }

    if (esNuevoCliente) {
      if (!clienteCif.trim()) { setError("El CIF de la empresa cliente es obligatorio."); setLoading(false); return; }
      if (!contactoNombre.trim()) { setError("El nombre de la persona de contacto del cliente es obligatorio."); setLoading(false); return; }
      if (!contactoTelefono.trim()) { setError("El teléfono de la persona de contacto del cliente es obligatorio."); setLoading(false); return; }
    }

    if (pipeline === "renting" && esNuevoProveedor && proveedorNombre.trim()) {
      if (!proveedorEmail.trim()) { setError("El email del proveedor es obligatorio."); setLoading(false); return; }
    }

    const productoFinal = producto === "Otro" ? (data.producto_otro?.trim() || "Otro") : producto;

    const res = await fetch("/api/operations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        pipeline_key: pipeline,
        producto: productoFinal,
        renting_rol: "colaborador",
        es_renovacion: esRenovacion,
        operacion_original_id: renovSeleccionada?.id ?? null,
        cliente_nombre: clienteNombre,
        cliente_email: clienteEmail || null,
        cliente_telefono: clienteTelefono || null,
        cliente_web: clienteWeb || null,
        cliente_cif: clienteCif || null,
        cliente_cnae: clienteCnae || null,
        cliente_provincia: clienteProvincia || null,
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
                clienteCif={clienteCif} setClienteCif={setClienteCif}
                clienteCnae={clienteCnae} setClienteCnae={setClienteCnae}
                clienteProvincia={clienteProvincia} setClienteProvincia={setClienteProvincia}
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

            {nivelEntidades < 4 && (
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
                clienteCif={clienteCif} setClienteCif={setClienteCif}
                clienteCnae={clienteCnae} setClienteCnae={setClienteCnae}
                clienteProvincia={clienteProvincia} setClienteProvincia={setClienteProvincia}
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

            {nivelEntidades < 4 && (
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

        {clientePendiente && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 px-4 py-3">
            Completa todos los campos obligatorios de la nueva empresa cliente antes de enviar la operación.
          </p>
        )}

        <button type="submit" disabled={loading || clientePendiente}
          className={`w-full py-3.5 text-sm font-bold transition-colors disabled:opacity-60 ${
            clientePendiente ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-[#2E1A47] text-white hover:bg-[#5a3d80]"
          }`}>
          {loading ? "Enviando operación..." : clientePendiente ? "Completa los datos del cliente para continuar" : "Enviar operación a BeGreat"}
        </button>
      </form>
    </div>
  );
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PROVINCIAS = [
  "A Coruña","Álava","Albacete","Alicante","Almería","Asturias","Ávila","Badajoz",
  "Barcelona","Bizkaia","Burgos","Cáceres","Cádiz","Cantabria","Castellón","Ceuta",
  "Ciudad Real","Córdoba","Cuenca","Gipuzkoa","Girona","Granada","Guadalajara",
  "Huelva","Huesca","Illes Balears","Jaén","La Rioja","Las Palmas","León","Lleida",
  "Lugo","Madrid","Málaga","Melilla","Murcia","Navarra","Ourense","Palencia",
  "Pontevedra","Salamanca","Santa Cruz de Tenerife","Segovia","Sevilla","Soria",
  "Tarragona","Teruel","Toledo","Valencia","Valladolid","Zamora","Zaragoza",
];

// ─── CNAE top-level search data ──────────────────────────────────────────────
const CNAE_CODES = [
  "0111 Cultivo de cereales","0113 Cultivo de hortalizas","0121 Cultivo de uva","0141 Explotación de ganado bovino",
  "0150 Producción agrícola combinada","0210 Silvicultura","0311 Pesca marina","0321 Acuicultura marina",
  "0510 Extracción de antracita y hulla","0610 Extracción de crudo de petróleo",
  "1011 Procesado de carne","1020 Procesado de pescado","1039 Otro procesado de frutas y hortalizas",
  "1051 Preparación de leche","1071 Fabricación de pan","1081 Fabricación de azúcar",
  "1101 Destilación de bebidas alcohólicas","1102 Elaboración de vinos","1105 Fabricación de cerveza",
  "1200 Industria del tabaco","1310 Preparación de fibras textiles","1392 Fabricación de artículos textiles",
  "1413 Confección de prendas de vestir","1520 Fabricación de calzado",
  "1610 Aserrado de madera","1621 Fabricación de chapas y tableros","1629 Otras industrias de madera",
  "1711 Fabricación de pasta papelera","1712 Fabricación de papel y cartón",
  "1811 Artes gráficas","1812 Otras actividades de impresión",
  "1920 Refino de petróleo","2011 Fabricación de gases industriales","2014 Fabricación de química orgánica",
  "2041 Fabricación de jabones y detergentes","2059 Otros productos químicos",
  "2110 Fabricación de productos farmacéuticos","2120 Fabricación de especialidades farmacéuticas",
  "2211 Fabricación de neumáticos","2219 Otros productos de caucho","2221 Fabricación de placas y tubos plásticos",
  "2311 Fabricación de vidrio plano","2320 Fabricación de productos cerámicos refractarios",
  "2410 Fabricación de productos siderúrgicos","2420 Fabricación de tubos de acero",
  "2511 Fabricación de estructuras metálicas","2529 Fabricación de depósitos metálicos",
  "2611 Fabricación de componentes electrónicos","2620 Fabricación de ordenadores",
  "2711 Fabricación de motores eléctricos","2712 Fabricación de aparatos de distribución",
  "2811 Fabricación de motores","2821 Fabricación de hornos",
  "2910 Fabricación de vehículos de motor","2920 Fabricación de carrocerías",
  "2932 Fabricación de otros componentes para vehículos","3011 Construcción de barcos",
  "3030 Construcción aeronáutica","3091 Fabricación de motocicletas","3099 Fabricación de otro material de transporte",
  "3101 Fabricación de muebles de oficina","3109 Fabricación de otros muebles",
  "3311 Reparación de productos metálicos","3312 Reparación de maquinaria",
  "3511 Producción de energía eléctrica","3512 Transporte de energía eléctrica","3513 Distribución de energía eléctrica",
  "3521 Producción de gas","3530 Suministro de vapor",
  "3600 Captación, depuración y distribución de agua","3700 Evacuación de aguas residuales",
  "3811 Recogida de residuos no peligrosos","3821 Tratamiento de residuos no peligrosos",
  "4110 Promoción inmobiliaria","4121 Construcción de edificios residenciales","4122 Construcción de edificios no residenciales",
  "4211 Construcción de carreteras","4221 Construcción de redes","4222 Construcción de redes eléctricas",
  "4311 Demolición","4312 Preparación de terrenos","4321 Instalaciones eléctricas",
  "4322 Fontanería e instalaciones","4329 Otras instalaciones","4331 Revocamiento",
  "4332 Instalación de carpintería","4339 Otro acabado de edificios","4391 Construcción de cubiertas",
  "4399 Otras actividades de construcción",
  "4511 Venta de automóviles","4519 Venta de otros vehículos","4520 Mantenimiento de vehículos",
  "4531 Comercio al por mayor de repuestos","4532 Comercio al por menor de repuestos",
  "4611 Intermediarios del comercio de materias primas","4612 Intermediarios de combustibles",
  "4613 Intermediarios de madera","4614 Intermediarios de maquinaria","4615 Intermediarios de muebles",
  "4616 Intermediarios de textiles","4617 Intermediarios de productos alimenticios",
  "4619 Intermediarios del comercio de productos diversos",
  "4621 Comercio al por mayor de cereales","4622 Comercio al por mayor de flores",
  "4631 Comercio al por mayor de frutas","4632 Comercio al por mayor de carne",
  "4634 Comercio al por mayor de bebidas","4636 Comercio al por mayor de azúcar y chocolate",
  "4637 Comercio al por mayor de café y té","4639 Comercio al por mayor de productos alimenticios",
  "4641 Comercio al por mayor de textiles","4642 Comercio al por mayor de prendas de vestir y calzado",
  "4643 Comercio al por mayor de electrodomésticos","4644 Comercio al por mayor de porcelana y cristalería",
  "4645 Comercio al por mayor de perfumería y cosmética",
  "4646 Comercio al por mayor de productos farmacéuticos",
  "4647 Comercio al por mayor de muebles y alfombras","4648 Comercio al por mayor de artículos de relojería",
  "4649 Comercio al por mayor de otros artículos de uso doméstico",
  "4651 Comercio al por mayor de equipos para TIC","4652 Comercio al por mayor de componentes electrónicos",
  "4661 Comercio al por mayor de maquinaria agrícola","4662 Comercio al por mayor de máquinas herramienta",
  "4663 Comercio al por mayor de maquinaria para minería y construcción",
  "4664 Comercio al por mayor de maquinaria para industria textil",
  "4665 Comercio al por mayor de muebles de oficina","4666 Comercio al por mayor de otra maquinaria de oficina",
  "4669 Comercio al por mayor de otra maquinaria","4671 Comercio al por mayor de combustibles",
  "4672 Comercio al por mayor de metales y minerales","4673 Comercio al por mayor de madera y materiales de construcción",
  "4674 Comercio al por mayor de ferretería y fontanería","4675 Comercio al por mayor de productos químicos",
  "4676 Comercio al por mayor de otros productos semielaborados","4677 Comercio al por mayor de chatarra y productos de desecho",
  "4690 Comercio al por mayor no especializado",
  "4711 Comercio al por menor en establecimientos no especializados con predominio de alimentación",
  "4719 Otro comercio al por menor en establecimientos no especializados",
  "4721 Comercio al por menor de frutas y hortalizas","4722 Comercio al por menor de carne",
  "4723 Comercio al por menor de pescado","4724 Comercio al por menor de pan y pastelería",
  "4725 Comercio al por menor de bebidas","4726 Comercio al por menor de tabaco",
  "4729 Otro comercio al por menor de alimentación",
  "4730 Comercio al por menor de combustible","4741 Comercio al por menor de ordenadores y software",
  "4742 Comercio al por menor de equipos de telecomunicaciones",
  "4743 Comercio al por menor de equipos de audio y vídeo",
  "4751 Comercio al por menor de textiles","4752 Comercio al por menor de ferretería",
  "4753 Comercio al por menor de alfombras","4754 Comercio al por menor de electrodomésticos",
  "4759 Comercio al por menor de muebles y otros artículos del hogar",
  "4761 Comercio al por menor de libros","4762 Comercio al por menor de periódicos y artículos de papelería",
  "4763 Comercio al por menor de grabaciones de música y vídeo",
  "4764 Comercio al por menor de artículos deportivos","4765 Comercio al por menor de juegos y juguetes",
  "4771 Comercio al por menor de prendas de vestir","4772 Comercio al por menor de calzado y artículos de cuero",
  "4773 Comercio al por menor de productos farmacéuticos","4774 Comercio al por menor de artículos médicos",
  "4775 Comercio al por menor de cosméticos e higiene","4776 Comercio al por menor de flores y plantas",
  "4777 Comercio al por menor de artículos de relojería y joyería",
  "4778 Otro comercio al por menor de artículos nuevos","4779 Comercio al por menor de artículos de segunda mano",
  "4781 Comercio al por menor de productos alimenticios en puestos de venta",
  "4782 Comercio al por menor de productos textiles en puestos de venta",
  "4789 Comercio al por menor de otros productos en puestos de venta","4791 Comercio por correo o por Internet",
  "4799 Otro comercio al por menor no realizado en establecimientos",
  "4910 Transporte interurbano de pasajeros por ferrocarril","4920 Transporte de mercancías por ferrocarril",
  "4931 Transporte terrestre urbano de pasajeros","4932 Transporte por taxi",
  "4939 Otros tipos de transporte terrestre de pasajeros","4941 Transporte de mercancías por carretera",
  "4942 Servicios de mudanzas","4950 Transporte por tubería",
  "5010 Transporte marítimo de pasajeros","5020 Transporte marítimo de mercancías",
  "5030 Transporte de pasajeros por vías navegables interiores","5040 Transporte de mercancías por vías navegables interiores",
  "5110 Transporte aéreo de pasajeros","5121 Transporte aéreo de mercancías",
  "5210 Depósito y almacenamiento","5221 Actividades anexas al transporte terrestre",
  "5222 Actividades anexas al transporte marítimo","5223 Actividades anexas al transporte aéreo",
  "5224 Manipulación de mercancías","5229 Otras actividades anexas al transporte",
  "5310 Actividades postales","5320 Otras actividades postales y de correos",
  "5510 Hoteles y alojamientos similares","5520 Alojamientos turísticos",
  "5530 Campings y aparcamientos para caravanas","5590 Otros alojamientos",
  "5610 Restaurantes y puestos de comidas","5621 Provisión de comidas preparadas para eventos",
  "5629 Otros servicios de comidas","5630 Establecimientos de bebidas",
  "5811 Edición de libros","5812 Edición de directorios","5813 Edición de periódicos",
  "5814 Edición de revistas","5819 Otras actividades editoriales","5821 Edición de videojuegos",
  "5829 Edición de otros programas informáticos",
  "5911 Actividades de producción cinematográfica","5912 Actividades de postproducción",
  "5913 Actividades de distribución cinematográfica","5914 Actividades de exhibición cinematográfica",
  "5920 Actividades de grabación de sonido y edición musical",
  "6010 Actividades de radiodifusión","6020 Actividades de programación y emisión de televisión",
  "6110 Telecomunicaciones por cable","6120 Telecomunicaciones inalámbricas",
  "6130 Telecomunicaciones por satélite","6190 Otras actividades de telecomunicaciones",
  "6201 Actividades de programación informática","6202 Actividades de consultoría informática",
  "6203 Gestión de recursos informáticos","6209 Otros servicios de tecnología de la información",
  "6311 Proceso de datos, hosting","6312 Portales web",
  "6391 Actividades de agencias de noticias","6399 Otros servicios de información",
  "6411 Banco central","6419 Otra intermediación monetaria",
  "6420 Actividades de las sociedades holding","6430 Inversión colectiva",
  "6491 Arrendamiento financiero","6492 Otras actividades crediticias",
  "6499 Otros servicios financieros","6511 Seguros de vida","6512 Seguros distintos de los de vida",
  "6520 Reaseguros","6530 Fondos de pensiones",
  "6611 Administración de mercados financieros","6612 Actividades de intermediación en operaciones con valores",
  "6619 Otras actividades auxiliares a los servicios financieros",
  "6621 Evaluación de riesgos y daños","6622 Actividades de agentes y corredores de seguros",
  "6629 Otras actividades auxiliares a seguros y fondos de pensiones",
  "6630 Actividades de gestión de fondos",
  "6810 Compraventa de bienes inmobiliarios","6820 Alquiler de bienes inmobiliarios",
  "6831 Agentes de la propiedad inmobiliaria","6832 Gestión de bienes inmobiliarios",
  "6910 Actividades jurídicas","6920 Actividades de contabilidad y auditoría",
  "7010 Actividades de las sedes centrales","7021 Consultoría en relaciones públicas y comunicación",
  "7022 Otras actividades de consultoría de gestión empresarial",
  "7111 Servicios técnicos de arquitectura","7112 Servicios técnicos de ingeniería",
  "7120 Ensayos y análisis técnicos",
  "7211 Investigación en biotecnología","7219 Otra investigación en ciencias naturales",
  "7220 Investigación en ciencias sociales y humanidades",
  "7311 Agencias de publicidad","7312 Servicios de representación de medios de comunicación",
  "7320 Estudios de mercado y encuestas de opinión pública",
  "7410 Actividades de diseño especializado","7420 Actividades de fotografía",
  "7430 Actividades de traducción e interpretación","7490 Otras actividades profesionales, científicas y técnicas",
  "7500 Actividades veterinarias",
  "7711 Alquiler de automóviles","7712 Alquiler de camiones",
  "7721 Alquiler de artículos de ocio y deporte","7722 Alquiler de cintas de vídeo y discos",
  "7729 Alquiler de otros efectos personales y artículos de uso doméstico",
  "7731 Alquiler de maquinaria y equipo agrícola","7732 Alquiler de maquinaria y equipo para la construcción",
  "7733 Alquiler de maquinaria y equipo de oficina","7734 Alquiler de medios de navegación",
  "7735 Alquiler de medios de transporte aéreo","7739 Alquiler de otra maquinaria y equipo",
  "7740 Arrendamiento de la propiedad intelectual",
  "7810 Actividades de agencias de colocación","7820 Actividades de empresas de trabajo temporal",
  "7830 Otra provisión de recursos humanos",
  "7911 Actividades de agencias de viajes","7912 Actividades de operadores turísticos",
  "7990 Otros servicios de reservas",
  "8010 Actividades de seguridad privada","8020 Servicios de sistemas de seguridad",
  "8030 Actividades de investigación","8110 Servicios integrales a edificios e instalaciones",
  "8121 Limpieza general de edificios","8122 Otras actividades de limpieza industrial y de edificios",
  "8129 Otras actividades de limpieza","8130 Actividades de jardinería",
  "8211 Servicios administrativos combinados","8219 Actividades de fotocopiado y otros servicios de apoyo a oficinas",
  "8220 Actividades de los centros de llamadas","8230 Organización de convenciones y ferias de muestras",
  "8291 Actividades de agencias de cobros y de información comercial",
  "8292 Actividades de envasado y empaquetado","8299 Otras actividades de apoyo a las empresas",
  "8411 Actividades generales de la Administración Pública",
  "8510 Educación preprimaria","8520 Educación primaria",
  "8531 Educación secundaria general","8532 Educación secundaria técnica y profesional",
  "8541 Educación postsecundaria no terciaria","8543 Educación universitaria",
  "8544 Educación terciaria no universitaria","8551 Educación deportiva y recreativa",
  "8552 Educación cultural","8553 Actividades de las escuelas de conducción",
  "8559 Otra educación","8560 Actividades auxiliares a la educación",
  "8610 Actividades hospitalarias","8621 Actividades de medicina general",
  "8622 Actividades de medicina especializada","8623 Actividades odontológicas",
  "8690 Otras actividades sanitarias",
  "8710 Asistencia en establecimientos residenciales con cuidados sanitarios",
  "8720 Asistencia en establecimientos residenciales para personas con discapacidad",
  "8730 Asistencia en establecimientos residenciales para personas mayores",
  "8790 Otras actividades de asistencia en establecimientos residenciales",
  "8810 Actividades de servicios sociales sin alojamiento para personas mayores y con discapacidad",
  "8891 Actividades de cuidado diurno de niños","8899 Otros actividades de servicios sociales sin alojamiento",
  "9001 Artes escénicas","9002 Actividades auxiliares a las artes escénicas",
  "9003 Creación artística y literaria","9004 Gestión de salas de espectáculos",
  "9102 Actividades de museos","9103 Gestión de lugares y edificios históricos",
  "9104 Actividades de jardines botánicos, parques zoológicos y reservas naturales",
  "9200 Actividades de juegos de azar y apuestas",
  "9311 Gestión de instalaciones deportivas","9312 Actividades de los clubs deportivos",
  "9313 Actividades de los gimnasios","9319 Otras actividades deportivas",
  "9321 Actividades de los parques de atracciones y los parques temáticos",
  "9329 Otras actividades recreativas y de entretenimiento",
  "9411 Actividades de organizaciones empresariales y patronales",
  "9412 Actividades de organizaciones profesionales",
  "9420 Actividades sindicales","9491 Actividades de organizaciones religiosas",
  "9492 Actividades de organizaciones políticas","9499 Otras actividades asociativas",
  "9511 Reparación de ordenadores","9512 Reparación de equipos de comunicación",
  "9521 Reparación de aparatos electrónicos de audio y vídeo",
  "9522 Reparación de aparatos electrodomésticos","9523 Reparación de calzado y artículos de cuero",
  "9524 Reparación de muebles y artículos de hogar","9525 Reparación de relojes y joyería",
  "9529 Reparación de otros efectos personales","9601 Lavado y limpieza de prendas textiles y de piel",
  "9602 Peluquería y otros tratamientos de belleza","9603 Pompas fúnebres y actividades relacionadas",
  "9604 Actividades de mantenimiento físico","9609 Otras actividades de servicios personales",
  "9700 Actividades de los hogares como empleadores de personal doméstico",
  "9900 Actividades de organizaciones extraterritoriales",
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function CnaeSearchInput({ value, onChange, inp, placeholder, options, isCnae }: {
  value: string; onChange: (v: string) => void; inp: string; placeholder: string; options: string[]; isCnae?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const source = isCnae ? CNAE_CODES : options;
  const filtered = value.length >= 1
    ? source.filter(o => o.toLowerCase().includes(value.toLowerCase())).slice(0, 8)
    : [];

  return (
    <div className="relative">
      <input value={value} onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => filtered.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className={inp} placeholder={placeholder} autoComplete="off" />
      {open && filtered.length > 0 && (
        <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-gray-200 shadow-lg max-h-48 overflow-y-auto">
          {filtered.map(o => (
            <button key={o} type="button"
              onMouseDown={() => { onChange(isCnae ? o.split(" ")[0] : o); setOpen(false); }}
              className="w-full text-left px-3 py-2 hover:bg-[#EEEBF3] text-sm border-b border-gray-50 last:border-0">
              {o}
            </button>
          ))}
        </div>
      )}
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

function SearchableField({ value, onChange, onSelect, onNew, placeholder, searchUrl, nameField, label, inp, labelCls, required, disabled, autoNewWhenEmpty = false }: {
  value: string; onChange: (v: string) => void; onSelect: (item: any) => void; onNew: () => void;
  placeholder: string; searchUrl: string; nameField: string; label: string;
  inp: string; labelCls: string; required?: boolean; disabled?: boolean; autoNewWhenEmpty?: boolean;
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
      if (data.length === 0 && autoNewWhenEmpty) {
        setOpen(false);
        onNew();
      } else {
        setOpen(true);
      }
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
  clienteWeb, setClienteWeb, clienteCif, setClienteCif, clienteCnae, setClienteCnae, clienteProvincia, setClienteProvincia,
  clienteSeleccionado, esNuevoCliente, setEsNuevoCliente,
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
                <div className="col-span-2">
                  <EmpresaSearchInput
                    value={clienteNombre}
                    onChange={setClienteNombre}
                    inp={inp}
                    labelCls={labelCls}
                    onSelect={(data) => {
                      setClienteNombre(data.nombre);
                      setClienteCif(data.cif);
                      if (data.provincia) setClienteProvincia(data.provincia);
                      if (data.cnae) setClienteCnae(data.cnae_label ? `${data.cnae} - ${data.cnae_label}` : data.cnae);
                      if (data.telefono) setClienteTelefono(data.telefono);
                      if (data.email) setClienteEmail(data.email);
                      if (data.web) setClienteWeb(data.web);
                    }}
                    onCifDuplicate={() => {}}
                  />
                </div>
                <div>
                  <label className={labelCls}>CIF *</label>
                  <input value={clienteCif} onChange={e => setClienteCif(e.target.value)} required className={inp} placeholder="B12345678" />
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <input type="email" value={clienteEmail} onChange={e => setClienteEmail(e.target.value)} className={inp} placeholder="info@empresa.es" />
                </div>
                <div>
                  <label className={labelCls}>Provincia</label>
                  <CnaeSearchInput value={clienteProvincia} onChange={setClienteProvincia} inp={inp}
                    placeholder="Madrid" options={PROVINCIAS} />
                </div>
                <div>
                  <label className={labelCls}>CNAE</label>
                  <CnaeSearchInput value={clienteCnae} onChange={setClienteCnae} inp={inp}
                    placeholder="Buscar por código o actividad..." options={[]} isCnae />
                </div>
                <div>
                  <label className={labelCls}>Teléfono</label>
                  <input value={clienteTelefono} onChange={e => setClienteTelefono(e.target.value)} className={inp} placeholder="+34 600 000 000" />
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
              label="Empresa cliente *" inp={inp} labelCls={labelCls} required disabled={disabled}
              autoNewWhenEmpty />
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
              label="Nombre del proveedor" inp={inp} labelCls={labelCls}
              autoNewWhenEmpty />
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
