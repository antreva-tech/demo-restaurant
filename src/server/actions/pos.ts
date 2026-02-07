"use server";

import { auth } from "@/lib/auth";
import { getCategoriesAndItemsForPos, getOpenOrdersForPos } from "@/server/queries/pos";

export async function getPosMenu(locationId: string) {
  const session = await auth();
  const restaurantId = (session as { restaurantId?: string })?.restaurantId;
  if (!restaurantId) return { error: "No autorizado", categories: [], items: [] };
  const { categories, items } = await getCategoriesAndItemsForPos(restaurantId, locationId);
  return { categories, items };
}

/** Returns OPEN orders for the current location for "Órdenes por cobrar"; optional search by customer name. */
export async function getOpenOrdersForPosAction(locationId: string, search?: string) {
  const session = await auth();
  const restaurantId = (session as { restaurantId?: string })?.restaurantId;
  if (!restaurantId) return { error: "No autorizado", orders: [] };
  const orders = await getOpenOrdersForPos(restaurantId, locationId, search);
  return { orders };
}
