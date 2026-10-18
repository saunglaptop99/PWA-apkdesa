# Catatan Lanjutan Project — 18 Oktober 2026

Project: `H:\TRISULA_DIGIART\pwa-desa`

## Perubahan terakhir

File yang terakhir diubah untuk permintaan validasi identitas warga:
- `src/components/warga/WargaFormModal.jsx`

Logika yang diterapkan:
- NIK harus 16 digit angka (validasi form sudah ada).
- Sebelum simpan, aplikasi mencari NIK yang sama di tabel `warga`. Jika sudah dipakai warga lain, penyimpanan diblokir dan pesan error ditampilkan. Saat edit, NIK milik record yang sedang diedit tetap diperbolehkan.
- Database memiliki unique constraint untuk `warga.nik` di `supabase/schema.sql`, sebagai pengaman jika ada dua proses input bersamaan. Error PostgreSQL `23505` diterjemahkan menjadi pesan duplikasi yang lebih mudah dipahami.
- Nomor KK harus 16 digit angka. Nomor KK yang telah dipakai warga lain memunculkan pemberitahuan, tetapi tidak memblokir simpan: beberapa anggota keluarga memang berbagi satu KK. Pesan menjelaskan bahwa KK tersebut hanya boleh digunakan jika masih keluarga pada KK yang sama.
- Pemeriksaan NIK/KK gagal karena koneksi/database bermasalah akan menghentikan simpan dan menampilkan pesan agar admin mencoba kembali.
- Import Excel yang sebelumnya diperbaiki sudah mendeteksi NIK ganda dalam file; pemakaian KK berulang tetap diperbolehkan untuk anggota keluarga.

## Pemeriksaan terakhir

- `git diff --check`: bersih (hanya ada peringatan konversi akhir baris LF/CRLF dari Git pada file yang telah berubah).
- `npm run build`: berhasil setelah dijalankan dengan izin proses yang mengizinkan esbuild membuat proses compiler anak. Vite mentransformasi 1.987 modul dan menghasilkan PWA. Peringatan ukuran bundle utama masih ada (sekitar 1.39 MB minified / 416 KB gzip).
- `git diff --check`: bersih; Git hanya memberi peringatan normal bahwa akhir baris LF dapat dikonversi ke CRLF.
- Belum dilakukan uji UI langsung untuk skenario NIK ganda, KK sama dengan anggota keluarga baru, dan NIK ganda saat edit.

## Langkah lanjutan yang disarankan

1. Uji melalui UI/database:
   - Tambah warga dengan NIK yang sudah terdaftar → harus ditolak dengan pesan yang jelas.
   - Tambah anggota keluarga dengan KK yang sudah dipakai, tetapi NIK baru → tampil pemberitahuan KK, lalu simpan diperbolehkan.
   - Edit warga tanpa mengubah NIK → tetap bisa disimpan.
   - Edit warga memakai NIK milik orang lain → harus ditolak.
2. Pertimbangkan memberi validasi duplikasi langsung saat mengetik/keluar dari input (debounce/blur) bila ingin umpan balik lebih awal. Saat ini pemeriksaan dilakukan saat submit.
3. Jangan membuat `no_kk` unik di database: itu akan melarang anggota keluarga berbagi KK. NIK yang harus unik.
4. Nomor akta, telepon, dan nomor lain belum diberi aturan unik karena belum dipastikan bahwa setiap nilai harus dimiliki satu warga saja.

## Konteks QC sebelumnya

Pada deep QC sebelumnya, `supabase db lint --linked --schema public` berhasil dan menemukan tidak ada kesalahan skema. RLS, publication Realtime, dan scope wilayah sudah diperiksa. Ada 5 profil aparat lama yang belum punya PIN/akun login (1 Dusun, 1 RW, 3 RT); perlu admin menetapkan PIN masing-masing sebelum login semua role dapat diuji end-to-end. Build sebelumnya menghasilkan peringatan ukuran bundle JavaScript yang besar.

Tidak ada perubahan data Supabase produksi yang dilakukan sebagai bagian pemeriksaan tersebut.

## Lanjutan: fitur pelayanan surat

Implementasi UI dan migrasi sudah disiapkan:
- `src/components/surat/SuratLayananPanel.jsx`: admin dapat mencatat permohonan berdasarkan warga master, pilih jenis surat, isi keperluan/kelengkapan, unggah PDF/JPG/PNG maksimal 5 MB, mengelola status dan alasan, melihat riwayat, mencari arsip, serta membuka lampiran melalui signed URL privat.
- `src/components/surat/SuratModal.jsx`: nomor agenda wajib diisi dan disimpan unik saat draf PDF dibuat. Pembuatan PDF hanya dapat dilakukan setelah status diverifikasi; cetak ulang tidak menurunkan status selesai. PDF tetap ditandai draf dan admin wajib memeriksa format isi.
- `src/pages/LayananPage.jsx`, `src/pages/WargaPage.jsx`, `src/App.jsx`: tab surat memakai workflow arsip; shortcut dari detail warga mengarah ke layanan surat, bukan generator lama.
- `supabase/migration_surat_layanan.sql`: tabel, RLS admin, indeks unik nomor surat, Realtime, bucket lampiran privat dan policy akses admin. Untuk database baru, definisi tabel juga ada di `supabase/schema.sql`.
- README sudah menambahkan urutan migrasi.

