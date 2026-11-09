import Link from "next/link";
import { Check } from "lucide-react";

interface StepperProps {
  currentStep: 1 | 2 | 3;
}

const steps = [
  { step: 1, label: "1. Profil Usaha", href: "/onboarding" },
  { step: 2, label: "2. Checklist Kepatuhan", href: "/dashboard" },
  { step: 3, label: "3. Draft Dokumen", href: "/documents" },
];

export function ComplianceStepper({ currentStep }: StepperProps) {
  return (
    <div className="w-full bg-card border-b border-border py-3 px-4 shadow-xs">
      <div className="mx-auto max-w-xl flex items-center justify-between text-xs sm:text-sm">
        {steps.map((item, idx) => {
          const isDone = item.step < currentStep;
          const isActive = item.step === currentStep;

          return (
            <div key={item.step} className="flex items-center gap-1.5 sm:gap-2">
              <Link
                href={item.href}
                className={`flex items-center gap-1.5 font-medium transition-colors ${
                  isActive
                    ? "text-primary font-bold"
                    : isDone
                    ? "text-emerald-700 hover:text-emerald-800"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : isDone
                      ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isDone ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : item.step}
                </span>
                <span className="hidden xs:inline sm:inline">{item.label}</span>
                <span className="xs:hidden sm:hidden">{item.step}</span>
              </Link>
              {idx < steps.length - 1 && (
                <span className="text-muted-foreground/40 mx-1 sm:mx-2 font-light">→</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

