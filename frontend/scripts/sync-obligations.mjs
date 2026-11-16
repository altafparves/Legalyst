// Mengubah data/obligations_oss.csv (korpus #13) menjadi lib/data/obligations-oss.json
// agar Screen 2 bisa memakai kewajiban dan sitasi asli sebelum endpoint backend siap.
// Jalankan ulang setiap kali CSV berubah: npm run sync:obligations
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(here, "../../data/obligations_oss.csv");
const OUT = resolve(here, "../lib/data/obligations-oss.json");

// CSV belum punya kolom judul singkat, jadi judul untuk kartu checklist ditulis di sini.
const TITLES = {
  "OSS-001": "Daftar NIB di Sistem OSS-RBA",
  "OSS-002": "Pernyataan SPPL yang menyatu dengan NIB",
  "OSS-003": "Pernyataan Mandiri K3L",
  "OSS-004": "NIB dan Sertifikat Standar (pernyataan mandiri)",
  "OSS-005": "Isi formulir SPPL di Sistem OSS",
  "OSS-006": "NIB dan Sertifikat Standar belum terverifikasi",
  "OSS-007": "Verifikasi Sertifikat Standar sebelum beroperasi",
  "OSS-008": "NIB untuk tahap persiapan usaha",
  "OSS-009": "Izin resmi sebelum beroperasi",
  "OSS-010": "Pernyataan kesesuaian tata ruang (KKPR)",
  "OSS-011": "Kepesertaan BPJS dan laporan WLKP",
  "OSS-012": "Laporan LKPM setiap 6 bulan",
  "OSS-013": "Pengecualian LKPM untuk usaha mikro",
  "OSS-014": "Penilaian mandiri standar usaha pariwisata",
  "OSS-015": "Sertifikat Standar Usaha Restoran",
  "OSS-016": "Sertifikat Laik Higiene Sanitasi (SLHS)",
  "OSS-017": "Standar usaha jasa boga dan SLHS",
  "OSS-018": "Penyuluhan keamanan pangan dan label HSP",
  "OSS-019": "Laporan kegiatan usaha perdagangan",
  "OSS-020": "Ketentuan toko swalayan (minimarket)",
  "OSS-021": "Izin SIUPMSE untuk perdagangan elektronik",
  "OSS-022": "Akun SIINas dan laporan data industri",
  "OSS-023": "SOP produksi pangan sesuai CPPOB",
  "OSS-024": "SIINas, SOP, dan keamanan produksi",
  "OSS-025": "Verifikasi persyaratan teknis lewat SIINas",
  "OSS-026": "Persyaratan izin industri lewat SIINas",
  "OSS-027": "SLHS Depot Air Minum",
  "OSS-028": "Izin CPPOB dan izin edar BPOM MD",
};

/** Parser CSV kecil (RFC 4180: kutip ganda, koma dan baris baru di dalam kutip). */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((v) => v !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((v) => v !== "")) rows.push(row);
  return rows;
}

const list = (v) => v.split(",").map((s) => s.trim()).filter(Boolean);

const [header, ...body] = parseCsv(readFileSync(SRC, "utf8").replace(/^﻿/, ""));
const out = body.map((cells) => {
  const r = Object.fromEntries(header.map((h, i) => [h.trim(), (cells[i] ?? "").trim()]));
  const title = TITLES[r.obligation_id];
  if (!title) throw new Error(`Judul untuk ${r.obligation_id} belum ada di TITLES`);
  if (!r.source_url) throw new Error(`${r.obligation_id} tidak punya source_url`);
  return {
    obligation_id: r.obligation_id,
    track: r.track,
    title,
    kbli_scope: r.kbli_scope === "ALL" ? "ALL" : list(r.kbli_scope),
    business_scale: r.business_scale === "ALL" ? "ALL" : list(r.business_scale),
    risk_tier: r.risk_tier,
    requirement_text: r.requirement_text,
    issuing_agency: r.issuing_agency,
    source_url: r.source_url,
    source_article: r.source_article,
    notes: r.notes,
  };
});

writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
console.log(`Wrote ${out.length} obligations to ${OUT}`);
