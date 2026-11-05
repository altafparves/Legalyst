"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, CheckCircle2, Loader2, Search, Sparkles } from "lucide-react";

import { useBusinessProfile, type BusinessProfile } from "@/components/business-profile-provider";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { Button } from "@/components/ui/button";
import {
  KBLI_VERSION,
  MIN_DESCRIPTION_WORDS,
  QUICK_EXAMPLES,
  countWords,
  matchKbli,
  type KbliCandidate,
} from "@/lib/compliance";
import { cn } from "@/lib/utils";

type Status = "idle" | "loading" | "done" | "error";

export function ProfilerForm() {
  const { profile, hydrated, setProfile } = useBusinessProfile();
  // Remount sekali setelah sessionStorage terbaca, agar profil tersimpan
  // (saat kembali lewat tombol "Ubah") jadi state awal form.
  return (
    <ProfilerFormInner
      key={hydrated ? "client" : "server"}
      initial={hydrated ? profile : null}
      onConfirm={setProfile}
    />
  );
}

function ProfilerFormInner({
  initial,
  onConfirm,
}: {
  initial: BusinessProfile | null;
  onConfirm: (profile: BusinessProfile) => void;
}) {
  const router = useRouter();
  const descriptionId = useId();
  const hintId = useId();

  const [description, setDescription] = useState(initial?.description ?? "");
  const [touched, setTouched] = useState(false);
  const [status, setStatus] = useState<Status>(initial ? "done" : "idle");
  const [candidates, setCandidates] = useState<KbliCandidate[]>(initial?.candidates ?? []);
  const [selected, setSelected] = useState<string | null>(initial?.kbli.kode ?? null);

  const words = countWords(description);
  const tooShort = words < MIN_DESCRIPTION_WORDS;
  const showError = touched && tooShort;

  async function analyze() {
    setTouched(true);
    if (tooShort) return;
    setStatus("loading");
    setSelected(null);
    try {
      const result = await matchKbli(description);
      setCandidates(result);
      setSelected(result[0]?.kode ?? null);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  function proceed() {
    const kbli = candidates.find((c) => c.kode === selected);
    if (!kbli) return;
    onConfirm({ description: description.trim(), kbli, candidates });
    router.push("/dashboard");
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-6 space-y-6">
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
          mencocokkan ke kode KBLI {KBLI_VERSION} resmi dari BPS & OSS.
        </p>
      </div>

      <form
        className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          analyze();
        }}
        noValidate
      >
        <div className="space-y-2">
          <label
            htmlFor={descriptionId}
            className="text-sm font-semibold text-foreground flex items-center justify-between"
          >
            <span>Deskripsi Usaha</span>
            <span
              className={cn(
                "text-xs font-normal tabular-nums",
                showError ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {words} / min. {MIN_DESCRIPTION_WORDS} kata
            </span>
          </label>
          <textarea
            id={descriptionId}
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => description && setTouched(true)}
            aria-invalid={showError}
            aria-describedby={hintId}
            disabled={status === "loading"}
            className={cn(
              "w-full rounded-lg border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 disabled:opacity-60",
              showError
                ? "border-destructive focus:ring-destructive/20"
                : "border-input focus:border-primary focus:ring-primary/20",
            )}
            placeholder="Contoh: Saya jualan katering nasi boks rumahan untuk acara kantor dan arisan..."
          />
          <p
            id={hintId}
            className={cn("text-xs", showError ? "text-destructive" : "text-muted-foreground")}
          >
            {showError
              ? `Ceritakan sedikit lagi. Butuh minimal ${MIN_DESCRIPTION_WORDS} kata (kurang ${MIN_DESCRIPTION_WORDS - words}).`
              : "Sebutkan apa yang dijual, cara membuatnya, dan di mana menjualnya."}
          </p>
        </div>

        <div className="space-y-1.5">
          <span className="text-xs text-muted-foreground">Contoh cepat:</span>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                type="button"
                disabled={status === "loading"}
                onClick={() => {
                  setDescription(ex.text);
                  setTouched(false);
                }}
                className="rounded-full border border-border bg-muted/60 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer disabled:opacity-60"
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>

        <Button type="submit" size="lg" className="w-full h-12 gap-2" disabled={status === "loading"}>
          {status === "loading" ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Menganalisis usaha Anda…</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>{status === "done" ? "Analisis Ulang" : "Analisis Kode KBLI Saya"}</span>
            </>
          )}
        </Button>
      </form>

      <section aria-live="polite" aria-busy={status === "loading"} className="space-y-3">
        {status === "loading" && <ResultsSkeleton />}

        {status === "error" && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p>Gagal menganalisis deskripsi usaha. Periksa koneksi lalu coba lagi.</p>
              <Button type="button" variant="outline" size="sm" onClick={analyze}>
                Coba Lagi
              </Button>
            </div>
          </div>
        )}

        {status === "done" && candidates.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">
                Hasil Rekomendasi KBLI {KBLI_VERSION}
              </h2>
              <span className="text-xs text-muted-foreground">
                {candidates.length} Kandidat Ditemukan
              </span>
            </div>

            <div role="radiogroup" aria-label={`Pilih kode KBLI ${KBLI_VERSION}`} className="space-y-3">
              {candidates.map((c, i) => (
                <KbliCard
                  key={c.kode}
                  candidate={c}
                  rank={i}
                  checked={selected === c.kode}
                  onSelect={() => setSelected(c.kode)}
                />
              ))}
            </div>

            <p className="text-center pt-1 text-xs text-muted-foreground inline-flex w-full items-center justify-center gap-1.5">
              <Search className="w-3.5 h-3.5" />
              <span>Kode KBLI tidak pas? Tambahkan detail usaha lalu analisis ulang.</span>
            </p>

            <div className="pt-2">
              <Button
                type="button"
                size="lg"
                className="w-full h-13 font-bold text-sm sm:text-base gap-2"
                disabled={!selected}
                onClick={proceed}
              >
                <span>Gunakan KBLI Ini & Susun Checklist Kepatuhan</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}
      </section>

      <DisclaimerBanner />
    </div>
  );
}

