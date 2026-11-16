"use client";

import { useEffect, useState } from "react";

const BOOT_FLAG = "us_saturn_boot_done_v1";

export default function SaturnLoader({ overlay = false }: { overlay?: boolean }) {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!overlay) {
      setVisible(true);
      return;
    }

    if (typeof window !== "undefined" && sessionStorage.getItem(BOOT_FLAG) === "1") {
      setVisible(false);
      return;
    }

    setVisible(true);
    const t1 = setTimeout(() => setFading(true), 1550);
    const t2 = setTimeout(() => {
      setVisible(false);
      if (typeof window !== "undefined") {
        sessionStorage.setItem(BOOT_FLAG, "1");
      }
    }, 2000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [overlay]);

  if (!visible) return null;

  return (
    <div className={`us-saturn-loader ${overlay ? "is-overlay" : "is-inline"} ${fading ? "is-fading" : ""}`}>
      <div className="us-saturn-3d-stage">
        <div className="us-saturn-ring-outer" />
        <div className="us-saturn-ring-inner" />
        <div className="us-saturn-sphere">
          <div className="us-saturn-bands" />
          <div className="us-saturn-shadow" />
        </div>
        <div className="us-saturn-moon-orbit">
          <span className="us-saturn-moon" />
        </div>
      </div>

      <div className="us-saturn-brand">
        <span className="us-saturn-title">UNIFIED STACK</span>
        <span className="us-saturn-sub">Синхронизация каталога и облачного профиля...</span>
        <div className="us-saturn-progress">
          <div className="us-saturn-progress-bar" />
        </div>
      </div>
    </div>
  );
}
