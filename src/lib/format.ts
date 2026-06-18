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

/** Formato input: 28.400,00 € */
export function fmtEuroInput(v: string): string {
  const n = parseFloat(v);
  if (isNaN(n)) return "";
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

/** Formato input: 5,00% */
export function fmtPctInput(v: string): string {
  const n = parseFloat(v);
  if (isNaN(n)) return "";
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";
}

/** Elimina formateo de input para obtener valor numérico crudo (acepta coma como decimal) */
export function rawFromFmt(v: string): string {
  // Remove currency/percent symbols and whitespace
  let clean = v.replace(/[€%\s]/g, "");
  // If there's a dot AND a comma, dot is thousands separator → remove it
  if (clean.includes(".") && clean.includes(",")) {
    clean = clean.replace(/\./g, "");
  }
  // Replace comma with dot for numeric storage
  clean = clean.replace(",", ".");
  return clean;
}

/** Auto-hyphen para CIF/NIF/DNI: inserta - entre letra y número */
export function formatDocId(v: string): string {
  return v.replace(/^([A-Za-z])(?!-)(\d)/, "$1-$2").replace(/(\d)(?!-)([A-Za-z])$/,"$1-$2").toUpperCase();
}
