import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { PromotionalBannerProps } from "./types";

export default function PromotionalBanner({
  promotion,
}: PromotionalBannerProps) {
  return (
    <section
      id="offers"
      aria-labelledby="promotional-banner-heading"
      className="bg-surface-alt"
    >
      <div className="mx-auto max-w-[1440px] px-5 py-[96px] sm:px-8 lg:px-10 lg:py-[120px]">
        <div className="relative min-h-[560px] overflow-hidden rounded-hero lg:h-[460px] lg:min-h-0">
          <Image
            src={promotion.image.src}
            alt={promotion.image.alt}
            fill
            sizes="(max-width: 1023px) 100vw, 92vw"
            priority
            className="object-cover"
            style={{ objectPosition: "68% center" }}
          />

          {/* Mobile: bottom-up dark gradient. Desktop: dark from the left. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-[#07101e]/85 via-[#07101e]/40 to-black/10 lg:bg-gradient-to-r lg:from-[#07101e]/90 lg:via-[#07101e]/40 lg:to-transparent"
          />

          <div className="absolute inset-0 flex items-end lg:items-center">
            <div className="max-w-[620px] p-6 sm:p-10 lg:max-w-[560px] lg:p-12">
              {(promotion.badge || promotion.eyebrow) && (
                <div className="flex flex-wrap items-center gap-3">
                  {promotion.badge && (
                    <span className="inline-flex items-center rounded-full border border-white/30 bg-white/15 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
                      {promotion.badge}
                    </span>
                  )}
                  {promotion.eyebrow && (
                    <span className="text-[12px] font-semibold uppercase tracking-[0.24em] text-white/85">
                      {promotion.eyebrow}
                    </span>
                  )}
                </div>
              )}

              <h2
                id="promotional-banner-heading"
                className="mt-5 font-display text-[38px] font-medium leading-[1.08] tracking-[-0.02em] text-white sm:text-[46px] lg:text-[54px]"
              >
                {promotion.title}
              </h2>

              {promotion.description && (
                <p className="mt-4 max-w-[480px] text-[17px] leading-[1.6] text-white/85 lg:text-[18px]">
                  {promotion.description}
                </p>
              )}

              <div className="mt-7 lg:mt-8">
                <Link
                  href={promotion.ctaUrl}
                  className="inline-flex h-[54px] items-center gap-2.5 rounded-full bg-white px-8 text-[16px] font-semibold text-slate-900 transition-[transform,background-color] duration-300 hover:-translate-y-0.5 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  {promotion.ctaLabel}
                  <ArrowRight className="h-[18px] w-[18px]" strokeWidth={2} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}