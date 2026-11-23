import { apiFetch } from "@/lib/api";
import OBLIGATIONS_OSS from "@/lib/data/obligations-oss.json";

/** Versi KBLI yang ditampilkan ke pengguna. Korpus di data/ memakai KBLI 2025. */
export const KBLI_VERSION = "2025";

export type ObligationTrack = "OSS" | "PIRT" | "HALAL" | "SPT";

/** Tingkat risiko OSS-RBA (PP No. 5/2021). Kosong untuk track selain OSS. */
export type RiskTier = "rendah" | "menengah rendah" | "menengah tinggi" | "tinggi";

export type BusinessScale = "mikro" | "kecil";

/** Mengikuti kolom data/TEMPLATE_obligations.csv. */
export type Obligation = {
  obligation_id: string;
  track: ObligationTrack;
  title: string;
  requirement_text: string;
  issuing_agency: string;
  /** Tautan regulasi resmi. */
  source_url: string;
  /** Sitasi singkat untuk badge, mis. "PP No. 5 Tahun 2021 Pasal 12". */
  citation: string;
  /** Pasal/ayat lengkap dari kolom source_article. */
  source_article: string;
  risk_tier?: RiskTier;
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
export async function fetchChecklist(
  kode: string,
  scale: BusinessScale = "mikro",
): Promise<Obligation[]> {
  if (USE_MOCK) {
    await wait(1500);
    return checklistFromCorpus(kode, scale);
  }
  const res = await apiFetch<ChecklistResponse>("/api/v1/compliance/checklist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kbli: kode, business_scale: scale }),
  });
  return res.obligations;
}

/* ------------------------------------------------------------------ */
/* Sementara endpoint belum ada, checklist disusun di frontend dari       */
/* korpus OSS-RBA (#13): data/obligations_oss.csv, disalin ke             */
/* lib/data/obligations-oss.json lewat `npm run sync:obligations`.        */
/* Track PIRT, Halal, dan SPT menyusul setelah korpus #14 dan #15 ada.    */
/* ------------------------------------------------------------------ */

type CorpusRow = {
  obligation_id: string;
  track: string;
  title: string;
  kbli_scope: string[] | "ALL";
  business_scale: string[] | "ALL";
  risk_tier: string;
  requirement_text: string;
  issuing_agency: string;
  source_url: string;
  source_article: string;
  notes: string;
};

const CORPUS = OBLIGATIONS_OSS as CorpusRow[];

const TIER_ORDER: RiskTier[] = ["rendah", "menengah rendah", "menengah tinggi", "tinggi"];

function appliesToScale(row: CorpusRow, scale: BusinessScale) {
  return row.business_scale === "ALL" || row.business_scale.includes(scale);
}

function isSpecificTo(row: CorpusRow, kode: string) {
  return row.kbli_scope !== "ALL" && row.kbli_scope.includes(kode);
}

/** true bila kode KBLI punya kewajiban khusus di korpus (bukan hanya yang berlaku umum). */
export function isKbliInCorpus(kode: string) {
  return CORPUS.some((row) => isSpecificTo(row, kode));
}

/**
 * Sitasi singkat untuk badge: ambil regulasi pertama sampai nomor Pasal/Lampiran,
 * mis. "PP No. 5 Tahun 2021 Pasal 12 ayat (1) dan ayat (2) jo. ..." -> "PP No. 5 Tahun 2021 Pasal 12".
 */
export function shortCitation(article: string) {
  const first = article.split(/\s+(?:jo\.|sebagaimana)\s+/)[0];
  const match = first.match(/^.*?(?:Pasal\s+\d+[A-Z]?|Lampiran(?:\s+[IVXLC]+(?:\.[A-Z])?)?)/);
  return (match ? match[0] : first).trim();
}

function checklistFromCorpus(kode: string, scale: BusinessScale): Obligation[] {
  const rows = CORPUS.filter(
    (row) => appliesToScale(row, scale) && (row.kbli_scope === "ALL" || isSpecificTo(row, kode)),
  );

  // Satu KBLI bisa masuk beberapa tingkat risiko (bergantung skala, luas, atau produk),
  // jadi tingkat terendah dianggap wajib dan tingkat di atasnya ditandai perlu verifikasi.
  const specificTiers = rows
    .filter((row) => isSpecificTo(row, kode))
    .map((row) => TIER_ORDER.indexOf(row.risk_tier as RiskTier))
    .filter((i) => i >= 0);
  const lowestTier = specificTiers.length > 0 ? Math.min(...specificTiers) : 0;

  return rows
    .map((row): Obligation => {
      const tierIndex = TIER_ORDER.indexOf(row.risk_tier as RiskTier);
      const higherTier = isSpecificTo(row, kode) && tierIndex > lowestTier;
      return {
        obligation_id: row.obligation_id,
        track: row.track as ObligationTrack,
        title: row.title,
        requirement_text: row.requirement_text,
        issuing_agency: row.issuing_agency,
        source_url: row.source_url,
        citation: shortCitation(row.source_article),
        source_article: row.source_article,
        risk_tier: tierIndex >= 0 ? TIER_ORDER[tierIndex] : undefined,
        needs_manual_verification: higherTier,
        notes: higherTier
          ? `Berlaku bila usaha Anda tergolong risiko ${row.risk_tier}. Tingkat risiko bergantung pada skala, luas tempat, dan jenis produk; cek di Sistem OSS.`
          : row.notes || undefined,
      };
    })
    .sort(
      (a, b) =>
        Number(a.needs_manual_verification) - Number(b.needs_manual_verification) ||
        a.obligation_id.localeCompare(b.obligation_id),
    );
}
