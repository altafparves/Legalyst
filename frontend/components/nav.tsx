"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

const links = [
  { href: "/", label: "Beranda" },
  { href: "/onboarding", label: "Onboarding" },
  { href: "/dashboard", label: "Dashboard" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight text-foreground">
          Legalyst
        </Link>

        <nav className="flex items-center gap-1">
          {links.map((link) => {
            const isActive =
              link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/login" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Masuk
          </Link>
          <Link href="/register" className={buttonVariants({ size: "sm" })}>
            Daftar
          </Link>
        </div>
      </div>
    </header>
  );
}
