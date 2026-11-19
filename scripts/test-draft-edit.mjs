import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script, 'Script utama harus ada');

// Setup mock browser environment for VM
const store = new Map();
const localStorage = {
  getItem: k => store.get(k) ?? null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k),
  clear: () => store.clear()
};

const makeStyle = () => ({ setProperty: () => {}, removeProperty: () => {} });

const makeClassList = () => ({ add: () => {}, remove: () => {}, contains: () => false, toggle: () => {} });

const domElements = new Map();
const document = {
  activeElement: null,
  documentElement: { dataset: {}, style: makeStyle(), classList: makeClassList() },
  addEventListener: () => {},
  removeEventListener: () => {},
  querySelectorAll: () => [],
  querySelector: () => ({ content: '#ffffff', setAttribute: () => {}, style: makeStyle(), after: () => {}, before: () => {} }),
  getElementById: id => {
    if (!domElements.has(id)) {
      domElements.set(id, {
        id,
        value: '',
        textContent: '',
        style: makeStyle(),
        parentElement: { style: makeStyle(), classList: makeClassList() },
        dataset: {},
        setAttribute: () => {},
        removeAttribute: () => {},
        getAttribute: () => '',
        classList: makeClassList(),
        before: () => {},
        after: () => {},
        insertBefore: () => {},
        querySelector: () => ({ content: '', textContent: '', style: makeStyle() }),
        querySelectorAll: () => [],
        options: [],
        add: () => {},
        prepend: () => {},
        append: () => {},
        appendChild: () => {},
        replaceChildren: () => {},
        focus: () => {},
        remove: () => {},
        showModal: () => {},
        close: () => {},
        addEventListener: () => {}
      });
    }
    return domElements.get(id);
  },
  createElement: tag => ({
    tagName: tag.toUpperCase(),
    value: '',
    textContent: '',
    style: makeStyle(),
    dataset: {},
    setAttribute: () => {},
    getAttribute: () => '',
    classList: makeClassList(),
    append: () => {},
    insertBefore: () => {},
    appendChild: () => {},
    replaceChildren: () => {},
    remove: () => {},
    addEventListener: () => {}
  }),
  createElementNS: (_ns, tag) => ({
    tagName: tag.toUpperCase(),
    value: '',
    textContent: '',
    style: makeStyle(),
    dataset: {},
    setAttribute: () => {},
    getAttribute: () => '',
    classList: makeClassList(),
    append: () => {},
    insertBefore: () => {},
    appendChild: () => {},
    replaceChildren: () => {},
    remove: () => {},
    addEventListener: () => {}
  }),
  createTextNode: text => ({ textContent: text })
};

const context = {
  window: {},
  document,
  fetch: async () => ({
    ok: true,
    json: async () => ({
      data: {
        reply: 'Siap! Aku catat pembelian kuota sebesar Rp2.000 menggunakan dompet DANA.',
        followUpSuggestions: ['Berapa sisa saldo saya?'],
        draftTransactions: [
          {
            type: 'keluar',
            title: 'Beli kuota',
            amount: 2000,
            category: 'Wifi',
            paymentMethod: 'tunai',
            walletName: 'Tunai',
            date: '2026-11-15'
          }
        ]
      }
    })
  }),
  location: { protocol: 'https:', hostname: 'localhost', href: 'https://localhost/' },
  matchMedia: () => ({ matches: false, addEventListener: () => {} }),
  innerWidth: 800,
  innerHeight: 600,
  scrollTo: () => {},
  addEventListener: () => {},
  localStorage,
  navigator: { onLine: true },
  console,
  performance: { now: () => Date.now() },
  requestAnimationFrame: () => 1,
  cancelAnimationFrame: () => {},
  queueMicrotask: fn => fn(),
  Option: function (text, value) { this.text = text; this.value = value; },
  setTimeout: () => 1,
  clearTimeout: () => {},
  setInterval: () => 1,
  clearInterval: () => {},
  Intl,
  Date,
  Math,
  Number,
  String,
  Array,
  Object,
  RegExp,
  JSON,
  Boolean,
  parseFloat,
  parseInt,
  isNaN,
  isFinite,
  AbortController
};
context.window = context;
context.globalThis = context;

vm.createContext(context);
vm.runInContext(script, context);

console.log('Testing AI Draft and E-wallet functionality...');

const run = expr => vm.runInContext(expr, context);

// Test 1: Auto-provisioning wallet via idDompetDariNama
const idDana = run("idDompetDariNama('DANA', true)");
assert.ok(idDana, 'idDompetDariNama harus menghasilkan ID untuk DANA');
const db = run('db');
const danaWallet = db.dompet.find(w => w.id === idDana);
assert.equal(danaWallet?.nama, 'DANA', 'Dompet DANA harus berhasil dibuat di db.dompet');
assert.equal(danaWallet?.jenis, 'wallet', 'Jenis dompet DANA harus wallet');

