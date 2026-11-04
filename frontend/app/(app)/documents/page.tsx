import type { Metadata } from "next";
import { Download, FileCheck, CheckCircle2, Archive, ExternalLink } from "lucide-react";
import { ComplianceStepper } from "@/components/compliance-stepper";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Draft Dokumen Legal Siap Unduh | Legalyst",
};

/**
 * [PIC: DIMAS]
 * Referensi Desain: docs/stitch-screens/03-auto-document-generator.html
 * Preview Lokal: http://localhost:3333
 *
 * Tanggung Jawab:
 * 1. Menampilkan daftar kartu dokumen hasil generate PDF otomatis.
 * 2. Tombol "Unduh PDF" per item & "Unduh Semua (.ZIP)" (integrasi ke endpoint backend / Azure Blob).
 * 3. Menampilkan status sukses / progress download (SSE).
 * 4. Menyajikan kartu petunjuk langkah nyata (materai Rp10.000, link ke OSS / SiHalal).
 * 5. Menjaga responsivitas mobile & tap target >= 48px.
 */
export default function DocumentsPage() {
  const documents = [
    {
      id: "doc-1",
      title: "Surat Pernyataan Mandiri Usaha Mikro",
      issuer: "Standar BKPM / OSS-RBA",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
      size: "245 KB",
      desc: "Format baku pernyataan pemenuhan tata ruang dan lingkungan hidup untuk terbitnya NIB kilat.",
      downloadUrl: "#",
    },
    {
      id: "doc-2",
      title: "Formulir Komitmen Sanitasi & Higienitas P-IRT",
      issuer: "Standar Dinas Kesehatan",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      size: "180 KB",
      desc: "Draft komitmen tata letak dapur dan SOP kebersihan produksi olahan keripik pisang.",
      downloadUrl: "#",
    },
    {
      id: "doc-3",
      title: "Surat Ikrar Bebas Bahan Kritis Halal",
      issuer: "Standar BPJPH Kemenag",
      badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
      size: "310 KB",
      desc: "Akad pernyataan mandiri (Self-Declare) bebas unsur haram/najis untuk pendaftaran SEHATI.",
      downloadUrl: "#",
    },
  ];

  return (
    <div className="flex flex-col min-h-full">
      <ComplianceStepper currentStep={3} />

      <div className="mx-auto w-full max-w-xl px-4 py-6 space-y-6">
        {/* Header Section */}
        <div className="space-y-1">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Langkah 3: Dokumen Siap Unduh
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Draft Dokumen Kepatuhan Anda
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Dokumen resmi berikut telah diisi secara otomatis sesuai data profil usaha dan kode KBLI
            10794 Anda.
          </p>
        </div>

        {/* Success Status Banner */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-emerald-950">
              3 Dokumen Berhasil Dibuat (100%)
            </h2>
            <p className="text-xs text-emerald-800">
              Siap diunduh dalam format PDF standar resmi instansi pemerintah.
            </p>
          </div>
        </div>

        {/* Documents Cards List */}
        <div className="space-y-3.5">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-3 hover:border-primary/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <span
                    className={`inline-block rounded-md border px-2 py-0.5 text-[11px] font-bold ${doc.badgeColor}`}
                  >
                    {doc.issuer}
                  </span>
                  <h3 className="text-base font-bold text-foreground">{doc.title}</h3>
                </div>
                <span className="text-xs text-muted-foreground font-mono shrink-0">
                  {doc.size}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {doc.desc}
              </p>

              <div className="pt-1 flex items-center justify-between gap-3">
                <span className="text-[11px] text-muted-foreground">Format: PDF Resmi</span>
                <a
                  href={doc.downloadUrl}
                  className={buttonVariants({
                    size: "sm",
                    className: "font-semibold flex items-center gap-1.5 h-10 px-4",
                  })}
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh PDF</span>
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Next Steps Guidance Card */}
        <div className="rounded-xl border border-border bg-muted/40 p-5 space-y-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <span>📋 Langkah Selanjutnya Setelah Mengunduh:</span>
          </h3>
          <ol className="text-xs sm:text-sm text-muted-foreground space-y-2 list-decimal list-inside leading-relaxed">
            <li>
              <strong className="text-foreground">Cetak & Tanda Tangan:</strong> Cetak dokumen dan
              bubuhkan tanda tangan pemilik usaha di atas materai Rp10.000 pada kolom yang tersedia.
            </li>
            <li>
              <strong className="text-foreground">Unggah ke OSS-RBA:</strong> Masuk ke{" "}
              <a
                href="https://oss.go.id"
                target="_blank"
                rel="noreferrer"
                className="text-primary font-semibold inline-flex items-center gap-0.5 hover:underline"
              >
                oss.go.id <ExternalLink className="w-3 h-3" />
              </a>{" "}
              dan unggah Surat Pernyataan Mandiri.
            </li>
            <li>
              <strong className="text-foreground">Unggah ke SiHalal:</strong> Masuk ke portal BPJPH
              untuk melampirkan Surat Ikrar Halal Mandiri.
            </li>
          </ol>
        </div>

        {/* Bulk Download Action */}
        <div className="pt-1">
          <button
            type="button"
            className={buttonVariants({
              variant: "outline",
              size: "lg",
              className: "w-full h-12 font-bold text-sm flex items-center justify-center gap-2 border-primary/30 text-primary hover:bg-primary/5 cursor-pointer",
            })}
          >
            <Archive className="w-4 h-4" />
            <span>Unduh Semua Dokumen (.ZIP)</span>
          </button>
        </div>

        {/* Disclaimer */}
        <DisclaimerBanner />
      </div>
    </div>
  );
}
