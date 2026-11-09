import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles, ArrowRight, CheckCircle2, Search } from "lucide-react";
import { ComplianceStepper } from "@/components/compliance-stepper";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Profil Usaha & Rekomendasi KBLI 2020 | Legalyst",
};

/**
 * [PIC: DIFFIE]
 * Referensi Desain: docs/stitch-screens/01-smart-onboarding-profiler.html
 * Preview Lokal: http://localhost:3333
 *
 * Tanggung Jawab:
 * 1. Form input ceritakan usaha (textarea + Zod validation).
 * 2. State loading & integrasi API matcher KBLI (/api/v1/profiler/match).
 * 3. Render interaktif Top-3 KBLI recommendation cards dengan confidence chip.
 * 4. Menyimpan KBLI terpilih ke state/context untuk dipakai di Dashboard.
 */
export default function OnboardingPage() {
  return (
    <div className="flex flex-col min-h-full">
      <ComplianceStepper currentStep={1} />

      <div className="mx-auto w-full max-w-xl px-4 py-6 space-y-6">
        {/* Header Section */}
        <div className="space-y-1 text-center sm:text-left">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Langkah 1: Profiling KBLI Otomatis
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Ceritakan Usaha Anda
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Tuliskan produk atau jasa yang Anda jual dengan bahasa sehari-hari. AI Legalyst akan
            mencocokkan ke kode KBLI 2020 resmi dari BPS & OSS.
          </p>
        </div>

        {/* Input Form Card */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="description"
              className="text-sm font-semibold text-foreground flex items-center justify-between"
            >
              <span>Deskripsi Usaha</span>
              <span className="text-xs text-muted-foreground font-normal">Min. 10 kata</span>
            </label>
            <textarea
              id="description"
              rows={4}
              defaultValue="Saya memproduksi keripik pisang aneka rasa (cokelat, gurih) dari dapur rumah dan menjualnya ke warung sekitar serta toko oleh-oleh. Ada 2 pekerja."
              className="w-full rounded-lg border border-input bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
              placeholder="Contoh: Saya jualan katering nasi boks rumahan untuk acara kantor dan arisan..."
            />
          </div>

          {/* Quick Suggestion Chips */}
          <div className="space-y-1.5">
            <span className="text-xs text-muted-foreground">Contoh cepat:</span>
            <div className="flex flex-wrap gap-1.5">
              {[
                "Keripik & Camilan Rumahan",
                "Kedai Kopi & Minuman",
                "Katering Rumahan",
                "Warung Kelontong",
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  className="rounded-full border border-border bg-muted/60 px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.99] transition-all shadow-xs cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Analisis Kode KBLI Saya</span>
          </button>
        </div>

        {/* Recommendations Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">
              Hasil Rekomendasi KBLI 2020
            </h2>
            <span className="text-xs text-muted-foreground">3 Kandidat Ditemukan</span>
          </div>

          {/* Card 1: Top Match */}
          <div className="rounded-xl border-2 border-primary bg-card p-4 shadow-sm space-y-3 relative overflow-hidden">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Kecocokan 94% (Sangat Cocok)
                  </span>
                  <span className="inline-block rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                    Risiko Rendah
                  </span>
                </div>
                <h3 className="text-base font-bold text-foreground">
                  KBLI 10794: Industri Kerupuk, Keripik, Peyek dan Sejenisnya
                </h3>
              </div>
              <input
                type="radio"
                name="selectedKbli"
                defaultChecked
                className="w-4 h-4 text-primary mt-1 shrink-0 accent-primary"
              />
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Mencakup usaha pembuatan keripik buah, umbi, dan makanan ringan sejenis berbasis hasil
              pertanian untuk skala industri rumah tangga dan mikro.
            </p>
          </div>

          {/* Card 2: Alternative */}
          <div className="rounded-xl border border-border bg-card p-4 hover:border-border/80 transition-colors space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    Kecocokan 78%
                  </span>
                  <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    Risiko Rendah
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-foreground">
                  KBLI 47241: Perdagangan Eceran Makanan dan Minuman di Toko
                </h3>
              </div>
              <input
                type="radio"
                name="selectedKbli"
                className="w-4 h-4 text-primary mt-1 shrink-0 accent-primary"
              />
            </div>
          </div>

          {/* Manual Search Fallback */}
          <div className="text-center pt-1">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Kode KBLI tidak pas? Cari manual dengan nomor atau kata kunci</span>
            </button>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <Link
            href="/dashboard"
            className={buttonVariants({
              size: "lg",
              className: "w-full h-13 font-bold text-sm sm:text-base flex items-center justify-center gap-2",
            })}
          >
            <span>Gunakan KBLI Ini & Susun Checklist Kepatuhan</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Disclaimer */}
        <DisclaimerBanner />
      </div>
    </div>
  );
}
