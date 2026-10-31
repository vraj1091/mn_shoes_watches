/** Shown inside the admin frame while a page's data loads. */
export default function AdminLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10" aria-busy="true">
      <p className="sr-only" role="status">
        Loading…
      </p>
      <div aria-hidden className="motion-safe:animate-pulse">
        <div className="h-8 w-56 rounded-sm bg-surface" />
        <div className="mt-3 h-4 w-80 max-w-full rounded-sm bg-surface" />
        <div className="mt-10 grid gap-3">
          {[0, 1, 2, 3, 4].map((row) => (
            <div key={row} className="h-14 rounded-md border border-line bg-raised" />
          ))}
        </div>
      </div>
    </div>
  );
}
