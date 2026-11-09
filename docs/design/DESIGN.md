# Legalyst Design System (v2, P0)

Sumber kebenaran: file Figma `Legalyst` (key `GpKZlLSKejLO58h1YABGJn`), page **Main playground**. Dokumen ini mencatat token dan aturan yang sama supaya bisa dipakai di kode (Next.js + Tailwind v4 + shadcn/ui). Jika Figma dan dokumen ini berbeda, Figma yang benar; perbarui dokumen ini.

Page **Design System** di file yang sama adalah milik Dimas (moodboard v1). Tidak dipakai sebagai token v2 dan jangan diubah.

## Produk dan pengguna
Web app responsif, dirancang mobile-first (360-390px), untuk pemilik warung dan produsen F&B rumahan (0-5 karyawan). Literasi regulasi rendah, sensitif harga. Semua teks UI Bahasa Indonesia. Desktop adalah adaptasi layout, bukan desain terpisah (belum dibuat).

## Arah visual
DNA dari Dimas dipertahankan: **biru tua + emas**. Netral diganti krem hangat, bukan putih atau abu. Aksen dan status berupa warna **solid** yang tegas. Warna pucat (pastel, opacity) tidak dipakai untuk aksen; warna terang hanya untuk latar.

### Aturan agar tidak terasa template
- Tidak ada garis atau bar warna di sisi kiri kartu.
- Daftar memakai baris dengan garis pemisah, bukan kartu untuk semuanya. Blok penekanan hanya satu per bagian.
- Blok penekanan memakai **sudut asimetris**: kiri-atas dan kanan-bawah `radius/xl`, kanan-atas dan kiri-bawah `radius/sm`.
- Ritme jarak sengaja berbeda: rapat di dalam grup (`spacing/sm`-`md`), lega antar bagian (`spacing/2xl`+).
- Judul besar, rata kiri. Ikon seperlunya; status tidak hanya bergantung pada warna (selalu ikon atau teks).
- Teks minimal 12px, isi minimal 14px. Area sentuh minimal 44x44px. Zoom tidak dikunci.

## Token

### Primitif (koleksi `Primitives`, tersembunyi dari picker)
| Nama | Hex |
|---|---|
| cream/50 | #FBF7EE |
| cream/100 | #F5EEDF |
| cream/200 | #EBE2CE |
| cream/300 | #DDD1B8 |
| navy/800 | #163A5F |
| navy/900 | #12294A |
| navy/950 | #0B1F3A |
| ink/900 | #17202F |
| ink/600 | #4F5663 |
| ink/500 | #8C8372 |
| gold/200 | #E8D48A (tidak dipakai semantik) |
| gold/500 | #D9A62E |
| gold/700 | #7A5800 |
| green/600 | #0F7A43 |
| terracotta/600 | #B04020 |
| red/600 | #BF2A20 |

### Semantik (koleksi `Color`, mode Light)
Nama CSS: `--color-<grup>-<nama>`, mis. `color/bg/page` menjadi `var(--color-bg-page)`.

| Token | Alias | Pakai untuk |
|---|---|---|
| color/bg/page | cream/100 | Latar halaman |
| color/bg/surface | cream/50 | Permukaan sedikit terangkat |
| color/bg/sunken | cream/200 | Latar catatan, track progress |
| color/bg/inverse | navy/900 | Tombol utama, nav bawah, blok terpilih |
| color/bg/inverse-deep | navy/950 | Scrim di belakang sheet |
| color/bg/brand | navy/800 | Isian merek (chip "Dipilih", progress) |
| color/bg/accent | gold/500 | Chip dasar hukum, tab aktif nav |
| color/bg/success | green/600 | Status selesai |
| color/bg/caution | terracotta/600 | "Perlu dicek sendiri", kecocokan rendah |
| color/bg/danger | red/600 | Gagal, error |
| color/text/primary | ink/900 | Teks utama |
| color/text/secondary | ink/600 | Teks sekunder |
| color/text/brand | navy/900 | Judul, tautan |
| color/text/on-inverse, on-brand, on-success, on-caution, on-danger | cream/50 | Teks di atas isian gelap |
| color/text/on-accent | ink/900 | Teks di atas emas |
| color/text/accent | gold/700 | Teks emas di atas krem |
| color/text/success, caution, danger | green/600, terracotta/600, red/600 | Teks status di atas krem |
| color/border/default | ink/500 | Border input dan kontrol |
| color/border/subtle | cream/300 | Garis pemisah daftar |
| color/border/strong | navy/900 | Penekanan |
| color/border/accent | gold/500 | Penekanan emas |

