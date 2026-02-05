import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "./site-config";

/**
 * Hero section for fast-food main site: bold headline, tagline, primary CTA. Mobile-first.
 */
export function Hero() {
  return (
    <section className="relative min-h-[65vh] overflow-hidden px-4 py-14 sm:py-20 md:py-24">
      <div className="absolute inset-0 bg-gray-200">
        <Image
          src={siteConfig.heroImageUrl}
          alt=""
          fill
          className="object-cover opacity-70"
          priority
          sizes="100vw"
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-white/85 via-white/50 to-white/90"
          aria-hidden
        />
      </div>
      <div className="relative mx-auto flex min-h-[55vh] max-w-4xl flex-col justify-center text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-menu-brown drop-shadow-sm sm:text-5xl md:text-6xl">
          {siteConfig.siteName}
        </h1>
        <p className="mt-3 text-lg font-medium text-gray-700 drop-shadow-sm sm:text-xl md:text-2xl">
          {siteConfig.tagline}
        </p>
        <div className="mt-8 flex justify-center">
          <Link
            href={siteConfig.menuPath}
            className="min-h-[48px] flex items-center justify-center rounded-xl bg-menu-gold px-8 py-3.5 text-lg font-semibold text-menu-brown shadow-md transition hover:bg-menu-gold-hover"
          >
            Ordena ya
          </Link>
        </div>
      </div>
    </section>
  );
}
