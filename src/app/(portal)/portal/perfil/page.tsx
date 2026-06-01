import { auth } from "@/lib/auth";
import { db } from "@/db";
import { collaborators, collaboratorContacts } from "@/db/schema";
import { eq } from "drizzle-orm";
import PerfilForm from "./PerfilForm";
import ContactosSection from "./ContactosSection";

export default async function PerfilPage() {
  const session = await auth();
  const userId = session!.user!.id as string;

  const [colab] = await db
    .select()
    .from(collaborators)
    .where(eq(collaborators.id, userId))
    .limit(1);

  const contactos = await db
    .select()
    .from(collaboratorContacts)
    .where(eq(collaboratorContacts.collaborator_id, userId))
    .orderBy(collaboratorContacts.created_at);

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Mi perfil</h1>
        <p className="text-sm text-gray-400 mt-1">Gestiona los datos de tu empresa y personas de contacto</p>
      </div>

      <div className="space-y-6">
        <PerfilForm colab={colab} />
        <ContactosSection contactos={contactos} />
      </div>
    </div>
  );
}
