// Lab 4 · สร้างเอกสารสรุปงานวิเคราะห์ 5 ชิ้น (meta, daily, rfm, cohort, abc) ลง Firestore collection "analytics"
//
//   npm run analytics:dry         คำนวณและแสดงสรุป ไม่เขียนจริง ไม่ต้องมี key
//   npm run analytics             คำนวณแล้วเขียนลง Firestore
//   npm run analytics -- --no-shift   ไม่เลื่อนวันที่
//
// key: FIREBASE_SERVICE_ACCOUNT=./secrets/service-account.json (เครื่องตัวเอง)
//   หรือ FIREBASE_SERVICE_ACCOUNT_JSON='{...}' (GitHub Actions secret)
import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import { prepareRows } from "../src/lib/metrics.js";
import { buildAnalytics, shiftRows, shiftHolidays, weeklyShift } from "../src/lib/analytics/build.js";
import { todayBangkok } from "../src/lab3/time.js";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; })
);
const DRY = Boolean(args["dry-run"]);
const SHIFT = !args["no-shift"];
const FILE = args.file ?? "public/sales.csv";

const baht = (n) => "฿" + Math.round(n).toLocaleString("th-TH");
const readCsv = (f) => Papa.parse(fs.readFileSync(f, "utf8").replace(/^﻿/, ""), { header: true, skipEmptyLines: true }).data;

// ---------- คำนวณ ----------
const raw = prepareRows(readCsv(FILE));
if (raw.length === 0) {
  console.error(`❌ อ่านข้อมูลจาก ${FILE} ได้ 0 แถว ตรวจ datetime, qty และ unit_price`);
  process.exit(1);
}
const lastDate = raw.reduce((m, r) => (r.date > m ? r.date : m), "");
const shift = SHIFT ? weeklyShift(lastDate, todayBangkok()) : 0;
const holidays = Object.fromEntries(readCsv("public/thai_holidays.csv").map((h) => [h.date, h.holiday]));
const analytics = buildAnalytics({
  rows: shiftRows(raw, shift),
  products: readCsv("public/products.csv"),
  holidays: shiftHolidays(holidays, shift),
  shift,
});
// Firestore ไม่รับ undefined · แปลงผ่าน JSON ให้เหลือเฉพาะค่าที่เก็บได้
const docs = JSON.parse(JSON.stringify(analytics));

const { meta } = docs;
console.log(`ไฟล์: ${FILE} (${raw.length.toLocaleString()} แถว)`);
console.log(shift ? `เลื่อนวันที่ +${shift} วัน (ทวีคูณของ 7) → ข้อมูลล่าสุด ${meta.asOf}` : `ไม่เลื่อนวันที่ ข้อมูลล่าสุด ${meta.asOf}`);
console.log(`บิล ${meta.bills.toLocaleString()} · ยอดขาย ${baht(meta.revenue)} · สมาชิก ${meta.members.toLocaleString()} คน`);
for (const s of docs.rfm.segments) console.log(`  ${s.segment.padEnd(15)} ${String(s.customers).padStart(5)} คน · ยอด ${(s.revenueShare * 100).toFixed(0)}%`);
console.log(`เมนูกลุ่ม A ${docs.abc.items.filter((i) => i.cls === "A").length} จาก ${docs.abc.items.length} รายการ`);
for (const [k, v] of Object.entries(docs)) console.log(`  analytics/${k.padEnd(6)} ${(JSON.stringify(v).length / 1024).toFixed(0)} KB`);

if (DRY) {
  console.log("\n(dry-run: ยังไม่ได้เขียนลง Firestore)");
  process.exit(0);
}

// ---------- ตรวจ key ก่อนเชื่อมต่อ ----------
let key;
if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  key = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
} else {
  const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!keyPath || !fs.existsSync(keyPath)) {
    console.error("\n❌ ไม่พบ service account key ตั้งค่า FIREBASE_SERVICE_ACCOUNT ใน .env ให้ชี้ไปที่ไฟล์ JSON");
    process.exit(1);
  }
  const rel = path.relative(process.cwd(), path.resolve(keyPath));
  if (!rel.startsWith("secrets" + path.sep)) {
    console.error(`\n❌ key อยู่ที่ ${rel} ให้ย้ายไปไว้ในโฟลเดอร์ secrets/ ซึ่งถูกกันไม่ให้ขึ้น GitHub`);
    process.exit(1);
  }
  const gitignore = fs.existsSync(".gitignore") ? fs.readFileSync(".gitignore", "utf8") : "";
  if (!gitignore.split(/\r?\n/).some((l) => ["secrets", "secrets/", "/secrets", "/secrets/"].includes(l.trim()))) {
    console.error("\n❌ .gitignore ยังไม่มีบรรทัด secrets/ key อาจหลุดขึ้น GitHub หยุดไว้ก่อน");
    process.exit(1);
  }
  key = JSON.parse(fs.readFileSync(keyPath, "utf8"));
}

const { initializeApp, cert } = await import("firebase-admin/app");
const { getFirestore } = await import("firebase-admin/firestore");
initializeApp({ credential: cert(key) });
const db = getFirestore();
console.log(`\nเชื่อมต่อโปรเจกต์: ${key.project_id}`);

for (const [id, data] of Object.entries(docs)) {
  await db.collection("analytics").doc(id).set(data);
  console.log(`  เขียน analytics/${id} แล้ว`);
}
console.log("✅ เสร็จ เปิดแท็บ 'ลูกค้า & เมนู' หรือ 'พยากรณ์ & ผิดปกติ' เพื่อดูผล");
