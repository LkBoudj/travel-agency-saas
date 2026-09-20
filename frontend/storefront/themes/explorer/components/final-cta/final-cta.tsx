import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { FinalCtaProps } from "./types";
import { SectionHeader } from "../section-header";

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
        <div className="relative overflow-hidden rounded-hero bg-surface-inverse px-6 py-[88px] text-center sm:py-[96px] lg:py-[112px]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
              backgroundSize: "44px 44px",
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -end-24 -top-28 h-[360px] w-[360px] rounded-full blur-3xl"
            style={{
              background: "color-mix(in srgb, var(--primary) 38%, transparent)",
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-32 -start-20 h-[320px] w-[320px] rounded-full blur-3xl"
            style={{
              background: "color-mix(in srgb, var(--primary) 24%, transparent)",
            }}
          />

          <div className="relative mx-auto max-w-[680px]">
            <SectionHeader
              eyebrow={eyebrow}
              title={title}
              description={description}
              tone="dark"
              headingId="final-cta-heading"
            />

            <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:mt-10 sm:flex-row sm:gap-5">
              <Link
                href={primaryUrl}
                className="group inline-flex h-[56px] w-full items-center justify-center gap-2.5 rounded-full bg-white px-9 text-[16px] font-semibold text-slate-900 transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-16px_rgba(255,255,255,0.45)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto"
              >
                {primaryLabel}
                <ArrowRight
                  className="h-[18px] w-[18px] transition-transform duration-300 group-hover:translate-x-1 rtl:-scale-x-100"
                  strokeWidth={2}
                />
              </Link>

              <Link
                href={secondaryUrl}
                className="inline-flex h-[56px] w-full items-center justify-center gap-2.5 rounded-full border border-white/25 px-9 text-[16px] font-semibold text-white transition-[background-color] duration-300 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto"
              >
                {secondaryLabel}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}