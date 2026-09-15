import type { FeatureCardProps } from "./types";

export default function FeatureCard({ feature }: FeatureCardProps) {
  const Icon = feature.icon;

  return (
    <article className="flex h-full flex-col items-center rounded-[20px] border border-slate-200/80 bg-white px-6 py-10 text-center transition-[box-shadow,border-color] duration-300 hover:border-slate-300/90 hover:shadow-[0_16px_32px_-22px_rgba(15,23,42,0.16)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-[14px] bg-primary-soft text-primary">
        <Icon className="h-[26px] w-[26px]" strokeWidth={1.8} />
      </span>
      <h3 className="mt-5 text-[21px] font-semibold leading-[1.3] tracking-[-0.01em] text-slate-900">
        {feature.title}
      </h3>
      <p className="mt-2.5 max-w-[220px] text-[15px] leading-[1.6] text-slate-500">
        {feature.description}
      </p>
    </article>
  );
}