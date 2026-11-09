import type { Metadata } from "next";
import { Sparkles } from "lucide-react";

import { BusinessProfiler } from "@/components/business-profiler";
import { ComplianceStepper } from "@/components/compliance-stepper";
import { DisclaimerBanner } from "@/components/disclaimer-banner";

export const metadata: Metadata = {
  title: "Profil Usaha & Rekomendasi KBLI | Legalyst",
};

export default function OnboardingPage() {
  return (
    <div className="flex min-h-full flex-col">
      <ComplianceStepper currentStep={1} />

      <div className="mx-auto w-full max-w-xl space-y-6 px-4 py-6">
        <div className="space-y-1 text-center sm:text-left">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Langkah 1: Profiling KBLI Otomatis
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Ceritakan Usaha Anda
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Tuliskan produk atau jasa yang Anda jual dengan bahasa sehari-hari.
            Legalyst akan mencocokkannya ke kode KBLI.
          </p>
        </div>

        <BusinessProfiler />

        <DisclaimerBanner />
      </div>
    </div>
  );
}
