"use server";

import { auth } from "@/lib/auth";
import { getCategoriesAndItemsForPos } from "@/server/queries/pos";

export async function getPosMenu(locationId: string) {
  const session = await auth();
  const restaurantId = (session as { restaurantId?: string })?.restaurantId;
  if (!restaurantId) return { error: "No autorizado", categories: [], items: [] };
  const { categories, items } = await getCategoriesAndItemsForPos(restaurantId, locationId);
  return { categories, items };
}
