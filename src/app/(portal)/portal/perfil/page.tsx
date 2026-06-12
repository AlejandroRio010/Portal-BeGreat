import { auth } from "@/lib/auth";
import { db } from "@/db";
import { collaborators, collaboratorContacts, collaboratorUsers } from "@/db/schema";
import { eq } from "drizzle-orm";
import MisDatosForm from "./MisDatosForm";
import PerfilForm from "./PerfilForm";
import ContactosSection from "./ContactosSection";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const session = await auth();
  const collaboratorId = (session!.user as any).collaboratorId as string;
  const userId = session!.user!.id as string;

  const [colab] = await db
    .select()
    .from(collaborators)
    .where(eq(collaborators.id, collaboratorId))
    .limit(1);

  const [user] = await db
    .select({ id: collaboratorUsers.id, nombre: collaboratorUsers.nombre, email: collaboratorUsers.email })
    .from(collaboratorUsers)
    .where(eq(collaboratorUsers.id, userId))
    .limit(1);

  const contactos = await db
    .select()
    .from(collaboratorContacts)
    .where(eq(collaboratorContacts.collaborator_id, collaboratorId))
    .orderBy(collaboratorContacts.created_at);

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Mi perfil</h1>
        <p className="text-sm text-gray-400 mt-1">Gestiona tus datos personales, los de tu empresa y personas de contacto</p>
      </div>

      <div className="space-y-6">
        {user && <MisDatosForm user={user} />}
        <PerfilForm colab={colab} />
        <ContactosSection contactos={contactos} />
      </div>
    </div>
  );
}
