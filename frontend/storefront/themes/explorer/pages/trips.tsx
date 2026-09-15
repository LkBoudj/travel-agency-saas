/**
 * Explorer Trips page. Contract-complete for the Theme platform; the trips
 * routes are not wired into this app milestone yet, so the page renders an
 * honest placeholder rather than fabricated listing data.
 */
export default function ExplorerTripsTemplate() {
  return (
    <section className="mx-auto max-w-[1440px] px-5 py-24 sm:px-8 lg:px-10 lg:py-32">
      <h1 className="text-[36px] font-bold tracking-[-0.02em] text-slate-900">
        Tours
      </h1>
      <p className="mt-4 max-w-[560px] text-[17px] leading-[1.6] text-slate-500">
        Trip listing pages are not part of this app milestone yet. The Explorer
        Theme contract ships this template so the platform can wire the route
        without a Theme change.
      </p>
    </section>
  );
}