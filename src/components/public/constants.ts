/**
 * Shared constants for the public menu (placeholders, dimensions).
 */

/**
 * Fallback image when a menu item has no imageUrl and no restaurant logo.
 * Used only when siteConfig.logoUrl is empty (Unsplash placeholder).
 */
export const DEFAULT_FOOD_IMAGE =
  "https://images.unsplash.com/photo-1546069901-d5bfd2cbfb1f?w=500&h=400&fit=crop";

/**
 * Encodes a path for use in img src (handles spaces and special chars in filenames).
 * @param path - Path or URL (e.g. /Antreva Restaurante Demo.png)
 * @returns Encoded path safe for img src
 */
function encodePathForSrc(path: string): string {
  try {
    const parts = path.trim().split("/");
    return parts.map((segment) => encodeURIComponent(segment)).join("/");
  } catch {
    return path;
  }
}

/**
 * Resolves the image URL to show on a product card. Uses the site logo as
 * placeholder when the product has no image; otherwise falls back to DEFAULT_FOOD_IMAGE.
 * @param itemImageUrl - Product's image URL (may be null/undefined/empty)
 * @param logoUrl - Site logo URL from config
 * @returns URL to display and whether it is the logo placeholder (for styling)
 */
export function getProductCardImageUrl(
  itemImageUrl: string | null | undefined,
  logoUrl: string
): { src: string; isLogoPlaceholder: boolean } {
  const hasItemImage = !!itemImageUrl?.trim();
  if (hasItemImage) {
    return { src: itemImageUrl!.trim(), isLogoPlaceholder: false };
  }
  const useLogo = !!logoUrl?.trim();
  const src = useLogo ? encodePathForSrc(logoUrl) : DEFAULT_FOOD_IMAGE;
  return {
    src,
    isLogoPlaceholder: useLogo,
  };
}
