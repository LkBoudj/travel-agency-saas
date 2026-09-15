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
    "linear-gradient(90deg, rgba(4,32,57,0.78) 0%, rgba(4,32,57,0.57) 30%, rgba(4,32,57,0.26) 55%, rgba(4,32,57,0.08) 78%, rgba(4,32,57,0.02) 100%)";

  return (
    <section className="relative isolate flex min-h-[640px] flex-col sm:min-h-[700px] lg:min-h-[720px]">
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
          className="absolute inset-y-0 left-0 right-0"
          style={{ background: overlayGradient }}
        />
      </div>

      <div
        className={`relative z-10 mx-auto flex w-full ${GRID} flex-col pt-24 pb-16 sm:pt-28 lg:pt-40 lg:pb-0`}
      >
        <p className="mb-6 text-[12px] font-semibold uppercase tracking-[0.24em] text-white/80">
          {eyebrow}
        </p>

        <h1 className="max-w-[620px] text-[42px] font-bold leading-[1.0] tracking-[-0.025em] text-white sm:text-[56px] lg:text-[70px]">
          {title}
          {accentTitle ? (
            <>
              <br />
              {accentTitle}
            </>
          ) : null}
        </h1>

        <p className="mt-8 max-w-[520px] text-[17px] leading-[1.6] text-white/90 sm:text-[18px] lg:mt-9 lg:text-[19px]">
          {description}
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-4">
          <Link
            href={primaryCta.href}
            className="inline-flex h-[56px] items-center gap-2.5 rounded-full bg-primary px-8 text-[16px] font-semibold text-white transition-[transform,background-color] duration-300 hover:-translate-y-0.5 hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {primaryCta.label}
            <ArrowRightIcon className="h-[18px] w-[18px]" />
          </Link>
          <Link
            href={secondaryCta.href}
            className="inline-flex h-[56px] items-center rounded-full border border-white/45 px-8 text-[16px] font-semibold text-white transition-[background-color,border-color] duration-300 hover:border-white/70 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {secondaryCta.label}
          </Link>
        </div>

        <ul className="mt-12 flex flex-wrap items-center gap-y-3 divide-x divide-white/15">
          {trustItems.map((item) => {
            const Icon = trustIcons[item.icon];
            return (
              <li
                key={item.label}
                className="flex items-center gap-3 py-1 pr-8 sm:pr-10 md:[&:nth-child(n+2)]:pl-10"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/90">
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className="whitespace-nowrap text-[15px] font-medium text-white/90">
                  {item.label}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="md:absolute md:inset-x-0 md:bottom-0 md:z-20">
        <div className={`mx-auto mt-10 w-full ${GRID} md:mt-0 md:translate-y-[45%]`}>
          {showSearch ? <SearchPanel /> : null}
        </div>
      </div>
    </section>
  );
}