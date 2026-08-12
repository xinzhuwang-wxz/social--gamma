import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { HomeInterior } from "@/components/world-home/home-interior";

export default async function HomePage() {
  const user = await currentUser();
  if (!user) redirect("/welcome");
  return <HomeInterior />;
}
