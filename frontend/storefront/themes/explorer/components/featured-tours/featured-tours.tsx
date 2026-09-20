import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { FeaturedToursProps } from "./types";
import TourCard from "./tour-card";
import { SectionHeader } from "../section-header";

export default function FeaturedTours({
  eyebrow = "Featured Tours",
  heading = "Unforgettable journeys,\nhandpicked for you",
  description = "Explore our most popular tours and create memories that last a lifetime.",
  tours,
  viewAllHref = "/tours",
}: FeaturedToursProps) {
  return (
    <section
      id="tours"
      aria-labelledby="featured-tours-heading"
      className="bg-white"
    >
      <div className="mx-auto max-w-[1440px] px-5 py-[96px] sm:px-8 lg:px-10 lg:py-[120px]">
        <SectionHeader
          eyebrow={eyebrow}
          title={heading}
          description={description}
          headingId="featured-tours-heading"
        />

        <div className="mx-auto mt-14 grid max-w-[1280px] grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3">
          {tours.map((tour) => (
            <TourCard key={tour.id} tour={tour} />
          ))}
        </div>

        <div className="mt-14 text-center lg:mt-16">
          <Link
            href={viewAllHref}
            className="group/btn inline-flex h-[56px] items-center gap-2.5 rounded-full bg-primary px-9 text-[16px] font-semibold text-white transition-[transform,background-color] duration-300 hover:-translate-y-0.5 hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            View All Tours
            <ArrowRight
              className="h-[18px] w-[18px] transition-transform duration-300 group-hover/btn:translate-x-1 rtl:-scale-x-100 rtl:group-hover/btn:-translate-x-1"
              strokeWidth={2}
            />
          </Link>
        </div>
      </div>
    </section>
  );
}