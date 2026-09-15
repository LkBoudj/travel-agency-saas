import type { HeroContent } from "@/features/agency/types";

export type { HeroContent };

export interface HeroProps extends HeroContent {
  /** Platform settings toggle: `hero.showSearch`. */
  showSearch?: boolean;
}