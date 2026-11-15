"use client";

import "./wireframe.css";
import { useMemo, useState } from "react";
import { AlertTriangle, Building2, Check, ChevronRight, ClipboardCheck, Download, FileText, HelpCircle, LayoutDashboard, LogOut, Search, ShieldCheck } from "lucide-react";

type View = "checklist" | "documents";
type Filter = "all" | "pending" | "done";

const obligations = [
  { id: 1, category: "Perizinan usaha", title: "Pastikan NIB usaha masih aktif", description: "Cocokkan data usaha dan status NIB melalui akun OSS milik usaha Anda.", citation: "PP No. 5 Tahun 2021, Pasal 176", manual: false, done: true },
  { id: 2, category: "Ketenagakerjaan", title: "Daftarkan pekerja ke BPJS Ketenagakerjaan", description: "Pastikan semua pekerja aktif sudah terdaftar dan data upahnya sesuai.", citation: "UU No. 24 Tahun 2011, Pasal 15 ayat (1)", manual: true, done: false },
  { id: 3, category: "Perpajakan", title: "Periksa kewajiban pelaporan SPT Masa", description: "Periksa jenis pajak yang berlaku dan tenggat pelaporan pada akun pajak usaha.", citation: "PMK No. 81 Tahun 2024, Pasal 94", manual: true, done: false },
  { id: 4, category: "Perlindungan konsumen", title: "Cantumkan informasi produk dengan jelas", description: "Tampilkan komposisi, harga, dan informasi penting lain yang mudah dibaca konsumen.", citation: "UU No. 8 Tahun 1999, Pasal 7 huruf b", manual: false, done: false },
];

const documents = [
  { name: "Ringkasan Kepatuhan Usaha", meta: "Contoh PDF · Ringkasan", kind: "Ringkasan" },
  { name: "Checklist Kewajiban Lengkap", meta: "Contoh PDF · Checklist", kind: "Checklist" },
  { name: "Daftar Referensi Regulasi", meta: "Contoh PDF · Referensi", kind: "Referensi" },
];

