import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Legalyst — Checklist Kepatuhan Usaha",
  description: "Checklist kewajiban dan dokumen kepatuhan usaha Anda.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
