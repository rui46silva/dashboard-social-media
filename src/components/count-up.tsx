"use client";

import { useEffect, useRef, useState } from "react";

const NUM = /\d[\d\s  .]*(?:,\d+)?/;
const parse = (raw: string) => Number(raw.replace(/[\s  .]/g, "").replace(",", "."));

/**
 * Animates the first number inside an already formatted string
 * ("18 400 €", "1,4 M", "+3371", "65%"), keeping the pt-PT format.
 * Counts from zero on first show and from the previous value on updates.
 */
export function CountUp({ value, duration = 800 }: { value: string; duration?: number }) {
  const match = value.match(NUM);
  const small = !match || (!match[0].includes(",") && parse(match[0]) < 20);
  const [shown, setShown] = useState(() => (match && !small ? value.replace(match[0], "0") : value));
  const from = useRef(0);

  useEffect(() => {
    if (!match || small || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      return;
    }
    const raw = match[0];
    const decimals = raw.includes(",") ? raw.split(",")[1].length : 0;
    const target = parse(raw);
    const grouped = /[\s  .]\d{3}/.test(raw);
    const fmt = (n: number) =>
      n.toLocaleString("pt-PT", { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: grouped ? "always" : false });
    const start = performance.now();
    const origin = from.current;
    let f = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - k, 5); // ease-out-quint, same curve as the CSS
      setShown(value.replace(raw, fmt(origin + (target - origin) * eased)));
      if (k < 1) f = requestAnimationFrame(tick);
      else {
        from.current = target;
        setShown(value);
      }
    };
    f = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(f);
  }, [value]);

  return <span className="num">{shown}</span>;
}
