import { prisma } from "@/lib/db";
import type { OrderStatus } from "@prisma/client";

export async function getOrdersForAdmin(
  restaurantId: string,
  opts?: { locationId?: string; status?: OrderStatus; from?: Date; to?: Date }
) {
  const where = {
    restaurantId,
    ...(opts?.locationId && { locationId: opts.locationId }),
    ...(opts?.status && { status: opts.status }),
    ...((opts?.from || opts?.to) && {
      createdAt: {
        ...(opts.from && { gte: opts.from }),
        ...(opts.to && { lte: opts.to }),
      },
    }),
  };
  return prisma.order.findMany({
    where,
    include: {
      location: { select: { id: true, name: true } },
      employee: { select: { id: true, name: true, employeeNumber: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
}

/**
 * Fetches a single order with items for admin invoice/edit view.
 * Ensures the order belongs to the given restaurant.
 */
export async function getOrderByIdForAdmin(restaurantId: string, orderId: string) {
  return prisma.order.findFirst({
    where: { id: orderId, restaurantId },
    include: {
      location: {
        include: {
          menuItems: {
            where: { isActive: true },
            select: { id: true, name: true, priceCents: true },
            orderBy: { name: "asc" },
          },
        },
      },
      employee: { select: { id: true, name: true, employeeNumber: true } },
      items: { orderBy: { id: "asc" } },
      restaurant: { select: { taxRateBps: true, serviceChargeBps: true } },
    },
  });
}
