import Image from "next/image";
import type { Testimonial } from "./types";

export default function TravelerAvatar({
  testimonial,
  className = "",
}: {
  testimonial: Testimonial;
  className?: string;
}) {
  const initials = testimonial.name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .replace(/[^\p{L}]/gu, "")
    .slice(0, 2)
    .toUpperCase();

  if (testimonial.avatar) {
    return (
      <Image
        src={testimonial.avatar.src}
        alt={testimonial.avatar.alt || `${testimonial.name}'s portrait`}
        width={testimonial.avatar.width}
        height={testimonial.avatar.height}
        className={`rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full bg-primary-soft text-[15px] font-semibold text-primary ${className}`}
    >
      {initials || "•"}
    </span>
  );
}