function confidenceLabel(confidence: number) {
  if (confidence >= 0.85) return "Sangat Cocok";
  if (confidence >= 0.6) return "Cukup Cocok";
  return "Kurang Cocok";
}

const RISK_LABEL: Record<KbliCandidate["risk_tier"], string> = {
  rendah: "Risiko Rendah",
  "menengah rendah": "Risiko Menengah Rendah",
  "menengah tinggi": "Risiko Menengah Tinggi",
  tinggi: "Risiko Tinggi",
};

function KbliCard({
  candidate,
  rank,
  checked,
  onSelect,
}: {
  candidate: KbliCandidate;
  rank: number;
  checked: boolean;
  onSelect: () => void;
}) {
  const pct = Math.round(candidate.confidence * 100);
  const strong = candidate.confidence >= 0.85;

  return (
    <label
      className={cn(
        "block cursor-pointer rounded-xl bg-card p-4 space-y-2 transition-colors",
        checked
          ? "border-2 border-primary shadow-sm"
          : "border border-border hover:border-primary/40",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold",
                strong
                  ? "bg-emerald-100 border-emerald-300 text-emerald-800"
                  : "bg-muted border-transparent text-muted-foreground font-medium",
              )}
            >
              {strong && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
              Kecocokan {pct}%{rank === 0 ? ` (${confidenceLabel(candidate.confidence)})` : ""}
            </span>
            <span className="inline-block rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
              {RISK_LABEL[candidate.risk_tier]}
            </span>
          </div>
          <h3 className={cn("text-foreground", checked ? "text-base font-bold" : "text-sm font-semibold")}>
            KBLI {candidate.kode}: {candidate.judul}
          </h3>
        </div>
        <input
          type="radio"
          name="selectedKbli"
          value={candidate.kode}
          checked={checked}
          onChange={onSelect}
          className="w-5 h-5 mt-0.5 shrink-0 accent-primary"
        />
      </div>
      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{candidate.deskripsi}</p>
    </label>
  );
}

function ResultsSkeleton() {
  return (
    <div className="space-y-3" aria-label="Memuat rekomendasi KBLI">
      <p className="text-sm text-muted-foreground flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        AI sedang mencocokkan deskripsi dengan katalog KBLI {KBLI_VERSION}…
      </p>
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-2 animate-pulse">
          <div className="h-4 w-32 rounded-full bg-muted" />
          <div className="h-4 w-3/4 rounded bg-muted" />
          <div className="h-3 w-full rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
