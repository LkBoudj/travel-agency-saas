import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { DestinationCardProps, DestinationLayout } from "./types";

const layoutStyles: Record<
  DestinationLayout,
  {
    padding: string;
    name: string;
    country: string;
    tourCount: string;
  }
> = {
  large: {
    padding: "p-6 sm:p-8",
    name: "text-[30px] sm:text-[32px]",
    country: "text-[15px] sm:text-[16px]",
    tourCount: "text-[14px] sm:text-[15px]",
  },
  small: {
    padding: "p-5 sm:p-6",
    name: "text-[24px] sm:text-[26px]",
    country: "text-[14px] sm:text-[15px]",
    tourCount: "text-[14px]",
  },
  wide: {
    padding: "p-6 sm:p-7",
    name: "text-[26px] sm:text-[28px]",
    country: "text-[15px]",
    tourCount: "text-[15px]",
  },
};

export default function DestinationCard({
  destination,
}: DestinationCardProps) {
  const styles = layoutStyles[destination.layout];

  return (
    <Link
      href={`/destinations/${destination.slug}`}
      className="group relative block h-full w-full overflow-hidden rounded-panel shadow-card transition-[transform,box-shadow] duration-500 ease-out hover:-translate-y-1 hover:shadow-panel focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
    >
      <Image
        src={destination.image.src}
        alt={destination.image.alt}
        fill
        sizes="(max-width: 767px) 92vw, (max-width: 1023px) 48vw, 45vw"
        className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.035]"
        style={{ objectPosition: destination.objectPosition }}
      />

      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 block h-[72%] bg-gradient-to-t from-[#0b1526]/90 via-[#0b1526]/35 to-transparent"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 block bg-[#0b1526]/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />

      <span
        className={`pointer-events-none absolute inset-x-0 bottom-0 flex ${styles.padding}`}
      >
        <span className="flex w-full flex-col items-start">
          <span
            className={`font-display font-medium leading-[1.1] tracking-[-0.01em] text-white ${styles.name}`}
          >
            {destination.name}
          </span>
          <span
            className={`mt-1.5 font-normal text-white/75 ${styles.country}`}
          >
            {destination.country}
          </span>
          <span
            className={`mt-4 inline-flex items-center gap-2 font-semibold text-white ${styles.tourCount}`}
          >
            {destination.tourCount} Tours
            <ArrowRight className="h-[18px] w-[18px] transition-transform duration-300 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
          </span>
        </span>
      </span>
    </Link>
  );
}