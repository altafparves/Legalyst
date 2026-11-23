"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Archive,
  ArrowRight,
  Building2,
  CheckCircle2,
  Download,
  ExternalLink,
  FileCheck,
  Loader2,
} from "lucide-react";

import { useBusinessProfile } from "@/components/business-profile-provider";
import { ComplianceStepper } from "@/components/compliance-stepper";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { buttonVariants } from "@/components/ui/button";
import {
  DOCUMENTS,
  downloadAllDocuments,
  downloadDocument,
  type GeneratedDocument,
} from "@/lib/documents";
import { cn } from "@/lib/utils";

type DownloadState = "idle" | "loading" | "done" | "error";

function Shell({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <ComplianceStepper currentStep={3} />
      <div className="mx-auto w-full max-w-xl space-y-6 px-4 py-6">{children}</div>
    </div>
  );
}

export function DocumentsView() {
  const { profile, hydrated } = useBusinessProfile();
  const [states, setStates] = useState<Record<string, DownloadState>>({});
  const [zipState, setZipState] = useState<DownloadState>("idle");

  if (!hydrated) return <Shell />;

  if (!profile) {
    return (
      <Shell>
        <div className="space-y-3 rounded-xl border border-dashed border-border bg-card p-6 text-center">
          <Building2 className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
          <h1 className="text-lg font-bold text-foreground">Profil usaha belum diisi</h1>
          <p className="text-sm text-muted-foreground">
            Pilih kode KBLI dulu agar draft dokumen bisa diisi otomatis sesuai usaha Anda.
          </p>
          <Link
            href="/onboarding"
            className={buttonVariants({ size: "lg", className: "h-12 w-full sm:w-auto" })}
          >
            Isi Profil Usaha
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </Shell>
    );
  }

  const kbli = profile.kbli;
  const kbliCode = kbli.code;
  const doneCount = DOCUMENTS.filter((d) => states[d.id] === "done").length;

  async function handleDownload(doc: GeneratedDocument) {
    if (states[doc.id] === "loading") return;
    setStates((prev) => ({ ...prev, [doc.id]: "loading" }));
    try {
      await downloadDocument(doc, kbli);
      setStates((prev) => ({ ...prev, [doc.id]: "done" }));
    } catch {
      setStates((prev) => ({ ...prev, [doc.id]: "error" }));
    }
  }

  async function handleDownloadAll() {
    if (zipState === "loading") return;
    setZipState("loading");
    try {
      await downloadAllDocuments(kbli);
      setZipState("done");
      setStates(Object.fromEntries(DOCUMENTS.map((d) => [d.id, "done" as const])));
    } catch {
      setZipState("error");
    }
  }

  return (
    <Shell>
      <div className="space-y-1">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
          Langkah 3: Dokumen Siap Unduh
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Draft Dokumen Kepatuhan Anda
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Dokumen berikut diisi otomatis sesuai profil usaha dan KBLI {kbliCode} ({profile.kbli.title}).
        </p>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-xs">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <FileCheck className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <h2 className="text-sm font-bold text-emerald-950">
            {DOCUMENTS.length} Dokumen Berhasil Dibuat
          </h2>
          <p className="text-xs text-emerald-800" aria-live="polite">
            {doneCount > 0
              ? `${doneCount} dari ${DOCUMENTS.length} dokumen sudah diunduh.`
              : "Siap diunduh dalam format PDF."}
          </p>
        </div>
      </div>

      <ul className="space-y-3.5">
        {DOCUMENTS.map((doc) => {
          const state = states[doc.id] ?? "idle";
          return (
            <li
              key={doc.id}
              className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-xs transition-colors hover:border-primary/40"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <span
                    className={cn(
                      "inline-block rounded-md border px-2 py-0.5 text-[11px] font-bold",
                      doc.badgeColor,
                    )}
                  >
                    {doc.issuer}
                  </span>
                  <h3 className="text-base font-bold text-foreground">{doc.title}</h3>
                </div>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">{doc.size}</span>
              </div>

              <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                {doc.desc.replace("{kbli}", kbliCode)}
              </p>

              <button
                type="button"
                onClick={() => handleDownload(doc)}
                disabled={state === "loading"}
                aria-busy={state === "loading"}
                className={buttonVariants({
                  variant: state === "done" ? "outline" : "default",
                  className: "h-12 w-full gap-2 text-sm font-semibold",
                })}
              >
                {state === "loading" && <Loader2 className="animate-spin" aria-hidden />}
                {state === "done" && <CheckCircle2 className="text-emerald-600" aria-hidden />}
                {(state === "idle" || state === "error") && <Download aria-hidden />}
                <span>
                  {state === "loading"
                    ? "Menyiapkan PDF..."
                    : state === "done"
                      ? "Sudah Diunduh, Unduh Lagi"
                      : state === "error"
                        ? "Coba Unduh Lagi"
                        : "Unduh PDF"}
                </span>
              </button>
              {state === "error" && (
                <p role="alert" className="flex items-center gap-1.5 text-xs text-red-600">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Gagal menyiapkan dokumen. Coba lagi sebentar lagi.
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-5">
        <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <span>📋 Langkah Selanjutnya Setelah Mengunduh:</span>
        </h3>
        <ol className="list-inside list-decimal space-y-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
          <li>
            <strong className="text-foreground">Cetak & Tanda Tangan:</strong> Cetak dokumen dan
            bubuhkan tanda tangan pemilik usaha di atas materai Rp10.000.
          </li>
          <li>
            <strong className="text-foreground">Unggah ke OSS-RBA:</strong> Masuk ke{" "}
            <a
              href="https://oss.go.id"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-12 items-center gap-0.5 font-semibold text-primary hover:underline"
            >
              oss.go.id <ExternalLink className="h-3 w-3" aria-hidden />
            </a>{" "}
            dan unggah Surat Pernyataan Mandiri.
          </li>
          <li>
            <strong className="text-foreground">Unggah ke SiHalal:</strong> Masuk ke{" "}
            <a
              href="https://ptsp.halal.go.id"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-12 items-center gap-0.5 font-semibold text-primary hover:underline"
            >
              ptsp.halal.go.id <ExternalLink className="h-3 w-3" aria-hidden />
            </a>{" "}
            untuk melampirkan Surat Ikrar Halal Mandiri.
          </li>
        </ol>
      </div>

      <div className="space-y-2 pt-1">
        <button
          type="button"
          onClick={handleDownloadAll}
          disabled={zipState === "loading"}
          aria-busy={zipState === "loading"}
          className={buttonVariants({
            variant: "outline",
            size: "lg",
            className:
              "h-12 w-full gap-2 border-primary/30 text-sm font-bold text-primary hover:bg-primary/5",
          })}
        >
          {zipState === "loading" ? (
            <Loader2 className="animate-spin" aria-hidden />
          ) : zipState === "done" ? (
            <CheckCircle2 className="text-emerald-600" aria-hidden />
          ) : (
            <Archive aria-hidden />
          )}
          <span>
            {zipState === "loading"
              ? "Menyiapkan ZIP..."
              : zipState === "done"
                ? "ZIP Sudah Diunduh, Unduh Lagi"
                : "Unduh Semua Dokumen (.ZIP)"}
          </span>
        </button>
        {zipState === "error" && (
          <p role="alert" className="flex items-center gap-1.5 text-xs text-red-600">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Gagal menyiapkan ZIP. Coba lagi sebentar lagi.
          </p>
        )}
      </div>

      <DisclaimerBanner />
    </Shell>
  );
}
