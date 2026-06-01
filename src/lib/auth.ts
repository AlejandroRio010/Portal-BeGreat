import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/db";
import { collaborators } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.identificador = (user as any).identificador;
        token.nombre = (user as any).nombre;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      (session.user as any).role = token.role;
      (session.user as any).identificador = token.identificador;
      (session.user as any).nombre = token.nombre;
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

        const [user] = await db
          .select()
          .from(collaborators)
          .where(eq(collaborators.email, credentials.email as string))
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
        };
      },
    }),
  ],
});
