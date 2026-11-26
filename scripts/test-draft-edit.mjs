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
    prepend: () => {},
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
    prepend: () => {},
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
  window: { crypto: globalThis.crypto },
  crypto: globalThis.crypto,
  btoa: globalThis.btoa,
  atob: globalThis.atob,
  TextEncoder: globalThis.TextEncoder,
  TextDecoder: globalThis.TextDecoder,
  Uint8Array: globalThis.Uint8Array,
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
  confirm: () => true,
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

// Test 15: Opsi "Izinkan Saldo Minus" pada Dompet (PayLater / Kartu Kredit / Overdraft)
console.log('Testing Negative Balance Allowance for Wallets (PayLater/Credit Card)...');
run(`
db.dompet = [
  { id: 'w-reguler', nama: 'BCA Utama', jenis: 'bank', saldoAwal: 100000, arsip: false, izinkanMinus: false },
  { id: 'w-paylater', nama: 'SPayLater', jenis: 'wallet', saldoAwal: 0, arsip: false, izinkanMinus: true }
];
`);

const errReguler = run(`
cekSaldoDompet([
  { id: 't-1', tipe: 'keluar', total: 150000, dompetId: 'w-reguler', cara: 'nontunai', aktif: true }
])
`);
assert.match(errReguler, /Saldo BCA Utama akan kurang/i, 'Dompet reguler harus menolak saldo minus');

const errPaylater = run(`
cekSaldoDompet([
  { id: 't-2', tipe: 'keluar', total: 500000, dompetId: 'w-paylater', cara: 'nontunai', aktif: true }
])
`);
assert.equal(errPaylater, '', 'Dompet dengan izinkanMinus=true harus mengizinkan saldo minus tanpa error');

// Test 16: Web Crypto API Enkripsi & Dekripsi Backup JSON (AES-GCM 256-bit + PBKDF2)
console.log('Testing Web Crypto API Backup Encryption and Decryption (AES-GCM)...');
const testEncryptionScript = `
(async () => {
  const dummyData = JSON.stringify({
    versi: 4,
    transaksi: [{ id: 'tx-1', judul: 'Kopi Kenangan', total: 22000 }],
    saldoTotal: 500000
  });
  const passwordBenar = 'RahasiaSuperKuat123';
  const passwordSalah = 'SalahPasswordNya';

  const encryptedJson = await enkripsiDataBackup(dummyData, passwordBenar);
  const parsedEncrypted = JSON.parse(encryptedJson);
  if (parsedEncrypted.format !== 'catatan-keuangan-encrypted-v1') throw new Error('Format salah');
  if (!parsedEncrypted.salt || !parsedEncrypted.iv || !parsedEncrypted.ciphertext) throw new Error('Komponen kripto hilang');

  const decryptedObj = await dekripsiDataBackup(parsedEncrypted, passwordBenar);
  if (decryptedObj.transaksi[0].judul !== 'Kopi Kenangan') throw new Error('Data dekripsi tidak cocok');
  if (decryptedObj.saldoTotal !== 500000) throw new Error('Saldo dekripsi tidak cocok');

  let gagalBerhasil = false;
  try {
    await dekripsiDataBackup(parsedEncrypted, passwordSalah);
  } catch (err) {
    gagalBerhasil = true;
  }
  if (!gagalBerhasil) throw new Error('Password salah seharusnya ditolak');
  return true;
})()
`;

const cryptoResult = await run(testEncryptionScript);
assert.equal(cryptoResult, true, 'Enkripsi & dekripsi Web Crypto API harus berhasil dan menolak password salah');

// Test 17: Kunci Aplikasi (App Lock) PIN Hashing & Validation
console.log('Testing App Lock PIN Hashing, Locking, and Unlocking Logic...');
const testAppLockScript = `
(async () => {
  const pin1 = '5829';
  const pinSalah = '1234';

  const hash1 = await hashPin(pin1);
  const hash2 = await hashPin(pin1);
  const hashSalah = await hashPin(pinSalah);

  if (!hash1 || hash1.length !== 64) throw new Error('SHA-256 hash PIN tidak valid');
  if (hash1 !== hash2) throw new Error('Hash PIN harus deterministik');
  if (hash1 === hashSalah) throw new Error('Hash PIN berbeda harus menghasilkan hash berbeda');

  set.appLockAktif = true;
  set.appLockPinHash = hash1;
  kunciAplikasi();
  if (appLockUnlocked !== false) throw new Error('Aplikasi harus dalam keadaan terkunci');

  inputPinBuffer = '5829';
  const hashedInput = await hashPin(inputPinBuffer);
  if (hashedInput === set.appLockPinHash) {
    bukaKunciAplikasi();
  }
  if (appLockUnlocked !== true) throw new Error('Aplikasi harus terbuka setelah PIN benar');

  return true;
})()
`;

const appLockResult = await run(testAppLockScript);
assert.equal(appLockResult, true, 'Logika PIN hash dan status kunci aplikasi harus berhasil');

