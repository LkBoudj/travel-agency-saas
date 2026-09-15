import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type {
  DestinationLayout,
  PopularDestinationsProps,
} from "./types";
import DestinationCard from "./destination-card";

const placement: Record<DestinationLayout, string> = {
  large:
    "h-[300px] sm:h-[380px] md:col-span-2 md:h-[420px] lg:h-[560px] lg:row-span-2 lg:col-span-7",
  small: "h-[280px] md:h-[320px] lg:h-[268px] lg:col-span-5",
  wide: "h-[300px] md:col-span-2 md:h-[340px] lg:h-[300px] lg:col-span-12",
};

export default function PopularDestinations({
  eyebrow = "Popular Destinations",
  heading = "Explore places worth traveling for",
  description = "Discover inspiring destinations and find the journeys that match the way you want to travel.",
  destinations,
  ctaHref = "/destinations",
}: PopularDestinationsProps) {
  return (
    <section
      id="destinations"
      aria-labelledby="popular-destinations-heading"
      className="bg-white"
    >
      <div className="mx-auto max-w-[1440px] px-5 py-[96px] sm:px-8 lg:px-10 lg:py-[120px]">
        <header className="text-center">
          <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-primary">
            {eyebrow}
          </p>
          <h2
            id="popular-destinations-heading"
            className="mx-auto mt-5 max-w-[760px] text-[36px] font-bold leading-[1.08] tracking-[-0.02em] text-slate-900 sm:text-[46px] lg:text-[52px] lg:leading-[1.06]"
          >
            {heading}
          </h2>
          <p className="mx-auto mt-5 max-w-[700px] text-[17px] leading-[1.6] text-slate-500 sm:text-[18px]">
            {description}
          </p>
        </header>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-12">
          {destinations.map((destination) => (
            <div key={destination.id} className={placement[destination.layout]}>
              <DestinationCard destination={destination} />
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            href={ctaHref}
            className="group/link inline-flex items-center gap-2 text-[16px] font-semibold text-primary transition-colors hover:text-[color-mix(in_srgb,var(--primary)_78%,black)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            Explore All Destinations
            <ArrowRight className="h-[18px] w-[18px] transition-transform duration-300 group-hover/link:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}