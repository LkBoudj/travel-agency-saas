import type { PageTemplateProps } from "@/themes/contracts";
import { booleanSetting } from "@/themes/settings";
import { Hero } from "../components/hero";
import { FeaturedTours } from "../components/featured-tours";
import { PopularDestinations } from "../components/popular-destinations";
import { WhyChooseUs } from "../components/why-choose-us";
import { PromotionalBanner } from "../components/promotional-banner";
import { TravelerStories } from "../components/traveler-stories";
import { FinalCta } from "../components/final-cta";

export default function ExplorerHomeTemplate({
  context,
  settings,
}: PageTemplateProps) {
  const { content } = context;

  return (
    <>
      <Hero
        {...content.hero}
        showSearch={booleanSetting(settings, "hero.showSearch", true)}
      />

      {booleanSetting(settings, "homepage.showFeaturedTours", true) && (
        <FeaturedTours tours={content.tours} viewAllHref={content.paths.tours} />
      )}

      {booleanSetting(
        settings,
        "homepage.showPopularDestinations",
        true,
      ) && (
        <PopularDestinations
          destinations={content.destinations}
          ctaHref={content.paths.destinations}
        />
      )}

      {booleanSetting(settings, "homepage.showWhyChooseUs", true) && (
        <WhyChooseUs features={content.trustPoints} />
      )}

      {booleanSetting(settings, "homepage.showPromotion", true) && (
        <PromotionalBanner promotion={content.promotion} />
      )}

      {booleanSetting(settings, "homepage.showTestimonials", true) && (
        <TravelerStories
          mainTestimonial={content.testimonials.main}
          smallTestimonials={content.testimonials.small}
          storiesHref={content.paths.stories}
        />
      )}

      {booleanSetting(settings, "homepage.showFinalCta", true) && (
        <FinalCta {...content.finalCta} />
      )}
    </>
  );
}