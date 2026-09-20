import type { SectionHeaderProps } from "./types";

const TITLES = "mt-5 text-[34px] font-medium leading-[1.08] tracking-[-0.02em] sm:text-[44px] lg:text-[50px] lg:leading-[1.05]";

export default function SectionHeader({
  eyebrow,
  title,
  description,
  align = "center",
  tone = "default",
  headingId,
  eyebrowId,
}: SectionHeaderProps) {
  const isCenter = align === "center";
  const isDark = tone === "dark";

  const titleLines = title.split("\n");

  return (
    <header
      className={
        isCenter
          ? "text-center"
          : "text-start"
      }
    >
      {eyebrow ? (
        <p
          id={eyebrowId}
          className={`inline-flex items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.24em] ${
            isDark ? "text-white/60" : "text-primary"
          }`}
        >
          <span
            aria-hidden="true"
            className={`h-px ${isCenter ? "w-8" : "w-6"} ${
              isDark ? "bg-white/40" : "bg-primary"
            }`}
          />
          {eyebrow}
        </p>
      ) : null}

      <h2
        id={headingId}
        className={`font-display ${TITLES} ${align === "center" ? "mx-auto" : ""} ${
          isDark ? "text-white" : "text-slate-900"
        }`}
      >
        {titleLines.map((line, index) => (
          <span key={index} className="block">
            {line || "\u00A0"}
          </span>
        ))}
      </h2>

      {description ? (
        <p
          className={`${align === "center" ? "mx-auto" : ""} mt-5 max-w-[620px] text-[17px] leading-[1.6] sm:text-[18px] ${
            isDark ? "text-white/75" : "text-slate-500"
          }`}
        >
          {description}
        </p>
      ) : null}
    </header>
  );
}