import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const role = (session.user as any).role;
  redirect(role === "admin" ? "/admin/operaciones" : "/portal");
}
