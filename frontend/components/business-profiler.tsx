"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Loader2, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  matchErrorMessage,
  matchKbli,
  type KbliCandidate,
} from "@/lib/profiler";

const MIN_WORDS = 10;

const EXAMPLES = [
  "Keripik & Camilan Rumahan",
  "Kedai Kopi & Minuman",
  "Katering Rumahan",
  "Warung Kelontong",
];

const EXAMPLE_TEXT: Record<string, string> = {
  "Keripik & Camilan Rumahan":
    "Saya memproduksi keripik pisang aneka rasa dari dapur rumah dan menjualnya ke warung sekitar serta toko oleh-oleh. Ada 2 pekerja.",
  "Kedai Kopi & Minuman":
    "Saya punya kedai kopi kecil yang menjual kopi seduh dan minuman dingin langsung ke pelanggan, dengan 2 karyawan.",
  "Katering Rumahan":
    "Saya menjual katering nasi boks rumahan untuk acara kantor dan arisan, dimasak sendiri di dapur rumah.",
  "Warung Kelontong":
    "Saya membuka warung kelontong yang menjual sembako dan makanan ringan kemasan kepada warga sekitar.",
};

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function BusinessProfiler() {
  const [description, setDescription] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<KbliCandidate[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  function updateDescription(value: string) {
    setDescription(value);
    setFieldError(null);
    setSubmitError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    if (countWords(description) < MIN_WORDS) {
      setFieldError(`Deskripsi minimal ${MIN_WORDS} kata.`);
      return;
    }

    setPending(true);
    setSubmitError(null);
    try {
      const result = await matchKbli(description.trim());
      setCandidates(result.candidates);
      setSelected(result.candidates[0]?.code ?? null);
    } catch (error) {
      setCandidates(null);
      setSelected(null);
      setSubmitError(matchErrorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-xs sm:p-5"
      >
        <div className="space-y-2">
          <label
            htmlFor="description"
            className="flex items-center justify-between text-sm font-semibold text-foreground"
          >
            <span>Deskripsi Usaha</span>
            <span className="text-xs font-normal text-muted-foreground">
              Min. {MIN_WORDS} kata
            </span>
          </label>
          <textarea
            id="description"
            name="description"
            rows={5}
            value={description}
            onChange={(event) => updateDescription(event.target.value)}
            disabled={pending}
            aria-invalid={fieldError ? true : undefined}
            aria-describedby={fieldError ? "description-error" : undefined}
            placeholder="Contoh: Saya jualan katering nasi boks rumahan untuk acara kantor dan arisan..."
            className="w-full resize-y rounded-lg border border-input bg-background p-3 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20 disabled:opacity-60 aria-invalid:border-red-500 sm:text-sm"
          />
          {fieldError && (
            <p id="description-error" className="text-sm text-red-600">
              {fieldError}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <span className="text-xs text-muted-foreground">Contoh cepat:</span>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((chip) => (
              <button
                key={chip}
                type="button"
                disabled={pending}
                onClick={() => updateDescription(EXAMPLE_TEXT[chip])}
                className="inline-flex min-h-11 items-center rounded-full border border-border bg-muted/60 px-3.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-xs transition-all hover:bg-primary/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Sparkles className="h-4 w-4" aria-hidden />
          )}
          <span>{pending ? "Menganalisis..." : "Analisis Kode KBLI Saya"}</span>
        </button>

        <p role="alert" className="text-sm text-red-600 empty:hidden">
          {submitError}
        </p>
      </form>

      {candidates && (
        <section className="space-y-3" aria-live="polite">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold text-foreground">
              Hasil Rekomendasi KBLI
            </h2>
            <span className="text-xs text-muted-foreground">
              {candidates.length} Kandidat Ditemukan
            </span>
          </div>

          <div role="radiogroup" aria-label="Kandidat kode KBLI" className="space-y-3">
            {candidates.map((candidate, index) => {
              const isSelected = selected === candidate.code;
              const percent = Math.round(candidate.confidence * 100);

              return (
                <label
                  key={candidate.code}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border bg-card p-4 transition-colors",
                    isSelected ? "border-2 border-primary shadow-sm" : "border-border hover:border-primary/40",
                  )}
                >
                  <input
                    type="radio"
                    name="selectedKbli"
                    value={candidate.code}
                    checked={isSelected}
                    onChange={() => setSelected(candidate.code)}
                    className="mt-1 h-5 w-5 shrink-0 accent-primary"
                  />
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold",
                          index === 0
                            ? "border border-emerald-300 bg-emerald-100 text-emerald-800"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {index === 0 && <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />}
                        Kecocokan {percent}%
                      </span>
                      <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium capitalize text-muted-foreground">
                        Risiko {candidate.risk}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">
                      KBLI {candidate.code}: {candidate.title}
                    </h3>
                    <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                      {candidate.description}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>

          <Link
            href="/dashboard"
            aria-disabled={!selected}
            className={cn(
              "flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-center text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90",
              !selected && "pointer-events-none opacity-50",
            )}
          >
            <span>Gunakan KBLI Ini & Susun Checklist</span>
            <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
          </Link>
        </section>
      )}
    </>
  );
}
