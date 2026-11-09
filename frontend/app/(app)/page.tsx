export default function Home() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6">
      <section className="w-full max-w-xl rounded-xl border border-border bg-card p-10 text-center shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Legalyst
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
          Frontend scaffold ready
        </h1>
        <p className="mt-3 text-muted-foreground">
          The workspace is ready for the legal obligation dashboard.
        </p>
      </section>
    </div>
  );
}