// Test 18: Ekstraksi Transaksi Lebih Dari 1 (Multi-Item Transaksi Terpisah)
console.log('Testing Multi-Transaction AI Extraction (>1 items)...');
const draftsMulti = run("ekstrakDrafTransaksiDariTeks('beli beras 50rb, telur 25rb, minyak 30rb')");
assert.equal(draftsMulti.length, 3, 'Harus menghasilkan 3 draf transaksi terpisah');
assert.equal(draftsMulti[0].amount, 50000, 'Nominal item 1 harus 50.000');
assert.equal(draftsMulti[1].amount, 25000, 'Nominal item 2 harus 25.000');
assert.equal(draftsMulti[2].amount, 30000, 'Nominal item 3 harus 30.000');

// Test 19: Ekstraksi Transaksi Gabungan Keranjang Belanja (Direct Merge / Cart)
console.log('Testing Direct Combined Cart Transaction Extraction...');
const draftsCart = run("ekstrakDrafTransaksiDariTeks('gabungkan beli beras 50rb, telur 25rb, minyak 30rb jadi 1 keranjang')");
assert.equal(draftsCart.length, 1, 'Harus menghasilkan 1 transaksi gabungan');
assert.equal(draftsCart[0].amount, 105000, 'Total transaksi gabungan harus 105.000');
assert.equal(draftsCart[0].items.length, 3, 'Harus memiliki 3 rincian barang dalam keranjang');
assert.equal(draftsCart[0].isCart, true, 'Flag isCart harus true');

// Test 20: Penggabungan Draf di Chat (gabungkanDrafChat) dan Simpan Transaksi Keranjang
console.log('Testing Chat Merge into Cart and Saving...');
const msgChatId = 'msg-chat-cart-test';
run(`
const msgObj = {
  id: '${msgChatId}',
  role: 'assistant',
  text: 'Siap! Saya sudah menyiapkan draf catatan.',
  draftTransactions: [
    {
      id: 'd-1',
      type: 'keluar',
      title: 'Makan siang',
      amount: 20000,
      category: 'Makan',
      paymentMethod: 'nontunai',
      walletName: 'DANA',
      walletId: '',
      date: hariIni(),
      tersimpan: false,
      items: [{ nama: 'Makan siang', qty: 1, satuan: '', harga: 20000, hargaTotal: 20000 }]
    },
    {
      id: 'd-2',
      type: 'keluar',
      title: 'Es teh manis',
      amount: 5000,
      category: 'Minuman',
      paymentMethod: 'nontunai',
      walletName: 'DANA',
      walletId: '',
      date: hariIni(),
      tersimpan: false,
      items: [{ nama: 'Es teh manis', qty: 1, satuan: '', harga: 5000, hargaTotal: 5000 }]
    }
  ],
  ts: Date.now()
};
simpanRiwayatAiChat([msgObj]);
`);

run(`gabungkanDrafChat('${msgChatId}')`);
const riwayatMerged = run(`muatRiwayatAiChat()`);
const msgMerged = riwayatMerged.find(m => m.id === msgChatId);
assert.equal(msgMerged.draftTransactions.length, 1, 'Draf setelah digabung harus menjadi 1 keranjang');
const cartDraf = msgMerged.draftTransactions[0];
assert.equal(cartDraf.amount, 25000, 'Total keranjang gabungan harus 25.000');
assert.equal(cartDraf.items.length, 2, 'Rincian keranjang harus berisi 2 item');

// Simpan transaksi keranjang ke database
run(`simpanTrxDariChat('${msgChatId}', '${cartDraf.id}')`);
const dbTrx = run("db.transaksi.find(t => t.total === 25000 && t.items && t.items.length === 2)");
assert.ok(dbTrx, 'Transaksi keranjang harus tersimpan di database');
assert.equal(dbTrx.total, 25000, 'Total transaksi tersimpan harus 25.000');
assert.equal(dbTrx.items.length, 2, 'Item keranjang tersimpan di database harus 2');

// Test 21: Deteksi Edit Relatif (Penambahan Nominal pada Transaksi yang Ada)
console.log('Testing Relative Amount Addition on Existing Transaction (Penyesuaian saldo 500k + 100k)...');
run(`
db.dompet.forEach(w => w.izinkanMinus = true);
const existingWIds = new Set(db.dompet.map(w => w.id));
db.transaksi.forEach(t => {
  if (t.dompetId && !existingWIds.has(t.dompetId)) {
    db.dompet.push({ id: t.dompetId, nama: 'Dompet ' + t.dompetId, jenis: 'wallet', saldoAwal: 1000000, izinkanMinus: true });
    existingWIds.add(t.dompetId);
  }
});
db.transaksi.push({
  id: 'trx-penyesuaian-500k',
  ts: Date.now(),
  tanggal: '2026-11-21',
  tipe: 'masuk',
  judul: 'Penyesuaian saldo',
  kategori: 'Saldo awal',
  items: [{ nama: 'Penyesuaian saldo', qty: 1, satuan: '', harga: 500000, hargaTotal: 500000 }],
  total: 500000,
  cara: 'tunai',
  dompetId: null
});
`);