// Test 2: Ekstraksi draf transaksi dengan e-wallet DANA
const drafts = run("ekstrakDrafTransaksiDariTeks('Tolong catat beli kuota 2rb pakai DANA ya')");
assert.equal(drafts.length, 1, 'Harus mengekstrak 1 draft');
const d0 = drafts[0];
assert.equal(d0.amount, 2000, 'Nominal harus 2000');
assert.equal(d0.paymentMethod, 'nontunai', 'Metode pembayaran harus nontunai');
assert.equal(d0.walletName, 'DANA', 'Nama dompet harus DANA');
assert.ok(d0.walletId, 'Wallet ID harus terisi');

// Test 3: Deteksi dan edit draf transaksi aktif ("Ubah ke kategori belanja dan pakai metode pembayaran dana")
context.draftAwal = {
  id: 'trx-1',
  type: 'keluar',
  title: 'Beli kuota',
  amount: 2000,
  category: 'Wifi',
  paymentMethod: 'tunai',
  walletName: 'Tunai',
  walletId: '',
  date: '2026-11-15',
  tersimpan: false
};

const edit1 = run("deteksiAksiEditDraf('Ubah ke kategori belanja dan pakai metode pembayaran dana', draftAwal)");
assert.ok(edit1, 'deteksiAksiEditDraf harus mendeteksi perubahan');
assert.equal(edit1.changes.category, 'Belanja', 'Kategori baru harus Belanja');
assert.equal(edit1.changes.paymentMethod, 'nontunai', 'Metode baru harus nontunai');
assert.equal(edit1.changes.walletName, 'DANA', 'Dompet baru harus DANA');
assert.ok(edit1.changes.walletId, 'Wallet ID baru harus terisi');

// Terapkan perubahan
Object.assign(context.draftAwal, edit1.changes);
assert.equal(context.draftAwal.category, 'Belanja');
assert.equal(context.draftAwal.walletName, 'DANA');

// Test 4: Edit nominal draf ("ganti nominal jadi 5rb")
const edit2 = run("deteksiAksiEditDraf('ganti nominal jadi 5rb', draftAwal)");
assert.ok(edit2, 'Harus mendeteksi perubahan nominal');
assert.equal(edit2.changes.amount, 5000, 'Nominal baru harus 5000');
Object.assign(context.draftAwal, edit2.changes);

// Test 5: Edit judul draf ("ubah judul jadi pulsa telkomsel")
const edit3 = run("deteksiAksiEditDraf('ubah judul jadi pulsa telkomsel', draftAwal)");
assert.ok(edit3, 'Harus mendeteksi perubahan judul');
assert.equal(edit3.changes.title, 'Pulsa telkomsel', 'Judul baru harus Pulsa telkomsel');
Object.assign(context.draftAwal, edit3.changes);

// Test 6: Edit ke tunai ("ganti ke pembayaran tunai")
const edit4 = run("deteksiAksiEditDraf('ganti ke pembayaran tunai', draftAwal)");
assert.ok(edit4, 'Harus mendeteksi perubahan ke tunai');
assert.equal(edit4.changes.paymentMethod, 'tunai');
assert.equal(edit4.changes.walletName, 'Tunai');

// Test 7: Simpan draft transaksi yang sudah diubah
context.draftAwal.paymentMethod = 'nontunai';
context.draftAwal.walletName = 'DANA';
context.draftAwal.walletId = idDana;
const resSimpan = run("simpanTransaksiLangsung(draftAwal)");
assert.ok(resSimpan.ok, 'Simpan transaksi harus berhasil');
assert.equal(resSimpan.transaction.kategori, 'Belanja', 'Kategori tersimpan harus Belanja');
assert.equal(resSimpan.transaction.dompetId, idDana, 'Dompet tersimpan harus ID DANA');
assert.equal(resSimpan.transaction.total, 5000, 'Total tersimpan harus 5000');

// Test 8: cariTransaksiCocok tidak boleh salah mengedit transaksi sembarangan jika tidak ada yang cocok
const matchSalah = run("cariTransaksiCocok('Ubah ke kategori belanja dan pakai metode pembayaran dana', db.transaksi)");
assert.equal(matchSalah, null, 'cariTransaksiCocok harus mengembalikan null jika tidak ada judul/terakhir yang cocok');

