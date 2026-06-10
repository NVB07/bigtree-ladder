import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

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

const matrixData = [
  {
    title: "Điều kiện tối thiểu",
    items: [
      "Không vi phạm kỷ luật trong kỳ gần nhất.",
      "KPI trung bình đạt từ 80% trở lên.",
      "Được quản lý trực tiếp đề xuất.",
      "Có minh chứng kết quả công việc rõ ràng."
    ]
  },
  {
    title: "Nguyên tắc tăng level",
    items: [
      "Level phản ánh scope và năng lực thực tế.",
      "Không tự động tăng theo thâm niên.",
      "Tăng level phải đi kèm tăng trách nhiệm.",
      "Ưu tiên người tạo ảnh hưởng tích cực tới team."
    ]
  },
  {
    title: "Khung lương thưởng",
    items: [
      "Tăng hiệu suất: 5–10%.",
      "Tăng level: 10–25%.",
      "Nhân sự key: theo phê duyệt BGĐ.",
      "Thưởng theo KPI/campaign/dự án nếu có."
    ]
  }
];

await setDoc(doc(db, 'matrix', 'main'), { items: matrixData });
console.log(`✅ Đã đẩy matrix lên Firebase: ${matrixData.length} mục`);
matrixData.forEach((m, i) => console.log(`   ${i+1}. ${m.title} (${m.items.length} items)`));
process.exit(0);
