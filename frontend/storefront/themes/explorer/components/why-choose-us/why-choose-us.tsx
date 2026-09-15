import type { WhyChooseUsProps } from "./types";
import FeatureCard from "./feature-card";

export default function WhyChooseUs({
  eyebrow = "Why Choose Us",
  heading = "Travel with confidence,\nfrom planning to return.",
  description = "We make every journey simpler, safer, and more personal.",
  features,
}: WhyChooseUsProps) {
  const headingLines = heading.split("\n");

  return (
    <section
      id="why-us"
      aria-labelledby="why-choose-us-heading"
      className="bg-white"
    >
      <div className="mx-auto max-w-[1440px] px-5 py-[96px] sm:px-8 lg:px-10 lg:py-[120px]">
        <header className="text-center">
          <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-primary">
            {eyebrow}
          </p>
          <h2
            id="why-choose-us-heading"
            className="mx-auto mt-5 max-w-[800px] text-[36px] font-bold leading-[1.08] tracking-[-0.02em] text-slate-900 sm:text-[46px] lg:text-[52px] lg:leading-[1.06]"
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

        <div className="mx-auto mt-14 grid max-w-[1280px] grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {features.map((feature) => (
            <FeatureCard key={feature.id} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  );
}