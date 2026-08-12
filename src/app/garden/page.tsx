import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { WorldGarden } from "@/components/world-home/world-garden";

export default async function GardenPage() {
  const user = await currentUser();
  if (!user) redirect("/welcome");
  return <WorldGarden />;
}
