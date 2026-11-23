import { getApiUrl } from "@/lib/api";
import { buildSamplePdf, buildZip } from "@/lib/sample-files";

export type GeneratedDocument = {
  id: string;
  title: string;
  issuer: string;
  badgeColor: string;
  size: string;
  /** Deskripsi singkat; {kbli} diganti kode KBLI terpilih. */
  desc: string;
  filename: string;
};

export const DOCUMENTS: GeneratedDocument[] = [
  {
    id: "doc-1",
    title: "Surat Pernyataan Mandiri Usaha Mikro (OSS-RBA)",
    issuer: "Standar BKPM / OSS-RBA",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    size: "245 KB",
    desc: "Format baku pernyataan pemenuhan tata ruang dan lingkungan hidup untuk terbitnya NIB. Sudah terisi KBLI {kbli}.",
    filename: "surat-pernyataan-mandiri.pdf",
  },
  {
    id: "doc-2",
    title: "Formulir Komitmen Higienitas & Sanitasi SPP-IRT",
    issuer: "Standar Dinas Kesehatan",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    size: "180 KB",
    desc: "Draft komitmen tata letak dapur dan SOP kebersihan produksi untuk usaha KBLI {kbli}.",
    filename: "komitmen-sanitasi-pirt.pdf",
  },
  {
    id: "doc-3",
    title: "Surat Ikrar Bebas Bahan Kritis (Halal Self-Declare)",
    issuer: "Standar BPJPH Kemenag",
    badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
    size: "310 KB",
    desc: "Pernyataan mandiri bebas bahan haram/najis untuk pendaftaran sertifikasi halal (self-declare).",
    filename: "ikrar-halal-self-declare.pdf",
  },
];

export const ZIP_FILENAME = "dokumen-kepatuhan-legalyst.zip";

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function fetchAndSave(path: string, filename: string, body: unknown) {
  const response = await fetch(getApiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Download gagal dengan status ${response.status}`);
  }
  saveBlob(await response.blob(), filename);
}

const apiConfigured = Boolean(process.env.NEXT_PUBLIC_API_BASE_URL);
const stubDelay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type KbliInfo = { code: string; title: string };

function samplePdf(doc: GeneratedDocument, kbli: KbliInfo): Uint8Array {
  return buildSamplePdf({
    title: doc.title,
    issuer: doc.issuer,
    kbliCode: kbli.code,
    kbliTitle: kbli.title,
    body: doc.desc.replace("{kbli}", kbli.code),
  });
}

function asBlob(bytes: Uint8Array, type: string): Blob {
  return new Blob([bytes as BlobPart], { type });
}

// Fallback sisi klien: tanpa NEXT_PUBLIC_API_BASE_URL, berkas contoh dibuat di browser
// (PDF sederhana bertanda "CONTOH"). Dengan API (endpoint Minggu 2; path dan body masih
// usulan, sesuaikan dengan kontrak backend): POST /api/v1/documents/{id}/pdf dan
// POST /api/v1/documents/zip.
export async function downloadDocument(doc: GeneratedDocument, kbli: KbliInfo): Promise<void> {
  if (!apiConfigured) {
    await stubDelay(1200);
    saveBlob(asBlob(samplePdf(doc, kbli), "application/pdf"), doc.filename);
    return;
  }
  await fetchAndSave(`/api/v1/documents/${doc.id}/pdf`, doc.filename, { kbli: kbli.code });
}

export async function downloadAllDocuments(kbli: KbliInfo): Promise<void> {
  if (!apiConfigured) {
    await stubDelay(1800);
    const zip = buildZip(
      DOCUMENTS.map((doc) => ({ name: doc.filename, data: samplePdf(doc, kbli) })),
    );
    saveBlob(asBlob(zip, "application/zip"), ZIP_FILENAME);
    return;
  }
  await fetchAndSave("/api/v1/documents/zip", ZIP_FILENAME, {
    kbli: kbli.code,
    ids: DOCUMENTS.map((d) => d.id),
  });
}
