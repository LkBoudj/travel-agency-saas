import Image from "next/image";
import Link from "next/link";
import type { HeroProps } from "./types";
import { ArrowRightIcon, trustIcons } from "./icons";
import SearchPanel from "./search-panel";

const GRID = "max-w-[1440px] px-5 sm:px-8 lg:px-10";

export default function Hero({
  image,
  eyebrow,
  title,
  accentTitle,
  description,
  primaryCta,
  secondaryCta,
  trustItems,
  showSearch = true,
}: HeroProps) {
  const overlayGradient =
    "linear-gradient(90deg, rgba(4,32,57,0.82) 0%, rgba(4,32,57,0.58) 34%, rgba(4,32,57,0.24) 58%, rgba(4,32,57,0.05) 82%, transparent 100%)";

  return (
    <section className="relative isolate flex min-h-[720px] flex-col sm:min-h-[780px] lg:min-h-[820px]">
      <div aria-hidden="true" className="absolute inset-0 z-0 overflow-hidden">
        <Image
          src={image.src}
          alt={image.alt ?? ""}
          fill
          sizes="100vw"
          preload
          className="object-cover"
          style={{
            objectPosition: "22% 32%",
            filter: "brightness(1.06) saturate(1.12)",
          }}
        />
        <div
          className="absolute inset-y-0 inset-inline-0"
          style={{ background: overlayGradient }}
        />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/45 to-transparent" />
      </div>

      <div
        className={`relative z-10 mx-auto flex w-full ${GRID} flex-col pt-28 pb-20 sm:pt-32 lg:pt-40 lg:pb-0`}
      >
        <p className="mb-7 inline-flex items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.24em] text-white/85">
          <span aria-hidden="true" className="h-px w-8 bg-white/45" />
          {eyebrow}
        </p>

        <h1 className="max-w-[860px] font-display text-[44px] font-medium leading-[0.99] tracking-[-0.02em] text-white sm:text-[60px] lg:text-[80px]">
          {title}
          {accentTitle ? (
            <>
              <br />
              <span className="bg-[linear-gradient(92deg,color-mix(in_srgb,var(--primary)_62%,white),#ffffff)] bg-clip-text italic text-transparent">
                {accentTitle}
              </span>
            </>
          ) : null}
        </h1>

        <p className="mt-8 max-w-[540px] text-[17px] leading-[1.6] text-white/90 sm:text-[18px] lg:mt-9 lg:text-[19px]">
          {description}
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-4">
          <Link
            href={primaryCta.href}
            className="group inline-flex h-[58px] items-center gap-2.5 rounded-full bg-primary px-8 text-[16px] font-semibold text-white shadow-[0_18px_40px_-16px_rgba(4,32,57,0.55)] transition-[transform,background-color,box-shadow] duration-300 hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_24px_48px_-16px_rgba(4,32,57,0.6)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {primaryCta.label}
            <ArrowRightIcon className="h-[18px] w-[18px] transition-transform duration-300 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
          </Link>
          <Link
            href={secondaryCta.href}
            className="inline-flex h-[58px] items-center rounded-full border border-white/40 bg-white/5 px-8 text-[16px] font-semibold text-white backdrop-blur-sm transition-[background-color,border-color] duration-300 hover:border-white/70 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {secondaryCta.label}
          </Link>
        </div>

        {trustItems.length > 0 ? (
          <ul className="mt-12 flex flex-wrap items-center gap-x-0 gap-y-4 divide-x divide-white/15 rtl:divide-x-reverse">
            {trustItems.map((item) => {
              const Icon = trustIcons[item.icon];
              return (
                <li
                  key={item.label}
                  className="flex items-center gap-3 py-1 pe-8 sm:pe-10 md:[&:nth-child(n+2)]:ps-10"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/90 backdrop-blur-sm">
                    <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                  </span>
                  <span className="whitespace-nowrap text-[15px] font-medium text-white/90">
                    {item.label}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      <div
        aria-hidden="true"
        className="absolute bottom-28 start-1/2 hidden -translate-x-1/2 flex-col items-center gap-2.5 text-white/60 lg:flex"
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.3em]">
          Scroll
        </span>
        <span className="h-10 w-px bg-gradient-to-b from-white/60 to-transparent" />
      </div>

      <div className="md:absolute md:inset-x-0 md:bottom-0 md:z-20">
        <div className={`mx-auto mt-10 w-full ${GRID} md:mt-0 md:translate-y-[48%]`}>
          {showSearch ? <SearchPanel /> : null}
        </div>
      </div>
    </section>
  );
}