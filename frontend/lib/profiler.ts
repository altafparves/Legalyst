export type RiskLevel = "rendah" | "menengah" | "tinggi";

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

// Stub until the profiler backend and DB schema land (#18 / #7). It simulates a
// network round trip and returns fixed dummy candidates, so the onboarding UI
// can be built and tested without the backend. It never calls fetch.
//
// To wire it up later, replace the body with something like:
//   return apiFetch<MatchKbliResult>("/profiler/match", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ description }),
//   });
// The page only depends on this signature, so no UI change is needed.
export async function matchKbli(description: string): Promise<MatchKbliResult> {
  void description;
  await new Promise((resolve) => setTimeout(resolve, 900));

  return {
    candidates: [
      {
        code: "10794",
        title: "Industri Kerupuk, Keripik, Peyek, dan Sejenisnya",
        description:
          "Mencakup usaha pembuatan kerupuk, keripik, peyek, dan makanan ringan sejenis dari hasil pertanian.",
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
  };
}

export function matchErrorMessage(error: unknown): string {
  void error;
  return "Gagal menganalisis deskripsi usaha. Coba lagi sebentar lagi.";
}