// Test 9: Simulasi Alur Penuh Chat (End-to-End kirimPesanAiChat)
console.log('Testing End-to-End Chat Flow with kirimPesanAiChat...');
run("localStorage.setItem('catatan-ai-consent-v1', 'setuju')");
run("localStorage.removeItem('catatan_ai_chat_history')");
await run("kirimPesanAiChat('Tolong catat beli kuota 2rb ya')");
const chatHistory1 = run("muatRiwayatAiChat()");
assert.equal(chatHistory1.length, 2, 'Riwayat harus berisi pesan user dan assistant');
const astMsg1 = chatHistory1[1];
assert.equal(astMsg1.role, 'assistant');
assert.ok(astMsg1.draftTransactions?.length, 'Harus ada draftTransactions');
const drafChat1 = astMsg1.draftTransactions[0];
assert.equal(drafChat1.title, 'Beli kuota');
assert.equal(drafChat1.amount, 2000);
assert.equal(drafChat1.paymentMethod, 'tunai', 'Draf awal tunai');
assert.equal(drafChat1.tersimpan, false);

// Follow-up dari user: Ubah ke kategori belanja dan pakai metode pembayaran dana
await run("kirimPesanAiChat('Ubah ke kategori belanja dan pakai metode pembayaran dana')");
const chatHistory2 = run("muatRiwayatAiChat()");
assert.equal(chatHistory2.length, 4, 'Riwayat bertambah pesan user ke-2 dan balasan assistant');
const astMsg2 = chatHistory2[3];
assert.equal(astMsg2.role, 'assistant');
assert.match(astMsg2.text, /Belanja/, 'Balasan harus menyebut kategori Belanja');
assert.match(astMsg2.text, /DANA/, 'Balasan harus menyebut metode DANA');
assert.ok(astMsg2.draftTransactions?.length, 'Harus menampilkan kartu draf terbarui');
const drafChat2 = astMsg2.draftTransactions[0];
assert.equal(drafChat2.category, 'Belanja', 'Kategori kartu draf harus terbarui jadi Belanja');
assert.equal(drafChat2.paymentMethod, 'nontunai', 'Metode pembayaran harus tetap nontunai');
assert.equal(drafChat2.walletName, 'DANA', 'Dompet kartu draf harus DANA');
assert.equal(drafChat2.amount, 2000, 'Nominal tidak berubah tetap 2000');

// Simpan draf langsung dari tombol Simpan di chat
run(`simpanTrxDariChat('${astMsg2.id}', '${drafChat2.id}')`);
const chatHistory3 = run("muatRiwayatAiChat()");
const drafTersimpan = chatHistory3[3].draftTransactions[0];
assert.equal(drafTersimpan.tersimpan, true, 'Status draf di riwayat harus tersimpan = true');
const trxTersimpan = db.transaksi.find(t => t.id === drafChat2.id || (t.judul === 'Beli kuota' && t.total === 2000));
assert.ok(trxTersimpan, 'Transaksi harus tersimpan di db.transaksi');
assert.equal(trxTersimpan.kategori, 'Belanja', 'Kategori transaksi di database harus Belanja');
assert.equal(trxTersimpan.cara, 'nontunai', 'Cara bayar transaksi di database harus nontunai');
assert.equal(trxTersimpan.dompetId, idDana, 'Dompet transaksi di database harus ID DANA');

// Test 10: Analisis Dompet DANA (Dana Analisis) via AI lokal
console.log('Testing Analisis Keuangan Dompet DANA...');
const analisisDana = run("jawabFinansialLokal('analisis dompet dana', siapkanKonteksAiChat())");
assert.ok(analisisDana, 'jawabFinansialLokal harus mengembalikan hasil analisis untuk DANA');
assert.match(analisisDana.reply, /Analisis Keuangan Dompet DANA/i, 'Judul analisis harus menyebut DANA');
assert.match(analisisDana.reply, /Saldo Saat Ini/i, 'Harus menampilkan saldo');
assert.match(analisisDana.reply, /Pengeluaran \(30 Hari\)/i, 'Harus menampilkan statistik pengeluaran 30 hari');
assert.match(analisisDana.reply, /Belanja/i, 'Harus menganalisis kategori pengeluaran DANA');

// Test 11: Cek Saldo Dompet DANA
const cekSaldoDana = run("jawabFinansialLokal('cek saldo dana', siapkanKonteksAiChat())");
assert.ok(cekSaldoDana, 'jawabFinansialLokal harus merespons kueri cek saldo DANA');
assert.match(cekSaldoDana.reply, /DANA/i, 'Balasan harus menyebut DANA');

// Test 12: Verifikasi Tombol Buka AI Chat (FAB & Top Header)
console.log('Testing FAB and Header AI buttons...');
assert.ok(run("typeof bukaDialogAiChat === 'function'"), 'bukaDialogAiChat harus terdefinisi sebagai fungsi');
const fabEl = run("document.getElementById('fabAiChat')");
assert.ok(fabEl, 'Elemen fabAiChat harus ada di DOM');
const topAiEl = run("document.getElementById('btnTopAiChat')");
assert.ok(topAiEl, 'Elemen btnTopAiChat harus ada di DOM');
const sideAiEl = run("document.getElementById('btnSideAiChat')");
assert.ok(sideAiEl, 'Elemen btnSideAiChat harus ada di DOM');

