"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animates the first number inside an already formatted string
 * ("18 400 €", "1,4 M", "+3371", "65%") from zero, keeping the pt-PT format.
 */
export function CountUp({ value, duration = 900 }: { value: string; duration?: number }) {
  const match = value.match(/\d[\d\s  .]*(?:,\d+)?/);
  const [shown, setShown] = useState(() => (match ? value.replace(match[0], "0") : value));
  const done = useRef(false);

  useEffect(() => {
    if (!match || done.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      return;
    }
    done.current = true;
    const raw = match[0];
    const decimals = raw.includes(",") ? raw.split(",")[1].length : 0;
    const target = Number(raw.replace(/[\s  .]/g, "").replace(",", "."));
    const grouped = /[\s  .]\d{3}/.test(raw);
    const fmt = (n: number) =>
      n.toLocaleString("pt-PT", { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: grouped ? "always" : false });
    const start = performance.now();
    let f = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - k, 3);
      setShown(value.replace(raw, fmt(target * eased)));
      if (k < 1) f = requestAnimationFrame(tick);
      else setShown(value);
    };
    f = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(f);
  }, [value]);

  return <>{shown}</>;
}
