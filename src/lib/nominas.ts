// Nóminas y personal, leídas del LIBRO DIARIO (asientos type=payroll de Holded
// más los pagos por banco). Hoy son dos personas: Macarena (empleada, con SS) y
// Rita (autónoma, sin SS; su cuota de autónomos la paga la empresa).
//
// Cuentas: 640 sueldos (debe=bruto) · 642 SS a cargo de la empresa (el debe
// fuera de un asiento de nómina = cuota de autónomos) · 476 SS acreedora
// (haber=a pagar a mes vencido; debe con banco=pago TGSS) · 4751 IRPF retenido
// (haber=retenido; debe con banco=ingreso del modelo 111) · 465 netos
// (haber=pendiente de pagar; debe con banco=nómina pagada).

import type { LibroLinea } from "@/lib/holdedLedger";

export interface NominaPersona {
  etiqueta: string;
  bruto: number;
  neto: number;
  irpf: number;
  ssEmpresa: number;   // coste de SS a cargo de la empresa
  ssTotal: number;     // SS total a liquidar (empresa + trabajador)
  costeEmpresa: number; // bruto + SS empresa
}

export interface NominasMes {
  mesIdx: number;
  personas: NominaPersona[]; // de los asientos de nómina del mes
  cuotaAutonomos: number;    // cuota RETA (Rita) cargada ese mes
  costeDevengo: number;      // Σ coste empresa + cuota autónomos
  pagosNetos: number;        // nóminas pagadas por banco ese mes
  pagoSS: number;            // TGSS pagada ese mes (a mes vencido)
  pagoIRPF: number;          // IRPF ingresado a Hacienda ese mes (mod. 111)
  /** Lo que cuenta como gasto del mes: el devengo si hay asientos de nómina;
   *  si la gestoría aún no los ha pasado, lo realmente pagado (netos + cuota). */
  coste: number;
}

const sum = (ls: LibroLinea[], pred: (l: LibroLinea) => boolean, lado: "debit" | "credit") =>
  ls.filter(pred).reduce((s, l) => s + l[lado], 0);

export function nominasPorMes(diario: LibroLinea[], anyo: number): NominasMes[] {
  const byE = new Map<number, LibroLinea[]>();
  for (const l of diario) { if (!byE.has(l.entry)) byE.set(l.entry, []); byE.get(l.entry)!.push(l); }

  const meses: NominasMes[] = Array.from({ length: 12 }, (_, mesIdx) => ({
    mesIdx, personas: [], cuotaAutonomos: 0, costeDevengo: 0, pagosNetos: 0, pagoSS: 0, pagoIRPF: 0, coste: 0,
  }));

  for (const ls of byE.values()) {
    const l0 = ls[0];
    if (l0.anyo !== anyo || l0.mesIdx < 0 || l0.mesIdx > 11) continue;
    const M = meses[l0.mesIdx];
    const esNomina = ls.some(l => l.type === "payroll");
    const tocaBanco = ls.some(l => l.account.startsWith("57"));

    if (esNomina) {
      const bruto = sum(ls, l => l.account.startsWith("640"), "debit");
      const ssEmpresa = sum(ls, l => l.account.startsWith("642"), "debit");
      const ssTotal = sum(ls, l => l.account.startsWith("476"), "credit");
      const irpf = sum(ls, l => l.account.startsWith("4751"), "credit");
      const neto = sum(ls, l => l.account.startsWith("465"), "credit");
      if (bruto <= 0.5) continue;
      // Heurística de identidad: la nómina con SS es la de la empleada.
      const etiqueta = ssTotal > 0.5 ? "Macarena (empleada)" : "Rita (autónoma)";
      M.personas.push({ etiqueta, bruto, neto, irpf, ssEmpresa, ssTotal, costeEmpresa: bruto + ssEmpresa });
      continue;
    }

    // Fuera de los asientos de nómina:
    // 642 al debe = cuota de autónomos (Rita) u otra SS a cargo de la empresa
    M.cuotaAutonomos += sum(ls, l => l.account.startsWith("642"), "debit");
    if (tocaBanco) {
      M.pagosNetos += sum(ls, l => l.account.startsWith("465"), "debit");
      M.pagoSS += sum(ls, l => l.account.startsWith("476"), "debit");
      M.pagoIRPF += sum(ls, l => l.account.startsWith("4751"), "debit");
    }
  }

  for (const M of meses) {
    M.costeDevengo = M.personas.reduce((s, p) => s + p.costeEmpresa, 0) + M.cuotaAutonomos;
    M.coste = M.personas.length > 0 ? M.costeDevengo : M.pagosNetos + M.cuotaAutonomos;
  }
  return meses;
}
