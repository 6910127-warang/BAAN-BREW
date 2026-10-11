// ด่านล็อกอิน Google ที่ใช้ร่วมกันได้ (แท็บ Lab 4 ใช้ตัวนี้) · ยังไม่ล็อกอินจะไม่ render children จึงไม่อ่าน Firestore
// LiveTab มีด่านของตัวเองอยู่ในไฟล์ ไม่ได้ย้ายมาใช้ตัวนี้เพื่อไม่ให้ Lab 3 เปลี่ยนพฤติกรรม
import { useEffect, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider, isConfigured } from "./firebase.js";

const AUTH_ERROR_TEXT = {
  "auth/unauthorized-domain": "โดเมนนี้ยังไม่ได้รับอนุญาต เพิ่มโดเมนใน Firebase Console → Authentication → Settings → Authorized domains",
  "auth/operation-not-allowed": "ยังไม่ได้เปิดใช้การเข้าสู่ระบบด้วย Google ใน Firebase Console → Authentication → Sign-in method",
  "auth/configuration-not-found": "โปรเจกต์ Firebase ยังไม่ได้เริ่มใช้ Authentication ไปที่ Firebase Console → Authentication → Get started แล้วเปิด Google ใน Sign-in method",
  "auth/popup-blocked": "เบราว์เซอร์บล็อกหน้าต่างล็อกอิน กรุณาอนุญาต pop-up แล้วลองใหม่",
  "auth/popup-closed-by-user": "ปิดหน้าต่างล็อกอินก่อนเสร็จสิ้น ลองใหม่อีกครั้ง",
};
const authErrorMessage = (e) => AUTH_ERROR_TEXT[e?.code] ?? `เข้าสู่ระบบไม่สำเร็จ: ${e?.message ?? "ไม่ทราบสาเหตุ"}`;

/** children = (user, signOutButton) => ReactNode */
export default function AuthGate({ title, children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    if (!auth) return undefined;
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setChecking(false);
    });
  }, []);

  async function handleSignIn() {
    setAuthError("");
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      setAuthError(authErrorMessage(e));
    }
  }

  async function handleSignOut() {
    setAuthError("");
    try {
      await signOut(auth);
    } catch (e) {
      setAuthError(authErrorMessage(e));
    }
  }

  if (!isConfigured) {
    return (
      <div className="rounded-lg border border-ink/15 bg-white p-6">
        <p className="text-red-700">❌ ยังไม่ได้ตั้งค่า Firebase ใน .env (ดู .env.example)</p>
      </div>
    );
  }

  if (checking) return <p className="text-ink/60">กำลังตรวจสอบการเข้าสู่ระบบ…</p>;

  if (!user) {
    return (
      <div className="mx-auto max-w-sm space-y-4 rounded-lg border border-ink/15 bg-white p-6 text-center">
        <h1 className="text-xl font-bold">{title}</h1>
        <p className="text-sm text-ink/70">เข้าสู่ระบบเพื่อดูข้อมูลวิเคราะห์</p>
        <button type="button" onClick={handleSignIn} className="w-full rounded-lg bg-brew px-4 py-2 text-sm text-white">
          เข้าสู่ระบบด้วย Google
        </button>
        {authError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-left text-sm text-red-700">❌ {authError}</p>}
      </div>
    );
  }

  const signOutButton = (
    <div className="flex items-center gap-2 text-sm">
      {user.photoURL && <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="h-8 w-8 rounded-full" />}
      <span className="max-w-[10rem] truncate">{user.displayName ?? user.email}</span>
      <button type="button" onClick={handleSignOut} className="rounded-lg border border-ink/15 bg-white px-3 py-1 hover:bg-ink/5">
        ออกจากระบบ
      </button>
    </div>
  );
  return (
    <>
      {authError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">❌ {authError}</p>}
      {children(user, signOutButton)}
    </>
  );
}
