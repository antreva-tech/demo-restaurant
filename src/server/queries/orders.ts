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
