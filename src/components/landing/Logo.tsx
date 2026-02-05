"use client";

import Link from "next/link";
import { siteConfig } from "./site-config";

/**
 * Logo for nav and footer. Uses site config logoUrl if set; otherwise placeholder (mark + site name).
 * Custom logo uses img so any URL works without next.config.
 * @param href - Link target (default "/"); use "/admin" in admin layout.
 */
export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  const content = siteConfig.logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={siteConfig.logoUrl}
      alt={siteConfig.siteName}
      className="h-16 w-16 object-contain object-left"
      width={64}
      height={64}
    />
  ) : (
    <span className="flex items-center gap-2">
      <span
        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-menu-gold text-2xl font-bold text-menu-brown"
        aria-hidden
      >
        {siteConfig.siteName.charAt(0)}
      </span>
      <span className="font-semibold text-inherit">{siteConfig.siteName}</span>
    </span>
  );

  return (
    <Link href={href} className={`inline-flex items-center ${className ?? ""}`} aria-label={href === "/admin" ? "Panel de administración" : "Inicio"}>
      {content}
    </Link>
  );
}
