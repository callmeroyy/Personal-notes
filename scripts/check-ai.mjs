import assert from 'node:assert/strict';
import { onRequest } from '../functions/api/ai.js';

const call = (body, env={}) => onRequest({
  env,
  request:new Request('https://personal-notes.example/api/ai', {
    method:'POST', headers:{ 'Content-Type':'application/json', Origin:'https://personal-notes.example' },
    body:JSON.stringify(body)
  })
});

let response = await call({ task:'parse_transaction', payload:{} });
assert.equal(response.status,503);
assert.equal((await response.json()).code,'AI_NOT_CONFIGURED');

const parseEnv = { AI:{ run:async () => ({ response:{
  type:'keluar', date:'2026-11-04', title:'Beli bensin', category:'Transport', amount:50000,
  paymentMethod:'nontunai', walletId:'dana-1', tags:['motor'], missing:[], confidence:.96
} }) } };
response = await call({ task:'parse_transaction', payload:{
  text:'Kemarin beli bensin 50 ribu pakai DANA', today:'2026-11-05',
  categories:{ expense:['Makan','Transport','Lainnya'], income:['Gaji','Lainnya'] },
  wallets:[{ id:'dana-1', name:'DANA', kind:'wallet' }]
} }, parseEnv);
assert.equal(response.status,200);
assert.match(response.headers.get('Cache-Control'),/no-store/);
let result = (await response.json()).data;
assert.equal(result.amount,50000);
assert.equal(result.walletId,'dana-1');
assert.equal(result.category,'Transport');

let retryCount = 0;
const retryEnv = { AI:{ run:async (_model, options) => {
  retryCount += 1;
  if (options.response_format.type === 'json_schema') throw new Error("JSON Mode couldn't be met");
  return { response:'```json\n{"type":"keluar","date":"2026-11-05","title":"Makan siang","category":"Makan","amount":25000,"paymentMethod":"tunai","walletId":"","tags":[],"missing":[],"confidence":0.9}\n```' };
} } };
response = await call({ task:'parse_transaction', payload:{
  text:'Hari ini makan siang 25 ribu tunai', today:'2026-11-05',
  categories:{ expense:['Makan','Lainnya'], income:['Gaji','Lainnya'] }, wallets:[]
} }, retryEnv);
assert.equal(response.status,200);
assert.equal(retryCount,2);
assert.equal((await response.json()).data.amount,25000);

let plainRetryCount = 0;
const plainRetryEnv = { AI:{ run:async (_model, options) => {
  plainRetryCount += 1;
  if (options.response_format) throw new Error('JSON mode unavailable');
  return { response:'{"type":"keluar","date":"2026-11-05","title":"Makan siang","category":"Makan","amount":25000,"paymentMethod":"tunai","walletId":"","tags":[],"missing":[],"confidence":0.9}' };
} } };
response = await call({ task:'parse_transaction', payload:{
  text:'Hari ini makan siang 25 ribu tunai', today:'2026-11-05',
  categories:{ expense:['Makan','Lainnya'], income:['Gaji','Lainnya'] }, wallets:[]
} }, plainRetryEnv);
assert.equal(response.status,200);
assert.equal(plainRetryCount,3);
assert.equal((await response.json()).data.category,'Makan');

const insightEnv = { AI:{ run:async () => ({ response:{ insights:[{
  kind:'warning', title:'Makan meningkat', detail:'Pengeluaran makan naik.', evidence:'Rp500.000 dibanding Rp300.000.',
  action:{ type:'create_budget', category:'Makan', amount:450000 }, confidence:.9
}] } }) } };
response = await call({ task:'financial_insight', payload:{
  periodDays:30, from:'2026-10-07', to:'2026-11-05', transactionCount:8, balance:1000000,
  current:{ income:2000000, expense:900000 }, previous:{ income:2000000, expense:700000 },
  byCategory:[{ category:'Makan', amount:500000 }], budgets:[],
  largestExpenses:[{ date:'2026-11-01', category:'Makan', amount:150000 }], categories:['Makan','Lainnya']
} }, insightEnv);
assert.equal(response.status,200);
result = (await response.json()).data;
assert.equal(result.insights.length,1);
assert.equal(result.insights[0].action.type,'create_budget');

response = await call({ task:'unknown', payload:{} }, parseEnv);
assert.equal(response.status,400);

console.log('OK: endpoint AI, validasi, no-store, Smart Input, dan Insight valid.');
