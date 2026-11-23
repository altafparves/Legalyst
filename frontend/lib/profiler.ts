import { apiFetch } from "@/lib/api";

/** Empat tingkat risiko resmi OSS-RBA (PP 28/2025). */
export type RiskLevel = "rendah" | "menengah rendah" | "menengah tinggi" | "tinggi";

export const RISK_LABEL: Record<RiskLevel, string> = {
  rendah: "Risiko Rendah",
  "menengah rendah": "Risiko Menengah Rendah",
  "menengah tinggi": "Risiko Menengah Tinggi",
  tinggi: "Risiko Tinggi",
};

export type KbliCandidate = {
  code: string;
  title: string;
  description: string;
  /** Match confidence, 0-1. */
  confidence: number;
  risk: RiskLevel;
};

export type MatchKbliResult = {
  candidates: KbliCandidate[];
};

type Scenario = {
  /** Kata kunci (huruf kecil). Skenario dengan kecocokan terbanyak menang. */
  keywords: string[];
  candidates: KbliCandidate[];
};

// Data stub untuk 4 chip contoh cepat. Kode dan judul mengikuti data/kbli_2025.csv.
const SCENARIOS: Scenario[] = [
  {
    keywords: ["keripik", "kerupuk", "peyek", "camilan", "snack", "pisang"],
    candidates: [
      {
        code: "10794",
        title: "Industri Kerupuk, Keripik, Peyek, dan Sejenisnya",
        description:
          "Mencakup pembuatan keripik buah, keripik umbi, dan camilan kering sejenis dari skala mikro hingga menengah.",
        confidence: 0.94,
        risk: "rendah",
      },
      {
        code: "47249",
        title: "Perdagangan Eceran Makanan Lainnya",
        description:
          "Mencakup perdagangan eceran khusus makanan hasil industri, misalnya makanan ringan kemasan.",
        confidence: 0.78,
        risk: "rendah",
      },
      {
        code: "10795",
        title: "Industri Sari Nabati dan Krimer Nabati",
        description:
          "Mencakup pembuatan sari nabati dari berbagai tanaman. Kecocokan rendah, ditampilkan sebagai alternatif.",
        confidence: 0.41,
        risk: "rendah",
      },
    ],
  },
  {
    keywords: ["kopi", "kedai", "minuman", "kafe", "cafe", "seduh", "teh"],
    candidates: [
      {
        code: "56303",
        title: "Aktivitas Rumah Minum/Kafe",
        description:
          "Mencakup penyediaan minuman panas maupun dingin yang dikonsumsi di tempat usaha.",
        confidence: 0.92,
        risk: "menengah rendah",
      },
      {
        code: "56101",
        title: "Aktivitas Penyediaan Makanan di Bangunan Tetap",
        description:
          "Mencakup penyediaan makanan kepada pelanggan di bangunan permanen, misalnya kedai atau rumah makan.",
        confidence: 0.66,
        risk: "menengah rendah",
      },
      {
        code: "47222",
        title: "Perdagangan Eceran Minuman Tidak Beralkohol",
        description:
          "Mencakup perdagangan eceran minuman tidak beralkohol yang tidak dikonsumsi langsung di tempat.",
        confidence: 0.48,
        risk: "rendah",
      },
    ],
  },
  {
    keywords: ["katering", "nasi", "boks", "acara", "arisan", "pesanan", "masak"],
    candidates: [
      {
        code: "56210",
        title: "Aktivitas Jasa Boga untuk Acara Tertentu (Event Catering)",
        description:
          "Mencakup penyiapan dan penyediaan makanan berdasarkan kontrak pesanan untuk acara tertentu.",
        confidence: 0.93,
        risk: "menengah tinggi",
      },
      {
        code: "56290",
        title: "Aktivitas Penyediaan Jasa Boga Lainnya",
        description:
          "Mencakup jasa penyedia makanan lainnya berdasarkan kontrak dalam periode waktu tertentu.",
        confidence: 0.71,
        risk: "menengah rendah",
      },
      {
        code: "56101",
        title: "Aktivitas Penyediaan Makanan di Bangunan Tetap",
        description:
          "Mencakup penyediaan makanan kepada pelanggan di bangunan permanen. Kecocokan rendah, sebagai alternatif.",
        confidence: 0.39,
        risk: "menengah rendah",
      },
    ],
  },
  {
    keywords: ["warung", "kelontong", "sembako", "toko", "eceran", "kemasan"],
    candidates: [
      {
        code: "47112",
        title:
          "Perdagangan Eceran Berbagai Macam Barang yang Utamanya Makanan, Minuman, atau Tembakau Selain dengan Sistem Swalayan",
        description:
          "Mencakup perdagangan eceran aneka kebutuhan sehari-hari, terutama makanan dan minuman, di warung atau toko kelontong.",
        confidence: 0.91,
        risk: "rendah",
      },
      {
        code: "47249",
        title: "Perdagangan Eceran Makanan Lainnya",
        description:
          "Mencakup perdagangan eceran khusus makanan hasil industri, misalnya makanan ringan kemasan.",
        confidence: 0.64,
        risk: "rendah",
      },
      {
        code: "47222",
        title: "Perdagangan Eceran Minuman Tidak Beralkohol",
        description:
          "Mencakup perdagangan eceran minuman tidak beralkohol yang tidak dikonsumsi langsung di tempat.",
        confidence: 0.45,
        risk: "rendah",
      },
    ],
  },
];

function scoreScenario(text: string, scenario: Scenario): number {
  return scenario.keywords.reduce((total, keyword) => total + (text.includes(keyword) ? 1 : 0), 0);
}

/** Memilih skenario stub berdasarkan kata kunci; bila tak ada yang cocok, pakai skenario pertama. */
function pickScenario(description: string): Scenario {
  const text = description.toLowerCase();
  let best = SCENARIOS[0];
  let bestScore = 0;
  for (const scenario of SCENARIOS) {
    const score = scoreScenario(text, scenario);
    if (score > bestScore) {
      best = scenario;
      bestScore = score;
    }
  }
  return best;
}

const apiConfigured = Boolean(process.env.NEXT_PUBLIC_API_BASE_URL);

/**
 * Mencocokkan deskripsi usaha ke kandidat KBLI.
 *
 * Bila NEXT_PUBLIC_API_BASE_URL diisi, memanggil POST /api/v1/profiler/match.
 * Bila tidak, memakai stub lokal yang sadar kata kunci (tanpa fetch) agar UI
 * bisa diuji tanpa backend. Halaman hanya bergantung pada signature ini.
 */
export async function matchKbli(description: string): Promise<MatchKbliResult> {
  if (apiConfigured) {
    return apiFetch<MatchKbliResult>("/api/v1/profiler/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description }),
    });
  }

  await new Promise((resolve) => setTimeout(resolve, 900));
  return { candidates: pickScenario(description).candidates };
}

export function matchErrorMessage(error: unknown): string {
  void error;
  return "Gagal menganalisis deskripsi usaha. Coba lagi sebentar lagi.";
}
