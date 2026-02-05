import { ContactSection } from "@/components/landing/ContactSection";
import { ExperienceSection } from "@/components/landing/ExperienceSection";
import { Hero } from "@/components/landing/Hero";
import { HoursSection } from "@/components/landing/HoursSection";
import { MenuPreviewSection } from "@/components/landing/MenuPreviewSection";
import { siteConfig } from "@/components/landing/site-config";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteNav } from "@/components/landing/SiteNav";
import { getPublicMenu } from "@/server/queries/menu";

/** Parses menu path to get restaurant and location slugs for menu fetch. */
function getSlugsFromMenuPath(path: string): { restaurantSlug: string; locationSlug: string } {
  const match = path.match(/\/r\/([^/]+)\/l\/([^/]+)/);
  return {
    restaurantSlug: match?.[1] ?? "demo",
    locationSlug: match?.[2] ?? "principal",
  };
}

/**
 * Home: customer-facing landing with menu preview and "Pedir en línea" CTA. Mobile-first, Spanish.
 * No business links (login/POS); staff use direct URLs.
 */
export default async function HomePage() {
  const menuPath = siteConfig.menuPath;
  const { restaurantSlug, locationSlug } = getSlugsFromMenuPath(menuPath);
  const menuData = await getPublicMenu(restaurantSlug, locationSlug);

  return (
    <div className="flex min-h-screen flex-col bg-white text-gray-900">
      <SiteNav />
      <Hero />
      <main className="flex-1">
        <ExperienceSection />
        <MenuPreviewSection
          menuPath={menuPath}
          categories={menuData?.categories ?? []}
          menuItems={menuData?.menuItems ?? []}
        />
        <HoursSection />
        <ContactSection />
      </main>
      <SiteFooter />
    </div>
  );
}
