import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const sw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const manifest = JSON.parse(fs.readFileSync(new URL('../manifest.webmanifest', import.meta.url), 'utf8'));

const gagal = pesan => {
  console.error('GAGAL:', pesan);
  process.exitCode = 1;
};

const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
if (!script) gagal('Script utama tidak ditemukan.');
else {
  try { new vm.Script(script, { filename: 'index.html' }); }
  catch (error) { gagal('Sintaks JavaScript tidak valid: ' + error.message); }
}

const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]);
const duplikat = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
if (duplikat.length) gagal('ID HTML duplikat: ' + duplikat.join(', '));

const idSet = new Set(ids);
const referensi = script ? [...script.matchAll(/\$\(["']([^"']+)["']\)/g)].map(match => match[1]) : [];
const dinamis = new Set(['pesanSingkat', 'catatExtra', 'st-500', 'est-500']);
const hilang = [...new Set(referensi.filter(id => !idSet.has(id) && !dinamis.has(id)))];
if (hilang.length) gagal('Referensi elemen tidak ditemukan: ' + hilang.join(', '));

for (const file of ['manifest.webmanifest', 'icon.svg', 'sw.js', '_headers']) {
  if (!fs.existsSync(new URL('../' + file, import.meta.url))) gagal('File wajib tidak ditemukan: ' + file);
}

if (manifest.start_url !== './' || manifest.scope !== './') gagal('Manifest harus aman untuk subpath hosting.');
if (!sw.includes("'./manifest.webmanifest'") || !sw.includes("'./icon.svg'")) gagal('Aset PWA belum masuk cache service worker.');

if (!process.exitCode) console.log(`OK: sintaks, ${ids.length} ID, referensi DOM, manifest, dan cache PWA valid.`);
