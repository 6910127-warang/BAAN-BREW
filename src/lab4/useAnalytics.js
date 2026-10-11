import { useEffect, useState } from "react";
import { analyticsErrorMessage, loadAnalytics } from "./analyticsSource.js";

/** โหลด analytics ครั้งเดียวตอนแท็บเปิด · คืน { data, error, loading } */
export default function useAnalytics() {
  const [state, setState] = useState({ data: null, error: "", loading: true });

  useEffect(() => {
    let cancelled = false;
    loadAnalytics().then(
      (data) => { if (!cancelled) setState({ data, error: "", loading: false }); },
      (e) => { if (!cancelled) setState({ data: null, error: analyticsErrorMessage(e), loading: false }); },
    );
    return () => { cancelled = true; };
  }, []);

  return state;
}