Verifikasi lanjutan: `npm run build` sukses (1.988 modul) setelah menjalankan dengan izin compiler anak; peringatan bundle besar tetap ada. `git diff --check` bersih, kecuali peringatan konversi LF/CRLF.

Migration `supabase/migration_surat_layanan.sql` **sudah diterapkan ke Supabase project yang tertaut** via `supabase db query --linked --file`. Metadata live mengonfirmasi tabel dengan RLS aktif, policy admin, indeks unik nomor agenda, bucket privat (PDF/JPG/PNG maks. 5 MB), policy objek admin, dan tabel masuk publication Realtime. `supabase db lint --linked --schema public` setelah migration: `No schema errors found`.

Belum dilakukan uji UI end-to-end dengan akun admin dan role aparat, belum membuat permohonan atau mengunggah berkas uji. Lanjutkan dengan login admin dan uji create request, upload + signed URL, update alasan/status, nomor agenda unik, create PDF setelah diverifikasi, serta cetak ulang surat selesai. Pastikan role nonadmin tidak bisa membuka tab/akses tabel atau bucket melalui client. Lampiran digital privat; bukan ditampilkan ke aparat.

## Lanjutan UI AdminPanel

Atas masukan tangkapan layar, `src/pages/AdminPanelPage.jsx` dirapikan:
- Kartu Aparat dipadatkan (nama/role, wilayah, status, username dan aksi) agar tiap item memakai tinggi layar lebih sedikit.
- Tab Wilayah kini berupa daftar Dusun yang dapat dibuka/tutup. Setiap Dusun menampilkan jumlah RW saat ringkas; daftar RW/RT dan tombol tambah RT hanya muncul saat dibuka. Aksi tambah RW, edit/hapus Dusun tetap tersedia.
- Build Vite setelah perubahan UI ini sukses; peringatan ukuran bundle utama (~1.4 MB minified) masih sama.

## Lanjutan dashboard semua role

- `src/pages/DashboardPage.jsx` diperbarui dengan hero identitas berwarna hijau institusional, judul nama lebih terukur, chip role, dan lokasi yang tetap dinamis sesuai profile.
- Statistik kembali berupa kartu individual yang rapi, panel distribusi dan sinkronisasi punya bingkai yang konsisten, shortcut layanan memakai tile berjarak dan ikon lebih tertata.
- CSS dashboard khusus di `src/index.css`; konten dan visibility shortcut admin tetap mengikuti role.
- Build Vite sukses (1.988 modul). Peringatan bundle >500 KB tetap ada. Halaman lokal terdeteksi merespons, tetapi uji screenshot setelah login belum dilakukan.

## Pengamanan PIN dan audit aktivitas

Untuk permintaan pengamanan aplikasi dan alur PIN lupa:
- Login PIN diproses Edge Function (`PIN_PEPPER` HMAC, PIN unik, pembatasan percobaan di server), bukan dibandingkan di client.
- Admin dapat menetapkan PIN baru aparat di form edit. Form menjelaskan bahwa PIN lama tidak dapat dilihat, meminta konfirmasi reset, dan tidak menampilkan PIN lama.
- Login memberi panduan aparat yang lupa PIN untuk menghubungi admin; PIN admin yang lupa dipulihkan oleh pemilik project Supabase melalui akses server tepercaya. Tidak dibuat endpoint reset publik.
- Sesi di browser otomatis keluar setelah 30 menit tanpa aktivitas atau 12 jam sejak login untuk semua role. Ini guard di sisi client; reset PIN tidak mencabut token/sesi yang sudah aktif di perangkat lain.
- Tab Aktivitas admin menampilkan 100 audit terbaru dan realtime; audit menyimpan aktor, aksi, record, dan nama kolom berubah tanpa nilai sensitif.
- `supabase/migration_security_audit.sql` sudah diterapkan pada project Supabase tertaut. `supabase db lint --linked --schema public` lulus tanpa kesalahan; tabel audit RLS aktif dan masuk publication Realtime.
- Aksi tambah/ubah/reset/hapus akun aparat dicatat eksplisit setelah Edge Function sukses. Pencatatan ditempatkan sebelum refresh list agar error refresh tidak melewati audit.
- `README.md` memuat panduan operasional PIN lupa, batas sesi, batasan pencabutan sesi, dan audit.

Perubahan source pada alur keamanan perlu diverifikasi ulang dengan build dan `git diff --check`; uji reset PIN aparat, penolakan akses audit untuk role nonadmin, dan expiry sesi secara manual. Jangan mengklaim semua sesi perangkat lain dicabut saat reset PIN.
