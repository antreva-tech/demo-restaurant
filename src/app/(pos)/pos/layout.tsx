import { auth } from "@/lib/auth";
import { getRestaurantForPos } from "@/server/queries/pos";
import { InactivityLogout } from "@/components/pos/InactivityLogout";
import { PosLogoutButton } from "@/components/pos/PosLogoutButton";
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
    <div className="flex h-screen flex-col overflow-hidden bg-gray-100">
      <InactivityLogout timeoutMinutes={timeoutMinutes} />
      <header className="safe-area-top flex shrink-0 min-h-[56px] items-center justify-between border-b bg-white px-4 py-2">
        <Link href="/pos" className="min-h-[44px] min-w-[44px] flex items-center font-semibold text-antreva-navy touch-manipulation">
          Caja
        </Link>
        <span className="text-sm text-gray-600">
          {session?.user?.name ?? (session?.user as { id?: string })?.id}
        </span>
        <PosLogoutButton />
      </header>
      <main className="min-h-0 flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
