import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getItemsForAdmin, getCategoriesForAdmin, getLocationsForAdmin } from "@/server/queries/admin";
import { Card } from "@/components/ui/Card";
import { ItemsGrid } from "@/components/admin/ItemsGrid";

export default async function AdminItemsPage() {
  const session = await auth();
  const restaurantId = (session as { restaurantId?: string })?.restaurantId;
  if (!restaurantId) redirect("/login/admin");

  const [items, categories, locations] = await Promise.all([
    getItemsForAdmin(restaurantId),
    getCategoriesForAdmin(restaurantId),
    getLocationsForAdmin(restaurantId),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-antreva-navy">Productos</h1>
      <Card>
        <ItemsGrid items={items} categories={categories} locations={locations} />
        {items.length === 0 && (
          <p className="mt-4 text-center text-antreva-slate">No hay productos. Use el botón para agregar uno.</p>
        )}
      </Card>
    </div>
  );
}
