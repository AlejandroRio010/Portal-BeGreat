import { db } from "@/db";
import { customFields, pipelines } from "@/db/schema";
import { asc } from "drizzle-orm";
import ConfiguracionClient from "./ConfiguracionClient";

const FASES_CONSULTORIA = [
  "Pre-análisis",
  "Firma de honorarios",
  "En estudio por entidad",
  "Operación aprobada",
  "Contrato firmado",
  "Honorarios pagados",
];

const FASES_RENTING = [
  "Pre-análisis",
  "En estudio por entidad",
  "Operación aprobada",
  "Condiciones aceptadas",
  "Contrato firmado",
  "Transferencia realizada",
];

export default async function AdminConfiguracionPage() {
  // Upsert pipeline data if not exists
  try {
    await db
      .insert(pipelines)
      .values([
        { key: "consultoria", label: "Consultoría financiera", fases: FASES_CONSULTORIA },
        { key: "renting", label: "Renting de equipos", fases: FASES_RENTING },
      ])
      .onConflictDoNothing();
  } catch {
    // Ignore if pipelines table doesn't exist yet
  }

  const fields = await db
    .select()
    .from(customFields)
    .orderBy(asc(customFields.entidad), asc(customFields.orden));

  return (
    <ConfiguracionClient
      initialFields={fields}
      pipelineConsultoria={FASES_CONSULTORIA}
      pipelineRenting={FASES_RENTING}
    />
  );
}
