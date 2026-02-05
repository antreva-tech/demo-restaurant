import Image from "next/image";
import { siteConfig } from "./site-config";

/**
 * Experience / story section with image. Spanish, mobile-first (stack on small screens).
 */
export function ExperienceSection() {
  return (
    <section className="bg-white px-4 py-12 sm:py-16" aria-labelledby="experience-heading">
      <div className="mx-auto max-w-5xl">
        <h2
          id="experience-heading"
          className="text-center text-2xl font-bold text-menu-brown sm:text-3xl"
        >
          Rápido y fresco
        </h2>
        <div className="mt-10 flex flex-col gap-10 md:flex-row md:items-center md:gap-14">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border-2 border-menu-gold/30 bg-gray-100 md:aspect-square md:max-w-md md:shrink-0">
            <Image
              src={siteConfig.experienceImageUrl}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw,  min(400px, 50vw)"
            />
          </div>
          <div className="flex flex-col justify-center md:max-w-lg">
            <p className="text-base leading-relaxed text-gray-700 sm:text-lg">
              {siteConfig.description}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
