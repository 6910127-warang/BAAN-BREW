// อ่านเอกสารสรุป 5 ชิ้นใน collection "analytics" (เขียนโดย npm run analytics)
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lab3/firebase.js";

export const ANALYTICS_DOCS = ["meta", "daily", "rfm", "cohort", "abc"];

const ERROR_TEXT = {
  "permission-denied": "Security Rules ไม่อนุญาตให้อ่าน analytics (deploy firestore.rules ที่มี match /analytics แล้วหรือยัง)",
  unavailable: "เชื่อมต่อ Firestore ไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่",
  unauthenticated: "ต้องเข้าสู่ระบบก่อนจึงจะอ่านข้อมูลได้",
};
export const analyticsErrorMessage = (e) => ERROR_TEXT[e?.code] ?? e?.message ?? "ไม่ทราบสาเหตุ";

/** @returns {Promise<{ meta, daily, rfm, cohort, abc }>} */
export async function loadAnalytics() {
  if (!db) throw new Error("ยังไม่ได้ตั้งค่า Firebase ใน .env");
  const snaps = await Promise.all(ANALYTICS_DOCS.map((id) => getDoc(doc(db, "analytics", id))));
  const missing = ANALYTICS_DOCS.filter((_, i) => !snaps[i].exists());
  if (missing.length) {
    throw new Error(`ไม่พบเอกสาร analytics/${missing.join(", ")} ให้รัน npm run analytics เพื่อสร้าง`);
  }
  return Object.fromEntries(ANALYTICS_DOCS.map((id, i) => [id, snaps[i].data()]));
}
