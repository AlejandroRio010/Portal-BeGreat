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

// Se busca por PROVEEDOR (el motor cuenta las facturas de ese proveedor y mira
// si están pagadas), no por importe ni por si está en recurrentes de Holded.
export const GASTOS_FIJOS: GastoFijo[] = [
  { label: "Alphabet — renting coche", match: "alphabet", mensual: 1192.64, categoria: "Vehículos (renting)" },
  { label: "Expelliarmus Services", match: "expelliarmus", mensual: 133.10, categoria: "Otros gastos" },
  { label: "Telefónica", match: "telefonica", mensual: null, categoria: "Telecomunicaciones", nota: "Telecom + iPhone" },
  { label: "Microsoft", match: "microsoft", mensual: 28.31, categoria: "Software y suscripciones" },
  { label: "Alejandro del Río — autónomo (IRPF 7%)", match: "alejandro del rio", mensual: null, categoria: "Colaboradores", nota: "Importe variable cada mes" },
];

export function norm(s: string): string {
  return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
}

/** ¿Una compra es de este gasto fijo? Solo por proveedor. */
export function esDelFijo(g: GastoFijo, proveedor: string): boolean {
  return norm(proveedor).includes(norm(g.match));
}
