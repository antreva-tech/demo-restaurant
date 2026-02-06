import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUsersForAdmin } from "@/server/queries/admin";
import { Card } from "@/components/ui/Card";
import { UsersTable } from "@/components/admin/UsersTable";

export default async function AdminUsersPage() {
  const session = await auth();
  const restaurantId = (session as { restaurantId?: string })?.restaurantId;
  if (!restaurantId) redirect("/login/admin");

  const users = await getUsersForAdmin(restaurantId);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-antreva-navy">Usuarios</h1>
      <Card>
        <UsersTable users={users} />
      </Card>
    </div>
  );
}
