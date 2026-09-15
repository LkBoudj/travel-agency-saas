import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { FinalCtaProps } from "./types";

export default function FinalCta({
  eyebrow,
  title,
  description,
  primaryLabel,
  primaryUrl,
  secondaryLabel,
  secondaryUrl,
}: FinalCtaProps) {
  return (
    <section aria-labelledby="final-cta-heading" className="bg-white">
      <div className="mx-auto max-w-[1440px] px-5 py-[96px] sm:px-8 lg:px-10 lg:py-[120px]">
        <div className="rounded-[24px] bg-surface-inverse px-6 py-[88px] text-center sm:py-[96px] lg:py-[112px]">
          {eyebrow && (
            <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              {eyebrow}
            </p>
          )}

          <h2
            id="final-cta-heading"
            className="mx-auto mt-5 max-w-[680px] text-[36px] font-bold leading-[1.08] tracking-[-0.02em] text-white sm:text-[46px] lg:text-[52px] lg:leading-[1.06]"
          >
            {title}
          </h2>

          {description && (
            <p className="mx-auto mt-5 max-w-[620px] text-[17px] leading-[1.6] text-slate-300 sm:text-[18px]">
              {description}
            </p>
          )}

          <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:mt-10 sm:flex-row sm:gap-5">
            <Link
              href={primaryUrl}
              className="inline-flex h-[56px] w-full items-center justify-center gap-2.5 rounded-full bg-primary px-9 text-[16px] font-semibold text-white transition-[transform,background-color] duration-300 hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto"
            >
              {primaryLabel}
              <ArrowRight className="h-[18px] w-[18px]" strokeWidth={2} />
            </Link>

            <Link
              href={secondaryUrl}
              className="inline-flex h-[56px] w-full items-center justify-center gap-2 rounded-full border border-white/25 px-9 text-[16px] font-semibold text-white transition-[background-color] duration-300 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto"
            >
              {secondaryLabel}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}