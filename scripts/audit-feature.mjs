import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script, 'Script utama index.html harus ada');

const store = new Map();
const localStorage = {
  getItem: k => store.get(k) ?? null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k),
  clear: () => store.clear()
};

const makeClassList = () => ({
  add: () => {},
  remove: () => {},
  contains: () => false,
  toggle: () => {}
});
const makeStyle = () => ({ setProperty: () => {}, removeProperty: () => {} });

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
  window: { crypto: globalThis.crypto },
  crypto: globalThis.crypto,
  btoa: globalThis.btoa,
  atob: globalThis.atob,
  TextEncoder: globalThis.TextEncoder,
  TextDecoder: globalThis.TextDecoder,
  Uint8Array: globalThis.Uint8Array,
  document,
  fetch: async () => ({ ok: true, json: async () => ({ data: {} }) }),
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
  Option: function (t, v) { this.text = t; this.value = v; },
  setTimeout: () => 1,
  clearTimeout: () => {},
  setInterval: () => 1,
  clearInterval: () => {},
  Intl, Date, Math, Number, String, Array, Object, RegExp, JSON, Boolean,
  parseFloat, parseInt, isNaN, isFinite, AbortController
};
context.window = context;
context.globalThis = context;
vm.createContext(context);
vm.runInContext(script, context);

const run = expr => vm.runInContext(expr, context);

console.log('====================================================');
console.log('   SYSTEMATIC AUDIT: AI MULTI-ITEM & CART MERGING   ');
console.log('====================================================\n');

const auditResults = [];

function recordAudit(testId, name, pass, detail) {
  auditResults.push({ testId, name, pass, detail });
  const statusIcon = pass ? '✅ PASS' : '❌ FAIL';
  console.log(`[${statusIcon}] ${testId}: ${name}`);
  if (detail) console.log(`       Detail: ${detail}`);
}

// -------------------------------------------------------------
// AUDIT 1: Punctuation & Complex Connectives Parsing
// -------------------------------------------------------------
try {
  // Comma separated
  const d1 = run("ekstrakDrafTransaksiDariTeks('sabun 10rb, odol 5rb, sampo 15rb')");
  assert.equal(d1.length, 3, 'Koma: harus menghasilkan 3 item');
  assert.equal(d1[0].amount, 10000);
  assert.equal(d1[1].amount, 5000);
  assert.equal(d1[2].amount, 15000);

  // Semicolon & Newlines
  const d2 = run("ekstrakDrafTransaksiDariTeks('beli nasi uduk 15rb; es teh 3rb\\ngorengan 5rb')");
  assert.equal(d2.length, 3, 'Titik koma & Baris baru: harus menghasilkan 3 item');
  assert.equal(d2[0].amount, 15000);
  assert.equal(d2[1].amount, 3000);
  assert.equal(d2[2].amount, 5000);

  // Numbered list: 1. ... 2. ... 3. ...
  const d3 = run("ekstrakDrafTransaksiDariTeks('1. bayar wifi 350rb 2. pulsa 50rb 3. bensin 20rb')");
  assert.equal(d3.length, 3, 'Penomoran: harus menghasilkan 3 item');
  assert.equal(d3[0].amount, 350000);
  assert.equal(d3[1].amount, 50000);
  assert.equal(d3[2].amount, 20000);

  // Plus sign
  const d4 = run("ekstrakDrafTransaksiDariTeks('kopi 18rb + donat 12rb')");
  assert.equal(d4.length, 2, 'Tanda plus: harus menghasilkan 2 item');
  assert.equal(d4[0].amount, 18000);
  assert.equal(d4[1].amount, 12000);

  recordAudit('AUDIT-1', 'Punctuation & Complex Connectives (comma, semicolon, newline, numbered, plus)', true, 'All 4 formats accurately parsed into distinct drafts');
} catch (err) {
  recordAudit('AUDIT-1', 'Punctuation & Complex Connectives', false, err.message);
}

