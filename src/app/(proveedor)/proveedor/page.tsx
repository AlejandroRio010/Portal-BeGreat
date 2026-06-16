import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operations, suppliers, clients } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { fmtEur, fmtNum } from "@/lib/format";
import Link from "next/link";
import Image from "next/image";

const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const FIRMADAS = ["Contrato firmado","Honorarios pagados","Transferencia realizada"];

export const dynamic = "force-dynamic";

const baseTiles = [
  { href: "/proveedor/alta-operacion",       label: "Alta nueva operación",    sub: "Cotiza y registra una operación" },
  { href: "/proveedor/operaciones/renting",  label: "Funnel de renting",       sub: "Seguimiento de tus deals" },
  { href: "/proveedor/clientes",             label: "Mis clientes",            sub: "Empresas y contactos" },
  { href: "/proveedor/historial",            label: "Historial de operaciones",sub: "Tus métricas y ventas" },
  { href: "/proveedor/perfil",               label: "Mi perfil",               sub: "Datos y catálogo" },
  { href: "/proveedor/contacto",             label: "Contacto BeGreat",        sub: "Rita & Alejandro" },
];

export default async function ProveedorHomePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const supplierId = (session!.user as any).supplierId as string;

  const [supplier] = await db
    .select({ nombre: suppliers.nombre, logo_url: suppliers.logo_url, codigo: suppliers.codigo, puede_ver_entidades: suppliers.puede_ver_entidades })
    .from(suppliers)
    .where(eq(suppliers.id, supplierId))
    .limit(1);

  const allOps = await db
    .select({
      id: operations.id,
      status: operations.status,
      fase: operations.fase,
      pipeline_key: operations.pipeline_key,
      importe: operations.importe,
      created_at: operations.created_at,
      client_nombre: clients.nombre,
    })
    .from(operations)
    .leftJoin(clients, eq(operations.client_id, clients.id))
    .where(eq(operations.supplier_id, supplierId))
    .orderBy(desc(operations.created_at));

  const recentOps = allOps.slice(0, 5);

  const firmadas = allOps.filter(o => FIRMADAS.includes(o.fase ?? ""));
  const pendientes = allOps.filter(o => o.status === "pendiente_de_validar");
  const enCurso = allOps.filter(o => o.status === "activa" && !FIRMADAS.includes(o.fase ?? ""));

  const totalImporteVendido = firmadas.reduce((s, o) => s + Number(o.importe ?? 0), 0);
  const importePendiente = [...pendientes, ...enCurso].reduce((s, o) => s + Number(o.importe ?? 0), 0);

  const availableYears = Array.from(new Set(allOps.map(o => new Date(o.created_at).getFullYear()))).sort((a,b) => b-a);
  const currentYear = new Date().getFullYear();
  const selectedYear = sp.year ? parseInt(sp.year) : (availableYears[0] ?? currentYear);

  const monthlyOps = Array(12).fill(0);
  const monthlyImporte = Array(12).fill(0);
  for (const op of allOps) {
    const d = new Date(op.created_at);
    if (d.getFullYear() !== selectedYear) continue;
    if (!FIRMADAS.includes(op.fase ?? "")) continue;
    const m = d.getMonth();
    monthlyOps[m] += 1;
    monthlyImporte[m] += Number(op.importe ?? 0);
  }
  const maxOps = Math.max(...monthlyOps, 1);
  const yearTotalOps = monthlyOps.reduce((s,v) => s+v, 0);
  const yearTotalImporte = monthlyImporte.reduce((s,v) => s+v, 0);

  return (
    <div>
      {/* Banner */}
      <div className="relative overflow-hidden mb-6 bg-[#1a0f2e] flex items-center justify-between px-10" style={{ height: 180 }}>
        <Image src="/cabecera-corporate.jpg" alt="" fill className="object-cover object-center opacity-45" priority />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(26,15,46,0.82) 0%, rgba(26,15,46,0.20) 45%, rgba(26,15,46,0.85) 100%)" }} />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Image src="/begreat-logo-blanco.png" alt="" width={200} height={60} className="object-contain opacity-8" />
        </div>
        <div className="relative z-10">
          {supplier?.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={supplier.logo_url} alt="Logo proveedor" style={{ maxHeight: 56, maxWidth: 200, objectFit: "contain" }} />
          )}
        </div>
        <div className="relative z-10 text-right">
          <p className="text-white/40 text-xs uppercase tracking-[0.2em] mb-1">Portal de proveedores</p>
          <h1 className="text-3xl font-bold text-white mb-1">
            Bienvenido, {supplier?.nombre?.split(" ")[0]}
          </h1>
          <p className="text-white/30 text-xs">{supplier?.codigo}</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="flex overflow-hidden">
          <div className="flex-1 bg-[#2E1A47] px-6 py-5">
            <p className="text-white/45 text-[10px] font-bold uppercase tracking-[0.18em] mb-2">Operaciones Firmadas</p>
            <p className="text-3xl font-black text-white">{firmadas.length}</p>
            <p className="text-white/30 text-[9px] mt-1 uppercase tracking-wide">acumulado total</p>
          </div>
          <div className="w-px bg-white/20 flex-shrink-0" />
          <div className="flex-1 bg-[#2E1A47] px-6 py-5">
            <p className="text-white/45 text-[10px] font-bold uppercase tracking-[0.18em] mb-2">Importe vendido</p>
            <p className="text-xl font-black text-white leading-tight">{fmtEur(totalImporteVendido)}</p>
            <p className="text-white/30 text-[9px] mt-1 uppercase tracking-wide">facturado vía renting</p>
          </div>
        </div>
        <div className="flex overflow-hidden">
          <div className="flex-1 bg-[#2E1A47] px-6 py-5">
            <p className="text-white/45 text-[10px] font-bold uppercase tracking-[0.18em] mb-2">Operaciones Activas</p>
            <p className="text-3xl font-black text-white">{enCurso.length + pendientes.length}</p>
            <p className="text-white/30 text-[9px] mt-1 uppercase tracking-wide">en curso</p>
          </div>
          <div className="w-px bg-white/20 flex-shrink-0" />
          <div className="flex-1 bg-[#2E1A47] px-6 py-5">
            <p className="text-white/45 text-[10px] font-bold uppercase tracking-[0.18em] mb-2">Importe potencial</p>
            <p className="text-xl font-black text-white leading-tight">{fmtEur(importePendiente)}</p>
            <p className="text-white/30 text-[9px] mt-1 uppercase tracking-wide">en proceso</p>
          </div>
        </div>
      </div>

      {/* Gráfico anual */}
      <div className="bg-white border border-gray-200 mb-6">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest">Ops firmadas por mes</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Pasa el ratón para ver el importe vendido ese mes</p>
          </div>
          <form method="get" className="flex items-center gap-2">
            <select name="year" defaultValue={String(selectedYear)}
              className="border border-gray-200 px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:border-[#2E1A47]">
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
              {!availableYears.includes(currentYear) && <option value={currentYear}>{currentYear}</option>}
            </select>
            <button type="submit" className="px-3 py-1.5 bg-[#2E1A47] text-white text-xs font-semibold hover:bg-[#3d2460] transition-colors">Ver</button>
          </form>
        </div>
        <div className="px-6 pt-6 pb-2">
          <div className="flex items-end gap-1 h-[120px]">
            {monthlyOps.map((opsCount, i) => {
              const h = opsCount > 0 ? Math.max(8, Math.round((opsCount / maxOps) * 120)) : 0;
              const importeMes = monthlyImporte[i];
              const bar = (
                <div className="relative flex-1 flex items-end w-full">
                  {opsCount > 0 && (
                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-[#2E1A47] text-white text-[9px] px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 shadow-lg">
                      <span className="block font-bold">{opsCount} op{opsCount !== 1 ? "s" : ""}</span>
                      {importeMes > 0 && <span className="block text-white/70">Vendido: {fmtEur(importeMes)}</span>}
                    </div>
                  )}
                  <div className="w-full transition-all group-hover:opacity-80"
                    style={{ height: h > 0 ? `${h}px` : "3px", backgroundColor: h > 0 ? "#2E1A47" : "#EEEBF3" }} />
                </div>
              );
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                  {bar}
                </div>
              );
            })}
          </div>
          <div className="flex gap-1 mt-2">
            {MESES.map((m, i) => <div key={i} className="flex-1 text-center text-[9px] text-gray-400 font-medium">{m}</div>)}
          </div>
        </div>
        <div className="px-6 pb-5 flex gap-8 border-t border-gray-100 pt-4">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Ops firmadas {selectedYear}</p>
            <p className="text-lg font-black text-[#2E1A47]">{yearTotalOps}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Importe vendido {selectedYear}</p>
            <p className="text-lg font-black text-[#2E1A47]">{fmtEur(yearTotalImporte)}</p>
          </div>
        </div>
      </div>

      {/* Tiles */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          ...baseTiles,
          ...(supplier?.puede_ver_entidades ? [{ href: "/proveedor/entidades", label: "Entidades financieras", sub: "Bancos y alternativas" }] : []),
        ].map((tile) => (
          <Link
            key={tile.href}
            href={tile.href}
            className="group flex flex-col justify-between p-5 bg-white border border-gray-200 transition-all duration-200 hover:bg-[#2E1A47] hover:border-[#2E1A47]"
            style={{ minHeight: 90 }}
          >
            <p className="text-sm font-semibold text-gray-900 group-hover:text-white transition-colors duration-200">
              {tile.label}
            </p>
            <div className="flex items-end justify-between mt-3">
              <p className="text-xs text-gray-400 group-hover:text-white/55 transition-colors duration-200">{tile.sub}</p>
              <span className="text-sm text-gray-300 group-hover:text-white/55 transition-all duration-200 group-hover:translate-x-0.5">→</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Últimas operaciones */}
      <div className="bg-white border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <p className="text-xs font-bold text-[#2E1A47] uppercase tracking-widest">Últimas operaciones</p>
          <Link href="/proveedor/historial" className="text-xs text-[#2E1A47] font-semibold hover:underline">
            Ver historial completo →
          </Link>
        </div>
        {recentOps.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-gray-300">Todavía no has registrado ninguna operación.</p>
            <Link href="/proveedor/alta-operacion" className="block mt-3 text-xs font-semibold text-[#2E1A47] hover:underline">
              + Alta nueva operación
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-[#EEEBF3] border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Cliente</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Estado</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Importe</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentOps.map((op) => (
                <tr key={op.id} className="hover:bg-[#EEEBF3]/30 transition-colors group">
                  <td className="px-6 py-3.5 text-sm font-medium text-gray-900">{op.client_nombre ?? "—"}</td>
                  <td className="px-6 py-3.5">
                    {op.status === "pendiente_de_validar" ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        Pendiente
                      </span>
                    ) : FIRMADAS.includes(op.fase ?? "") ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                        Firmada ✓
                      </span>
                    ) : op.status === "archivada" ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-red-50 border border-red-200 text-red-600 text-xs font-semibold">
                        Denegada
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-600">{op.fase}</span>
                    )}
                  </td>
                  <td className="px-6 py-3.5">
                    {op.importe
                      ? <span className="text-sm font-bold text-[#2E1A47]">{fmtEur(op.importe)}</span>
                      : <span className="text-xs text-gray-300">—</span>}
                  </td>
                  <td className="px-6 py-3.5 text-sm text-gray-400">
                    {new Date(op.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-6 py-3.5">
                    <Link href={`/proveedor/operaciones/${op.id}`} className="text-[#2E1A47] text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                      Ver →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
