# Review Desain Stitch — Legalyst

- Project Stitch: `2697470425528243077` (8 screen = 4 screen unik × 2 varian tema)
- Reviewer: Claude (design judge, mode read-only) · Tanggal: 2026-10-16
- Bukti: `docs/design/stitch-export/` (HTML + screenshot 780px = 2× lebar 390px)
- Basis acuan: `README.md` (FR 1–11, use case, wireframe lo-fi), `docs/schema.md`, `docs/assets/Legalyst Use Case Diagram.png`. Tidak ada file PRD terpisah di repo; README dianggap PRD. Wireframe lo-fi PDF tidak dibuka, hanya deskripsi di README.

**Peta file → screen**

| Screen | Varian terang | Varian gelap |
|---|---|---|
| S1 Beranda Usaha | `08-beranda-993ca709` | `06-beranda-f9d992ba` |
| S2 Katalog Layanan Legalitas | `03-katalog-4cfdd3fe` | `05-katalog-e71b038a` |
| S3 Pantau Status Perizinan (tab "Proses") | `01-pantau-baf26147` | `04-pantau-6d6b4175` |
| S4 Konsultasi Gratis UMKM (tab "Konsul Gratis") | `07-konsultasi-e01c0f9a` | `02-konsultasi-02470efe` |

Catatan: file `02` berlatar gelap tetapi memakai konfigurasi font Playfair, jadi pasangan terang/gelapnya tidak persis sama font-nya dengan yang lain. Ini bagian dari temuan konsistensi.

---

## 1. Ringkasan

1. Desain ini **bukan desain untuk 3 fitur P0**. Tidak ada screen onboarding/profiler KBLI, compliance wizard, maupun generator dokumen. 0 dari 11 FR punya UI.
2. Yang digambar adalah marketplace layanan perizinan (katalog, tracker pengajuan, konsultasi advokat). Itu fitur P1 atau di luar scope v1.
3. Tidak ada sitasi regulasi, tag "verifikasi manual", disclaimer "bukan nasihat hukum", atau state error/loading/confidence rendah di satu screen pun.
4. Ada klaim yang tidak bisa dipertanggungjawabkan (angka pengguna, advokat bernama, testimoni, "100% gratis", "terintegrasi OSS & BPJPH"). Untuk produk hukum ini risiko kepercayaan, bukan sekadar copy.
5. Komponen visual (kartu, chip, bottom nav, stepper) berkualitas dan bisa dipakai ulang. Yang perlu dibuat ulang adalah isi dan alurnya.

**Skor total: 17 / 45 (38%)**
**Verdict: PERLU REVISI BESAR.** Belum siap untuk finalisasi. Direkomendasikan re-brief ke Stitch dengan screen P0, bukan memperbaiki screen yang ada.

---

## 2. Skor per kriteria

| # | Kriteria | Skor | Alasan |
|---|---|---|---|
| 1 | Coverage | 1/5 | 0 dari 3 alur P0 punya screen. Yang ada hanya katalog layanan, tracker, konsultasi, dan beranda yang tidak sesuai PRD. |
| 2 | Kesesuaian user | 2/5 | Bahasa Indonesia hangat dan ramah ("Halo, Bu Siti!"). Tetapi NIB, KBLI, PNBP, PKP, LP3H, BRM, Sidang Fatwa MUI tidak dijelaskan, dan kepadatan teks tinggi (S3 punya ±25 blok teks per layar). |
| 3 | Mobile-first | 3/5 | Layout satu kolom pas di 390px dan tidak ada horizontal scroll tingkat halaman yang terlihat. Tetapi ada teks 9–11px, `user-scalable=no`, dan ikon aksi 32–40px (lihat §3). |
| 4 | State lengkap | 1/5 | Hanya ada empty state katalog (`search_off`), "loading" palsu `setTimeout` di S4, dan toast sukses. Tidak ada error, confidence rendah, "verifikasi manual", atau loading wizard <10 detik. |
| 5 | Kepercayaan & kejelasan | 1/5 | 0 sitasi regulasi (tidak ada "Pasal/UU/PP/Permen" di kedelapan file), 0 disclaimer. Sebaliknya ada klaim kuat yang tidak berbukti. |
| 6 | Konsistensi | 3/5 | Dalam satu tema, komponen konsisten dan berulang. Namun ada dua tema berbeda (terang: Playfair + Plus Jakarta Sans; gelap: Bodoni Moda + Hanken Grotesk) dan screen `05` memakai hex hard-coded, bukan token. |
| 7 | Aksesibilitas | 2/5 | Viewport mengunci zoom, label form nyaris tidak ada, beberapa pasangan warna di bawah AA, ukuran teks 9–11px (lihat §3). |
| 8 | Kelayakan implementasi | 3/5 | Markup Tailwind mudah dipindah. Tetapi token MD3 (±40 warna), ikon Material Symbols, dan komponen custom perlu dipetakan. Komponen yang paling dibutuhkan P0 belum ada sama sekali. |
| 9 | Kesesuaian use case & FR | 1/5 | 7 use case di diagram dan FR 1–11 tidak ada yang tercover (lihat §4). |