const actEditTest = run(`deteksiAksiEditTrx('ada transaksi pemasukan penyesuaian saldo 500k nah itu tambahkan 100k')`);
assert.ok(actEditTest, 'Harus mendeteksi aksi edit transaksi');
assert.equal(actEditTest.targetId, 'trx-penyesuaian-500k', 'Target ID harus trx-penyesuaian-500k');
assert.equal(actEditTest.changes.amount, 600000, 'Nominal baru harus 600.000 (500k + 100k)');
assert.equal(actEditTest.oldValues.amount, 500000, 'Nominal lama harus 500.000');

// Eksekusi perubahan transaksi langsung
const resUpdate = run(`updateTransaksiLangsung('${actEditTest.targetId}', ${JSON.stringify(actEditTest.changes)})`);
assert.ok(resUpdate.ok, 'Update transaksi langsung harus berhasil: ' + (resUpdate.error || ''));
const updatedTrx = run(`db.transaksi.find(t => t.id === 'trx-penyesuaian-500k')`);
assert.equal(updatedTrx.total, 600000, 'Total di database harus terupdate menjadi 600.000');
assert.equal(updatedTrx.items[0].harga, 600000, 'Harga item harus ikut terupdate menjadi 600.000');

// Test 22: Fitur Sticky Notes (Catatan Tempel)
console.log('Testing Sticky Notes (Catatan Tempel) CRUD, Pin, Color, and Persistence...');
run(`
db.notes = [];
$('inpNoteJudul').value = 'Daftar Belanja';
$('txtNoteIsi').value = 'Beli susu, telur, dan roti tawar';
$('chkNotePinned').checked = false;
noteWarnaAktif = 'biru';
simpanNoteDariForm();
`);

let notesList = run('db.notes');
assert.equal(notesList.length, 1, 'Harus ada 1 catatan tempel tersimpan');
assert.equal(notesList[0].judul, 'Daftar Belanja');
assert.equal(notesList[0].isi, 'Beli susu, telur, dan roti tawar');
assert.equal(notesList[0].warna, 'biru');
assert.equal(notesList[0].pinned, false);

const firstNoteId = notesList[0].id;

// Test pin toggle
run(`togglePinNote('${firstNoteId}')`);
notesList = run('db.notes');
assert.equal(notesList[0].pinned, true, 'Catatan harus berhasil disematkan (pinned = true)');

// Tambah catatan kedua tanpa pin
run(`
noteEditId = null;
$('inpNoteJudul').value = 'Catatan Biasa';
$('txtNoteIsi').value = 'Ini catatan kedua yang tidak dipin';
$('chkNotePinned').checked = false;
noteWarnaAktif = 'hijau';
simpanNoteDariForm();
`);

notesList = run('db.notes');
assert.equal(notesList.length, 2, 'Harus ada 2 catatan tempel');

// Test update note
run(`
bukaFormNote('${firstNoteId}');
$('txtNoteIsi').value = 'Beli susu, telur, roti, dan keju';
simpanNoteDariForm();
`);
notesList = run('db.notes');
const updatedNote = notesList.find(n => n.id === firstNoteId);
assert.equal(updatedNote.isi, 'Beli susu, telur, roti, dan keju', 'Isi catatan harus terupdate');

// Test backup validation and candidate import with notes
const backupData = run(`
validasiBackupLedger({
  fiturData: 4,
  transaksi: [],
  dompet: [],
  transferDompet: [],
  notes: db.notes,
  uangFisik: { aktif: false, stok: stokKosong() }
})
`);
assert.equal(backupData.notes.length, 2, 'Backup ledger harus menyertakan 2 catatan');

// Test delete note
run(`
hapusNote('${firstNoteId}');
`);
notesList = run('db.notes');
assert.equal(notesList.length, 1, 'Setelah dihapus harus tersisa 1 catatan');
assert.equal(notesList[0].judul, 'Catatan Biasa');

// Test 23: Backup Export & Restore Integration for Sticky Notes
console.log('Testing Sticky Notes Export in buatBackupObjek and Restore in terapkanImportLedger...');
const exportedBackup = run('buatBackupObjek()');
assert.ok(Array.isArray(exportedBackup.notes), 'buatBackupObjek harus menyertakan array notes');
assert.equal(exportedBackup.notes.length, 1, 'Array notes dalam backup harus berisi 1 catatan');
assert.equal(exportedBackup.notes[0].judul, 'Catatan Biasa', 'Judul catatan dalam backup harus sesuai');

// Simulasikan database dikosongkan (seperti browser baru)
run('db.notes = []');
assert.equal(run('db.notes.length'), 0, 'Database notes harus kosong sebelum pemulihan');

// Lakukan import dalam mode 'pulihkan'
run(`
importLedgerDraft = { raw: ${JSON.stringify(exportedBackup)}, data: validasiBackupLedger(${JSON.stringify(exportedBackup)}) };
$('ledgerImportMode').value = 'pulihkan';
terapkanImportLedger();
$('btnWalletConfirmYes').onclick?.();
`);
notesList = run('db.notes');
assert.equal(notesList.length, 1, 'Catatan harus berhasil dipulihkan dari backup');
assert.equal(notesList[0].judul, 'Catatan Biasa', 'Judul catatan yang dipulihkan harus sesuai');

