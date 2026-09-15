import { Quote, Star } from "lucide-react";
import type { TestimonialCardProps } from "./types";
import TravelerAvatar from "./traveler-avatar";

export default function TestimonialCard({
  testimonial,
  variant = "small",
}: TestimonialCardProps) {
  const isMain = variant === "main";

  return (
    <article
      className={`flex h-full flex-col rounded-[20px] border border-slate-200/80 bg-white p-6 shadow-[0_16px_40px_-32px_rgba(15,23,42,0.25)] sm:p-7 ${
        isMain ? "lg:p-9" : ""
      }`}
    >
      <div className="flex items-center gap-1.5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Star
            key={index}
            aria-hidden="true"
            className={`h-[16px] w-[16px] fill-amber-400 text-amber-400 ${
              index < testimonial.rating ? "opacity-100" : "opacity-25"
            }`}
            strokeWidth={1.5}
          />
        ))}
        <span className="ml-2 text-[14px] font-semibold text-slate-700">
          {testimonial.rating.toFixed(1)}
        </span>
      </div>

      <Quote
        aria-hidden="true"
        className={`mt-6 ${isMain ? "h-[32px] w-[32px]" : "h-[26px] w-[26px]"}`}
        strokeWidth={1.6}
        fill="currentColor"
        opacity={0.12}
      />

      <blockquote
        className={`mt-3 font-medium leading-[1.5] tracking-[-0.01em] text-slate-900 ${
          isMain ? "text-[21px] sm:text-[24px]" : "text-[16.5px]"
        }`}
      >
        “{testimonial.content}”
      </blockquote>

      <div className="mt-auto flex items-center gap-4 pt-8">
        <TravelerAvatar
          testimonial={testimonial}
          className={isMain ? "h-[50px] w-[50px]" : "h-[44px] w-[44px]"}
        />
        <div>
          <p className="text-[15px] font-semibold text-slate-900">
            {testimonial.name}
          </p>
          {(testimonial.tour || testimonial.destination) && (
            <p className="mt-0.5 text-[13.5px] text-slate-500">
              {[testimonial.tour, testimonial.destination]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}