Kontras terhitung (WCAG): teks utama di krem 14.2:1, sekunder 6.4:1, krem di atas hijau 5.06:1, terakota 5.46:1, merah 5.51:1, tinta di atas emas 7.35:1, krem di atas biru 13.6:1, emas tua di krem 5.6:1, border default di krem 3.24:1. **Emas sebagai isian di atas krem hanya 1.92:1**, jadi emas tidak boleh menjadi satu-satunya penanda state.

### Spasi (`Spacing`) dan radius (`Radius`)
| Spasi | px | Radius | px |
|---|---|---|---|
| 2xs | 2 | sm | 8 |
| xs | 4 | md | 12 |
| sm | 8 | lg | 20 |
| md | 12 | xl | 28 |
| lg | 16 | pill | 999 |
| xl | 24 | | |
| 2xl | 32 | | |
| 3xl | 40 | | |
| 4xl | 56 | | |
| 5xl | 72 | | |

CSS: `--spacing-<nama>`, `--radius-<nama>`.

### Tipografi
Judul: **Bricolage Grotesque**. Isi: **Atkinson Hyperlegible Next** (dirancang untuk keterbacaan). Skala mobile:

| Style | Font | Ukuran/tinggi baris |
|---|---|---|
| Heading/1 | Bricolage Grotesque Bold | 32/38, -1% |
| Heading/2 | Bricolage Grotesque Bold | 24/30, -0.5% |
| Heading/3 | Bricolage Grotesque SemiBold | 20/26 |
| Subtitle/1 | Atkinson SemiBold | 18/26 |
| Subtitle/2 | Atkinson Medium | 16/24 |
| Body/1 Regular, Body/1 SemiBold | Atkinson | 16/26 |
| Body/2 Regular, Body/2 SemiBold | Atkinson | 14/22 |
| Label | Atkinson Bold | 12/16, +3% |

Efek: `Shadow/Sheet` (bayangan ke atas, biru tua 14%) hanya untuk bottom sheet.

### Ikon
**Material Symbols Rounded** (Google), satu gaya, bobot Regular. Di Figma dipakai sebagai font (ligature). Di kode pakai paket `material-symbols`. Ikon yang belum tersedia: jangan digambar manual; minta pemilik desain menyediakan.

## Komponen (ada di Figma, `Components / Checklist`)
| Komponen | Properti | Padanan shadcn/ui |
|---|---|---|
| Chip | Label (ikon opsional) | Badge |
| Button | Label (ikon kanan opsional) | Button |
| Tab | Label | Tabs / toggle |
| Nav Item | Label, Icon | custom (nav bawah) |
| Checklist Item | Tag, Title, Desc + Chip dasar hukum + Button | custom (Card tanpa bingkai) |

Belum dibuat: Textarea, kartu kandidat KBLI, combobox pilih sendiri, stepper loading, sheet dasar hukum, baris dokumen.

## Penamaan di UI
| Internal | Teks di UI |
|---|---|
| Smart Onboarding & Business Profiler | Kenali Usaha Anda (judul layar: "Ceritakan usaha Anda") |
| Interactive Compliance Wizard | Checklist Kewajiban Usaha (tab: Checklist) |
| Auto-Document Generator | Buat Dokumen (tab: Dokumen) |
| verify manually | Perlu dicek sendiri |
| confidence | Kecocokan |
| citation | Dasar hukum |
| override | Pilih sendiri |
| disclaimer | Catatan penting |
| generate | Buat |
| KBLI | Kode jenis usaha (KBLI), dijelaskan satu kalimat saat pertama muncul |

## Nada bahasa
Tenang, hangat, langsung ("Anda"), kalimat pendek. Tanpa jargon tanpa penjelasan. Tanpa superlatif, statistik karangan, testimoni, atau nama orang. Tanpa em-dash. Data contoh diberi label "Contoh". Dasar hukum memakai placeholder "PP No. XX Tahun XXXX, Pasal XX" sampai data asli tersedia; jangan mengarang nomor regulasi.

## Di luar scope v1
Tracker status pengajuan, konsultasi advokat, chat AI, unggah dan audit kontrak, e-filing atau tombol "ajukan", merek dagang, PT Perorangan, native app.

## Status pembangunan di Figma
| Item | Status |
|---|---|
| Token (variabel, text style, efek) | Selesai |
| Specimen token | Selesai (node 125:13) |
| Komponen dasar | Selesai (host 126:2) |
| Layar Checklist 390px | Selesai (node 127:6) |
| Layar P0 lain (lihat brief) | Belum; terhenti oleh batas panggilan Figma MCP |
| Versi desktop | Belum |
| Dark mode | Di luar scope |

Catatan: nav bawah berbentuk pil adalah pola app. Untuk web perlu ditinjau ulang saat versi desktop dibuat (mis. header atas pada layar lebar).

Project Stitch "Legalyst v2 (P0)" (ID 6641840150252780044) memakai palet lama dan hanya berisi screen Onboarding. Anggap eksplorasi saja, bukan acuan token.
