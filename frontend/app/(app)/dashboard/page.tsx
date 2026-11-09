import type { Metadata } from "next";

import { ComplianceStepper } from "@/components/compliance-stepper";
import { ComplianceChecklist } from "./compliance-checklist";

export const metadata: Metadata = {
  title: "Checklist Kepatuhan Regulasi | Legalyst",
};

/**
 * Screen 2: Compliance Wizard [PIC: DIFFIE]
 * Referensi Desain: docs/stitch-screens/02-compliance-wizard.html
 */
export default function DashboardPage() {
  return (
    <div className="flex flex-col min-h-full">
      <ComplianceStepper currentStep={2} />
      <ComplianceChecklist />
    </div>
  );
}
