"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Store, CheckSquare, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/onboarding", label: "Profil", icon: Store },
  { href: "/dashboard", label: "Checklist", icon: CheckSquare },
  { href: "/documents", label: "Dokumen", icon: FileText },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md md:hidden">
      <div className="flex h-16 items-center justify-around px-2">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center py-1 text-xs font-medium transition-colors",
                isActive
                  ? "text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5 mb-1", isActive ? "stroke-[2.5]" : "stroke-[1.75]")} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
