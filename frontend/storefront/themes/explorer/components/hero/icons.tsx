import type { ReactElement } from "react";
import { ArrowRight, Lock, Shield, Star } from "lucide-react";
import type { TrustPointIcon } from "@/features/agency/types";

interface IconProps {
  className?: string;
}

function ShieldIcon({ className }: IconProps) {
  return <Shield className={className} strokeWidth={1.8} />;
}

function StarIcon({ className }: IconProps) {
  return <Star className={className} strokeWidth={1.8} fill="currentColor" />;
}

function LockIcon({ className }: IconProps) {
  return <Lock className={className} strokeWidth={1.8} />;
}

export function ArrowRightIcon({ className }: IconProps) {
  return <ArrowRight className={className} strokeWidth={2} />;
}

export const trustIcons: Record<
  TrustPointIcon,
  (props: IconProps) => ReactElement
> = {
  shield: ShieldIcon,
  star: StarIcon,
  lock: LockIcon,
};