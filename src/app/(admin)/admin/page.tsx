import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardOverview } from "@/components/admin/DashboardOverview";

/**
 * Admin dashboard (Ventas). Renders client DashboardOverview which fetches
 * via API and caches with SWR so filter changes only hit the DB when the
 * selected range/location was not already loaded.
 */
export default async function AdminDashboardPage() {
  const session = await auth();
  const restaurantId = (session as { restaurantId?: string })?.restaurantId;
  if (!restaurantId) redirect("/login/admin");

  return <DashboardOverview />;
}
