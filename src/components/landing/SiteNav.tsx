"use client";

import Link from "next/link";
import { siteConfig } from "./site-config";
import { Logo } from "./Logo";

/**
 * Main site nav (customer-only): logo, Menú, Contacto. Mobile-first touch targets.
 * Business links (login, POS) are not shown; staff use direct URLs.
 */
export function SiteNav() {
  return (
    <nav className="sticky top-0 z-50 border-b-2 border-menu-gold/40 bg-menu-brown backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Logo className="min-h-[44px] min-w-[44px] text-menu-cream" />
        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            href={siteConfig.menuPath}
            className="min-h-[44px] flex min-w-[44px] items-center justify-center rounded-lg px-4 text-menu-cream/95 hover:bg-menu-gold/25 hover:text-menu-cream sm:min-w-0"
          >
            Menú
          </Link>
          <a
            href="#contact"
            className="min-h-[44px] flex min-w-[44px] items-center justify-center rounded-lg px-4 text-menu-cream/95 hover:bg-menu-gold/25 hover:text-menu-cream sm:min-w-0"
          >
            Contacto
          </a>
        </div>
      </div>
    </nav>
  );
}
