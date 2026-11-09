"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  FileText,
  Loader2,
  Sparkles,
} from "lucide-react";

import { useBusinessProfile } from "@/components/business-profile-provider";
import { CitationBadge } from "@/components/citation-badge";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { Button, buttonVariants } from "@/components/ui/button";
import { KBLI_VERSION, fetchChecklist, type Obligation } from "@/lib/compliance";
import { cn } from "@/lib/utils";

type Status = "loading" | "done" | "error";

const TRACK_LABEL: Record<Obligation["track"], string> = {
  OSS: "Perizinan OSS",
  PIRT: "Pangan Olahan",
  HALAL: "Sertifikasi Halal",
  SPT: "Perpajakan",
};

export function ComplianceChecklist() {
  const { profile, hydrated } = useBusinessProfile();
  const [status, setStatus] = useState<Status>("loading");
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [done, setDone] = useState<Set<string>>(new Set());

  const kode = profile?.kbli.code;
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!kode) return;
    let cancelled = false;
    fetchChecklist(kode).then(
      (result) => {
        if (cancelled) return;
        setObligations(result);
        setStatus("done");
      },
      () => {
        if (!cancelled) setStatus("error");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [kode, attempt]);

  function retry() {
    setStatus("loading");
    setAttempt((n) => n + 1);
  }

  if (!hydrated) return <PageShell />;

  if (!profile) {
    return (
      <PageShell>
        <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center space-y-3">
          <Building2 className="w-8 h-8 mx-auto text-muted-foreground" />
          <h1 className="text-lg font-bold text-foreground">Profil usaha belum diisi</h1>
          <p className="text-sm text-muted-foreground">
            Ceritakan usaha Anda dan pilih kode KBLI dulu, lalu checklist kepatuhan akan disusun
            otomatis.
          </p>
          <Link href="/onboarding" className={buttonVariants({ size: "lg", className: "w-full sm:w-auto" })}>
            Isi Profil Usaha
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </PageShell>
    );
  }

  const required = obligations.filter((o) => !o.needs_manual_verification).length;
  const toVerify = obligations.length - required;

  function toggle(id: string) {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <PageShell>
      {/* Ringkasan profil usaha */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-sm text-foreground">
                KBLI {profile.kbli.code}: {profile.kbli.title}
              </span>
              <span className="rounded-md bg-blue-100 text-blue-800 px-1.5 py-0.5 text-xs font-bold">
                Usaha Mikro
              </span>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-1">{profile.description}</p>
          </div>
        </div>
        <Link
          href="/onboarding"
          className="inline-flex min-h-11 min-w-11 items-center justify-center text-xs text-primary font-semibold hover:underline shrink-0 px-2"
        >
          Ubah
        </Link>
      </div>

      <DisclaimerBanner />

      {status === "loading" && <ChecklistLoading />}

      {status === "error" && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p>Checklist gagal disusun. Periksa koneksi lalu coba lagi.</p>
            <Button type="button" variant="outline" size="sm" onClick={retry}>
              Coba Lagi
            </Button>
          </div>
        </div>
      )}

      {status === "done" && (
        <>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-foreground">
                Daftar Kewajiban Hukum & Sertifikasi
              </h1>
              <p className="text-xs text-muted-foreground">
                {done.size} dari {obligations.length} sudah Anda tandai selesai
              </p>
            </div>
            <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-1 text-xs font-bold shrink-0">
              {required} Wajib{toVerify > 0 ? ` • ${toVerify} Verifikasi` : ""}
            </span>
          </div>

          <ul className="space-y-3.5">
            {obligations.map((o) => (
              <ObligationCard
                key={o.obligation_id}
                obligation={o}
                checked={done.has(o.obligation_id)}
                onToggle={() => toggle(o.obligation_id)}
              />
            ))}
          </ul>

          <div className="pt-2">
            <Link
              href="/documents"
              className={buttonVariants({
                size: "lg",
                className: "w-full h-13 font-bold text-sm sm:text-base",
              })}
            >
              <FileText className="w-4 h-4" />
              <span>Generate Dokumen Kepatuhan Saya</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </>
      )}
    </PageShell>
  );
}

function PageShell({ children }: { children?: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-xl px-4 py-6 space-y-6">{children}</div>;
}

function ObligationCard({
  obligation: o,
  checked,
  onToggle,
}: {
  obligation: Obligation;
  checked: boolean;
  onToggle: () => void;
}) {
  const warn = o.needs_manual_verification;
  const inputId = `obligation-${o.obligation_id}`;

  return (
    <li
      className={cn(
        "rounded-xl border p-4 shadow-xs space-y-2.5 transition-colors",
        warn
          ? "border-amber-300 bg-amber-50/40"
          : "border-border bg-card hover:border-primary/40",
        checked && "opacity-70",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            {warn ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                Perlu Verifikasi Manual
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Wajib • {TRACK_LABEL[o.track]}
              </span>
            )}
            <CitationBadge citation={o.citation} />
          </div>
          <label
            htmlFor={inputId}
            className={cn(
              "block text-sm sm:text-base font-bold cursor-pointer",
              warn ? "text-amber-950" : "text-foreground",
              checked && "line-through",
            )}
          >
            {o.title}
          </label>
        </div>
        <label className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center -mt-2.5 -mr-2.5">
          <input
            id={inputId}
            type="checkbox"
            checked={checked}
            onChange={onToggle}
            aria-label={`Tandai selesai: ${o.title}`}
            className={cn(
              "w-5 h-5 mt-0.5 rounded-sm shrink-0",
              warn ? "accent-amber-600" : "accent-primary",
            )}
          />
        </label>
      </div>
      <p
        className={cn(
          "text-xs sm:text-sm leading-relaxed",
          warn ? "text-amber-900" : "text-muted-foreground",
        )}
      >
        {o.requirement_text}
      </p>
      <p className="text-xs text-muted-foreground">
        Instansi: {o.issuing_agency}
        {o.source_url && (
          <>
            {" • "}
            <a href={o.source_url} target="_blank" rel="noreferrer" className="underline">
              Lihat regulasi
            </a>
          </>
        )}
      </p>
    </li>
  );
}

const LOADING_STEPS = [
  "Membaca profil usaha & kode KBLI",
  "Mencocokkan aturan OSS-RBA, P-IRT, Halal & pajak",
  "Menyusun checklist beserta sitasi regulasi",
];

function ChecklistLoading() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1)), 600);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      aria-live="polite"
      aria-busy="true"
      className="rounded-xl border border-border bg-card p-5 space-y-4"
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Sparkles className="w-4 h-4 text-primary" />
        Menyusun checklist kepatuhan untuk KBLI {KBLI_VERSION} Anda…
      </div>
      <ol className="space-y-2">
        {LOADING_STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-2 text-xs sm:text-sm">
            {i < step ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : i === step ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
            ) : (
              <span className="w-4 h-4 rounded-full border border-border shrink-0" />
            )}
            <span className={i <= step ? "text-foreground" : "text-muted-foreground"}>{label}</span>
          </li>
        ))}
      </ol>
      <p className="text-xs text-muted-foreground">Biasanya selesai kurang dari 10 detik.</p>
    </div>
  );
}
