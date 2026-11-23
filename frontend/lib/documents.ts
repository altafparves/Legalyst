import { getApiUrl } from "@/lib/api";

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
    title: "Formulir Komitmen Higienitas & Sanitasi P-IRT",
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

// Stub sampai endpoint generate dokumen (backend + Supabase Storage) tersedia.
// Tanpa NEXT_PUBLIC_API_BASE_URL, hanya mensimulasikan proses dan tidak mengunduh berkas.
// Dengan API: POST /api/v1/documents/{id}/pdf dan POST /api/v1/documents/zip
// (path dan body masih usulan, sesuaikan dengan kontrak backend).
export async function downloadDocument(doc: GeneratedDocument, kbliCode: string): Promise<void> {
  if (!apiConfigured) {
    await stubDelay(1200);
    return;
  }
  await fetchAndSave(`/api/v1/documents/${doc.id}/pdf`, doc.filename, { kbli: kbliCode });
}

export async function downloadAllDocuments(kbliCode: string): Promise<void> {
  if (!apiConfigured) {
    await stubDelay(1800);
    return;
  }
  await fetchAndSave("/api/v1/documents/zip", ZIP_FILENAME, {
    kbli: kbliCode,
    ids: DOCUMENTS.map((d) => d.id),
  });
}
