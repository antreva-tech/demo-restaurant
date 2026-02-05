import { siteConfig } from "./site-config";

/**
 * Optional Horarios block. Renders only when NEXT_PUBLIC_HOURS is set. Spanish.
 */
export function HoursSection() {
  if (!siteConfig.hasHours) return null;
  return (
    <section className="bg-white px-4 py-12 sm:py-16" aria-labelledby="hours-heading">
      <div className="mx-auto max-w-2xl text-center">
        <h2
          id="hours-heading"
          className="text-2xl font-semibold text-menu-brown sm:text-3xl"
        >
          Horarios
        </h2>
        <p className="mt-4 whitespace-pre-line text-base text-gray-600 sm:text-lg">
          {siteConfig.hours}
        </p>
      </div>
    </section>
  );
}
