/**
 * Migration script: đọc data.json → upload lên Firebase Firestore
 * Chạy 1 lần duy nhất: node scripts/migrate-to-firebase.mjs
 *
 * Cấu trúc Firestore sau khi migrate (phương án B - separate collections):
 *   criteria/main         → { items: [...] }
 *   levels/{code}         → level object (L0, L1, ...)
 *   departments/{id}      → department object kèm order
 *   process/main          → { steps: [...] }
 *   matrix/main           → { items: [...] }
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, writeBatch } from 'firebase/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parse .env.local thủ công (không cần dotenv)
function loadEnv(envPath) {
  try {
    const content = readFileSync(envPath, 'utf-8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx < 0) return;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      process.env[key] = val;
    });
  } catch {
    console.error('❌ Không tìm thấy .env.local');
    process.exit(1);
  }
}

loadEnv(resolve(__dirname, '../.env.local'));

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.projectId) {
  console.error('❌ Thiếu NEXT_PUBLIC_FIREBASE_PROJECT_ID trong .env.local');
  process.exit(1);
}

// Đọc data.json
const dataPath = resolve(__dirname, '../data.json');
let data;
try {
  data = JSON.parse(readFileSync(dataPath, 'utf-8'));
} catch {
  console.error('❌ Không đọc được data.json');
  process.exit(1);
}

console.log('🔥 Kết nối Firebase project:', firebaseConfig.projectId);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const batch = writeBatch(db);

// 1. criteria → convert nested arrays thành objects (Firestore không hỗ trợ nested arrays)
// Format trong data.json: [name, points, desc]
// Format lưu Firestore: { name, points, desc }
const criteriaObjects = (data.criteria || []).map(c => ({ name: c[0], points: c[1], desc: c[2] }));
batch.set(doc(db, 'criteria', 'main'), { items: criteriaObjects });
console.log(`  ✅ criteria: ${criteriaObjects.length} items`);

// 2. levels → mỗi level 1 document (doc id = code)
(data.levels || []).forEach(lvl => {
  batch.set(doc(db, 'levels', lvl.code), lvl);
});
console.log(`  ✅ levels: ${data.levels?.length ?? 0} docs`);

// 3. departments → mỗi dept 1 document (doc id = id), kèm order
(data.departments || []).forEach((dept, idx) => {
  batch.set(doc(db, 'departments', dept.id), { ...dept, order: idx });
});
console.log(`  ✅ departments: ${data.departments?.length ?? 0} docs`);

// 4. process → 1 document chứa array steps
batch.set(doc(db, 'process', 'main'), { steps: data.process || [] });
console.log(`  ✅ process: ${data.process?.length ?? 0} steps`);

// 5. matrix → 1 document chứa array items
batch.set(doc(db, 'matrix', 'main'), { items: data.matrix || [] });
console.log(`  ✅ matrix: ${data.matrix?.length ?? 0} items`);

console.log('\n⏳ Đang ghi lên Firestore...');
await batch.commit();
console.log('🎉 Migration hoàn tất! Kiểm tra tại https://console.firebase.google.com/project/treebii/firestore');
process.exit(0);
