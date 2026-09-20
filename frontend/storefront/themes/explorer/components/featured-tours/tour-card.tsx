import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Crown,
  Flame,
  Heart,
  MapPin,
  Star,
} from "lucide-react";
import type { TourBadge, TourCardProps } from "./types";

const ICON_STROKE = 2;

const badgeStyles: Record<
  TourBadge,
  { label: string; className: string; Icon: typeof Star }
> = {
  "best-seller": {
    label: "Best Seller",
    className: "bg-primary-echo text-primary",
    Icon: Crown,
  },
  featured: {
    label: "Featured",
    className: "bg-white/90 text-slate-700 backdrop-blur-sm",
    Icon: Star,
  },
  "limited-availability": {
    label: "Limited Availability",
    className: "bg-amber-100 text-amber-700",
    Icon: Flame,
  },
};

function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(price);
}

export default function TourCard({ tour }: TourCardProps) {
  const badge = tour.badge ? badgeStyles[tour.badge] : undefined;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-panel border border-slate-200/80 bg-white shadow-card transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1.5 hover:shadow-panel">
      <Link
        href={`/tours/${tour.slug}`}
        className="relative block aspect-[3/2] overflow-hidden"
        aria-label={`${tour.title} — view details`}
      >
        <Image
          src={tour.image.src}
          alt={tour.image.alt}
          width={tour.image.width}
          height={tour.image.height}
          sizes="(max-width: 639px) 92vw, (max-width: 1023px) 50vw, 33vw"
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          style={{ objectPosition: tour.image.objectPosition ?? "50% 40%" }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-black/0 to-black/0"
        />
        {badge ? (
          <span
            className={`absolute start-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold shadow-sm ${badge.className}`}
          >
            <badge.Icon className="h-[14px] w-[14px]" strokeWidth={ICON_STROKE} />
            {badge.label}
          </span>
        ) : null}
        <button
          type="button"
          aria-label={`Save ${tour.title} to favorites`}
          className="absolute end-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-slate-500 shadow-sm ring-1 ring-black/5 backdrop-blur transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <Heart className="h-[19px] w-[19px]" strokeWidth={ICON_STROKE} />
        </button>
      </Link>

      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-display text-[24px] font-medium leading-snug tracking-[-0.01em] text-slate-900">
          <Link
            href={`/tours/${tour.slug}`}
            className="transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            {tour.title}
          </Link>
        </h3>

        <p className="mt-2.5 flex items-center gap-1.5 text-[15px] font-normal text-slate-500">
          <MapPin
            className="h-[17px] w-[17px] shrink-0 text-primary"
            strokeWidth={ICON_STROKE}
          />
          {tour.destination}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-[14px] font-medium text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays
              className="h-[17px] w-[17px] text-primary"
              strokeWidth={ICON_STROKE}
            />
            {tour.duration}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Star
              className="h-[17px] w-[17px] fill-primary stroke-primary"
              strokeWidth={ICON_STROKE}
            />
            {tour.rating.toFixed(1)}
            <span className="text-slate-400">({tour.reviewCount})</span>
          </span>
        </div>

        <div className="mt-auto border-t border-slate-100 pt-5">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pt-2">
            <div>
              <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-slate-400">
                From
              </p>
              <p className="mt-1 font-display text-[30px] font-medium leading-none tracking-[-0.01em] text-primary">
                {formatPrice(tour.price, tour.currency ?? "USD")}
                <span className="ms-1.5 font-sans text-[13.5px] font-normal text-slate-400">
                  / person
                </span>
              </p>
            </div>
            <Link
              href={`/tours/${tour.slug}`}
              className="group/btn inline-flex h-11 items-center gap-2 rounded-full border border-primary px-6 text-[15px] font-semibold text-primary transition-colors hover:bg-primary hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              View Tour
              <ArrowRight
                className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1 rtl:-scale-x-100 rtl:group-hover/btn:-translate-x-1"
                strokeWidth={ICON_STROKE}
              />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}