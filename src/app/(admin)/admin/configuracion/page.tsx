import { db } from "@/db";
import { customFields, pipelines } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import ConfiguracionClient from "./ConfiguracionClient";

const FASES_CONSULTORIA_DEFAULT = [
  "Pre-análisis", "Firma de honorarios", "En estudio por entidad",
  "Operación aprobada", "Contrato firmado", "Honorarios pagados",
];

const FASES_RENTING_DEFAULT = [
  "Pre-análisis", "En estudio por entidad", "Operación aprobada",
  "Condiciones aceptadas", "Contrato firmado", "Transferencia realizada",
];

export default async function AdminConfiguracionPage() {
  await db.insert(pipelines).values([
    { key: "consultoria", label: "Consultoría financiera", fases: FASES_CONSULTORIA_DEFAULT },
    { key: "renting", label: "Renting de equipos", fases: FASES_RENTING_DEFAULT },
  ]).onConflictDoNothing();

  const [pc] = await db.select().from(pipelines).where(eq(pipelines.key, "consultoria")).limit(1);
  const [pr] = await db.select().from(pipelines).where(eq(pipelines.key, "renting")).limit(1);

  const fields = await db.select().from(customFields).orderBy(asc(customFields.entidad), asc(customFields.orden));

  return (
    <ConfiguracionClient
      initialFields={fields}
      pipelineConsultoria={(pc?.fases as string[]) ?? FASES_CONSULTORIA_DEFAULT}
      pipelineRenting={(pr?.fases as string[]) ?? FASES_RENTING_DEFAULT}
    />
  );
}