// Lakukan import dalam mode 'gabung' dengan catatan tambahan
const newIncomingBackup = JSON.parse(JSON.stringify(exportedBackup));
newIncomingBackup.notes.push({
  id: 'note-incoming-gabung-01',
  judul: 'Catatan dari Perangkat Lain',
  isi: 'Isi catatan yang digabung',
  warna: 'pink',
  pinned: true,
  ts: Date.now(),
  diubah: Date.now()
});

run(`
importLedgerDraft = { raw: ${JSON.stringify(newIncomingBackup)}, data: validasiBackupLedger(${JSON.stringify(newIncomingBackup)}) };
$('ledgerImportMode').value = 'gabung';
terapkanImportLedger();
`);
notesList = run('db.notes');
assert.equal(notesList.length, 2, 'Setelah digabung harus ada 2 catatan');
const noteGabungan = notesList.find(n => n.id === 'note-incoming-gabung-01');
assert.ok(noteGabungan, 'Catatan gabungan harus ada di database');
assert.equal(noteGabungan.judul, 'Catatan dari Perangkat Lain');
assert.equal(noteGabungan.warna, 'pink');
assert.equal(noteGabungan.pinned, true);

// Test 24: Sticky Notes Custom Hex Color Picker, Contrast, and Filter
console.log('Testing Sticky Notes Custom Hex Color Picker, Contrast Calculation, and Custom Filter...');
assert.equal(run(`normalWarnaNote('#ff5733')`), '#ff5733', 'Hex 6-digit harus valid');
assert.equal(run(`normalWarnaNote('#ABC')`), '#abc', 'Hex 3-digit harus valid dan dinormalisasi huruf kecil');
assert.equal(run(`normalWarnaNote('hijau')`), 'hijau', 'Preset warna hijau harus tetap valid');
assert.equal(run(`normalWarnaNote('warna-acak-asal')`), 'kuning', 'Warna tidak valid harus fallback ke kuning');

// Test hitungKontrasWarna
assert.equal(run(`hitungKontrasWarna('#000000')`), '#f8fafc', 'Warna hitam pekat harus menghasilkan teks terang');
assert.equal(run(`hitungKontrasWarna('#ffffff')`), '#1f2937', 'Warna putih bersih harus menghasilkan teks gelap');
assert.equal(run(`hitungKontrasWarna('#ffc6ff')`), '#1f2937', 'Warna pastel terang harus menghasilkan teks gelap');
assert.equal(run(`hitungKontrasWarna('#1e1b4b')`), '#f8fafc', 'Warna navy gelap harus menghasilkan teks terang');

// Buat catatan dengan custom hex color
run(`
noteEditId = null;
$('inpNoteJudul').value = 'Catatan Warna Custom Neon';
$('txtNoteIsi').value = 'Ini catatan dengan custom hex #9b5de5';
$('chkNotePinned').checked = true;
noteWarnaAktif = '#9b5de5';
simpanNoteDariForm();
`);

notesList = run('db.notes');
const customNote = notesList.find(n => n.judul === 'Catatan Warna Custom Neon');
assert.ok(customNote, 'Catatan warna kustom harus tersimpan di database');
assert.equal(customNote.warna, '#9b5de5', 'Warna harus tersimpan dalam format hex');
assert.equal(customNote.pinned, true, 'Catatan harus pinned');

// Test Filter Kustom
run(`
noteFilterWarna = 'kustom';
renderStickyNotes();
`);
const renderedContainer = run(`$('notesListContainer')`);
assert.ok(renderedContainer, 'Kontainer catatan tempel harus ada');

// Test backup export and restore with custom color note
const backupWithCustom = run('buatBackupObjek()');
const noteCustomInBackup = backupWithCustom.notes.find(n => n.warna === '#9b5de5');
assert.ok(noteCustomInBackup, 'Catatan dengan warna hex kustom harus ada di objek backup');
assert.equal(noteCustomInBackup.judul, 'Catatan Warna Custom Neon');

// Test 25: Custom Finance Name & Branding Setting
console.log('Testing Custom Finance Name (Kustomisasi Nama Keuangan) & Branding...');
assert.equal(run('namaKeuanganTampil()'), 'Catatan Keuangan', 'Default nama keuangan harus Catatan Keuangan');

// Ubah nama keuangan kustom menjadi "Keuangan Roy"
run(`
tampilan.namaKeuangan = 'Keuangan Roy';
simpanTampilan();
perbaruiNamaKeuangan();
`);

assert.equal(run('ambilNamaKeuangan()'), 'Keuangan Roy', 'Nama keuangan kustom harus terbaca');
assert.equal(run('namaKeuanganTampil()'), 'Keuangan Roy', 'Nama tampilan harus Keuangan Roy');
assert.equal(run("$('appHeaderTitle')?.textContent"), 'Keuangan Roy', 'Header h1 harus menampilkan Keuangan Roy');
assert.equal(run("$('uiSidebarCaption')?.textContent"), 'Ruang Keuangan Roy', 'Sidebar caption harus terupdate');
assert.ok(run("document.title.includes('Keuangan Roy')"), 'Document title harus menyertakan nama kustom');

