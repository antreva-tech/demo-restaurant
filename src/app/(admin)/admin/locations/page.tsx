import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getLocationsForAdmin } from "@/server/queries/admin";
import { Card } from "@/components/ui/Card";
import { LocationsTable } from "@/components/admin/LocationsTable";

export default async function AdminLocationsPage() {
  const session = await auth();
  const restaurantId = (session as { restaurantId?: string })?.restaurantId;
  if (!restaurantId) redirect("/login");

  const locations = await getLocationsForAdmin(restaurantId);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Ubicaciones</h1>
      <Card>
        {locations.length === 0 ? (
          <p className="text-gray-500">No hay ubicaciones. Agregue una.</p>
        ) : (
          <LocationsTable locations={locations} />
        )}
      </Card>
    </div>
  );
}