---

## 3. Temuan per screen

Legenda: **[DESAIN]** = masalah fungsional/kepatuhan terhadap kebutuhan. **[ESTETIKA]** = preferensi, tidak memblokir.
Yang bertanda **(perlu verifikasi)** saya simpulkan dari kode/class, belum diukur di browser.

### S1 · Beranda Usaha (`08` terang / `06` gelap)

| # | Temuan | Severity | Saran konkret |
|---|---|---|---|
| S1-1 | [DESAIN] Hero "Bereskan Legalitas Usaha Tanpa Antre & Bebas Biaya" dengan CTA "Cek Kelayakan Legalitas (2 Menit)" membuka modal 2 pertanyaan (kategori produk, punya KTP & NPWP). Ini **bukan** Smart Onboarding: tidak ada kolom deskripsi bebas (FR 1), tidak ada top-3 KBLI + confidence (FR 2), tidak ada konfirmasi/override (FR 3). | BLOCKER | Ganti modal dengan screen onboarding penuh: textarea deskripsi usaha → loading → 3 kartu kandidat KBLI → konfirmasi/override. |
| S1-2 | [DESAIN] Kartu "Skor Kesiapan Pasar Modern 65% · Tingkat 2 dari 3" tidak ada di FR/PRD, tidak jelas dihitung dari apa, dan terlihat seperti angka resmi. | MAJOR | Hapus. Ganti dengan ringkasan checklist yang bisa ditelusuri ("3 dari 7 kewajiban selesai"). |
| S1-3 | [DESAIN] "Layanan Prioritas" (Buat NIB Kilat, Sertifikat Halal, Daftar Merek, PIRT & BPOM) mengarahkan user mengajukan sendiri lewat Legalyst. Pengajuan/e-filing di luar scope v1. "Merek Dagang HAKI" juga tidak termasuk 4 kewajiban P0 (OSS-RBA/PIRT/Halal/SPT); SPT tidak muncul sama sekali. | MAJOR | Ubah jadi daftar kewajiban dari checklist yang dipersonalisasi, dengan CTA "Lihat panduan" dan "Buat dokumen". Tambahkan SPT. Hapus Merek. |
| S1-4 | [DESAIN] Bagian "Kisah Rekan UMKM" (Pak Budi, Ibu Dewi) dan "Manfaat Nyata Memiliki NIB" ("Terlindungi dari razia…") adalah testimoni dan klaim hukum yang dikarang dan tanpa sumber. | MAJOR | Hapus testimoni sebelum ada pengguna nyata. Klaim manfaat hukum wajib bersitasi atau dibuang. |
| S1-5 | [DESAIN] Header: logo gambar + teks "Legalyst…" terpotong ellipsis + badge "GRATIS" + bell + avatar berdesakan di 390px. Judul halaman ("Beranda Usaha") jadi tidak terbaca. | MINOR | Satu logo saja; badge "Gratis" dipindah/dihapus; judul halaman tidak dipotong. |
| S1-6 | [DESAIN] Teks 10–11px (`text-[10px]` ×6, `text-[11px]` ×5 di `06`) untuk chip dan label, termasuk "Gratis", "Subsidi 100%", "DJKI Kemenkumham". Di bawah 12px, berat untuk literasi rendah. | MAJOR | Minimum 12px untuk label, 14px untuk isi. |
| S1-7 | [DESAIN] Badge "Terverifikasi OSS" patah dua baris; "Tingkat 2 dari 3" patah ("3" sendirian di baris kedua). Tombol "Cek Kelayakan Legalitas (2 Menit)" patah di tengah tanda kurung. | MINOR | Beri `whitespace-nowrap`/lebar minimum, atau persingkat label. |
| S1-8 | [DESAIN] Tombol "Unduh" dan "Daftar" berbentuk pil kecil; ikon avatar/bell 32–40px (`h-8`/`h-9`/`h-10`). Tap target kemungkinan <44px **(perlu verifikasi di browser)**. | MAJOR | Pastikan area sentuh ≥44×44px (pakai padding atau `min-h-11`). |
| S1-9 | [ESTETIKA] Hero emas dengan palu hukum dan serif Bodoni/Playfair terasa "firma hukum", bukan "warung". Pilihan merek, bukan cacat. | MINOR | Opsional. |