// Test tombol reset nama kembali ke default
run(`$('btnResetNamaKeuangan')?.onclick?.()`);
assert.equal(run('ambilNamaKeuangan()'), '', 'Nama kustom harus kosong setelah reset');
assert.equal(run('namaKeuanganTampil()'), 'Catatan Keuangan', 'Nama tampilan harus kembali ke default');
assert.equal(run("$('appHeaderTitle')?.textContent"), 'Catatan Keuangan', 'Header h1 harus kembali ke Catatan Keuangan');

// Test saran cepat nama
run(`
tampilan.namaKeuangan = 'Keuangan Keluarga';
simpanTampilan();
perbaruiNamaKeuangan();
`);
assert.equal(run('namaKeuanganTampil()'), 'Keuangan Keluarga', 'Saran nama kustom Keuangan Keluarga harus aktif');

// Test persistensi backup dan import restore
const backupCustomName = run('buatBackupObjek()');
assert.equal(backupCustomName.tampilan?.namaKeuangan, 'Keuangan Keluarga', 'Nama kustom harus masuk ke objek backup');

run(`
tampilan.namaKeuangan = '';
simpanTampilan();
terapkanTampilan();
`);
assert.equal(run('namaKeuanganTampil()'), 'Catatan Keuangan', 'Harus reset sebelum restore');

run(`
importLedgerDraft = { raw: ${JSON.stringify(backupCustomName)}, data: validasiBackupLedger(${JSON.stringify(backupCustomName)}) };
$('ledgerImportMode').value = 'pulihkan';
terapkanImportLedger();
$('btnWalletConfirmYes')?.onclick?.();
`);
assert.equal(run('namaKeuanganTampil()'), 'Keuangan Keluarga', 'Nama keuangan kustom harus berhasil dipulihkan dari backup');

// Test 26: AI Assistant Comprehensive App Feature Knowledge & Explanations
console.log('Testing AI Assistant Comprehensive Feature Knowledge & Explanations...');

// 26.1: Ikhtisar Seluruh Fitur (All features overview)
const respAllFeatures = run("jawabFinansialLokal('apa saja fitur yang ada di web ini?', siapkanKonteksAiChat())");
assert.ok(respAllFeatures, 'AI harus merespons kueri ikhtisar seluruh fitur');
assert.match(respAllFeatures.reply, /Panduan Lengkap Fitur/i, 'Harus mencantumkan judul Panduan Lengkap Fitur');
assert.match(respAllFeatures.reply, /Dompet Multi-Akun & Uang Fisik/i, 'Harus menjelaskan fitur dompet');
assert.match(respAllFeatures.reply, /Catat Transaksi Cepat & Keranjang Belanja/i, 'Harus menjelaskan fitur catat transaksi');
assert.match(respAllFeatures.reply, /Catatan Tempel \(Sticky Notes 3D\)/i, 'Harus menjelaskan fitur catatan tempel');
assert.match(respAllFeatures.reply, /Batas Anggaran \(Budget\)/i, 'Harus menjelaskan batas anggaran');
assert.match(respAllFeatures.reply, /Target Tabungan & Impian/i, 'Harus menjelaskan target tabungan');
assert.match(respAllFeatures.reply, /Transaksi Berulang & Tagihan Rutin/i, 'Harus menjelaskan transaksi berulang');
assert.match(respAllFeatures.reply, /Status Catatan \(Aktif\/Nonaktif\)/i, 'Harus menjelaskan status catatan');
assert.match(respAllFeatures.reply, /Grafik & Analisis Visual/i, 'Harus menjelaskan grafik');
assert.match(respAllFeatures.reply, /Tampilan & Personalisasi/i, 'Harus menjelaskan tampilan');
assert.match(respAllFeatures.reply, /Keamanan & Backup Terenkripsi/i, 'Harus menjelaskan keamanan dan backup');
assert.match(respAllFeatures.reply, /PWA & 100% Offline/i, 'Harus menjelaskan PWA offline');
assert.ok(respAllFeatures.followUpSuggestions?.includes('Fitur Sticky Notes'), 'Harus menyarankan follow-up Sticky Notes');

// 26.2: Fitur Sticky Notes / Catatan Tempel
const respStickyNotes = run("jawabFinansialLokal('bagaimana cara pakai sticky notes?', siapkanKonteksAiChat())");
assert.ok(respStickyNotes, 'AI harus merespons kueri fitur sticky notes');
assert.match(respStickyNotes.reply, /Fitur Catatan Tempel \(Sticky Notes 3D\)/i, 'Harus ada judul sticky notes');
assert.match(respStickyNotes.reply, /Desain 3D Realistis/i, 'Harus menyebut desain 3D');
assert.match(respStickyNotes.reply, /Pemilih Warna Kustom 16 Juta Warna/i, 'Harus menyebut custom color picker');
assert.match(respStickyNotes.reply, /Kontras Teks Cerdas \(WCAG\)/i, 'Harus menyebut kontras teks dinamis');
assert.match(respStickyNotes.reply, /Sematkan Catatan \(Pin\)/i, 'Harus menyebut fitur pin');

