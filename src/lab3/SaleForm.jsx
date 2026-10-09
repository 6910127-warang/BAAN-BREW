// Lab 3.2 · ฟอร์มบันทึกยอดขาย → setDoc ลง collection "sales"
import { useState } from "react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase.js";
import { BRANCHES, PAYMENTS, MAX_QTY, buildSale, validateSaleForm } from "./saleModel.js";
import { formatBaht } from "../lib/format";

const EMPTY = { branch: "", product_id: "", qty: "1", payment_method: "", customer_id: "" };

const inputClass = "mt-1 w-full rounded-lg border border-ink/15 bg-white px-3 py-1.5 text-sm";

function Field({ label, error, children }) {
  return (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {error && <span role="alert" className="mt-1 block text-red-700">{error}</span>}
    </label>
  );
}

export default function SaleForm({ products, uid }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null); // { ok, text }

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const product = products.find((p) => p.product_id === form.product_id);
  const qty = /^\d+$/.test(form.qty.trim()) ? Number(form.qty) : 0;
  const total = product ? qty * Number(product.price) : 0;

  async function onSubmit(e) {
    e.preventDefault();
    setResult(null);
    const found = validateSaleForm(form, products);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const { id, data } = buildSale(form, product, { uid });
    setSaving(true);
    try {
      await setDoc(doc(db, "sales", id), { ...data, created_at: serverTimestamp() });
      setResult({ ok: true, text: `บันทึกสำเร็จ: ${data.order_id}` });
      setForm((f) => ({ ...EMPTY, branch: f.branch }));
    } catch (err) {
      setResult({
        ok: false,
        text: err?.code === "permission-denied" ? "ถูกปฏิเสธโดย Security Rules" : `บันทึกไม่สำเร็จ: ${err?.message ?? "ไม่ทราบสาเหตุ"}`,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-3 rounded-lg border border-ink/15 bg-white p-4 sm:p-6">
      <h2 className="text-lg font-semibold">บันทึกยอดขาย</h2>

      <Field label="สาขา" error={errors.branch}>
        <select value={form.branch} onChange={set("branch")} className={inputClass}>
          <option value="">เลือกสาขา</option>
          {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
      </Field>

      <Field label="เมนู" error={errors.product_id}>
        <select value={form.product_id} onChange={set("product_id")} className={inputClass}>
          <option value="">เลือกเมนู</option>
          {products.map((p) => (
            <option key={p.product_id} value={p.product_id}>{p.product_name} — {formatBaht(Number(p.price))}</option>
          ))}
        </select>
      </Field>

      <Field label="จำนวน" error={errors.qty}>
        <input type="number" inputMode="numeric" min={1} max={MAX_QTY} value={form.qty} onChange={set("qty")} className={inputClass} />
      </Field>

      <Field label="วิธีชำระเงิน" error={errors.payment_method}>
        <select value={form.payment_method} onChange={set("payment_method")} className={inputClass}>
          <option value="">เลือกวิธีชำระเงิน</option>
          {PAYMENTS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </Field>

      <Field label="รหัสสมาชิก (ไม่บังคับ)" error={errors.customer_id}>
        <input type="text" placeholder="C00001" value={form.customer_id} onChange={set("customer_id")} className={inputClass} />
      </Field>

      <p className="text-sm">ยอดรวม: <strong className="tabular-nums">{formatBaht(total)}</strong></p>

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-lg bg-brew px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {saving ? "กำลังบันทึก…" : "บันทึกยอดขาย"}
      </button>

      {result && (
        <p
          role={result.ok ? "status" : "alert"}
          className={`rounded-lg border p-3 text-sm ${result.ok ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-700"}`}
        >
          {result.ok ? "✅" : "❌"} {result.text}
        </p>
      )}
    </form>
  );
}
