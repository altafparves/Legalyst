import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Onboarding | Legalyst",
};

export default function OnboardingPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6">
      <section className="w-full max-w-xl rounded-xl border border-border bg-card p-10 text-center shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Onboarding
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
          Coming soon
        </h1>
        <p className="mt-3 text-muted-foreground">
          The business profiler form will live here.
        </p>
      </section>
    </div>
  );
}
