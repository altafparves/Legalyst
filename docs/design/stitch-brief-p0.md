# Brief layar P0 (v2)

Rujukan: [DESIGN.md](DESIGN.md) untuk token dan aturan, [stitch-review.md](stitch-review.md) untuk alasan redesign. Cakupan: FR 1-11 di README. Teks UI Bahasa Indonesia, data berlabel "Contoh", kode KBLI dan regulasi hanya placeholder (belum diverifikasi).

Alat kerja saat ini: **Figma** (file `Legalyst`, page Main playground). Stitch hanya untuk eksplorasi.

## Layar dan state

| # | Layar (teks di UI) | FR | State yang harus tampak | Status Figma |
|---|---|---|---|---|
| 1 | Ceritakan usaha Anda | 1 | kosong (tombol nonaktif), terisi, terlalu pendek | Belum |
| 2 | Mana yang paling cocok? | 2, 3 | normal, kecocokan rendah | Belum |
| 3 | Pilih jenis usaha sendiri | 3 | pencarian, tidak ditemukan | Belum |
| 4 | Menyusun checklist Anda | 4-6 | progres 3 langkah, lebih lama dari biasanya | Belum |
| 5 | Checklist kewajiban usaha | 6, 7, 8 | normal, kosong | **Selesai (normal)** |
| 6 | Sheet dasar hukum | 7 | kutipan klausul + tautan sumber | Belum |
| 7 | Buat dokumen | 9 | data profil, sedang membuat | Belum |
| 8 | Dokumen Anda | 10, 11 | siap, sedang dibuat, gagal, kosong | Belum |
| 9 | Beranda | semua | pengguna baru, pengguna lama | Belum |

Catatan pembangunan: percobaan membangun layar 1-3 gagal di tengah jalan sebelum batas panggilan Figma tercapai. Mungkin ada frame setengah jadi di Figma pada baris y=2200 (mulai x=1100, nama "Onboarding / Mobile 390"). Periksa dan hapus sebelum membangun ulang.

## Spesifikasi per layar

**1. Ceritakan usaha Anda.** Bar atas: tombol kembali, "1 DARI 3". Judul "Ceritakan usaha Anda"; penjelasan "Tulis dengan bahasa sehari-hari. Kami carikan jenis usaha resminya." Label "Deskripsi usaha", textarea besar dengan placeholder "Contoh: Saya jualan sambal botolan buatan rumah, dijual lewat WhatsApp dan titip di warung" dan penghitung 0/500. Catatan penjelas KBLI: "KBLI adalah kode resmi jenis usaha. Dari kode ini kami tahu izin apa saja yang perlu Anda urus." Tombol "Cari jenis usaha" nonaktif sampai minimal 20 karakter, dengan teks "Tulis minimal 20 karakter agar hasilnya tepat."

**2. Mana yang paling cocok?** Tiga kandidat jenis usaha dengan "Kecocokan" (angka dan bar), contoh 82%, 11%, 4%. Kandidat terpilih berupa blok solid biru tua bersudut asimetris; lainnya baris dengan garis pemisah. Tombol "Ya, pakai yang ini"; tautan "Tidak ada yang cocok? Pilih sendiri". Catatan: "Anda bisa mengubah pilihan ini nanti di Profil." Varian kecocokan rendah: blok solid terakota "KECOCOKAN RENDAH, Kami kurang yakin dengan jenis usaha Anda." dengan tombol "Ubah deskripsi"; tidak ada kandidat terpilih; tombol utama nonaktif "Pilih salah satu dulu".

**3. Pilih jenis usaha sendiri.** Kolom cari, daftar hasil (kode contoh + nama), satu terpilih dengan ikon centang. Varian tidak ditemukan: "Tidak ketemu. Coba kata kunci lain, misalnya jenis barang yang Anda jual." dengan tombol "Hapus pencarian". Tombol "Konfirmasi pilihan".

**4. Menyusun checklist Anda.** Tiga langkah dengan ikon dan teks status: "Mencocokkan jenis usaha" (selesai), "Menyaring kewajiban sesuai skala dan lokasi" (berjalan), "Menyusun panduan dengan dasar hukum" (menunggu). Blok placeholder pemuatan dan teks "Biasanya selesai kurang dari 10 detik." Varian lebih lama: blok solid merah "Ini lebih lama dari biasanya. Cerita usaha Anda tetap tersimpan." dengan tombol "Coba lagi" dan "Kembali".

**5. Checklist kewajiban usaha** (sudah dibangun). Judul besar, profil usaha contoh, progres "3 dari 7 kewajiban selesai", tab Semua/OSS-RBA/PIRT/Halal/SPT. Bagian "Perlu dikerjakan" (baris bergaris pemisah, tiap item punya chip dasar hukum emas dan tombol "Buat dokumen"; hanya item pertama bertombol solid), "Perlu dicek sendiri" (satu blok solid terakota bersudut asimetris), "Selesai" (baris ringkas dengan ikon centang), catatan penting "Informasi ini panduan umum, bukan nasihat hukum.", dan nav bawah. Varian kosong belum dibuat.

**6. Sheet dasar hukum.** Bottom sheet di atas latar scrim biru tua: tombol tutup, label "DASAR HUKUM", nama regulasi placeholder, "Pasal XX", kutipan klausul (berlabel "Contoh kutipan"), "Dalam bahasa sederhana" dengan penjelasan, tombol "Buka sumber resmi".

**7. Buat dokumen.** Judul "Buat dokumen", nama dokumen contoh. Data dari profil terisi otomatis (nama usaha, pemilik, alamat, kode usaha), tiap baris punya tautan "Ubah". Catatan emas "Ini draf. Periksa kembali sebelum dipakai." Tombol "Buat PDF". Varian proses: tombol berubah "Membuat dokumen…" dan nonaktif.

**8. Dokumen Anda.** Baris dokumen: ikon, nama, tanggal, status solid (Siap, Sedang dibuat, Gagal) dan aksi ("Unduh PDF" atau "Coba lagi"). Varian kosong: "Belum ada dokumen. Buka checklist dan pilih item untuk membuat dokumen." dengan tombol "Ke checklist". Nav bawah, tab Dokumen aktif.

**9. Beranda.** "Halo, Bu Siti" (Contoh), profil usaha singkat, progres checklist dengan tombol "Lanjutkan checklist", item berikutnya, dua dokumen terakhir, catatan penting, nav bawah. Pengguna baru: satu ajakan "Mulai ceritakan usaha Anda".

## Aturan isi
- Tidak ada testimoni, statistik pengguna, rating, nama orang, chat, fitur advokat, pelacak status pengajuan, atau tombol "ajukan".
- Setiap item kewajiban wajib punya chip dasar hukum yang bisa diketuk (FR 7). Item yang tidak bisa dipastikan diberi "Perlu dicek sendiri" (FR 8), bukan dibuang.
- Catatan penting "bukan nasihat hukum" muncul di Checklist dan Dokumen serta di PDF.
- Istilah KBLI, NIB, PIRT, OSS, SPT dijelaskan satu kalimat saat pertama muncul.
