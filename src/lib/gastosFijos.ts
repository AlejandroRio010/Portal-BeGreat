// Gastos fijos (recurrentes) de Bearing Point S.L.
// La API de Holded no expone las "facturas recurrentes", así que la lista se
// define aquí y el estado de cada mes se resuelve cruzando con las compras
// reales (proveedor + importe) y su conciliación de pago.

export interface GastoFijo {
  label: string;
  match: string;          // subcadena del nombre del proveedor (normalizada)
  mensual: number | null; // importe mensual con IVA; null si es variable
  categoria: string;
  nota?: string;
}

export const GASTOS_FIJOS: GastoFijo[] = [
  { label: "Alphabet — renting coche", match: "alphabet", mensual: 1192.64, categoria: "Vehículos (renting)" },
  { label: "Expelliarmus Services", match: "expelliarmus", mensual: 133.10, categoria: "Otros gastos" },
  { label: "Telefónica — telecomunicaciones", match: "telefonica", mensual: 84.00, categoria: "Telecomunicaciones" },
  { label: "Telefónica — iPhone (pago aplazado)", match: "telefonica", mensual: 27.00, categoria: "Telecomunicaciones" },
  { label: "Microsoft", match: "microsoft", mensual: 14.16, categoria: "Software y suscripciones" },
  { label: "Alejandro del Río — autónomo (IRPF 7%)", match: "alejandro del rio", mensual: null, categoria: "Colaboradores", nota: "Importe variable cada mes" },
];

export function norm(s: string): string {
  return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
}

/** ¿Una compra (proveedor + total) corresponde a este gasto fijo? */
export function esDelFijo(g: GastoFijo, proveedor: string, total: number): boolean {
  if (!norm(proveedor).includes(norm(g.match))) return false;
  if (g.mensual == null) return true; // variable: basta el proveedor
  // Fijo: además el importe tiene que parecerse (separa Telefónica telecom de iPhone)
  return Math.abs(total - g.mensual) <= Math.max(3, g.mensual * 0.15);
}
