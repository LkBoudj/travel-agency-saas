import type { FeatureCardProps } from "./types";

export default function FeatureCard({ feature, index }: FeatureCardProps) {
  const Icon = feature.icon;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-panel border border-slate-200/70 bg-surface-alt p-7 text-start shadow-card transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-slate-300/90 hover:shadow-panel focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900">
      <span
        aria-hidden="true"
        className="font-display text-[44px] font-medium italic leading-none text-primary/25 transition-colors duration-300 group-hover:text-primary/50"
      >
        {String(index + 1).padStart(2, "0")}
      </span>

      <span className="mt-6 inline-flex h-14 w-14 items-center justify-center rounded-[14px] bg-primary-soft text-primary transition-colors duration-300">
        <Icon className="h-[26px] w-[26px]" strokeWidth={1.8} />
      </span>

      <h3 className="mt-5 font-display text-[23px] font-medium leading-[1.25] tracking-[-0.01em] text-slate-900">
        {feature.title}
      </h3>
      <p className="mt-2.5 max-w-[240px] text-[15px] leading-[1.6] text-slate-500">
        {feature.description}
      </p>
    </article>
  );
}