import Link from "next/link";
import { siteConfig } from "./site-config";
import { Logo } from "./Logo";

/**
 * Site footer: logo and quick links (Menú, Contacto).
 */
export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t-2 border-menu-gold/25 bg-white px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <div className="flex flex-col items-center gap-2 text-center sm:items-start sm:text-left">
            <Logo className="text-menu-brown" />
            <p className="mt-1 text-sm text-gray-500">
              © {year} {siteConfig.copyrightName}. Todos los derechos reservados.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <Link href={siteConfig.menuPath} className="text-gray-600 hover:text-menu-brown">
              Menú
            </Link>
            <a href="#contact" className="text-gray-600 hover:text-menu-brown">
              Contacto
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
