import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/firebase/admin";
import BillingClient from "./BillingClient";

export default async function BillingPage() {
  const user = await getServerUser();
  if (!user) redirect("/auth?error=unauthorized");
  return <BillingClient />;
}
