# Panduan Slicing Frontend Legalyst (Sprint 1)

Dokumen ini adalah panduan teknis bagi **Diffie** dan **Dimas** untuk mengerjakan *slicing* dan integrasi antarmuka Legalyst di branch `dev`.

---

## 1. Menjalankan Preview Desain Lokal (Live Prototype)

Untuk melihat visual desain kanonik Stitch yang sudah diperbaiki, jalankan server preview lokal atau buka URL yang sudah aktif:
* **Live Interactive Viewer:** [http://localhost:3333](http://localhost:3333)
* **File Referensi HTML & Screenshot di Repo:**
  * Screen 1: [`docs/stitch-screens/01-smart-onboarding-profiler.html`](file:///Users/altafparvesh/WEB-project/Legalyst/docs/stitch-screens/01-smart-onboarding-profiler.html)
  * Screen 2: [`docs/stitch-screens/02-compliance-wizard.html`](file:///Users/altafparvesh/WEB-project/Legalyst/docs/stitch-screens/02-compliance-wizard.html)
  * Screen 3: [`docs/stitch-screens/03-auto-document-generator.html`](file:///Users/altafparvesh/WEB-project/Legalyst/docs/stitch-screens/03-auto-document-generator.html)

---

## 2. Pembagian Tugas & File yang Dikerjakan

### 👤 DIFFIE (PIC: Screen 1 & Screen 2 + Core Interaction)

| Modul | File Halaman | Tanggung Jawab Utama |
| :--- | :--- | :--- |
| **Screen 1: Smart Profiler** | `frontend/app/(app)/onboarding/page.tsx` | Slicing form ceritakan usaha, state loading AI, render kartu Top-3 KBLI 2020 dengan persentase kecocokan (*confidence chip*), dan penyimpanan KBLI terpilih ke state/Context. |
| **Screen 2: Compliance Wizard** | `frontend/app/(app)/dashboard/page.tsx` | Slicing ringkasan profil usaha, loading checklist (<10s), render daftar kewajiban dengan **100% badge sitasi regulasi** (`[PP No. 5/2021]`), dan tag amber `[⚠️ Perlu Verifikasi Manual]`. |

**Checklist Diffie:**
- [ ] Validasi input form deskripsi usaha (minimal 10 kata).
- [ ] Interaksi tombol radio kartu KBLI 1, 2, atau 3.
- [ ] Hubungkan tombol "Analisis KBLI" ke endpoint mock atau backend `POST /api/v1/profiler/match`.
- [ ] Pastikan alur navigasi berpindah lancar dari `/onboarding` ke `/dashboard`.

---

### 👤 DIMAS (PIC: Screen 3 + Layout Polishing & Usability Testing)

| Modul | File Halaman | Tanggung Jawab Utama |
| :--- | :--- | :--- |
| **Screen 3: Doc Generator** | `frontend/app/(app)/documents/page.tsx` | Slicing kartu daftar draft dokumen (OSS, P-IRT, Halal), tombol unduh PDF, tombol unduh semua (.ZIP), dan kartu panduan langkah lanjutan (materai & tanda tangan). |
| **Mobile Navigation** | `frontend/components/bottom-nav.tsx` & `layout.tsx` | Merapikan Bottom Navigation 3 tab (`Profil` $\to$ `Checklist` $\to$ `Dokumen`) agar presisi di berbagai ukuran layar HP Android. |
| **Usability Testing** | Laporan Riset Capstone | Memimpin pengujian kegunaan (*usability testing*) ke **$\ge 3$ pelaku UMKM riil** (target wajib PRD). |

**Checklist Dimas:**
- [ ] Tombol "Unduh PDF" memiliki feedback visual (loading/spinner saat diklik).
- [ ] Audit tap target di HP: semua tombol minimal memiliki tinggi `48px` (standar WCAG).
- [ ] Susun skenario uji coba untuk 3 pemilik warung/F&B di Jogja.

---

## 3. Komponen Bersama yang Sudah Disediakan

Komponen berikut sudah dibuatkan dan bisa langsung di-import:
1. `<ComplianceStepper currentStep={1 | 2 | 3} />` di [`frontend/components/compliance-stepper.tsx`](file:///Users/altafparvesh/WEB-project/Legalyst/frontend/components/compliance-stepper.tsx)
2. `<DisclaimerBanner />` di [`frontend/components/disclaimer-banner.tsx`](file:///Users/altafparvesh/WEB-project/Legalyst/frontend/components/disclaimer-banner.tsx)
3. `<CitationBadge citation="..." />` di [`frontend/components/citation-badge.tsx`](file:///Users/altafparvesh/WEB-project/Legalyst/frontend/components/citation-badge.tsx)
4. `<BottomNav />` di [`frontend/components/bottom-nav.tsx`](file:///Users/altafparvesh/WEB-project/Legalyst/frontend/components/bottom-nav.tsx)

---

## 4. Cara Menjalankan Frontend Next.js

```bash
cd frontend
npm install
npm run dev
```
Buka [http://localhost:3000](http://localhost:3000) di browser.
