// Tipos de gasto variable de Bearing Point S.L.
// El gasto variable (todo lo que no es fijo) se reparte en "cajones" según la
// cuenta contable de la factura en Holded. Así el panel refleja la operativa
// real: comisiones, mercadería, nóminas, tarjeta y un cajón de otros.

import type { HoldedGasto } from "./holded";

export type BucketVariable = "comisiones" | "mercaderia" | "nomina" | "tarjeta" | "otros";

// Cuenta contable (id interno de Holded) → cajón.
const CUENTA_BUCKET: Record<string, BucketVariable> = {
  "66fc0ce79abd2620ac0ad5e5": "mercaderia",  // Compras equipos renting (Obliviate, Inael, Dolce…)
  "66fc0ce89abd2620ac0ad5ec": "comisiones",  // Colaboradores (Pablo Arroyo, Fosterman, Krattos…)
  "66fc0ce89abd2620ac0ad5f5": "nomina",      // Personal / Seguridad Social
  "690db72775589e7bab06312e": "tarjeta",     // Combustible / parking
  "697c6cb79bb26f088a058289": "tarjeta",     // Combustible (cuenta alterna)
  "6968a609a942b0b5d005b7c7": "tarjeta",     // Dietas / restauración
};

export function bucketDe(g: HoldedGasto): BucketVariable {
  return (g.cuenta_id && CUENTA_BUCKET[g.cuenta_id]) || "otros";
}

export interface BucketMeta {
  key: BucketVariable;
  label: string;
  emoji: string;
  desc: string;
  nota?: string;
}

// Orden de aparición en el panel.
export const BUCKETS: BucketMeta[] = [
  { key: "comisiones", label: "Comisiones de colaboradores", emoji: "🤝", desc: "Lo que pagamos a cada colaborador por su comisión", nota: "se ligan a su operación" },
  { key: "mercaderia", label: "Compras de mercadería", emoji: "📦", desc: "Equipos de renting cuando BeGreat factura (se paga a proveedor/cliente)" },
  { key: "nomina", label: "Nóminas y personal", emoji: "👥", desc: "Sueldos y Seguridad Social" },
  { key: "tarjeta", label: "Tarjeta de crédito", emoji: "💳", desc: "Dietas, combustible, parking", nota: "lo detallamos mañana" },
  { key: "otros", label: "Otros gastos variables", emoji: "•", desc: "Gastos puntuales que no encajan en los anteriores" },
];
