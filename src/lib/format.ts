/**
 * Formato numérico estándar BeGreat: #.##0,0;(#.##0,0);-
 * - Separador de miles: .
 * - Separador decimal: ,
 * - 1 decimal siempre
 * - Cero → "-"
 * - Negativos → (X.XXX,X)
 */
export function fmtNum(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "-";
  const num = Number(value);
  if (isNaN(num) || num === 0) return "-";
  const abs = Math.abs(num);
  const formatted = abs.toLocaleString("es-ES", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return num < 0 ? `(${formatted})` : formatted;
}

/**
 * Igual que fmtNum pero añade " €"
 * Negativos: (1.234,5 €)
 */
export function fmtEur(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "-";
  const num = Number(value);
  if (isNaN(num) || num === 0) return "-";
  const abs = Math.abs(num);
  const formatted = abs.toLocaleString("es-ES", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return num < 0 ? `(${formatted} €)` : `${formatted} €`;
}
