import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { TravelerStoriesProps } from "./types";
import TestimonialCard from "./testimonial-card";

export default function TravelerStories({
  eyebrow = "Traveler Stories",
  heading = "What our travelers remember most",
  description = "Real experiences from travelers who trusted us with their journeys.",
  mainTestimonial,
  smallTestimonials,
  storiesHref = "/stories",
}: TravelerStoriesProps) {
  return (
    <section
      id="stories"
      aria-labelledby="traveler-stories-heading"
      className="bg-surface-subtle"
    >
      <div className="mx-auto max-w-[1440px] px-5 py-[96px] sm:px-8 lg:px-10 lg:py-[120px]">
        <header className="text-center">
          <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-primary">
            {eyebrow}
          </p>
          <h2
            id="traveler-stories-heading"
            className="mx-auto mt-5 max-w-[760px] text-[36px] font-bold leading-[1.08] tracking-[-0.02em] text-slate-900 sm:text-[46px] lg:text-[52px] lg:leading-[1.06]"
          >
            {heading}
          </h2>
          <p className="mx-auto mt-5 max-w-[640px] text-[17px] leading-[1.6] text-slate-500 sm:text-[18px]">
            {description}
          </p>
        </header>

        <div className="mx-auto mt-14 grid max-w-[1280px] grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr] lg:gap-8">
          <TestimonialCard testimonial={mainTestimonial} variant="main" />

          <div className="grid grid-cols-1 gap-6 lg:gap-8">
            {smallTestimonials.map((testimonial) => (
              <TestimonialCard key={testimonial.id} testimonial={testimonial} />
            ))}
          </div>
        </div>

        <div className="mt-12 text-center lg:mt-14">
          <Link
            href={storiesHref}
            className="group/link inline-flex items-center gap-2 text-[16px] font-semibold text-primary transition-colors hover:text-[color-mix(in_srgb,var(--primary)_78%,black)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            Read more traveler stories
            <ArrowRight className="h-[18px] w-[18px] transition-transform duration-300 group-hover/link:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}