// -------------------------------------------------------------
// AUDIT 2: Multi-Item with Wallet Detection (Shared & Specific)
// -------------------------------------------------------------
try {
  // Shared wallet across multiple items
  const dWallets1 = run("ekstrakDrafTransaksiDariTeks('beli bensin 30rb dan makan 20rb pakai DANA')");
  assert.equal(dWallets1.length, 2);
  assert.equal(dWallets1[0].paymentMethod, 'nontunai');
  assert.equal(dWallets1[0].walletName, 'DANA');
  assert.equal(dWallets1[1].paymentMethod, 'nontunai');
  assert.equal(dWallets1[1].walletName, 'DANA');

  // Per-item specific wallet
  const dWallets2 = run("ekstrakDrafTransaksiDariTeks('beli pulsa 50rb DANA, bayar listrik 100rb BCA, beli kopi 15rb tunai')");
  assert.equal(dWallets2.length, 3);
  assert.equal(dWallets2[0].walletName, 'DANA');
  assert.equal(dWallets2[0].paymentMethod, 'nontunai');
  assert.equal(dWallets2[1].walletName, 'BCA');
  assert.equal(dWallets2[1].paymentMethod, 'nontunai');
  assert.equal(dWallets2[2].walletName, 'Tunai');
  assert.equal(dWallets2[2].paymentMethod, 'tunai');

  recordAudit('AUDIT-2', 'Multi-Item Payment Method & E-Wallet Inheritance', true, 'Shared wallet correctly propagates; item-specific wallets cleanly assigned');
} catch (err) {
  recordAudit('AUDIT-2', 'Multi-Item Payment Method & E-Wallet Inheritance', false, err.message);
}

// -------------------------------------------------------------
// AUDIT 3: Direct Cart Prompts (Various Indonesian Phrasings)
// -------------------------------------------------------------
try {
  // Phrasing A: "gabungkan transaksi X dan Y"
  const c1 = run("ekstrakDrafTransaksiDariTeks('gabungkan transaksi makan 20rb dan minum 5rb')");
  assert.equal(c1.length, 1);
  assert.equal(c1[0].amount, 25000);
  assert.equal(c1[0].items.length, 2);
  assert.equal(c1[0].isCart, true);

  // Phrasing B: "satukan belanja X, Y jadi 1 keranjang"
  const c2 = run("ekstrakDrafTransaksiDariTeks('satukan belanja beras 50rb, telur 25rb jadi 1 keranjang')");
  assert.equal(c2.length, 1);
  assert.equal(c2[0].amount, 75000);
  assert.equal(c2[0].items.length, 2);
  assert.equal(c2[0].isCart, true);

  // Phrasing C: "beli X dan Y jadi satu"
  const c3 = run("ekstrakDrafTransaksiDariTeks('beli mie 10rb dan teh 5rb jadi satu')");
  assert.equal(c3.length, 1);
  assert.equal(c3[0].amount, 15000);
  assert.equal(c3[0].items.length, 2);

  // Phrasing D: "masukkan ke keranjang belanja: X, Y"
  const c4 = run("ekstrakDrafTransaksiDariTeks('masukkan ke keranjang belanja: apel 20rb, jeruk 15rb')");
  assert.equal(c4.length, 1);
  assert.equal(c4[0].amount, 35000);
  assert.equal(c4[0].items.length, 2);

  recordAudit('AUDIT-3', 'Direct Cart Prompts Phrasings Coverage', true, 'All 4 colloquial phrasing variations correctly identified as 1 merged cart draft');
} catch (err) {
  recordAudit('AUDIT-3', 'Direct Cart Prompts Phrasings Coverage', false, err.message);
}

