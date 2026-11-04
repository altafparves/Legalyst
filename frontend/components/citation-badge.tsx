import { Scale } from "lucide-react";

interface CitationBadgeProps {
  citation: string;
}

export function CitationBadge({ citation }: CitationBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700 shadow-2xs">
      <Scale className="w-3 h-3 text-slate-500" />
      <span>{citation}</span>
    </span>
  );
}

