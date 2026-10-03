// Lab 3.2 · ตรวจฟอร์มและสร้างเอกสารยอดขายใหม่
// ใช้ AI เขียนฟังก์ชันในไฟล์นี้ (Prompt 3.2A) จนกว่า npm test จะผ่านทุกข้อ
// เอกสารที่ได้ต้องมีโครงสร้างเดียวกับข้อมูลที่ import ใน Lab 3.1 เพื่อให้ metrics.js จาก Lab 1 ใช้ต่อได้
import { nowBangkokISO } from "./time.js";

export const BRANCHES = ["สยาม", "สีลม", "อารีย์", "บางนา", "มหาวิทยาลัย"];
export const PAYMENTS = ["QR พร้อมเพย์", "บัตรเครดิต", "เงินสด", "LINE MAN", "Grab"];
export const MAX_QTY = 20;

/**
 * ตรวจฟอร์ม { branch, product_id, qty, payment_method, customer_id } (ค่าเป็นข้อความจาก input)
 * คืน {} ถ้าถูกต้อง หรือ { ชื่อฟิลด์: ข้อความภาษาไทย } ถ้าผิด
 */
export function validateSaleForm(form, products) {
  const errors = {};
  if (!BRANCHES.includes(form.branch)) errors.branch = "กรุณาเลือกสาขาให้ถูกต้อง";
  if (!products.some((p) => p.product_id === form.product_id)) errors.product_id = "กรุณาเลือกเมนูให้ถูกต้อง";
  if (!PAYMENTS.includes(form.payment_method)) errors.payment_method = "กรุณาเลือกวิธีชำระเงินให้ถูกต้อง";

  const qtyText = String(form.qty ?? "").trim();
  const qty = Number(qtyText);
  if (!/^\d+$/.test(qtyText) || qty < 1 || qty > MAX_QTY) {
    errors.qty = `จำนวนต้องเป็นจำนวนเต็ม 1–${MAX_QTY}`;
  }

  const cid = String(form.customer_id ?? "").trim();
  if (cid && !/^C\d{5}$/i.test(cid)) errors.customer_id = "รหัสสมาชิกต้องเป็น C ตามด้วยตัวเลข 5 หลัก";
  return errors;
}

/** เลขบิลจากเวลาไทย รูปแบบ WEB-YYYYMMDD-HHMMSS-XXXX (XXXX = ตัวเลข/อักษรพิมพ์ใหญ่สุ่ม 4 ตัว) */
export function makeOrderId(now = new Date(), rand = Math.random) {
  const iso = nowBangkokISO(now);
  const day = iso.slice(0, 10).replaceAll("-", "");
  const time = iso.slice(11, 19).replaceAll(":", "");
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let suffix = "";
  for (let i = 0; i < 4; i++) suffix += chars[Math.floor(rand() * chars.length)];
  return `WEB-${day}-${time}-${suffix}`;
}

/**
 * สร้าง { id, data } จากฟอร์มที่ผ่านการตรวจแล้ว
 * - ราคามาจาก product.price เสมอ · revenue = qty × ราคา · ตัวเลขทุกตัวเป็น number
 * - datetime/date/hour เป็นเวลาไทย (ใช้ nowBangkokISO)
 * - channel = "เดลิเวอรี" ถ้าจ่ายด้วย LINE MAN หรือ Grab ไม่งั้น "หน้าร้าน"
 * - source = "web", created_by = uid · ยังไม่ต้องใส่ created_at (ใส่ตอนบันทึกด้วย serverTimestamp())
 */
export function buildSale(form, product, { uid, now = new Date(), rand = Math.random }) {
  const iso = nowBangkokISO(now);
  const qty = Number(String(form.qty).trim());
  const unitPrice = Number(product.price);
  const orderId = makeOrderId(now, rand);
  const cid = String(form.customer_id ?? "").trim().toUpperCase();
  return {
    id: `${orderId}-${product.product_id}`,
    data: {
      order_id: orderId,
      datetime: iso,
      date: iso.slice(0, 10),
      hour: Number(iso.slice(11, 13)),
      branch: form.branch,
      product_id: product.product_id,
      qty,
      unit_price: unitPrice,
      revenue: qty * unitPrice,
      payment_method: form.payment_method,
      channel: ["LINE MAN", "Grab"].includes(form.payment_method) ? "เดลิเวอรี" : "หน้าร้าน",
      customer_id: cid || null,
      source: "web",
      created_by: uid,
    },
  };
}
