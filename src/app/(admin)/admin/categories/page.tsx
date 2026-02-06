import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCategoriesForAdmin, getLocationsForAdmin } from "@/server/queries/admin";
import { Card } from "@/components/ui/Card";
import { CategoriesTable } from "@/components/admin/CategoriesTable";

export default async function AdminCategoriesPage() {
  const session = await auth();
  const restaurantId = (session as { restaurantId?: string })?.restaurantId;
  if (!restaurantId) redirect("/login/admin");

  const [categories, locations] = await Promise.all([
    getCategoriesForAdmin(restaurantId),
    getLocationsForAdmin(restaurantId),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-antreva-navy">Categorías</h1>
      <Card>
        {categories.length === 0 ? (
          <p className="text-antreva-slate">No hay categorías. Agregue una.</p>
        ) : (
          <CategoriesTable categories={categories} locations={locations} />
        )}
      </Card>
    </div>
  );
}