// Test 13: Verifikasi Akses AI ke Target Tabungan & Transaksi Berulang di Konteks
console.log('Testing AI Context for Savings Targets and Recurring Transactions...');
run(`
db.wishlist = [
  { id: 'w-1', nama: 'Beli Laptop', target: 10000000, tenggat: '2026-12-31' },
  { id: 'w-2', nama: 'Liburan Akhir Tahun', target: 3000000, tenggat: '' }
];
db.transaksi.push({
  id: 'trx-tab-1',
  tanggal: '2026-11-15',
  tipe: 'keluar',
  kategori: 'Tabungan',
  total: 4000000,
  wishId: 'w-1',
  status: 'aktif',
  cara: 'nontunai'
});
db.berulang = [
  { id: 'r-1', nama: 'Tagihan WiFi Indihome', tipe: 'keluar', kategori: 'Tagihan', qty: 1, harga: 350000, periode: 'bulan', mulai: '2026-01-01' },
  { id: 'r-2', nama: 'Tabungan Rutin Mingguan', tipe: 'keluar', kategori: 'Tabungan', qty: 1, harga: 50000, periode: 'minggu', mulai: '2026-01-01' },
  { id: 'r-3', nama: 'Gaji Kantor', tipe: 'masuk', kategori: 'Gaji', qty: 1, harga: 8000000, periode: 'bulan', mulai: '2026-01-01' }
];
`);

const ctxBaru = run("siapkanKonteksAiChat()");
assert.ok(Array.isArray(ctxBaru.targets), 'Konteks AI harus berisi array targets');
assert.equal(ctxBaru.targets.length, 2, 'Jumlah targets harus 2');
const targetLaptop = ctxBaru.targets.find(t => t.name === 'Beli Laptop');
assert.ok(targetLaptop, 'Target Beli Laptop harus ada di konteks');
assert.equal(targetLaptop.target, 10000000, 'Target laptop harus 10.000.000');
assert.equal(targetLaptop.collected, 4000000, 'Terkumpul harus 4.000.000 dari transaksi');
assert.equal(targetLaptop.remaining, 6000000, 'Sisa kekurangan harus 6.000.000');
assert.equal(targetLaptop.percent, 40, 'Persentase harus 40%');

assert.ok(Array.isArray(ctxBaru.recurring), 'Konteks AI harus berisi array recurring');
assert.equal(ctxBaru.recurring.length, 3, 'Jumlah recurring harus 3');
const recWifi = ctxBaru.recurring.find(r => r.name.includes('WiFi'));
assert.ok(recWifi, 'Tagihan WiFi harus ada di recurring');
assert.equal(recWifi.amount, 350000, 'Nominal tagihan WiFi harus 350.000');
assert.equal(recWifi.period, 'bulan', 'Periode WiFi harus bulanan');

// Test 14: AI Assistant merespons pertanyaan tentang Target Tabungan & Transaksi Berulang
console.log('Testing AI Assistant Queries for Targets and Recurring Transactions...');
const respTarget = run("jawabFinansialLokal('bagaimana progres target tabunganku?', siapkanKonteksAiChat())");
assert.ok(respTarget, 'AI harus merespons pertanyaan target tabungan');
assert.match(respTarget.reply, /Target Tabungan/i, 'Balasan harus menyebut Target Tabungan');
assert.match(respTarget.reply, /Beli Laptop/i, 'Balasan harus mencantumkan Beli Laptop');
assert.match(respTarget.reply, /40%/, 'Balasan harus mencantumkan persentase 40%');
assert.match(respTarget.reply, /6\.000\.000/, 'Balasan harus mencantumkan sisa kekurangan 6jt');

const respBerulang = run("jawabFinansialLokal('ada tagihan rutin apa saja?', siapkanKonteksAiChat())");
assert.ok(respBerulang, 'AI harus merespons pertanyaan transaksi berulang');
assert.match(respBerulang.reply, /Transaksi Berulang/i, 'Balasan harus menyebut Transaksi Berulang');
assert.match(respBerulang.reply, /WiFi Indihome/i, 'Balasan harus mencantumkan Tagihan WiFi');
assert.match(respBerulang.reply, /350\.000/, 'Balasan harus mencantumkan nominal WiFi');
assert.match(respBerulang.reply, /Gaji Kantor/i, 'Balasan harus mencantumkan pemasukan rutin');
assert.match(respBerulang.reply, /Estimasi Komitmen Rutin Bulanan/i, 'Balasan harus menghitung estimasi komitmen bulanan');

console.log('Semua pengujian unit draf AI, E-wallet DANA, Target Tabungan, dan Transaksi Berulang BERHASIL!');
