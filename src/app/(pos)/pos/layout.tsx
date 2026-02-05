import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getRestaurantForPos } from "@/server/queries/pos";
import { logout } from "@/server/actions/auth";
import { InactivityLogout } from "@/components/pos/InactivityLogout";
import Link from "next/link";

export default async function PosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const restaurantId = (session as { restaurantId?: string })?.restaurantId;

  if (!restaurantId) {
    return <>{children}</>;
  }

  const restaurant = await getRestaurantForPos(restaurantId);
  const timeoutMinutes = restaurant?.posInactivityTimeoutMinutes ?? 15;

  return (
    <div className="flex min-h-screen flex-col bg-gray-100">
      <InactivityLogout timeoutMinutes={timeoutMinutes} />
      <header className="flex items-center justify-between border-b bg-white px-4 py-2">
        <Link href="/pos" className="font-semibold text-antreva-navy">
          Caja
        </Link>
        <span className="text-sm text-gray-600">
          {session?.user?.name ?? (session?.user as { id?: string })?.id}
        </span>
        <form action={logout}>
          <button type="submit" className="text-sm text-antreva-blue hover:underline">
            Cerrar sesión
          </button>
        </form>
      </header>
      {children}
    </div>
  );
}
