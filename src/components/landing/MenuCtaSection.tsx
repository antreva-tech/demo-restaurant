import Link from "next/link";
import { siteConfig } from "./site-config";

/**
 * Single CTA section linking to the public menu. Mobile-first; touch-friendly button.
 */
export function MenuCtaSection() {
  return (
    <section className="bg-white px-4 py-12 sm:py-16" aria-labelledby="menu-cta-heading">
      <div className="mx-auto max-w-xl">
        <h2
          id="menu-cta-heading"
          className="text-center text-2xl font-semibold text-menu-brown sm:text-3xl"
        >
          Menús
        </h2>
        <p className="mt-3 text-center text-gray-600">
          Explora nuestro menú y haz tu pedido.
        </p>
        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href={siteConfig.menuPath}
            className="min-h-[44px] w-full min-w-0 flex items-center justify-center rounded-xl bg-menu-gold px-6 py-3 font-medium text-menu-brown transition hover:bg-menu-gold-hover sm:w-auto"
          >
            Ver menú
          </Link>
        </div>
      </div>
    </section>
  );
}