function buildPdf(name: string) {
  const safeName = name.replace(/[()\\]/g, "");
  const content = `BT /F1 18 Tf 72 740 Td (Legalyst) Tj 0 -32 Td /F1 12 Tf (${safeName}) Tj 0 -24 Td (Dokumen contoh untuk wireframe.) Tj ET`;
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >> endobj",
    `4 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) { offsets.push(pdf.length); pdf += `${object}\n`; }
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return URL.createObjectURL(new Blob([pdf], { type: "application/pdf" }));
}

export default function Home() {
  const [view, setView] = useState<View>("checklist");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [checked, setChecked] = useState(() => new Set(obligations.filter((item) => item.done).map((item) => item.id)));
  const complete = checked.size;
  const progress = Math.round((complete / obligations.length) * 100);
  const visible = useMemo(() => obligations.filter((item) => {
    const matchesStatus = filter === "all" || (filter === "done" ? checked.has(item.id) : !checked.has(item.id));
    return matchesStatus && `${item.title} ${item.description} ${item.citation}`.toLowerCase().includes(query.toLowerCase());
  }), [checked, filter, query]);

  function toggle(id: number) {
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function download(name: string) {
    const href = buildPdf(name);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `${name.toLowerCase().replaceAll(" ", "-")}.pdf`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(href), 0);
  }

  return (
    <div className="wireframe min-h-screen bg-[var(--surface-muted)] text-[var(--ink)]">
      <p className="bg-slate-100 px-5 py-2 text-center text-sm text-slate-700">Pratinjau wireframe · Data, kutipan regulasi, dan PDF merupakan contoh untuk evaluasi tampilan.</p>
      <header className="border-b border-[var(--line)] bg-white">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 lg:px-8">
          <button className="flex items-center gap-2 text-left" onClick={() => setView("checklist")} aria-label="Buka beranda Legalyst">
            <span className="grid size-9 place-items-center rounded-lg bg-[var(--brand)] text-white"><ShieldCheck className="size-5" aria-hidden /></span>
            <span className="text-lg font-bold tracking-tight">Legalyst</span>
          </button>
          <div className="flex items-center gap-3">
            <button className="hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[var(--ink-muted)] hover:bg-slate-100 sm:flex"><HelpCircle className="size-4" aria-hidden /> Bantuan</button>
            <div className="h-7 w-px bg-[var(--line)]" />
            <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium hover:bg-slate-100">
              <span className="grid size-8 place-items-center rounded-full bg-slate-200 font-semibold text-slate-700">DA</span>
              <span className="hidden sm:inline">Dapur Aruna</span><LogOut className="size-4 text-[var(--ink-muted)]" aria-hidden />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1440px] lg:grid-cols-[248px_1fr]">
        <aside className="border-b border-[var(--line)] bg-white px-4 py-4 lg:min-h-[calc(100vh-4rem)] lg:border-b-0 lg:border-r lg:py-6">
          <nav aria-label="Navigasi utama" className="flex gap-2 lg:block lg:space-y-1">
            <NavButton active={view === "checklist"} icon={<ClipboardCheck />} onClick={() => setView("checklist")}>Checklist</NavButton>
            <NavButton active={view === "documents"} icon={<FileText />} onClick={() => setView("documents")}>Dokumen</NavButton>
          </nav>
          <div className="mt-8 hidden rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] p-4 lg:block">
            <div className="flex items-center gap-2 text-sm font-semibold"><Building2 className="size-4 text-[var(--brand)]" aria-hidden /> Profil usaha</div>
            <p className="mt-3 text-sm font-medium">Dapur Aruna</p>
            <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">Restoran dan penyediaan makanan</p>
            <button className="mt-3 text-xs font-semibold text-[var(--brand-dark)] hover:underline">Lihat profil usaha</button>
          </div>
        </aside>

        <main className="min-w-0 px-5 py-8 lg:px-10 lg:py-10">
          {view === "checklist" ? (
            <ChecklistView checked={checked} complete={complete} filter={filter} progress={progress} query={query} visible={visible} onFilter={setFilter} onQuery={setQuery} onToggle={toggle} onOpenDocuments={() => setView("documents")} />
          ) : <DocumentsView onDownload={download} />}
        </main>
      </div>
    </div>
  );
}

function NavButton({ active, children, icon, onClick }: { active: boolean; children: React.ReactNode; icon: React.ReactNode; onClick: () => void }) {
  return <button onClick={onClick} aria-current={active ? "page" : undefined} className={`flex flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors lg:w-full ${active ? "bg-[var(--brand-soft)] text-[var(--brand-dark)]" : "text-[var(--ink-muted)] hover:bg-slate-100 hover:text-[var(--ink)]"}`}>{icon}{children}</button>;
}

type ChecklistProps = { checked: Set<number>; complete: number; filter: Filter; progress: number; query: string; visible: typeof obligations; onFilter: (filter: Filter) => void; onQuery: (query: string) => void; onToggle: (id: number) => void; onOpenDocuments: () => void };

function ChecklistView(props: ChecklistProps) {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-[var(--brand-dark)]">Langkah 2 dari 3</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Checklist kewajiban usaha</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--ink-muted)]">Tandai kewajiban yang sudah dipenuhi. Cek sumber regulasi jika Anda butuh konteks lebih lanjut.</p>
        </div>
        <button onClick={props.onOpenDocuments} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[var(--brand)] px-5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--brand-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2">Lihat dokumen <ChevronRight className="size-4" aria-hidden /></button>
      </div>

      <section className="mt-8 rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm sm:p-6" aria-label="Progres checklist">
        <div className="flex items-center justify-between gap-4">
          <div><p className="font-semibold">Progres Anda</p><p className="mt-1 text-sm text-[var(--ink-muted)]">{props.complete} dari {obligations.length} kewajiban selesai</p></div>
          <span className="text-2xl font-bold text-[var(--brand-dark)]">{props.progress}%</span>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={props.progress}><div className="h-full rounded-full bg-[var(--brand)] transition-[width]" style={{ width: `${props.progress}%` }} /></div>
      </section>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex rounded-lg border border-[var(--line)] bg-white p-1" aria-label="Filter checklist">
          {(["all", "pending", "done"] as const).map((value) => <button key={value} onClick={() => props.onFilter(value)} className={`rounded-md px-3 py-1.5 text-sm font-medium ${props.filter === value ? "bg-slate-900 text-white" : "text-[var(--ink-muted)] hover:bg-slate-100"}`}>{{ all: "Semua", pending: "Belum selesai", done: "Selesai" }[value]}</button>)}
        </div>
        <label className="relative block sm:w-72"><span className="sr-only">Cari kewajiban</span><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" aria-hidden /><input value={props.query} onChange={(event) => props.onQuery(event.target.value)} placeholder="Cari kewajiban..." className="h-10 w-full rounded-lg border border-[var(--line-strong)] bg-white pl-9 pr-3 text-sm outline-none placeholder:text-slate-500 focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]" /></label>
      </div>

      <section className="mt-4 space-y-3" aria-live="polite">
        {props.visible.map((item) => {
          const done = props.checked.has(item.id);
          return (
            <article key={item.id} className={`rounded-xl border bg-white p-5 shadow-sm transition-colors sm:p-6 ${done ? "border-emerald-200" : "border-[var(--line)]"}`}>
              <div className="flex items-start gap-4">
                <button onClick={() => props.onToggle(item.id)} aria-label={`${done ? "Tandai belum selesai" : "Tandai selesai"}: ${item.title}`} className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 ${done ? "border-emerald-700 bg-emerald-700 text-white" : "border-slate-400 bg-white hover:border-[var(--brand)]"}`}>{done && <Check className="size-4" strokeWidth={3} aria-hidden />}</button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{item.category}</span>{item.manual && <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900"><AlertTriangle className="size-3.5" aria-hidden /> Perlu verifikasi manual</span>}</div>
                  <h2 className={`mt-3 text-base font-semibold sm:text-lg ${done ? "text-slate-500 line-through" : ""}`}>{item.title}</h2>
                  <p className="mt-1.5 text-sm leading-6 text-[var(--ink-muted)]">{item.description}</p>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--brand-dark)]"><FileText className="size-4" aria-hidden /> {item.citation}</span>
                </div>
              </div>
            </article>
          );
        })}
        {props.visible.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-[var(--ink-muted)]">Tidak ada kewajiban yang cocok dengan pencarian ini.</div>}
      </section>
    </div>
  );
}