// -------------------------------------------------------------
// AUDIT 4: Follow-up Chat Merging via gabungkanDrafChat
// -------------------------------------------------------------
try {
  const msgAuditId = 'msg-audit-merge';
  run(`
    const testMsg = {
      id: '${msgAuditId}',
      role: 'assistant',
      text: 'Berikut draf catatan:',
      draftTransactions: [
        { id: 'd-a', type: 'keluar', title: 'Ayam geprek', amount: 18000, category: 'Makan', paymentMethod: 'tunai', walletName: 'Tunai', date: hariIni(), tersimpan: false, items: [{ nama: 'Ayam geprek', qty: 1, satuan: '', harga: 18000, hargaTotal: 18000 }] },
        { id: 'd-b', type: 'keluar', title: 'Es jeruk', amount: 5000, category: 'Minuman', paymentMethod: 'tunai', walletName: 'Tunai', date: hariIni(), tersimpan: false, items: [{ nama: 'Es jeruk', qty: 1, satuan: '', harga: 5000, hargaTotal: 5000 }] }
      ]
    };
    simpanRiwayatAiChat([testMsg]);
  `);

  const mergeSuccess = run(`gabungkanDrafChat('${msgAuditId}')`);
  assert.equal(mergeSuccess, true);

  const hist = run(`muatRiwayatAiChat()`);
  const m = hist.find(x => x.id === msgAuditId);
  assert.equal(m.draftTransactions.length, 1);
  assert.equal(m.draftTransactions[0].amount, 23000);
  assert.equal(m.draftTransactions[0].items.length, 2);
  assert.equal(m.draftTransactions[0].isCart, true);

  // Calling merge again when already 1 cart should safely return false/noop
  const secondMerge = run(`gabungkanDrafChat('${msgAuditId}')`);
  assert.equal(secondMerge, false, 'Merge pada pesan yang sudah 1 draf harus false/noop tanpa merusak data');

  recordAudit('AUDIT-4', 'Interactive Chat Merging & Idempotency', true, 'Drafts merged accurately; idempotent guard prevents double-merge corruption');
} catch (err) {
  recordAudit('AUDIT-4', 'Interactive Chat Merging & Idempotency', false, err.message);
}

// -------------------------------------------------------------
// AUDIT 5: Direct Database Preservation (simpanTransaksiLangsung)
// -------------------------------------------------------------
try {
  const cartToSave = {
    type: 'keluar',
    title: 'Belanja Dapur Mingguan',
    amount: 145000,
    category: 'Belanja',
    paymentMethod: 'nontunai',
    walletName: 'DANA',
    items: [
      { nama: 'Beras 5kg', qty: 1, satuan: 'karung', harga: 75000, hargaTotal: 75000 },
      { nama: 'Minyak Goreng 2L', qty: 1, satuan: 'pouch', harga: 38000, hargaTotal: 38000 },
      { nama: 'Telur Ayam 1kg', qty: 1, satuan: 'kg', harga: 32000, hargaTotal: 32000 }
    ]
  };

  const saveRes = run(`simpanTransaksiLangsung(${JSON.stringify(cartToSave)})`);
  assert.equal(saveRes.ok, true);
  const savedTrx = saveRes.transaction;
  assert.equal(savedTrx.total, 145000);
  assert.equal(savedTrx.items.length, 3);
  assert.equal(savedTrx.items[0].nama, 'Beras 5kg');
  assert.equal(savedTrx.items[1].nama, 'Minyak Goreng 2L');
  assert.equal(savedTrx.items[2].nama, 'Telur Ayam 1kg');

  // Verify in db.transaksi directly
  const foundInDb = run(`db.transaksi.find(t => t.id === '${savedTrx.id}')`);
  assert.ok(foundInDb);
  assert.equal(foundInDb.items.length, 3);

  recordAudit('AUDIT-5', 'Database Integrity & Item Breakdown Preservation', true, 'Full 3-item cart details preserved in db.transaksi exactly');
} catch (err) {
  recordAudit('AUDIT-5', 'Database Integrity & Item Breakdown Preservation', false, err.message);
}

