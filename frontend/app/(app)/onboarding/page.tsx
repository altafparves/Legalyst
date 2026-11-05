import type { Metadata } from "next";

import { ComplianceStepper } from "@/components/compliance-stepper";
import { KBLI_VERSION } from "@/lib/compliance";
import { ProfilerForm } from "./profiler-form";

export const metadata: Metadata = {
  title: `Profil Usaha & Rekomendasi KBLI ${KBLI_VERSION} | Legalyst`,
};

/**
 * Screen 1: Smart Profiler [PIC: DIFFIE]
 * Referensi Desain: docs/stitch-screens/01-smart-onboarding-profiler.html
 */
export default function OnboardingPage() {
  return (
    <div className="flex flex-col min-h-full">
      <ComplianceStepper currentStep={1} />
      <ProfilerForm />
    </div>
  );
}
