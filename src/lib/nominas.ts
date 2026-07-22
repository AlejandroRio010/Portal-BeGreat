// Nóminas y personal, leídas del LIBRO DIARIO (asientos type=payroll de Holded
// —o cualquier asiento que cargue sueldos 640— más los pagos por banco).
// Hoy son dos personas: Macarena (empleada, con SS) y Rita (autónoma, sin SS;
// su cuota de autónomos la paga la empresa).
//
// Cuentas: 640 sueldos (debe=bruto) · 642 SS a cargo de la empresa (el debe
// fuera de un asiento de nómina = cuota de autónomos) · 476 SS acreedora
// (haber=devengada, a pagar a mes vencido; debe con banco=pago TGSS) · 4751
// IRPF retenido (haber=retenido; debe con banco=ingreso del modelo 111) · 465
// netos (haber=pendiente de pagar; debe con banco=nómina pagada).

import type { LibroLinea } from "@/lib/holdedLedger";

export interface NominaPersona {
  etiqueta: string;
  autonoma: boolean;
  bruto: number;
  neto: number;        // líquido que recibe la persona
  irpf: number;        // IRPF retenido de su nómina (a guardar)
  ssEmpresa: number;   // coste de SS a cargo de la empresa
  ssTotal: number;     // SS total devengada (empresa + trabajador)
  costeEmpresa: number; // bruto + SS empresa
  netoPagado: boolean; // su líquido ya ha salido por banco este mes
}

export interface NominasMes {
  mesIdx: number;
  personas: NominaPersona[];
  cuotaAutonomos: number;    // cuota RETA (Rita) cargada ese mes
  costeDevengo: number;      // Σ coste empresa + cuota autónomos
  netoDevengado: number;     // Σ netos del mes
  pagosNetos: number;        // nóminas netas pagadas por banco ese mes
  pagoSS: number;            // TGSS pagada ese mes (a mes vencido)
  pagoIRPF: number;          // IRPF ingresado a Hacienda ese mes (mod. 111)
  irpfRetenidoMes: number;   // IRPF retenido este mes (4751 haber) — nóminas + facturas
  coste: number;             // lo que cuenta como gasto del mes
}

const sum = (ls: LibroLinea[], pred: (l: LibroLinea) => boolean, lado: "debit" | "credit") =>
  ls.filter(pred).reduce((s, l) => s + l[lado], 0);
const round2 = (n: number) => Math.round(n * 100) / 100;

export function nominasPorMes(diario: LibroLinea[], anyo: number): NominasMes[] {
  const byE = new Map<number, LibroLinea[]>();
  for (const l of diario) { if (!byE.has(l.entry)) byE.set(l.entry, []); byE.get(l.entry)!.push(l); }

  const meses = Array.from({ length: 12 }, (_, mesIdx) => ({
    mesIdx, personas: [] as NominaPersona[], cuotaAutonomos: 0, costeDevengo: 0, netoDevengado: 0,
    pagosNetos: 0, pagoSS: 0, pagoIRPF: 0, irpfRetenidoMes: 0, coste: 0,
    netosPagadosImportes: [] as number[],
  }));

  for (const ls of byE.values()) {
    const l0 = ls[0];
    if (l0.anyo !== anyo || l0.mesIdx < 0 || l0.mesIdx > 11) continue;
    const M = meses[l0.mesIdx];

    // IRPF retenido del mes (créditos a 4751): nóminas + retenciones de facturas
    M.irpfRetenidoMes += sum(ls, l => l.account.startsWith("4751"), "credit");

    const esNomina = ls.some(l => l.type === "payroll") || ls.some(l => l.account.startsWith("640") && l.debit > 0.5);
    const tocaBanco = ls.some(l => l.account.startsWith("57"));

    if (esNomina) {
      const bruto = sum(ls, l => l.account.startsWith("640"), "debit");
      if (bruto <= 0.5) continue;
      const ssEmpresa = sum(ls, l => l.account.startsWith("642"), "debit");
      const ssTotal = sum(ls, l => l.account.startsWith("476"), "credit");
      const irpf = sum(ls, l => l.account.startsWith("4751"), "credit");
      const neto = sum(ls, l => l.account.startsWith("465"), "credit");
      const autonoma = ssTotal <= 0.5;
      M.personas.push({
        etiqueta: autonoma ? "Rita (autónoma)" : "Macarena (empleada)",
        autonoma, bruto, neto, irpf, ssEmpresa, ssTotal, costeEmpresa: bruto + ssEmpresa, netoPagado: false,
      });
      continue;
    }

    // Fuera de los asientos de nómina:
    M.cuotaAutonomos += sum(ls, l => l.account.startsWith("642"), "debit");
    if (tocaBanco) {
      const netos = sum(ls, l => l.account.startsWith("465"), "debit");
      if (netos > 0.5) M.netosPagadosImportes.push(netos);
      M.pagosNetos += netos;
      M.pagoSS += sum(ls, l => l.account.startsWith("476"), "debit");
      M.pagoIRPF += sum(ls, l => l.account.startsWith("4751"), "debit");
    }
  }

  for (const M of meses) {
    // Estado de pago del líquido por persona (por importe: 1.409,52 ≠ 1.400)
    const pool = [...M.netosPagadosImportes];
    for (const p of M.personas) {
      const i = pool.findIndex(v => Math.abs(v - p.neto) < 0.5);
      if (i >= 0) { p.netoPagado = true; pool.splice(i, 1); }
    }
    const totalNeto = M.personas.reduce((s, p) => s + p.neto, 0);
    if (totalNeto > 0.5 && M.pagosNetos + 0.5 >= totalNeto) M.personas.forEach(p => { p.netoPagado = true; });

    M.netoDevengado = round2(totalNeto);
    M.irpfRetenidoMes = round2(M.irpfRetenidoMes);
    M.costeDevengo = round2(M.personas.reduce((s, p) => s + p.costeEmpresa, 0) + M.cuotaAutonomos);
    M.coste = round2(M.personas.length > 0 ? M.costeDevengo : M.pagosNetos + M.cuotaAutonomos);
  }

  return meses.map(({ netosPagadosImportes, ...m }) => m);
}

/** IRPF retenido acumulado del trimestre de un mes (lo que se ingresará en el
 *  modelo 111): suma de lo retenido en los meses del trimestre hasta ese mes. */
export function irpfTrimestreHasta(meses: NominasMes[], mesIdx: number): number {
  const qStart = Math.floor(mesIdx / 3) * 3;
  return round2(meses.slice(qStart, mesIdx + 1).reduce((s, m) => s + m.irpfRetenidoMes, 0));
}
