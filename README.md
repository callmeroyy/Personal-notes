# Catatan Keuangan

Aplikasi keuangan pribadi berbasis web yang berjalan langsung di browser. Data utama disimpan pada perangkat pengguna; server hosting hanya menyajikan file aplikasi.

## Fitur

- Pemasukan dan pengeluaran multi-item
- Tunai, rekening, e-wallet, dan transfer antar dompet
- Anggaran, transaksi berulang, dan target tabungan
- Grafik, rekap gambar/PDF, CSV, serta backup JSON
- Foto dan OCR struk
- Backup opsional ke Google Drive
- PWA/offline melalui service worker

## Menjalankan pemeriksaan

Node.js diperlukan hanya untuk pemeriksaan pengembangan, bukan untuk menjalankan aplikasi.

```sh
npm run check
```

Untuk pengembangan lokal, sajikan folder ini melalui server HTTP localhost. Membuka `index.html` langsung dengan protokol `file:` tidak mendukung service worker maupun Google OAuth.

## Deploy ke Cloudflare Pages

Hubungkan repository GitHub ke Cloudflare Pages dan gunakan branch produksi `main`. Project ini tidak memerlukan build command; direktori output adalah root repository.

File `_headers` menyediakan header keamanan dasar dan aturan cache. `manifest.webmanifest`, `icon.svg`, dan `sw.js` menyediakan dukungan PWA.

Setelah mendapat domain `pages.dev`, tambahkan origin tersebut di Google Cloud Console pada OAuth Client ID bagian **Authorized JavaScript origins**. Contoh:

```text
https://nama-project.pages.dev
```

## Migrasi dari domain lama

Penyimpanan browser terikat pada origin. Data dari domain GitHub Pages tidak otomatis tersedia di domain Cloudflare Pages.

1. Export backup JSON dari domain lama.
2. Buka deployment Cloudflare Pages.
3. Import backup JSON.
4. Periksa saldo, transaksi, foto, dan koneksi Google Drive.
5. Pertahankan domain lama sampai migrasi selesai.

Jika hostname custom domain tidak berubah, penyimpanan browser tetap berada pada origin yang sama selama protokolnya tetap HTTPS.

## Privasi dan backup

Transaksi tersimpan di browser perangkat. Backup Google Drive menggunakan scope `drive.file`, sehingga aplikasi hanya dapat mengakses file yang dibuatnya sendiri. Tetap simpan backup JSON berkala sebelum mengganti perangkat, browser, atau domain.
