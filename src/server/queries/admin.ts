import { prisma } from "@/lib/db";

export async function getRestaurantForAdmin(restaurantId: string) {
  return prisma.restaurant.findUnique({
    where: { id: restaurantId },
  });
}

export async function getLocationsForAdmin(restaurantId: string) {
  return prisma.location.findMany({
    where: { restaurantId },
    orderBy: { name: "asc" },
  });
}

export async function getCategoriesForAdmin(restaurantId: string) {
  return prisma.category.findMany({
    where: { restaurantId },
    include: { location: { select: { id: true, name: true } } },
    orderBy: [{ locationId: "asc" }, { sortOrder: "asc" }],
  });
}

export async function getItemsForAdmin(restaurantId: string) {
  return prisma.menuItem.findMany({
    where: { restaurantId },
    include: {
      category: { select: { id: true, name: true } },
      location: { select: { id: true, name: true } },
    },
    orderBy: [{ locationId: "asc" }, { name: "asc" }],
  });
}

export async function getUsersForAdmin(restaurantId: string) {
  return prisma.user.findMany({
    where: { restaurantId },
    orderBy: { name: "asc" },
  });
}
