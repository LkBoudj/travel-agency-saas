import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { FeaturedToursProps } from "./types";
import TourCard from "./tour-card";

export default function FeaturedTours({
  eyebrow = "Featured Tours",
  heading = "Unforgettable journeys,\nhandpicked for you",
  description = "Explore our most popular tours and create memories that last a lifetime.",
  tours,
  viewAllHref = "/tours",
}: FeaturedToursProps) {
  const headingLines = heading.split("\n");

  return (
    <section
      id="tours"
      aria-labelledby="featured-tours-heading"
      className="bg-white"
    >
      <div className="mx-auto max-w-[1440px] px-5 py-[96px] sm:px-8 lg:px-10 lg:py-[120px]">
        <header className="text-center">
          <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-primary">
            {eyebrow}
          </p>
          <h2
            id="featured-tours-heading"
            className="mx-auto mt-5 max-w-[840px] text-[36px] font-bold leading-[1.08] tracking-[-0.02em] text-slate-900 sm:text-[46px] lg:text-[52px] lg:leading-[1.06]"
          >
            {headingLines.map((line, index) => (
              <span key={index} className="block">
                {line || "\u00A0"}
              </span>
            ))}
          </h2>
          <p className="mx-auto mt-5 max-w-[600px] text-[17px] leading-[1.6] text-slate-500 sm:text-[18px]">
            {description}
          </p>
        </header>

        <div className="mx-auto mt-14 grid max-w-[1280px] grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3">
          {tours.map((tour) => (
            <TourCard key={tour.id} tour={tour} />
          ))}
        </div>

        <div className="mt-14 text-center lg:mt-16">
          <Link
            href={viewAllHref}
            className="inline-flex h-[56px] items-center gap-2.5 rounded-full bg-primary px-9 text-[16px] font-semibold text-white transition-[transform,background-color] duration-300 hover:-translate-y-0.5 hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            View All Tours
            <ArrowRight className="h-[18px] w-[18px]" strokeWidth={2} />
          </Link>
        </div>
      </div>
    </section>
  );
}