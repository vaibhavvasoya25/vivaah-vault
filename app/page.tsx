import { redirect } from "next/navigation";
import { getSession } from "../lib/session"; // adjust to match your project's actual relative path

export default async function Home() {
  const session = await getSession();

  if (session.authenticated) {
    redirect("/dashboard");
  }

  redirect("/login");
}