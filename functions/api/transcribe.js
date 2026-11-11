const MODEL = '@cf/openai/whisper-large-v3-turbo';
const MAX_AUDIO_BYTES = 2_000_000;
const ALLOWED_AUDIO_TYPES = new Set(['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/mpeg', 'application/octet-stream']);

function json(data, status=200, extraHeaders={}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, private, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex, nofollow',
      ...extraHeaders
    }
  });
}
function fail(status, code, error, headers={}) { return json({ code, error }, status, headers); }
function cleanText(value, max=500) {
  return String(value ?? '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}
async function digest(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].slice(0, 12).map(byte => byte.toString(16).padStart(2, '0')).join('');
}
async function withinRate(request, label, limit, seconds) {
  try {
    const cache = globalThis.caches?.default;
    if (!cache) return true;
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const bucket = Math.floor(Date.now() / (seconds * 1000));
    const key = await digest(`${label}:${ip}:${bucket}`);
    const cacheRequest = new Request(`${new URL(request.url).origin}/__voice_rate/${label}/${key}`, { method:'GET' });
    const previous = await cache.match(cacheRequest);
    const count = previous ? Number(await previous.text()) || 0 : 0;
    if (count >= limit) return false;
    await cache.put(cacheRequest, new Response(String(count + 1), { headers:{ 'Cache-Control':`public, max-age=${seconds}` } }));
    return true;
  } catch (_) { return true; }
}
function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return new Response(null, { status:204, headers:{ 'Cache-Control':'no-store' } });
  if (request.method !== 'POST') return fail(405, 'METHOD_NOT_ALLOWED', 'Gunakan metode POST.', { Allow:'POST, OPTIONS' });
  const url = new URL(request.url);
  const origin = request.headers.get('Origin');
  if (origin && origin !== url.origin) return fail(403, 'CROSS_ORIGIN_BLOCKED', 'Permintaan lintas situs ditolak.');
  if ((request.headers.get('Sec-Fetch-Site') || '').toLowerCase() === 'cross-site') return fail(403, 'CROSS_ORIGIN_BLOCKED', 'Permintaan lintas situs ditolak.');
  const contentType = String(request.headers.get('Content-Type') || '').toLowerCase().split(';')[0].trim();
  if (!ALLOWED_AUDIO_TYPES.has(contentType)) return fail(415, 'INVALID_AUDIO_TYPE', 'Format rekaman tidak didukung.');
  const declared = Number(request.headers.get('Content-Length') || 0);
  if (declared > MAX_AUDIO_BYTES) return fail(413, 'AUDIO_TOO_LARGE', 'Rekaman terlalu besar. Batasi rekaman hingga 20 detik.');
  if (!env?.AI?.run) return fail(503, 'AI_NOT_CONFIGURED', 'Binding Workers AI belum tersedia.');
  if (!await withinRate(request,'minute',6,60) || !await withinRate(request,'hour',30,3600)) return fail(429, 'RATE_LIMITED', 'Terlalu banyak permintaan suara. Coba lagi nanti.', { 'Retry-After':'60' });

  const audio = await request.arrayBuffer();
  if (audio.byteLength < 800) return fail(400, 'AUDIO_EMPTY', 'Rekaman belum berisi suara yang cukup.');
  if (audio.byteLength > MAX_AUDIO_BYTES) return fail(413, 'AUDIO_TOO_LARGE', 'Rekaman terlalu besar. Batasi rekaman hingga 20 detik.');

  try {
    const result = await env.AI.run(MODEL, {
      audio:toBase64(audio),
      task:'transcribe',
      language:'id',
      vad_filter:true,
      initial_prompt:'Satu transaksi keuangan pribadi dalam bahasa Indonesia. Pertahankan nama dompet digital dan nominal uang.'
    });
    const text = cleanText(result?.text ?? result?.transcription_info?.text);
    if (text.length < 2) return fail(422, 'NO_SPEECH', 'Suara belum dapat dikenali. Coba lagi dan bicara lebih dekat ke mikrofon.');
    return json({ data:{ text } });
  } catch (error) {
    console.error('Voice transcription failed', cleanText(error?.message || error, 160));
    return fail(502, 'TRANSCRIPTION_FAILED', 'Rekaman belum dapat diubah menjadi teks. Coba lagi.');
  }
}
