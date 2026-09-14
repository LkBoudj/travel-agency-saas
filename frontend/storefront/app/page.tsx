// Temporary placeholder so the Header's transparent-to-sticky behavior can be
// verified. Replaced by the real Hero + sections in a later task.
export default function Home() {
  return (
    <main className="font-sans">
      <section
        aria-label="Placeholder hero"
        className="flex h-[80vh] items-end justify-center bg-gradient-to-b from-zinc-800 to-zinc-900 pb-12"
      >
        <span className="text-sm uppercase tracking-[0.3em] text-zinc-300">
          Hero placeholder
        </span>
      </section>
      <section aria-label="Placeholder content" className="bg-background py-32">
        <div className="mx-auto max-w-7xl space-y-24 px-5 sm:px-8">
          <div className="h-24 rounded-xl bg-zinc-100" />
          <div className="h-24 rounded-xl bg-zinc-100" />
          <div className="h-24 rounded-xl bg-zinc-100" />
          <div className="h-24 rounded-xl bg-zinc-100" />
        </div>
      </section>
    </main>
  );
}