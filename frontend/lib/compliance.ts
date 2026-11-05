import { apiFetch } from "@/lib/api";

/** Versi KBLI yang ditampilkan ke pengguna. Korpus di data/ memakai KBLI 2025. */
export const KBLI_VERSION = "2025";

export const MIN_DESCRIPTION_WORDS = 10;

export type RiskTier = "rendah" | "menengah rendah" | "menengah tinggi" | "tinggi";

export type KbliCandidate = {
  kode: string;
  judul: string;
  deskripsi: string;
  /** 0–1, ditampilkan sebagai persentase kecocokan. */
  confidence: number;
  risk_tier: RiskTier;
};

export type ProfilerMatchResponse = {
  candidates: KbliCandidate[];
};

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

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

const USE_MOCK = !process.env.NEXT_PUBLIC_API_BASE_URL;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * POST /api/v1/profiler/match
 * Memakai mock lokal selama NEXT_PUBLIC_API_BASE_URL belum diisi.
 */
export async function matchKbli(description: string): Promise<KbliCandidate[]> {
  if (USE_MOCK) {
    await wait(1200);
    return mockMatch(description);
  }
  const res = await apiFetch<ProfilerMatchResponse>("/api/v1/profiler/match", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ description }),
  });
  return res.candidates.slice(0, 3);
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
/* Mock data. Judul KBLI dari data/kbli_2025.csv. Sitasi kewajiban hanya  */
/* contoh tampilan; isi asli datang dari korpus obligations di backend.  */
/* ------------------------------------------------------------------ */

type CatalogEntry = Omit<KbliCandidate, "confidence"> & { keywords: string[] };

const CATALOG: CatalogEntry[] = [
  {
    kode: "10794",
    judul: "Industri Kerupuk, Keripik, Peyek, dan Sejenisnya",
    deskripsi:
      "Pembuatan kerupuk, keripik buah, umbi, dan makanan ringan sejenis berbasis hasil pertanian.",
    risk_tier: "rendah",
    keywords: ["keripik", "kerupuk", "peyek", "camilan", "snack", "rempeyek", "pisang", "singkong"],
  },
  {
    kode: "10710",
    judul: "Industri Produk Bakeri",
    deskripsi: "Pembuatan roti, kue kering, dan produk bakeri lainnya.",
    risk_tier: "rendah",
    keywords: ["roti", "bakeri", "kue kering", "cookies", "bolu", "brownies", "panggang"],
  },
  {
    kode: "10792",
    judul: "Industri Kue Basah",
    deskripsi: "Pembuatan kue basah seperti lemper, klepon, onde-onde, dan sejenisnya.",
    risk_tier: "rendah",
    keywords: ["kue basah", "jajan pasar", "klepon", "lemper", "onde", "kue"],
  },
  {
    kode: "10750",
    judul: "Industri Makanan dan Masakan Olahan",
    deskripsi: "Pembuatan makanan siap saji dan masakan olahan yang dikemas.",
    risk_tier: "menengah rendah",
    keywords: ["frozen", "beku", "olahan", "sambal", "rendang", "kemasan", "siap saji"],
  },
  {
    kode: "56210",
    judul: "Aktivitas Jasa Boga untuk Acara Tertentu (event Catering)",
    deskripsi: "Penyediaan makanan berdasarkan kontrak untuk acara tertentu.",
    risk_tier: "menengah rendah",
    keywords: ["katering", "catering", "nasi boks", "nasi kotak", "acara", "arisan", "hajatan"],
  },
  {
    kode: "56101",
    judul: "Aktivitas Penyediaan Makanan di Bangunan Tetap",
    deskripsi: "Rumah makan, warung makan, dan restoran yang menetap di satu lokasi.",
    risk_tier: "rendah",
    keywords: ["warung makan", "rumah makan", "restoran", "warteg", "makan", "masakan"],
  },
  {
    kode: "56102",
    judul: "Aktivitas Penyediaan Makanan di Bangunan Tidak Tetap",
    deskripsi: "Penjualan makanan di tenda, gerobak, atau kios keliling.",
    risk_tier: "rendah",
    keywords: ["gerobak", "keliling", "tenda", "kaki lima", "pinggir jalan", "angkringan"],
  },
  {
    kode: "56303",
    judul: "Aktivitas Rumah Minum/kafe",
    deskripsi: "Kedai kopi, kafe, dan rumah minum yang menyajikan minuman untuk dikonsumsi di tempat.",
    risk_tier: "rendah",
    keywords: ["kopi", "kafe", "cafe", "kedai", "minuman", "teh", "boba", "es"],
  },
  {
    kode: "47112",
    judul:
      "Perdagangan Eceran Berbagai Macam Barang yang Utamanya Makanan, Minuman, atau Tembakau Selain dengan Sistem Swalayan",
    deskripsi: "Warung kelontong dan toko eceran kebutuhan sehari-hari tanpa sistem swalayan.",
    risk_tier: "rendah",
    keywords: ["kelontong", "sembako", "eceran", "kebutuhan rumah tangga", "minuman kemasan"],
  },
];

export const QUICK_EXAMPLES: { label: string; text: string }[] = [
  {
    label: "Keripik & Camilan Rumahan",
    text: "Saya memproduksi keripik pisang aneka rasa (cokelat, gurih) dari dapur rumah dan menjualnya ke warung sekitar serta toko oleh-oleh. Ada 2 pekerja.",
  },
  {
    label: "Kedai Kopi & Minuman",
    text: "Saya membuka kedai kopi kecil di depan rumah yang menjual kopi susu, teh, dan minuman dingin untuk diminum di tempat atau dibawa pulang.",
  },
  {
    label: "Katering Rumahan",
    text: "Saya menerima pesanan katering nasi boks rumahan untuk acara kantor, arisan, dan pengajian, dimasak di dapur rumah bersama 3 orang pekerja.",
  },
  {
    label: "Warung Kelontong",
    text: "Saya punya warung kelontong di kampung yang menjual sembako, minuman kemasan, jajanan, dan kebutuhan rumah tangga sehari-hari ke tetangga sekitar.",
  },
];

function mockMatch(description: string): KbliCandidate[] {
  const text = description.toLowerCase();
  const scored = CATALOG.map((entry, i) => {
    const hits = entry.keywords.filter((k) => text.includes(k)).length;
    return { entry, hits, i };
  }).sort((a, b) => b.hits - a.hits || a.i - b.i);

  const base = [0.94, 0.78, 0.62];
  return scored.slice(0, 3).map(({ entry, hits }, rank) => {
    const { keywords: _keywords, ...rest } = entry;
    void _keywords;
    // Tanpa kata kunci yang cocok, turunkan skor agar UI menampilkan kecocokan rendah.
    const confidence = hits > 0 ? base[rank] : base[rank] - 0.35;
    return { ...rest, confidence };
  });
}

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