// 26.3: Fitur Dompet, Transfer, Tarik Tunai & PayLater
const respTransfer = run("jawabFinansialLokal('bagaimana cara transfer saldo antar dompet?', siapkanKonteksAiChat())");
assert.ok(respTransfer, 'AI harus merespons kueri transfer saldo');
assert.match(respTransfer.reply, /Fitur Dompet, Tunai & Transfer Saldo/i, 'Harus ada judul dompet dan transfer');
assert.match(respTransfer.reply, /Pindahkan Uang/i, 'Harus menjelaskan pindahkan uang');
assert.match(respTransfer.reply, /Tarik Tunai/i, 'Harus menjelaskan tarik tunai');

const respPayLater = run("jawabFinansialLokal('apakah aplikasi ini mendukung paylater atau saldo minus?', siapkanKonteksAiChat())");
assert.ok(respPayLater, 'AI harus merespons kueri paylater/saldo minus');
assert.match(respPayLater.reply, /Saldo Minus \(PayLater \/ Kartu Kredit\)/i, 'Harus menjelaskan saldo negatif untuk paylater');

// 26.4: Fitur Backup, Enkripsi AES-GCM & Google Drive
const respBackupDrive = run("jawabFinansialLokal('bagaimana cara backup data ke google drive?', siapkanKonteksAiChat())");
assert.ok(respBackupDrive, 'AI harus merespons kueri backup google drive');
assert.match(respBackupDrive.reply, /Fitur Backup, Enkripsi AES-GCM & Google Drive Sync/i, 'Harus ada judul backup drive');
assert.match(respBackupDrive.reply, /Enkripsi Kriptografi Militer \(AES-GCM\)/i, 'Harus menyebut enkripsi AES-GCM');
assert.match(respBackupDrive.reply, /Google Drive Terintegrasi/i, 'Harus menyebut Google Drive');
assert.match(respBackupDrive.reply, /Gabung Data/i, 'Harus menjelaskan mode gabung');
assert.match(respBackupDrive.reply, /Pulihkan Total/i, 'Harus menjelaskan mode pulihkan total');

// 26.5: Fitur Keamanan PIN & Sensor Privasi Saldo
const respSecurity = run("jawabFinansialLokal('bagaimana cara mengunci aplikasi dengan PIN?', siapkanKonteksAiChat())");
assert.ok(respSecurity, 'AI harus merespons kueri keamanan aplikasi');
assert.match(respSecurity.reply, /Fitur Keamanan & Privasi Tingkat Tinggi/i, 'Harus ada judul keamanan');
assert.match(respSecurity.reply, /Kunci Aplikasi \(App Lock PIN\)/i, 'Harus menyebut app lock PIN');
assert.match(respSecurity.reply, /SHA-256/i, 'Harus menyebut SHA-256');
assert.match(respSecurity.reply, /Sensor Saldo \(Mode Privasi\)/i, 'Harus menyebut sensor saldo');

// 26.6: Fitur Gaya Tampilan, Tema & Kustomisasi Nama
const respStyles = run("jawabFinansialLokal('ada gaya tampilan apa saja di web ini?', siapkanKonteksAiChat())");
assert.ok(respStyles, 'AI harus merespons kueri gaya dan tampilan');
assert.match(respStyles.reply, /Fitur Gaya, Tema & Personalisasi Tampilan/i, 'Harus ada judul gaya dan tema');
assert.match(respStyles.reply, /Kustomisasi Nama Keuangan/i, 'Harus menyebut kustomisasi nama');
assert.match(respStyles.reply, /23 Gaya Visual Eksklusif/i, 'Harus menyebut 23 gaya visual');
assert.match(respStyles.reply, /Ruang Ide/i, 'Harus menyebut gaya Ruang Ide');

// 26.7: Fitur Status Catatan (Aktif/Nonaktif) & Ekspor
const respStatusCatatan = run("jawabFinansialLokal('apa fungsi status catatan nonaktif?', siapkanKonteksAiChat())");
assert.ok(respStatusCatatan, 'AI harus merespons kueri status catatan nonaktif');
assert.match(respStatusCatatan.reply, /Status Catatan Inovatif \(Aktif\/Nonaktif\)/i, 'Harus menjelaskan status catatan');
assert.match(respStatusCatatan.reply, /Ekspor Tabel CSV \/ Excel/i, 'Harus menjelaskan ekspor CSV/Excel');
assert.match(respStatusCatatan.reply, /Laporan PDF/i, 'Harus menjelaskan laporan PDF');

// 26.8: Fitur Smart Input, Suara & Keranjang Belanja
const respSmartInput = run("jawabFinansialLokal('bagaimana cara menggunakan smart input suara mikrofon?', siapkanKonteksAiChat())");
assert.ok(respSmartInput, 'AI harus merespons kueri smart input');
assert.match(respSmartInput.reply, /Fitur Smart Input, Suara & Keranjang Belanja/i, 'Harus menjelaskan smart input');
assert.match(respSmartInput.reply, /Input Suara \(Mikrofon\)/i, 'Harus menjelaskan input suara');
assert.match(respSmartInput.reply, /Keranjang Belanja Multi-Item/i, 'Harus menjelaskan keranjang belanja');

