import { ContactSection } from "@/components/landing/ContactSection";
import { ExperienceSection } from "@/components/landing/ExperienceSection";
import { Hero } from "@/components/landing/Hero";
import { HoursSection } from "@/components/landing/HoursSection";
import { MenuPreviewSection } from "@/components/landing/MenuPreviewSection";
import { siteConfig } from "@/components/landing/site-config";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteNav } from "@/components/landing/SiteNav";
import { getDefaultPublicMenu, getPublicMenu } from "@/server/queries/menu";

/** Parses menu path to get restaurant and location slugs for menu fetch. */
function getSlugsFromMenuPath(path: string): { restaurantSlug: string; locationSlug: string } {
  const match = path.match(/\/r\/([^/]+)\/l\/([^/]+)/);
  return {
    restaurantSlug: match?.[1] ?? "demo",
    locationSlug: match?.[2] ?? "principal",
  };
}

/**
 * Resolves menu data from the database. Uses site config menu path if it returns data;
 * otherwise falls back to first restaurant + first active location so the section is always DB-driven.
 */
async function getMenuPreviewData() {
  const menuPath = siteConfig.menuPath;
  const { restaurantSlug, locationSlug } = getSlugsFromMenuPath(menuPath);
  let menuData = await getPublicMenu(restaurantSlug, locationSlug);
  let resolvedPath = menuPath;
  if (!menuData) {
    menuData = await getDefaultPublicMenu();
    if (menuData) {
      resolvedPath = `/r/${menuData.restaurant.slug}/l/${menuData.location.slug}`;
    }
  }
  return {
    menuPath: resolvedPath,
    categories: menuData?.categories ?? [],
    menuItems: menuData?.menuItems ?? [],
  };
}

/**
 * Home: customer-facing landing with menu preview and "Pedir en línea" CTA. Mobile-first, Spanish.
 * Menu preview section is built from the database (categories + items); no hardcoded menu content.
 */
export default async function HomePage() {
  const { menuPath, categories, menuItems } = await getMenuPreviewData();

  return (
    <div className="flex min-h-screen flex-col bg-white text-gray-900">
      <SiteNav />
      <Hero />
      <main className="flex-1">
        <ExperienceSection />
        <MenuPreviewSection
          menuPath={menuPath}
          categories={categories}
          menuItems={menuItems}
        />
        <HoursSection />
        <ContactSection />
      </main>
      <SiteFooter />
    </div>
  );
}