### S2 · Katalog Layanan Legalitas (`03` terang / `05` gelap)

| # | Temuan | Severity | Saran konkret |
|---|---|---|---|
| S2-1 | [DESAIN] Katalog statis berisi 5 layanan untuk semua orang, bukan checklist personal dari KBLI + skala + lokasi (FR 4, 6). User tidak diberi tahu mana yang wajib baginya. Ini kebalikan dari nilai produk. | BLOCKER | Ganti dengan screen Compliance Checklist yang dihasilkan dari profil. Katalog, kalau dipertahankan, hanya sebagai halaman referensi. |
| S2-2 | [DESAIN] Setiap kartu (NIB, Halal, Merek, PIRT, PT Perorangan) tidak punya sitasi regulasi, padahal FR 7 mewajibkan. Hanya ada chip bebas seperti "Wajib 2024-2026", "Hanya Rp50.000 PNBP", "Bebas Retribusi", "Bebas Biaya (Subsidi BPJPH)". | BLOCKER | Tambahkan chip sitasi yang bisa diklik (format: "[nama regulasi] Pasal [nomor]", isi dari data `obligations.source_article`) yang membuka bottom sheet berisi kutipan klausul. Nominal biaya hanya ditampilkan bila bersumber (lihat Pertanyaan #6). |
| S2-3 | [DESAIN] CTA "Ajukan NIB Mandiri", "Mulai Daftar Halal", "Cek Nama & Ajukan", "Ajukan Izin P-IRT", "Pelajari & Buat Akta" menjanjikan pengajuan langsung. Bottom sheet "Akun Anda telah tersinkron dengan NIK KTP terverifikasi" dan "Buka Formulir Kilat" mengimplikasikan integrasi pemerintah. Itu e-filing, di luar scope. | MAJOR | Ubah CTA menjadi "Lihat langkah" dan "Buat dokumen draf". Hapus klaim sinkronisasi NIK. |
| S2-4 | [DESAIN] "Pendirian PT Perorangan" dan "Pendaftaran Merek" bukan kewajiban F&B/retail dalam 4 track P0. Menambah beban kognitif. | MAJOR | Hapus dari v1. |
| S2-5 | [DESAIN] Banner "32.480+ Pelaku Usaha telah melegalkan gerai" dan "Seluruh berkas digital terbit langsung dari portal sah pemerintah…" tidak berbukti. | MAJOR | Hapus. |
| S2-6 | [DESAIN] Jargon tanpa penjelasan: NIB, OSS RI, PNBP, PKP, BPJPH, DJKI, PIRT. Kartu langsung memakai singkatan. | MAJOR | Tambahkan penjelasan satu kalimat di bawah judul kartu atau komponen "Apa ini?" (tooltip/sheet). |
| S2-7 | [DESAIN] Input pencarian di `05` memakai hex hard-coded (`bg-[#0F294A]`, placeholder `#6B829E`). Placeholder ke latar ≈3.7:1, di bawah AA 4.5:1. | MINOR | Gunakan token dan naikkan kontras placeholder. |
| S2-8 | [DESAIN] Ada empty state "Layanan Belum Ditemukan" (satu-satunya state nyata). Tombol "Tampilkan Semua Layanan" bagus, tetapi tidak ada state loading atau error pencarian. | MINOR | Lengkapi skeleton dan error. |

### S3 · Pantau Status Perizinan, tab "Proses" (`01` terang / `04` gelap)

| # | Temuan | Severity | Saran konkret |
|---|---|---|---|
| S3-1 | [DESAIN] Seluruh screen adalah fitur **Tracker & Alerts (P1)** yang eksplisit di luar scope v1. Tab "Proses" mengambil satu dari empat slot navigasi bawah. | BLOCKER | Keluarkan dari v1. Ganti tab dengan "Checklist" atau "Dokumen". |
| S3-2 | [DESAIN] Klaim "OSS & BPJPH Terintegrasi — Pembaruan: Hari ini, 09:41 WIB" dan "real-time" tidak mungkin dipenuhi tanpa integrasi pemerintah yang tidak direncanakan. | MAJOR | Hapus. Bila ada nanti, tampilkan "diperbarui manual oleh Anda". |
| S3-3 | [DESAIN] Konten dikarang: "Ust. Ahmad Fauzi (LP3H Jawa Tengah)" bergambar, nomor `#HL-2026-UMKM-88412`, KBLI "10799". Pengguna bisa mengira pendamping ini nyata. | MAJOR | Hapus orang bernama; pakai data placeholder yang jelas (mis. "Contoh") di mockup. |
| S3-4 | [DESAIN] Tombol "Unduh Sertifikat NIB Lengkap (PDF)" **mirip** download PDF di FR 10–11 tetapi artinya berbeda: mengunduh sertifikat OSS, bukan draf dokumen buatan Legalyst. Di mockup ini bisa menyamarkan fitur P0 yang sebenarnya belum ada. | MAJOR | Jangan jadikan ini bukti coverage FR 10–11. Buat screen terpisah untuk dokumen hasil generate. |
| S3-5 | [DESAIN] Nama kartu terpotong ("Nomor Induk Berusaha (NIB) O…", "10799 - Industri Bumbu Masak & …"). Header: badge "Gratis" bertumpuk dengan ikon bell. | MINOR | `line-clamp` diganti wrap; rapikan header. |
| S3-6 | [DESAIN] Tahap 3 dan 4 pada stepper berwarna abu pudar (`opacity-60`) dengan teks 14px. Kontras rendah untuk informasi yang masih penting. | MINOR | Gunakan warna teks sekunder AA, bukan opacity. |
| S3-7 | [DESAIN] Teks `text-[9px]` (1 kali, mis. label "OSS Valid"). | MINOR | Naikkan ke ≥12px. |

### S4 · Konsultasi Gratis UMKM, tab "Konsul Gratis" (`07` terang / `02` gelap)

| # | Temuan | Severity | Saran konkret |
|---|---|---|---|
| S4-1 | [DESAIN] Marketplace advokat (Bambang Sudiro S.H., M.Kn., rating 4.9, "450+ UMKM Binaan") adalah fitur di luar scope dan berbeda dari positioning di README (Justika.com disebut kompetitor tidak langsung). Nama, foto, rating, dan afiliasi (Perhimpunan Advokat, Kemenparekraf) terlihat seperti orang nyata. | BLOCKER | Hapus screen. Selama advokat nyata belum ada, jangan dipublikasikan. |
| S4-2 | [DESAIN] "Tanya Cepat AI Legalyst — Rangkuman regulasi UMKM dalam 5 detik" adalah chat hukum bebas tanpa sitasi, tanpa disclaimer, dan tidak ada di FR. Teks "Memuat jawaban hukum berbasis UU Cipta Kerja & PP UMKM…" hanya `setTimeout`, bukan loading nyata. Risiko jawaban salah tanpa jejak sumber. | BLOCKER | Hapus dari v1. Kemampuan AI di P0 hanya KBLI matching dan penyusunan checklist yang bersitasi. |
| S4-3 | [DESAIN] "Tinjau Dokumen & Draft Kontrak" dengan unggah PDF/foto (maks 10MB, "Enkripsi end-to-end") adalah **Document Auditor (P1)**. Klaim E2E tidak realistis untuk 1 sprint. | MAJOR | Hapus. |
| S4-4 | [DESAIN] Klaim "100% Bebas Biaya", "Pro-Bono Nasional", "Bakti Hukum Untuk Negeri", "Respon: < 5 mnt", "Kode Etik Advokat & Kerahasiaan": komitmen layanan dan hukum yang tidak bisa dipenuhi proyek tugas akhir. | MAJOR | Hapus. |
| S4-5 | [DESAIN] Teks "Pilih berkas…" dan input pertanyaan memakai `<input>` tanpa `<label>`; hanya `placeholder`. | MINOR | Beri `<label>` atau `aria-label`. |
| S4-6 | [ESTETIKA] Kartu advokat terlalu dekoratif (rating, "Sesi Siang"). Tidak berarti banyak karena akan dihapus. | MINOR | Abaikan. |

### Lintas screen

| # | Temuan | Severity | Saran konkret |
|---|---|---|---|
| X-1 | [DESAIN] `<meta name="viewport" … maximum-scale=1.0, user-scalable=no>` di semua 8 file. Mengunci pinch-zoom, melanggar WCAG 1.4.4 (Resize Text), dan merugikan pengguna dengan penglihatan lemah. | MAJOR | Hapus `maximum-scale` dan `user-scalable=no` saat implementasi. |
| X-2 | [DESAIN] Tidak ada disclaimer "Informasi ini bukan nasihat hukum" di semua screen (grep 0/8). | BLOCKER | Footer persisten di halaman checklist/dokumen + banner di dokumen yang digenerate. |
| X-3 | [DESAIN] Bottom nav: Beranda / Layanan / **Proses** / **Konsul Gratis**. Struktur navigasi tidak mewakili alur P0 (Profil → Checklist → Dokumen) dan menyimpang dari wireframe lo-fi (Profil Bisnis, Compliance Wizard, Dokumen, Pengingat). | MAJOR | Ganti ke: Beranda · Checklist · Dokumen · Profil. |
| X-4 | [DESAIN] Dua tema (terang dan gelap) dengan pasangan font berbeda di tiap screen. Tidak ada keputusan mana yang kanonik. | MAJOR | Pilih satu untuk v1 (rekomendasi: terang). Lihat Pertanyaan #1. |
| X-5 | [DESAIN] `alt` pada gambar berupa prompt generasi gambar panjang ("A portrait of an Indonesian female IP lawyer… photorealistic…"). Bukan alt yang layak untuk pembaca layar. | MINOR | Gambar dekoratif: `alt=""`. |
| X-6 | [DESAIN] Hanya 1–2 `aria-label` per screen; hanya 2 `<label>` di S1. Urutan fokus tidak dapat dinilai dari Stitch. | MINOR | Audit saat implementasi. |
| X-7 | [DESAIN] Kontras (dihitung): placeholder/outline terang `#73777f` pada putih = 4.49:1 (hampir AA), pada `#f7f9fb` = 4.26:1 (gagal); batas kartu gelap `#4d4635` pada `#00132e` = 1.98:1 (tidak memisahkan dengan jelas). Pasangan teks utama (emas/biru, `#d1c5af` pada `#0c203b` = 9.58:1) aman. | MINOR | Gelapkan teks outline terang; kuatkan border gelap. |
| X-8 | [ESTETIKA] Palet navy + emas dengan serif tampak mewah dan berwibawa. Cocok untuk kesan terpercaya, tetapi preferensi. | — | Opsional. |

---

## 4. Gap: flow dan state yang belum ada sama sekali

**Alur P0 tanpa screen (mapping use case diagram → UI)**

| Use case / FR | Screen yang diperlukan | Status |
|---|---|---|
| Enter Business Profile / FR 1 | Onboarding: textarea deskripsi usaha (Bahasa Indonesia, contoh isian, hitung karakter) | ❌ |
| View Suggested KBLI Codes / FR 2 | Hasil top-3 kandidat: kode, nama, confidence (angka + bar) | ❌ |
| Confirm or Override KBLI / FR 3 | Pilih satu kandidat; cari/pilih manual; konfirmasi | ❌ |
| FR 4–6 (rule engine + RAG + LLM) | Loading wizard <10 detik dengan langkah progres; hasil checklist personal | ❌ |
| View Compliance Checklist / FR 6 | Daftar kewajiban per track: OSS-RBA, PIRT, Halal, SPT | ❌ |
| View Source Regulations / FR 7 | Chip sitasi yang dapat diklik → sheet berisi kutipan klausul + tautan sumber | ❌ |
| Flag "verify manually" / FR 8 | Tag dan penjelasan untuk obligasi yang tidak bisa dikonfirmasi | ❌ |
| Generate Draft Document / FR 9 | Pilih item → pratinjau/isian data profil → generate | ❌ |
| Download Document PDF / FR 10–11 | Daftar dokumen, status generate, tombol unduh PDF | ❌ |

**FR tanpa UI: FR 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 (11 dari 11).** FR 4 dan 5 bersifat backend, UI-nya hanya tampil lewat state loading dan hasil.

**State yang belum ada sama sekali**
- Loading wizard (<10 detik): skeleton dan langkah ("Mencocokkan KBLI → Menyaring kewajiban → Menyusun checklist").
- Hasil confidence rendah: peringatan di kandidat KBLI, ajakan memperjelas deskripsi.
- Tag "Verifikasi manual" untuk obligasi yang tidak ter-match.
- Error: API gagal, timeout >10 detik, deskripsi terlalu pendek, KBLI tidak ditemukan.
- Empty dashboard (user baru belum punya profil/dokumen).
- Generate dokumen: progres, gagal, berhasil.
- Auth: login/register. Sudah ada di frontend repo, tetapi tidak ada di Stitch.
- Disclaimer "bukan nasihat hukum".
- Penjelasan istilah (glosarium KBLI/NIB/PIRT/OSS/SPT).

---

## 5. Komponen reusable yang muncul (basis design system)

| Komponen di Stitch | Padanan shadcn/ui | Catatan implementasi |
|---|---|---|
| Top app bar (logo, judul, badge, bell, avatar) | custom (header) | Sederhanakan, hapus badge Gratis dan duplikat logo |
| Bottom tab bar 4 item | custom | Ganti isi (X-3). Sederhana |
| Hero card dengan CTA | `Card` + `Button` | Mudah |
| Badge/chip status ("Diproses", "Gratis", "OSS Valid") | `Badge` | Perlu varian: sukses, proses, peringatan, manual |
| Progress bar | `Progress` | Mudah |
| Vertical stepper 4 tahap (S3) | custom | Sedang. Tidak diperlukan P0; bisa dipakai ulang untuk langkah loading wizard |
| Baris dokumen (ikon, judul, meta, aksi "Unduh") | `Card`/list item | Dipakai ulang untuk daftar dokumen P0 |
| Kartu layanan (chip metadata, syarat dokumen, CTA) | `Card` + `Badge` + `Button` | Padanan untuk kartu checklist item, tambah chip sitasi |
| Tab/filter segmented ("Semua / Sedang Berjalan / Selesai") | `Tabs` | Mudah |
| Input pencarian + chips kategori | `Input` + chips | Dipakai ulang untuk override KBLI (combobox) |
| Bottom sheet/modal (kuis, bantuan) | `Drawer`/`Sheet` | Dipakai ulang untuk sheet sitasi |
| Toast (sukses/proses) | `sonner` | Mudah |
| Callout info ("Jaminan…") | `Alert` | Cocok untuk disclaimer |
| Empty state ("Layanan Belum Ditemukan") | custom | Sederhana |
| Kartu testimoni horizontal (carousel) | `Carousel` | Tidak perlu di v1 |
| Kartu advokat, dropzone upload, input chat AI | custom | **Jangan dibangun** (di luar scope) |

Komponen yang **dibutuhkan P0 tetapi belum ada:** textarea deskripsi, kartu kandidat KBLI (radio + confidence meter), combobox override KBLI, peringatan confidence rendah, kartu checklist item, chip sitasi + sheet kutipan, tag "Verifikasi manual", loading wizard bertahap, pratinjau/progres dokumen, banner disclaimer, tooltip glosarium.

**Kelayakan implementasi (Next.js 16 + Tailwind v4 + shadcn, 1 sprint)**
- Repo saat ini baru punya `button`, `input`, `label` di `frontend/components/ui/`. Sisanya perlu ditambah via shadcn CLI (`badge`, `card`, `progress`, `tabs`, `sheet`, `sonner`, `alert`, `textarea`, `command`).
- Stitch memakai Tailwind CDN (v3) dengan ±40 token bergaya Material 3 (`surface-container-low`, dll.). Harus dipetakan ke `@theme` Tailwind v4 atau disederhanakan menjadi ±10 token semantik. Estimasi: setengah hari.
- Ikon Material Symbols → ganti ke `lucide-react` (sudah ada di dependensi).
- Font (Playfair/Bodoni + Plus Jakarta/Hanken) tersedia via `next/font`. Pertimbangkan satu font sans saja untuk label kecil.
- Yang **berlebihan/sulit**: stepper S3, carousel testimoni, dropzone dengan klaim E2E, chat AI, integrasi WA, QR cetak. Semuanya di luar P0.

---

## 6. Rekomendasi tindakan (urut)

**Must-fix sebelum coding**
1. Re-brief Stitch: buat 9 screen P0 (onboarding, hasil KBLI + override, loading wizard, checklist, sheet sitasi, daftar dokumen, generate dokumen, error/empty states, disclaimer). Jangan perbaiki katalog/tracker/konsultasi.
2. Keluarkan dari v1: S3 (tracker), S4 (konsultasi advokat, chat AI, auditor kontrak), kartu Merek dan PT Perorangan.
3. Hapus semua klaim tak berbukti (angka pengguna, advokat bernama, testimoni, "terintegrasi OSS/BPJPH", "100% gratis", "skor kesiapan"). Gunakan placeholder bertanda "contoh" di mockup.
4. Tambahkan sitasi yang bisa diklik di setiap item checklist (FR 7) dan tag "Verifikasi manual" (FR 8).
5. Tambahkan disclaimer "bukan nasihat hukum" di checklist, dokumen, dan PDF.
6. Rancang state: loading <10 detik, confidence rendah, error, empty.
7. Putuskan satu tema (terang/gelap) dan satu pasangan font. Dokumentasikan token.
8. Perbaiki aksesibilitas dasar: hapus `user-scalable=no`, teks minimum 12px (isi 14px), tap target ≥44px, `<label>` untuk semua input, kontras ≥4.5:1.
9. Definisikan ulang navigasi bawah: Beranda · Checklist · Dokumen · Profil (selaras wireframe lo-fi).

**Nice-to-have**
10. Penjelasan istilah (KBLI, NIB, PIRT, OSS, SPT) via tooltip/sheet "Apa ini?".
11. Skeleton dan transisi progres untuk loading wizard.
12. Pertahankan elemen visual yang sudah baik: kartu, chip, bar progres, bottom nav. Hanya isinya diganti.
13. Rapikan header (satu logo, tanpa teks terpotong) dan label yang patah baris.
14. Ganti `alt` gambar dengan `alt=""` untuk dekoratif.

---

## 7. Pertanyaan terbuka untuk Dimas

1. Dari dua varian (terang vs gelap), mana yang kanonik? Apakah keduanya dibuat sengaja atau hasil dua kali generate?
2. Prompt apa yang dipakai di Stitch? Hasilnya tampak dari brief marketplace layanan, bukan PRD P0. Apakah ada project Stitch lain yang berisi screen P0?
3. Apakah ada screen lain (onboarding, wizard) yang belum diekspor? `list_screens` hanya mengembalikan 8 screen; saya tidak memeriksa instance/flow di `get_project`.
4. Apakah tim sengaja memasukkan fitur P1 (tracker) dan konsultasi advokat sebagai visi jangka panjang? Jika ya, tandai jelas "Segera hadir", jangan sebagai tab utama v1.
5. Apakah SPT ikut ditampilkan di checklist v1 (README menyebutnya P0, tetapi tidak ada UI)?
6. Angka dan klaim regulasi di katalog ("Rp50.000 PNBP", "Wajib 2024–2026", "Bebas Retribusi", "Bebas Biaya Subsidi BPJPH") tidak saya verifikasi. Dari mana sumbernya? Jangan masuk UI sebelum ada sitasi.
7. Apakah label "Gratis" di header adalah model bisnis yang diputuskan? User sensitif harga, jadi klaim ini harus benar.
8. Nama "Bu Siti / Dapur Sambal Mak Nyuss" sebagai persona demo: aman dipakai, tetapi pastikan tidak dikira data nyata saat demo.
9. Ukuran tap target dan kontras dihitung dari class/token, bukan dirender. Apakah tim ingin saya ukur di browser pada 360/390px sebelum revisi?
10. Apakah user mengenal istilah "KBLI"? Perlu keputusan apakah kode ditampilkan, atau cukup nama bidang usaha dengan kode sebagai detail kedua.
