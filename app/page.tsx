import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Home } from "@/components/Home";

export default async function Page() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <Home
      usuario={{
        nombre: session.user.name ?? session.user.email ?? "Vos",
        email: session.user.email ?? "",
      }}
    />
  );
}
