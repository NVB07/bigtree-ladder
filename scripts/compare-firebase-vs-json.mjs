/**
 * Script so sánh CHI TIẾT dữ liệu Firebase vs data.json
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, getDocs, collection } from 'firebase/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv(envPath) {
  const content = readFileSync(envPath, 'utf-8');
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) return;
    process.env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
  });
}
loadEnv(resolve(__dirname, '../.env.local'));

const app = initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
});
const db = getFirestore(app);

const local = JSON.parse(readFileSync(resolve(__dirname, '../data.json'), 'utf-8'));

const [criteriaSnap, levelsSnap, deptsSnap, processSnap] = await Promise.all([
  getDoc(doc(db, 'criteria', 'main')),
  getDocs(collection(db, 'levels')),
  getDocs(collection(db, 'departments')),
  getDoc(doc(db, 'process', 'main')),
]);

// ─── LEVELS ───────────────────────────────────────────────
console.log('\n═══ LEVELS ═══');
const fbLevels = levelsSnap.docs.map(s => s.data()).sort((a, b) => a.code.localeCompare(b.code));
const localLevels = (local.levels || []).slice().sort((a, b) => a.code.localeCompare(b.code));

console.log(`Firebase có ${fbLevels.length} levels, data.json có ${localLevels.length} levels`);

fbLevels.forEach((fbL, i) => {
  const lcL = localLevels.find(l => l.code === fbL.code);
  if (!lcL) { console.log(`  ❌ Level ${fbL.code}: CHỈ CÓ TRONG FIREBASE`); return; }
  
  const fbKeys = Object.keys(fbL).sort();
  const lcKeys = Object.keys(lcL).sort();
  
  const fbMissing = lcKeys.filter(k => !fbKeys.includes(k));
  const extraFb = fbKeys.filter(k => !lcKeys.includes(k));
  
  if (fbMissing.length || extraFb.length) {
    console.log(`  ⚠️  Level ${fbL.code} - Firebase thiếu fields: [${fbMissing}], thừa fields: [${extraFb}]`);
  }
  
  const diffFields = lcKeys.filter(k => JSON.stringify(fbL[k]) !== JSON.stringify(lcL[k]));
  if (diffFields.length) {
    diffFields.forEach(f => {
      console.log(`  ❌ ${fbL.code}.${f}:`);
      console.log(`     FB : ${JSON.stringify(fbL[f])}`);
      console.log(`     JSON: ${JSON.stringify(lcL[f])}`);
    });
  } else if (!fbMissing.length && !extraFb.length) {
    console.log(`  ✅ Level ${fbL.code}: khớp`);
  }
});

// ─── DEPARTMENTS ───────────────────────────────────────────
console.log('\n═══ DEPARTMENTS ═══');
const fbDepts = deptsSnap.docs.map(s => { const d = s.data(); delete d.order; return d; })
  .sort((a, b) => a.id.localeCompare(b.id));
const localDepts = (local.departments || []).slice().sort((a, b) => a.id.localeCompare(b.id));

console.log(`Firebase có ${fbDepts.length} depts, data.json có ${localDepts.length} depts`);

fbDepts.forEach(fbD => {
  const lcD = localDepts.find(d => d.id === fbD.id);
  if (!lcD) { console.log(`  ❌ Dept ${fbD.id}: CHỈ CÓ TRONG FIREBASE`); return; }
  
  const diffFields = Object.keys(lcD).filter(k => JSON.stringify(fbD[k]) !== JSON.stringify(lcD[k]));
  if (diffFields.length) {
    diffFields.forEach(f => {
      console.log(`  ❌ ${fbD.id}.${f}:`);
      console.log(`     FB : ${JSON.stringify(fbD[f])?.slice(0, 150)}`);
      console.log(`     JSON: ${JSON.stringify(lcD[f])?.slice(0, 150)}`);
    });
  } else {
    console.log(`  ✅ Dept ${fbD.id}: khớp`);
  }
});

// ─── PROCESS ───────────────────────────────────────────────
console.log('\n═══ PROCESS ═══');
const fbProcess = processSnap.exists() ? processSnap.data().steps : [];
const lcProcess = local.process || [];
console.log(`Firebase có ${fbProcess.length} steps, data.json có ${lcProcess.length} steps`);
fbProcess.forEach((s, i) => {
  const same = JSON.stringify(s) === JSON.stringify(lcProcess[i]);
  console.log(`  ${same ? '✅' : '❌'} Step ${i+1} "${s.title}": ${same ? 'khớp' : 'KHÔNG KHỚP'}`);
  if (!same) {
    console.log(`     FB : ${JSON.stringify(s)}`);
    console.log(`     JSON: ${JSON.stringify(lcProcess[i])}`);
  }
});

process.exit(0);
