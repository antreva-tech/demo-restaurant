import { CartProvider } from "@/components/public/CartContext";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ restaurantSlug: string; locationSlug: string }>;
}

/**
 * Wraps menu and checkout with CartProvider so cart is available and keyed by location.
 */
export default async function PublicMenuLayout({ children, params }: LayoutProps) {
  const { restaurantSlug, locationSlug } = await params;
  return (
    <CartProvider restaurantSlug={restaurantSlug} locationSlug={locationSlug}>
      {children}
    </CartProvider>
  );
}
