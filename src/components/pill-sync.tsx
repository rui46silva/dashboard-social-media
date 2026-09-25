"use client";

import { useEffect } from "react";

/**
 * Sliding selection pill for every `.tabs` and `.segmented` control.
 * Measures the selected button and exposes its box as CSS variables, so the
 * white pill glides between options instead of jumping. Works for any markup
 * that uses aria-selected / aria-pressed, without touching each page.
 */
export function PillSync() {
  useEffect(() => {
    let frame = 0;
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        document.querySelectorAll<HTMLElement>(".tabs, .segmented").forEach((box) => {
          const sel = box.querySelector<HTMLElement>(':scope > [aria-selected="true"], :scope > [aria-pressed="true"]');
          if (!sel) {
            box.classList.remove("has-pill");
            return;
          }
          box.style.setProperty("--pill-x", `${sel.offsetLeft}px`);
          box.style.setProperty("--pill-y", `${sel.offsetTop}px`);
          box.style.setProperty("--pill-w", `${sel.offsetWidth}px`);
          box.style.setProperty("--pill-h", `${sel.offsetHeight}px`);
          if (!box.classList.contains("has-pill")) {
            box.classList.add("has-pill");
            // Enable the glide only after the first placement.
            requestAnimationFrame(() => box.classList.add("pill-ready"));
          }
        });
      });
    };
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["aria-selected", "aria-pressed", "class"] });
    const ro = new ResizeObserver(sync);
    ro.observe(document.body);
    window.addEventListener("resize", sync);
    document.fonts?.ready.then(sync);
    return () => {
      mo.disconnect();
      ro.disconnect();
      window.removeEventListener("resize", sync);
      cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}
