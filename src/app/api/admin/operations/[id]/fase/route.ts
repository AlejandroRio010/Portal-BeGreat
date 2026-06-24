import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { operations, collaborators, supplierUsers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { sendOperationValidatedEmail, sendOperationApprovedEmail, sendSupplierOperationApprovedEmail, sendSupplierContractSignedEmail } from "@/lib/email";
import { fmtEur } from "@/lib/format";

const FASES_FIRMADAS = ["Contrato firmado", "Honorarios pagados", "Transferencia realizada"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const { fase, notas_admin, facturacion_renting, onedrive_url } = body;

  // Fetch current state for email triggers
  const [prevOp] = await db
    .select({
      status: operations.status,
      fase: operations.fase,
      nombre: operations.nombre,
      collaborator_id: operations.collaborator_id,
      supplier_id: operations.supplier_id,
      importe: operations.importe,
      descripcion: operations.descripcion,
      comision_colaborador: operations.comision_colaborador,
    })
    .from(operations)
    .where(eq(operations.id, id))
    .limit(1);

  const updateData: Record<string, unknown> = {
    updated_at: new Date(),
  };

  if (fase !== undefined) {
    updateData.fase = fase;
    updateData.status = "activa";
  }
  if (notas_admin !== undefined) updateData.notas_admin = notas_admin || null;
  if (facturacion_renting !== undefined) updateData.facturacion_renting = facturacion_renting || null;
  if (onedrive_url !== undefined) updateData.onedrive_url = onedrive_url || null;

  await db.update(operations).set(updateData).where(eq(operations.id, id));

  // ─── Email notifications ────────────────────────────────────────────────────
  if (prevOp && fase !== undefined) {
    (async () => {
      try {
        const [colab] = await db
          .select({ email: collaborators.email, nombre: collaborators.nombre })
          .from(collaborators)
          .where(eq(collaborators.id, prevOp.collaborator_id))
          .limit(1);
        if (!colab) return;

        // Validated: was pending, now active
        if (prevOp.status === "pendiente_de_validar") {
          await sendOperationValidatedEmail(colab.email, colab.nombre, prevOp.nombre ?? "Operación", id);
        }

        // Approved: fase moves to "Operación aprobada"
        if (fase === "Operación aprobada" && prevOp.fase !== "Operación aprobada") {
          await sendOperationApprovedEmail(
            colab.email, colab.nombre, prevOp.nombre ?? "Operación", id,
            fmtEur(prevOp.importe), fmtEur(prevOp.comision_colaborador)
          );
        }
      } catch (e: any) {
        console.error("[OpEmail]", e.message);
      }
    })();

    // Supplier emails: approved + contract signed
    if (prevOp.supplier_id) {
      const isApproved = fase === "Operación aprobada" && prevOp.fase !== "Operación aprobada";
      const isContractSigned = fase === "Contrato firmado" && prevOp.fase !== "Contrato firmado";
      if (isApproved || isContractSigned) {
        (async () => {
          try {
            const users = await db.select({ email: supplierUsers.email, nombre: supplierUsers.nombre })
              .from(supplierUsers)
              .where(and(eq(supplierUsers.supplier_id, prevOp.supplier_id!), eq(supplierUsers.activo, true)));
            for (const u of users) {
              if (isApproved) {
                await sendSupplierOperationApprovedEmail(u.email, u.nombre, prevOp.nombre ?? "Operación");
              } else {
                await sendSupplierContractSignedEmail(u.email, u.nombre, prevOp.nombre ?? "Operación", fmtEur(prevOp.importe), prevOp.descripcion);
              }
            }
          } catch (e: any) { console.error("[SupplierEmail]", e.message); }
        })();
      }
    }
  }

  return NextResponse.json({ ok: true });
}
