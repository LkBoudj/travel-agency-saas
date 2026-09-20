import type { Feature } from "@/features/trust-points/types";

export type { Feature };

export interface WhyChooseUsProps {
  eyebrow?: string;
  heading?: string;
  description?: string;
  features: Feature[];
}

export interface FeatureCardProps {
  feature: Feature;
  index: number;
}