// -------------------------------------------------------------
// AUDIT 6: Form Transfer & Shopping Cart Population (bukaDrafDiFormCatat)
// -------------------------------------------------------------
try {
  run(`
    konfirmasiDompet = (t, m, cb) => cb();
    $('tipe').value = 'keluar';
    $('iCara').value = 'tunai';
    $('iQty').value = '1';
    $('iModeHarga').value = 'total';
    $('kategori').value = KAT.keluar[0];
    $('tgl').value = hariIni();
  `);

  const cartForForm = {
    type: 'keluar',
    title: 'Belanja ATK',
    amount: 45000,
    category: 'Pendidikan',
    paymentMethod: 'tunai',
    items: [
      { nama: 'Buku Tulis', qty: 3, satuan: 'buah', harga: 5000, hargaTotal: 15000 },
      { nama: 'Pulpen Gel', qty: 2, satuan: 'buah', harga: 7500, hargaTotal: 15000 },
      { nama: 'Penggaris Besi', qty: 1, satuan: 'buah', harga: 15000, hargaTotal: 15000 }
    ]
  };

  run(`bukaDrafDiFormCatat(${JSON.stringify(cartForForm)})`);

  const activeNama = run("$('iNama').value");
  const activeQty = run("$('iQty').value");
  const activeHarga = run("$('iHarga').value");
  const krjCount = run("keranjang.length");
  const krjItem1 = run("keranjang[0]");
  const krjItem2 = run("keranjang[1]");

  assert.equal(activeNama, 'Buku Tulis');
  assert.equal(activeQty, '3');
  assert.equal(krjCount, 2, '2 item berikutnya harus berada di keranjang');
  assert.equal(krjItem1.nama, 'Pulpen Gel');
  assert.equal(krjItem2.nama, 'Penggaris Besi');

  recordAudit('AUDIT-6', 'Form Transfer & Cart Population UI Hooks', true, 'Item 1 correctly set to active form inputs; Items 2 & 3 correctly placed in keranjang array');
} catch (err) {
  recordAudit('AUDIT-6', 'Form Transfer & Cart Population UI Hooks', false, err.message);
}

// -------------------------------------------------------------
// AUDIT 7: Security & Input Sanitization
// -------------------------------------------------------------
try {
  const xssInput = 'beli <script>alert("xss")</script> 20rb dan "img onerror=alert(1)" 10rb';
  const xssDrafts = run(`ekstrakDrafTransaksiDariTeks(${JSON.stringify(xssInput)})`);
  assert.equal(xssDrafts.length, 2);
  // Titles should be sanitized strings without unescaped execution
  assert.ok(!xssDrafts[0].title.includes('<script>'));
  assert.ok(typeof xssDrafts[0].amount === 'number' && xssDrafts[0].amount === 20000);
  assert.ok(typeof xssDrafts[1].amount === 'number' && xssDrafts[1].amount === 10000);

  recordAudit('AUDIT-7', 'Input Sanitization & Injection Resistance', true, 'HTML tags stripped cleanly from titles; amounts parsed as safe numbers');
} catch (err) {
  recordAudit('AUDIT-7', 'Input Sanitization & Injection Resistance', false, err.message);
}

// -------------------------------------------------------------
// AUDIT 8: Smart Input Dialog (dlgAiSmart) Multi-Item Integration
// -------------------------------------------------------------
try {
  run(`
    $('aiSmartText').value = 'beli beras 50rb, telur 25rb, minyak 30rb';
    analisisSmartAi();
  `);

  const lastAi = run("aiSmartLast");
  assert.ok(lastAi, 'aiSmartLast harus terisi');
  assert.equal(lastAi.amount, 105000, 'Total smart input harus 105.000');
  assert.equal(lastAi.items.length, 3, 'Smart input harus menghasilkan keranjang 3 item');
  assert.equal(lastAi.isCart, true, 'isCart harus true');

  recordAudit('AUDIT-8', 'Smart Input Dialog (dlgAiSmart) Integration', true, 'Smart input textarea correctly synthesizes multi-item input into cart draft with full item array');
} catch (err) {
  recordAudit('AUDIT-8', 'Smart Input Dialog (dlgAiSmart) Integration', false, err.message);
}

console.log('\n====================================================');
console.log('                 AUDIT SUMMARY                      ');
console.log('====================================================');
const total = auditResults.length;
const passed = auditResults.filter(r => r.pass).length;
console.log(`Passed: ${passed} / ${total} (${Math.round((passed / total) * 100)}%)`);
if (passed === total) {
  console.log('RESULT: 100% AUDIT PASS - RIGOROUS ZERO DEFECT METRIC ACHIEVED.');
} else {
  console.error('RESULT: AUDIT FAILURES DETECTED.');
  process.exitCode = 1;
}
