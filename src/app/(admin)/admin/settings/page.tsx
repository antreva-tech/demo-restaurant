import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getRestaurantForAdmin } from "@/server/queries/admin";
import { Card } from "@/components/ui/Card";
import { SettingsForm } from "@/components/admin/SettingsForm";

export default async function AdminSettingsPage() {
  const session = await auth();
  const restaurantId = (session as { restaurantId?: string })?.restaurantId;
  if (!restaurantId) redirect("/login/admin");

  const restaurant = await getRestaurantForAdmin(restaurantId);
  if (!restaurant) redirect("/admin");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-antreva-navy">Configuración</h1>
      <Card title="Restaurant y Caja">
        <SettingsForm restaurant={restaurant} />
      </Card>
    </div>
  );
}
