import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/db";
import { collaborators, collaboratorUsers, suppliers, supplierUsers } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.identificador = (user as any).identificador;
        token.nombre = (user as any).nombre;
        token.collaboratorId = (user as any).collaboratorId;
        token.supplierId = (user as any).supplierId;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      (session.user as any).role = token.role;
      (session.user as any).identificador = token.identificador;
      (session.user as any).nombre = token.nombre;
      (session.user as any).collaboratorId = token.collaboratorId;
      (session.user as any).supplierId = token.supplierId;
      return session;
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const emailNorm = (credentials.email as string).toLowerCase().trim();

        // 1) Try collaborator_users (colaborador login)
        const [cu] = await db
          .select()
          .from(collaboratorUsers)
          .where(eq(collaboratorUsers.email, emailNorm))
          .limit(1);

        if (cu) {
          // Check parent collaborator is active too
          const [colab] = await db
            .select({
              activo: collaborators.activo,
              identificador: collaborators.identificador,
              nombre: collaborators.nombre,
              nivel_entidades: collaborators.nivel_entidades,
            })
            .from(collaborators)
            .where(eq(collaborators.id, cu.collaborator_id))
            .limit(1);

          if (!colab || !colab.activo || !cu.activo) return null;

          const valid = await bcrypt.compare(credentials.password as string, cu.password_hash);
          if (!valid) return null;

          return {
            id: cu.id,
            email: cu.email,
            name: cu.nombre,
            role: "colaborador" as const,
            identificador: colab.identificador,
            nombre: cu.nombre,
            collaboratorId: cu.collaborator_id,
          };
        }

        // 2) Try supplier_users (proveedor login)
        const [su] = await db
          .select()
          .from(supplierUsers)
          .where(eq(supplierUsers.email, emailNorm))
          .limit(1);

        if (su) {
          const [supplier] = await db
            .select({
              portal_activo: suppliers.portal_activo,
              codigo: suppliers.codigo,
              nombre: suppliers.nombre,
            })
            .from(suppliers)
            .where(eq(suppliers.id, su.supplier_id))
            .limit(1);

          if (!supplier || !supplier.portal_activo || !su.activo) return null;

          const validSu = await bcrypt.compare(credentials.password as string, su.password_hash);
          if (!validSu) return null;

          return {
            id: su.id,
            email: su.email,
            name: su.nombre,
            role: "proveedor" as const,
            identificador: supplier.codigo ?? "",
            nombre: su.nombre,
            collaboratorId: null,
            supplierId: su.supplier_id,
          };
        }

        // 3) Try collaborators table (admin login)
        const [user] = await db
          .select()
          .from(collaborators)
          .where(eq(collaborators.email, emailNorm))
          .limit(1);

        if (!user || !user.activo) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password_hash
        );
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.nombre,
          role: user.role,
          identificador: user.identificador,
          nombre: user.nombre,
          collaboratorId: user.id,
        };
      },
    }),
  ],
});
