import type { WhyChooseUsProps } from "./types";
import FeatureCard from "./feature-card";
import { SectionHeader } from "../section-header";

export default function WhyChooseUs({
  eyebrow = "Why Choose Us",
  heading = "Travel with confidence,\nfrom planning to return.",
  description = "We make every journey simpler, safer, and more personal.",
  features,
}: WhyChooseUsProps) {
  return (
    <section
      id="why-us"
      aria-labelledby="why-choose-us-heading"
      className="bg-white"
    >
      <div className="mx-auto max-w-[1440px] px-5 py-[96px] sm:px-8 lg:px-10 lg:py-[120px]">
        <SectionHeader
          eyebrow={eyebrow}
          title={heading}
          description={description}
          headingId="why-choose-us-heading"
        />

        <div className="mx-auto mt-14 grid max-w-[1280px] grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {features.map((feature, index) => (
            <FeatureCard key={feature.id} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}