function DocumentsView({ onDownload }: { onDownload: (name: string) => void }) {
  return (
    <div className="mx-auto max-w-5xl">
      <p className="text-sm font-semibold text-[var(--brand-dark)]">Langkah 3 dari 3</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Dokumen Anda</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--ink-muted)]">Unduh hasil pemetaan kewajiban usaha Anda. Dokumen ini membantu persiapan, tetapi bukan pengganti nasihat hukum.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-3"><StatCard label="Dokumen tersedia" value="3" icon={<FileText />} /><StatCard label="Kewajiban dipetakan" value="4" icon={<ClipboardCheck />} /><StatCard label="Terakhir diperbarui" value="Hari ini" icon={<LayoutDashboard />} /></div>
      <section className="mt-6 overflow-hidden rounded-xl border border-[var(--line)] bg-white shadow-sm">
        <div className="border-b border-[var(--line)] px-5 py-4 sm:px-6"><h2 className="font-semibold">PDF yang sudah dibuat</h2><p className="mt-1 text-sm text-[var(--ink-muted)]">3 dokumen siap diunduh</p></div>
        <div className="divide-y divide-[var(--line)]">
          {documents.map((document) => <article key={document.name} className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
            <div className="flex min-w-0 flex-1 items-center gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-lg bg-red-50 text-red-700"><FileText className="size-5" aria-hidden /></span><div className="min-w-0"><h3 className="truncate font-semibold">{document.name}</h3><p className="mt-1 text-sm text-[var(--ink-muted)]">{document.meta}</p></div></div>
            <span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{document.kind}</span>
            <button onClick={() => onDownload(document.name)} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[var(--line-strong)] bg-white px-4 text-sm font-semibold hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2"><Download className="size-4" aria-hidden /> Unduh PDF</button>
          </article>)}
        </div>
      </section>
      <div className="mt-6 flex gap-3 rounded-xl border border-blue-200 bg-blue-50 p-5 text-sm leading-6 text-blue-950"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-[var(--brand)]" aria-hidden /><p><strong>Catatan:</strong> Peraturan dapat berubah. Selalu periksa kembali informasi berlabel “Perlu verifikasi manual” melalui sumber resmi atau tenaga profesional.</p></div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <div className="rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm"><div className="flex items-center justify-between text-[var(--ink-muted)]"><span className="text-sm font-medium">{label}</span>{icon}</div><p className="mt-3 text-2xl font-bold">{value}</p></div>;
}
