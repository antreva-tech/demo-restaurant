import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getRestaurantForPos, getLocationsForPos } from "@/server/queries/pos";
import { PosBuilder } from "@/components/pos/PosBuilder";

export default async function PosPage() {
  const session = await auth();
  const restaurantId = (session as { restaurantId?: string })?.restaurantId;
  if (!restaurantId) redirect("/pos/login");

  const [restaurant, locations] = await Promise.all([
    getRestaurantForPos(restaurantId),
    getLocationsForPos(restaurantId),
  ]);

  if (!restaurant || locations.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-gray-600">No hay ubicaciones configuradas. Configure una en Administración.</p>
      </div>
    );
  }

  return (
    <PosBuilder
      locations={locations}
      restaurant={{
        taxRateBps: restaurant.taxRateBps,
        serviceChargeBps: restaurant.serviceChargeBps,
      }}
    />
  );
}
