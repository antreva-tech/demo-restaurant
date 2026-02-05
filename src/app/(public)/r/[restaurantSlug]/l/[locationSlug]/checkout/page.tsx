import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicMenu } from "@/server/queries/menu";
import { CheckoutForm } from "@/components/public/CheckoutForm";

interface PageProps {
  params: Promise<{ restaurantSlug: string; locationSlug: string }>;
}

/**
 * Checkout page for online orders. Requires cart in context; redirects to menu if empty (client-side).
 */
export default async function CheckoutPage({ params }: PageProps) {
  const { restaurantSlug, locationSlug } = await params;
  const data = await getPublicMenu(restaurantSlug, locationSlug);
  if (!data) notFound();
  const { restaurant, location } = data;
  const menuHref = `/r/${restaurantSlug}/l/${locationSlug}`;

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <header className="safe-area-top sticky top-0 z-30 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex min-h-[52px] items-center gap-3 px-3 sm:min-h-[56px] sm:px-4">
          <Link
            href={menuHref}
            className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full text-[#2d3748] active:bg-gray-100 sm:hover:bg-gray-100"
            aria-label="Volver al menú"
          >
            <BackIcon />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold text-[#2d3748] sm:text-xl">
              Finalizar pedido
            </h1>
            <p className="truncate text-sm text-[#718096]">
              {restaurant.name} · {location.name}
            </p>
          </div>
          <span className="w-11 shrink-0" aria-hidden />
        </div>
      </header>
      <CheckoutForm
        restaurantSlug={restaurantSlug}
        locationSlug={locationSlug}
        restaurantName={restaurant.name}
        locationName={location.name}
      />
    </div>
  );
}

function BackIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
