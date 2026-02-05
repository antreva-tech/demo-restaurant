import { notFound } from "next/navigation";
import { getPublicMenu } from "@/server/queries/menu";
import { MenuView } from "@/components/public/MenuView";

export const revalidate = 60;

interface PageProps {
  params: Promise<{ restaurantSlug: string; locationSlug: string }>;
}

/**
 * Public menu by restaurant and location slug. Spanish, DOP.
 */
export default async function PublicMenuPage({ params }: PageProps) {
  const { restaurantSlug, locationSlug } = await params;
  const data = await getPublicMenu(restaurantSlug, locationSlug);
  if (!data) notFound();
  const { restaurant, location, categories, menuItems } = data;
  return (
    <MenuView
      restaurantName={restaurant.name}
      locationName={location.name}
      locationAddress={location.address}
      categories={categories}
      menuItems={menuItems}
      restaurantSlug={restaurantSlug}
      locationSlug={locationSlug}
      taxRateBps={restaurant.taxRateBps}
    />
  );
}