// 26.9: Fitur PWA & Offline
const respPwa = run("jawabFinansialLokal('apakah aplikasi ini bisa dipakai offline tanpa internet?', siapkanKonteksAiChat())");
assert.ok(respPwa, 'AI harus merespons kueri offline dan PWA');
assert.match(respPwa.reply, /Fitur PWA \(Progressive Web App\) & Akses 100% Offline/i, 'Harus ada judul PWA offline');
assert.match(respPwa.reply, /Berjalan Penuh 100% Tanpa Internet/i, 'Harus menjelaskan offline tanpa internet');

// 26.10: Panduan Cara Pakai Budget, Target & Transaksi Berulang
const respCaraBudget = run("jawabFinansialLokal('bagaimana cara membuat batas anggaran?', siapkanKonteksAiChat())");
assert.match(respCaraBudget.reply, /Cara Menggunakan Batas Anggaran \(Budget\)/i, 'Harus memberi panduan cara budget');

const respCaraTarget = run("jawabFinansialLokal('bagaimana cara menggunakan target tabungan?', siapkanKonteksAiChat())");
assert.match(respCaraTarget.reply, /Cara Menggunakan Target Tabungan \(Wishlist & Impian\)/i, 'Harus memberi panduan cara target tabungan');

const respCaraBerulang = run("jawabFinansialLokal('bagaimana cara mengatur transaksi berulang?', siapkanKonteksAiChat())");
assert.match(respCaraBerulang.reply, /Cara Menggunakan Transaksi Berulang & Tagihan Rutin/i, 'Harus memberi panduan cara transaksi berulang');

// Test 27: Security, Math Parser, Markdown Renderer, PBKDF2 Cooldown, Pagination & IndexedDB Media
console.log('Testing Security Hardening, Safe Math Parser, Markdown Renderer, Pagination & Media Cache...');

// 27.1: Safe Math Parser (tanpa new Function / eval)
assert.equal(run("hitungEkspresiAman('25000+15000*2')"), 55000, 'Prioritas perkalian harus benar');
assert.equal(run("hitungEkspresiAman('(100+50)/3')"), 50, 'Tanda kurung dan pembagian harus benar');
assert.equal(run("hitungEkspresiAman('-50+20')"), -30, 'Unary minus harus didukung');
assert.ok(Number.isNaN(run("hitungEkspresiAman('10/0')")), 'Pembagian nol harus mengembalikan NaN');
assert.ok(Number.isNaN(run("hitungEkspresiAman('alert(1)')")), 'Ekspresi non-matematika harus ditolak');

// 27.2: Safe Markdown Renderer (XSS-safe DOM nodes)
const mdNodes = run(`
  (() => {
    const c = { children: [], appendChild(n) { this.children.push(n); } };
    isiBubbleMarkdownAman(c, 'Halo **Dunia** dan *Miring* serta \`kode\` <script>alert(1)</script>');
    return c.children.map(n => ({ tag: n.tagName || '#text', text: n.textContent }));
  })()
`);
assert.ok(mdNodes.some(n => n.tag === 'STRONG' && n.text === 'Dunia'), 'Teks **bold** harus jadi elemen STRONG');
assert.ok(mdNodes.some(n => n.tag === 'EM' && n.text === 'Miring'), 'Teks *italic* harus jadi elemen EM');
assert.ok(mdNodes.some(n => n.tag === 'CODE' && n.text === 'kode'), 'Teks \`code\` harus jadi elemen CODE');
assert.ok(!mdNodes.some(n => n.tag === 'SCRIPT'), 'Tag HTML berbahaya tidak boleh dibuat sebagai elemen');

// 27.3: App Lock PBKDF2 Migration & Brute-force Cooldown
const appLockHardeningOk = await run(`
  (async () => {
    set.appLockSalt = '';
    set.appLockFails = 0;
    set.appLockLockedUntil = 0;
    const legacyHash = await hashPinLegacy('2468');
    set.appLockPinHash = legacyHash;
    set.appLockAktif = true;

    // Verifikasi legacy harus sukses dan otomatis migrasi ke PBKDF2 + salt unik
    const okLegacy = await verifikasiPinAppLock('2468');
    if (!okLegacy) throw new Error('PIN legacy harus valid');
    if (!set.appLockSalt || set.appLockSalt.length < 16) throw new Error('Salt unik harus dibuat saat migrasi');
    if (set.appLockPinHash === legacyHash) throw new Error('Hash harus bermigrasi ke PBKDF2');

    // Simulasi 5x salah PIN memicu cooldown 30 detik
    for (let i = 0; i < 5; i++) {
      inputPinBuffer = '999';
      await handlePinInput('9');
      inputPinBuffer = '';
    }
    if (sisaCooldownAppLock() <= 0) throw new Error('Cooldown harus aktif setelah 5x salah PIN');
    set.appLockFails = 0;
    set.appLockLockedUntil = 0;
    return true;
  })()
`);
assert.equal(appLockHardeningOk, true, 'Migrasi PBKDF2 dan cooldown App Lock harus berfungsi');

