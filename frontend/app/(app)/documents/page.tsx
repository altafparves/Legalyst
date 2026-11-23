import type { Metadata } from "next";

import { DocumentsView } from "@/components/documents-view";

export const metadata: Metadata = {
  title: "Draft Dokumen Legal Siap Unduh | Legalyst",
};

/**
 * Screen 3: Draft Dokumen Siap Unduh.
 * Referensi desain: docs/stitch-screens/03-auto-document-generator.html
 *
 * Logika interaktif ada di components/documents-view.tsx (client component),
 * data dan stub unduhan di lib/documents.ts. Semua target ketuk >= 48px.
 */
export default function DocumentsPage() {
  return <DocumentsView />;
}
