import { prisma } from "@/lib/db";

/**
 * Load restaurant by slug (public menu).
 */
export async function getRestaurantBySlug(slug: string) {
  return prisma.restaurant.findUnique({
    where: { slug },
  });
}

/**
 * Load location by restaurant id and slug (active only).
 */
export async function getLocationBySlug(restaurantId: string, locationSlug: string) {
  return prisma.location.findFirst({
    where: {
      restaurantId,
      slug: locationSlug,
      isActive: true,
    },
  });
}

/**
 * Load categories for a location (active, ordered by sortOrder).
 */
export async function getCategoriesForLocation(locationId: string) {
  return prisma.category.findMany({
    where: { locationId, isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

/**
 * Load menu items for a location (active). Optionally filter by category.
 */
export async function getMenuItemsForLocation(locationId: string, categoryId?: string) {
  return prisma.menuItem.findMany({
    where: {
      locationId,
      isActive: true,
      ...(categoryId ? { categoryId } : {}),
    },
    orderBy: { name: "asc" },
    include: { category: { select: { id: true, name: true, sortOrder: true } } },
  });
}

/**
 * Full public menu data for a restaurant location.
 */
export async function getPublicMenu(restaurantSlug: string, locationSlug: string) {
  const restaurant = await getRestaurantBySlug(restaurantSlug);
  if (!restaurant) return null;
  const location = await getLocationBySlug(restaurant.id, locationSlug);
  if (!location) return null;
  const categories = await getCategoriesForLocation(location.id);
  const menuItems = await getMenuItemsForLocation(location.id);
  return { restaurant, location, categories, menuItems };
}
