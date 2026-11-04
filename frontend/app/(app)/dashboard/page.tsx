import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, AlertTriangle, FileText, Building2 } from "lucide-react";
import { ComplianceStepper } from "@/components/compliance-stepper";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { CitationBadge } from "@/components/citation-badge";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Checklist Kepatuhan Regulasi | Legalyst",
};

/**
 * [PIC: DIFFIE]
 * Referensi Desain: docs/stitch-screens/02-compliance-wizard.html
 * Preview Lokal: http://localhost:3333
 *
 * Tanggung Jawab:
 * 1. Menampilkan ringkasan profil usaha (KBLI, skala mikro, lokasi).
 * 2. Mengambil matriks kepatuhan dari backend (Rule Engine + RAG synthesis).
 * 3. Loading state interaktif (< 10 detik sesuai metrik PRD) saat LLM menyusun checklist.
 * 4. Merender 100% badge sitasi regulasi ([PP No. 5/2021], dll.).
 * 5. Merender badge peringatan amber [Perlu Verifikasi Manual] untuk klausul ragu/edge case.
 */
export default function DashboardPage() {
  return (
    <div className="flex flex-col min-h-full">
      <ComplianceStepper currentStep={2} />

      <div className="mx-auto w-full max-w-xl px-4 py-6 space-y-6">
        {/* Business Summary Header Card */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-sm text-foreground truncate">
                  KBLI 10794: Industri Kerupuk & Keripik
                </span>
                <span className="rounded-md bg-blue-100 text-blue-800 px-1.5 py-0.2 text-[10px] font-bold">
                  Usaha Mikro
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                Dapur Sambal & Keripik Mak Nyuss • Sleman, D.I. Yogyakarta
              </p>
            </div>
          </div>
          <Link
            href="/onboarding"
            className="text-xs text-primary font-semibold hover:underline shrink-0"
          >
            Ubah
          </Link>
        </div>

        {/* Disclaimer Banner */}
        <DisclaimerBanner />

        {/* Section Title */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-foreground">
              Daftar Kewajiban Hukum & Sertifikasi
            </h1>
            <p className="text-xs text-muted-foreground">
              Disintesis secara deterministik & terverifikasi regulasi resmi
            </p>
          </div>
          <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-1 text-xs font-bold">
            3 Wajib • 1 Verifikasi
          </span>
        </div>

        {/* Obligations List */}
        <div className="space-y-3.5">
          {/* Obligation 1: NIB */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-2.5 hover:border-primary/40 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Wajib Segera
                  </span>
                  <CitationBadge citation="PP No. 5/2021 Pasal 12" />
                </div>
                <h2 className="text-sm sm:text-base font-bold text-foreground">
                  Nomor Induk Berusaha (NIB) Berbasis Risiko
                </h2>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 text-primary mt-1 rounded-sm accent-primary shrink-0"
              />
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Identitas legalitas usaha tunggal yang berlaku sebagai izin edar dasar, angka pengenal
              impor, dan bukti kepatuhan jaminan sosial ketenagakerjaan.
            </p>
          </div>

          {/* Obligation 2: PIRT */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-2.5 hover:border-primary/40 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Wajib Pangan Olahan
                  </span>
                  <CitationBadge citation="PerBPOM No. 22/2021 & PP 5/2021" />
                </div>
                <h2 className="text-sm sm:text-base font-bold text-foreground">
                  Izin Edar P-IRT (Dinas Kesehatan)
                </h2>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 text-primary mt-1 rounded-sm accent-primary shrink-0"
              />
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Sertifikasi pemenuhan komitmen higienitas untuk produk makanan kering berdaya tahan
              simpan lebih dari 7 hari di suhu ruang.
            </p>
          </div>

          {/* Obligation 3: Halal Self-Declare */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-2.5 hover:border-primary/40 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3 text-blue-600" />
                    Wajib Tahap 2024
                  </span>
                  <CitationBadge citation="UU No. 33/2014 & PP No. 42/2024" />
                </div>
                <h2 className="text-sm sm:text-base font-bold text-foreground">
                  Sertifikasi Halal (Jalur Self-Declare BPJPH)
                </h2>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 text-primary mt-1 rounded-sm accent-primary shrink-0"
              />
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Pernyataan mandiri pelaku usaha mikro tanpa biaya (Program SEHATI) bahwa bahan baku
              yang digunakan telah dipastikan halal dan bebas najis.
            </p>
          </div>

          {/* Obligation 4: Edge Case with Manual Verification Tag */}
          <div className="rounded-xl border border-amber-300 bg-amber-50/40 p-4 shadow-xs space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    Perlu Verifikasi Manual
                  </span>
                  <CitationBadge citation="UU Pangan No. 18/2012" />
                </div>
                <h2 className="text-sm sm:text-base font-bold text-amber-950">
                  Izin Edar BPOM MD (Khusus Skala Lanjutan)
                </h2>
              </div>
              <input
                type="checkbox"
                className="w-4 h-4 text-amber-700 mt-1 rounded-sm accent-amber-600 shrink-0"
              />
            </div>
            <p className="text-xs sm:text-sm text-amber-900 leading-relaxed">
              Selama skala usaha Anda mikro rumahan, cukup menggunakan P-IRT. Jika Anda menggunakan
              bahan tambahan pangan (BTP) khusus atau memperluas distribusi ke supermarket besar,
              status ini wajib dikonsultasikan secara manual.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <Link
            href="/documents"
            className={buttonVariants({
              size: "lg",
              className: "w-full h-13 font-bold text-sm sm:text-base flex items-center justify-center gap-2",
            })}
          >
            <FileText className="w-4 h-4" />
            <span>Generate Dokumen Kepatuhan Saya</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
