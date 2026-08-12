import { currentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { GardenView } from "@/components/garden/garden-view";

export default async function GardenPage() {
  const user = await currentUser();
  if (!user) redirect("/welcome");
  return <GardenView />;
}
