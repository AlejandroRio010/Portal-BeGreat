export type RepartoColaborador = { id?: string; nombre?: string; importe?: string };

/**
 * Comisión de UN colaborador concreto en una operación: su línea dentro del
 * reparto (colaboradores_comision). Si la op no tiene reparto, cae al campo
 * legacy comision_colaborador (ops antiguas con un solo colaborador).
 * Nunca devuelve la suma de todos los colaboradores.
 */
export function comisionDeColaborador(
  op: { comision_colaborador: string | null; colaboradores_comision?: unknown },
  collaboratorId: string,
): number {
  const reparto = (op.colaboradores_comision as RepartoColaborador[] | null) ?? [];
  if (reparto.length === 0) return Number(op.comision_colaborador ?? 0);
  const mia = reparto.find(c => c.id === collaboratorId);
  return mia ? (parseFloat(mia.importe ?? "") || 0) : 0;
}
