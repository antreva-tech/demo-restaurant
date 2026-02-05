import { auth } from "@/lib/auth";
import { getDateRange } from "@/lib/dashboard";
import { getLocationsForAdmin } from "@/server/queries/admin";
import { getKpis, getSalesByDay, getTopItems } from "@/server/queries/analytics";
import { NextResponse } from "next/server";

/**
 * GET /api/admin/dashboard
 * Returns dashboard data for the given range and locationId.
 * Used by the client dashboard with SWR so filter changes only refetch when the cache misses.
 */
export async function GET(request: Request) {
  const session = await auth();
  const restaurantId = (session as { restaurantId?: string })?.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") ?? "30";
  const locationIdParam = searchParams.get("locationId");
  const locationId =
    locationIdParam && locationIdParam !== "all" ? locationIdParam : undefined;
  const { from, to } = getDateRange(range);

  const [locations, kpis, salesByDay, topItems] = await Promise.all([
    getLocationsForAdmin(restaurantId),
    getKpis(restaurantId, from, to, locationId),
    getSalesByDay(restaurantId, from, to, locationId),
    getTopItems(restaurantId, from, to, locationId),
  ]);

  return NextResponse.json({
    locations,
    kpis,
    salesByDay,
    topItems,
  });
}
