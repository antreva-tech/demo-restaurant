import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getItemsForAdmin, getCategoriesForAdmin, getLocationsForAdmin } from "@/server/queries/admin";
import { Card } from "@/components/ui/Card";
import { ItemsTable } from "@/components/admin/ItemsTable";

export default async function AdminItemsPage() {
  const session = await auth();
  const restaurantId = (session as { restaurantId?: string })?.restaurantId;
  if (!restaurantId) redirect("/login");

  const [items, categories, locations] = await Promise.all([
    getItemsForAdmin(restaurantId),
    getCategoriesForAdmin(restaurantId),
    getLocationsForAdmin(restaurantId),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Productos</h1>
      <Card>
        {items.length === 0 ? (
          <p className="text-gray-500">No hay productos. Agregue uno.</p>
        ) : (
          <ItemsTable items={items} categories={categories} locations={locations} />
        )}
      </Card>
    </div>
  );
}