// 27.4: Media Cache & Backup Resolution
run(`
  mediaCache.set('trx:media-test-1', 'data:image/png;base64,AAA');
  db.transaksi.push(normal({ id: 'media-test-1', tanggal: hariIni(), tipe: 'keluar', judul: 'Tes Foto', kategori: 'Belanja', items: [{ nama: 'Tes', qty: 1, harga: 1000 }], total: 1000, foto: 'idb:trx:media-test-1' }));
`);
assert.equal(run("ambilFoto('idb:trx:media-test-1')"), 'data:image/png;base64,AAA', 'ambilFoto harus menyelesaikan pointer idb:');
const backupMedia = run('buatBackupObjek()');
const trxMediaInBackup = backupMedia.transaksi.find(t => t.id === 'media-test-1');
assert.equal(trxMediaInBackup?.foto, 'data:image/png;base64,AAA', 'Backup harus menyertakan data foto asli dari mediaCache');

// 27.5: Paginasi Riwayat (>50 transaksi)
const paginationRes = run(`
  (() => {
    $('rTipe').value = 'semua';
    $('rStatus').value = 'aktif';
    $('rDari').value = '';
    $('rSampai').value = '';
    $('rCari').value = '';
    for (let i = 0; i < 55; i++) {
      db.transaksi.push(normal({ id: 'page-' + i, tanggal: hariIni(), tipe: 'keluar', judul: 'Item ' + i, kategori: 'Lainnya', items: [{ nama: 'Item ' + i, qty: 1, harga: 1000 }], total: 1000 }));
    }
    const appended = [];
    const rListEl = $('rList');
    const origReplace = rListEl.replaceChildren;
    const origAppend = rListEl.append;
    rListEl.replaceChildren = (...args) => { appended.length = 0; appended.push(...args); };
    rListEl.append = (...args) => { appended.push(...args); };
    renderRiwayat(true);
    rListEl.replaceChildren = origReplace;
    rListEl.append = origAppend;
    return {
      totalTerlihat: ledgerTerlihat.length,
      renderedCount: appended.length,
      lastText: appended[appended.length - 1]?.textContent || ''
    };
  })()
`);
assert.ok(paginationRes.totalTerlihat > 50, 'Total transaksi terfilter harus > 50');
assert.equal(paginationRes.renderedCount, 51, 'DOM harus merender maksimal 50 baris + 1 tombol Muat lebih banyak');
assert.match(paginationRes.lastText, /Muat lebih banyak/i, 'Tombol Muat lebih banyak harus muncul');

// Test 28: Kalender Cashflow (Integrasi Grafik & Variasi BG per Gaya)
console.log('Testing Cashflow Calendar integration and bg-v* assignment...');
assert.equal(run("angkaRingkasKalender(1500000)"), '1,5jt', 'Format ringkas jutaan harus 1,5jt');
assert.equal(run("angkaRingkasKalender(45000)"), '45rb', 'Format ringkas ribuan harus 45rb');

const calRes = run(`
  (() => {
    const tgl = hariIni();
    calTahun = Number(tgl.slice(0, 4));
    calBulan = Number(tgl.slice(5, 7)) - 1;
    calTanggalDipilih = tgl;
    calMode = 'semua';

    const gridChildren = [];
    const calGridEl = $('calGrid');
    const origReplace = calGridEl.replaceChildren;
    const origAppend = calGridEl.appendChild;
    calGridEl.replaceChildren = (...a) => { gridChildren.length = 0; gridChildren.push(...a); };
    calGridEl.appendChild = n => { gridChildren.push(n); };

    renderKalenderCashflow();

    calGridEl.replaceChildren = origReplace;
    calGridEl.appendChild = origAppend;

    const dayButtons = gridChildren.filter(n => n && n.tagName === 'BUTTON');
    return {
      dayCount: dayButtons.length,
      title: $('calMonthTitle').textContent,
      detailTitle: $('calDetailTitle').textContent,
      detailSub: $('calDetailSub').textContent
    };
  })()
`);
assert.ok(calRes.dayCount >= 28 && calRes.dayCount <= 31, 'Kalender harus merender 28-31 tombol tanggal');
assert.ok(calRes.title.length > 4, 'Judul bulan kalender harus terisi');
assert.match(calRes.detailSub, /Masuk Rp .*Keluar Rp /i, 'Ringkasan tanggal terpilih harus menampilkan Masuk dan Keluar');

console.log('Semua pengujian unit draf AI, multi-item, keranjang gabungan, E-wallet DANA, Target Tabungan, Transaksi Berulang, Dompet PayLater, Enkripsi Backup, Kunci Aplikasi PBKDF2, Edit Relatif Transaksi, Sticky Notes Realistis, Custom Color Picker, Custom Finance Name, Pengetahuan Fitur AI, Safe Math/Markdown, Paginasi, Media Cache, Kalender Cashflow, dan Backup/Restore BERHASIL!');
