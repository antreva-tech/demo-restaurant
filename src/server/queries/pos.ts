import { prisma } from "@/lib/db";

export async function getRestaurantForPos(restaurantId: string) {
  return prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      id: true,
      name: true,
      taxRateBps: true,
      serviceChargeBps: true,
      posInactivityTimeoutMinutes: true,
      allowCash: true,
      allowTransfer: true,
      allowCard: true,
    },
  });
}

export async function getLocationsForPos(restaurantId: string) {
  return prisma.location.findMany({
    where: { restaurantId, isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function getCategoriesAndItemsForPos(
  restaurantId: string,
  locationId: string
) {
  const location = await prisma.location.findFirst({
    where: { id: locationId, restaurantId, isActive: true },
  });
  if (!location) return { categories: [], items: [] };
  const [categories, items] = await Promise.all([
    prisma.category.findMany({
      where: { locationId: location.id, isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.menuItem.findMany({
      where: { locationId: location.id, isActive: true },
      orderBy: [{ categoryId: "asc" }, { name: "asc" }],
    }),
  ]);
  return { categories, items };
}
