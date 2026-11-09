import { apiFetch } from "@/lib/api";

/** Versi KBLI yang ditampilkan ke pengguna. Korpus di data/ memakai KBLI 2025. */
export const KBLI_VERSION = "2025";

export type ObligationTrack = "OSS" | "PIRT" | "HALAL" | "SPT";

/** Mengikuti kolom data/TEMPLATE_obligations.csv. */
export type Obligation = {
  obligation_id: string;
  track: ObligationTrack;
  title: string;
  requirement_text: string;
  issuing_agency: string;
  /** Tautan regulasi resmi; kosong pada data mock. */
  source_url: string;
  /** Sitasi regulasi yang wajib tampil di setiap item, mis. "PP No. 5/2021 Pasal 12". */
  citation: string;
  /** true = tampilkan tag amber "Perlu Verifikasi Manual". */
  needs_manual_verification: boolean;
  notes?: string;
};

export type ChecklistResponse = {
  obligations: Obligation[];
};

const USE_MOCK = !process.env.NEXT_PUBLIC_API_BASE_URL;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * POST /api/v1/compliance/checklist
 * Endpoint belum ada di backend; nama mengikuti pola profiler dan bisa diubah.
 */
export async function fetchChecklist(kode: string): Promise<Obligation[]> {
  if (USE_MOCK) {
    await wait(1500);
    return mockChecklist(kode);
  }
  const res = await apiFetch<ChecklistResponse>("/api/v1/compliance/checklist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kbli: kode, business_scale: "mikro" }),
  });
  return res.obligations;
}

/* ------------------------------------------------------------------ */
/* Mock data. Sitasi kewajiban hanya contoh tampilan; isi asli datang   */
/* dari korpus obligations di backend.                                    */
/* ------------------------------------------------------------------ */

const COMMON_OBLIGATIONS: Obligation[] = [
  {
    obligation_id: "OSS-001",
    track: "OSS",
    title: "Nomor Induk Berusaha (NIB) Berbasis Risiko",
    requirement_text:
      "Daftarkan usaha di portal OSS untuk mendapatkan NIB, identitas tunggal yang menjadi dasar perizinan usaha risiko rendah.",
    issuing_agency: "Kementerian Investasi/BKPM",
    source_url: "",
    citation: "PP No. 5/2021 Pasal 12",
    needs_manual_verification: false,
  },
  {
    obligation_id: "HALAL-001",
    track: "HALAL",
    title: "Sertifikasi Halal (Jalur Self-Declare BPJPH)",
    requirement_text:
      "Ajukan sertifikat halal melalui pernyataan mandiri (program SEHATI) bila bahan baku dan proses produksi sederhana dan dipastikan halal.",
    issuing_agency: "BPJPH",
    source_url: "",
    citation: "UU No. 33/2014 & PP No. 42/2024",
    needs_manual_verification: false,
  },
  {
    obligation_id: "SPT-001",
    track: "SPT",
    title: "NPWP & Pelaporan PPh Final UMKM 0,5%",
    requirement_text:
      "Miliki NPWP dan laporkan SPT Tahunan. Omzet di bawah Rp4,8 miliar per tahun dapat memakai tarif PPh final 0,5%.",
    issuing_agency: "Ditjen Pajak",
    source_url: "",
    citation: "PP No. 55/2022 Pasal 56",
    needs_manual_verification: false,
  },
];

const PIRT: Obligation = {
  obligation_id: "PIRT-001",
  track: "PIRT",
  title: "Sertifikat Produksi Pangan Industri Rumah Tangga (SPP-IRT)",
  requirement_text:
    "Wajib untuk pangan olahan kemasan yang diproduksi di rumah dan tahan simpan lebih dari 7 hari pada suhu ruang.",
  issuing_agency: "Dinas Kesehatan Kabupaten/Kota",
  source_url: "",
  citation: "PerBPOM No. 22/2021 Pasal 3",
  needs_manual_verification: false,
};

const BPOM_MD: Obligation = {
  obligation_id: "PIRT-002",
  track: "PIRT",
  title: "Izin Edar BPOM MD (Skala Lanjutan)",
  requirement_text:
    "Selama skala usaha mikro rumahan, P-IRT sudah cukup. Bila memakai bahan tambahan pangan tertentu atau masuk supermarket besar, status ini perlu dikonsultasikan.",
  issuing_agency: "BPOM",
  source_url: "",
  citation: "UU No. 18/2012 Pasal 91",
  needs_manual_verification: true,
  notes: "Tergantung jenis BTP dan jalur distribusi.",
};

const SLHS: Obligation = {
  obligation_id: "PIRT-003",
  track: "PIRT",
  title: "Sertifikat Laik Higiene Sanitasi (SLHS)",
  requirement_text:
    "Usaha jasa boga dan rumah makan perlu memenuhi standar higiene sanitasi. Kewajiban untuk skala mikro masih bergantung pada kebijakan daerah.",
  issuing_agency: "Dinas Kesehatan Kabupaten/Kota",
  source_url: "",
  citation: "Permenkes No. 14/2021 Lampiran",
  needs_manual_verification: true,
  notes: "Cek peraturan bupati/wali kota setempat.",
};

function mockChecklist(kode: string): Obligation[] {
  const isManufacturing = kode.startsWith("10");
  const isFoodService = kode.startsWith("56");
  return [
    ...COMMON_OBLIGATIONS.slice(0, 1),
    ...(isManufacturing ? [PIRT] : []),
    ...COMMON_OBLIGATIONS.slice(1),
    ...(isManufacturing ? [BPOM_MD] : []),
    ...(isFoodService ? [SLHS] : []),
  ];
}
