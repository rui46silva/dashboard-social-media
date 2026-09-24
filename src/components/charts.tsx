"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { compact, num } from "@/lib/format";

export type Series = { id: string; label: string; color: string; values: number[] };

function niceMax(v: number) {
  if (v <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / exp;
  const step = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return step * exp;
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(640);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(240, e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/**
 * Multi-series line chart. 2px lines, recessive grid, crosshair + tooltip on
 * hover/touch, legend always shown for ≥2 series and end-of-line direct labels.
 */
export function LineChart({
  series,
  labels,
  height = 220,
  format = compact,
  area = false,
}: {
  series: Series[];
  labels: string[];
  height?: number;
  format?: (n: number) => string;
  area?: boolean;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const directLabels = series.length > 1 && series.length <= 4 && width > 480;
  const pad = { top: 12, right: directLabels ? 84 : 12, bottom: 24, left: 44 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;
  const n = labels.length;

  const max = useMemo(() => niceMax(Math.max(...series.flatMap((s) => s.values)) * 1.05), [series]);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const x = (i: number) => pad.left + (n === 1 ? w / 2 : (i / (n - 1)) * w);
  const y = (v: number) => pad.top + h - (v / max) * h;

  // Nudge end labels apart so they never overlap.
  const ends = series
    .map((s) => ({ id: s.id, label: s.label, y: y(s.values[n - 1]) }))
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) {
    if (ends[i].y - ends[i - 1].y < 14) ends[i].y = ends[i - 1].y + 14;
  }

  const every = Math.ceil(n / Math.max(2, Math.floor(w / 70)));

  const onMove = (clientX: number) => {
    const box = ref.current!.getBoundingClientRect();
    const rel = clientX - box.left - pad.left;
    const i = Math.round((rel / w) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };

  const tipLeft = hover === null ? 0 : Math.min(Math.max(x(hover) + 12, 0), width - 170);

  return (
    <div className="chart" ref={ref}>
      {series.length > 1 && (
        <div className="legend" style={{ marginBottom: 10 }}>
          {series.map((s) => (
            <span key={s.id}>
              <i style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={`Gráfico de linhas: ${series.map((s) => s.label).join(", ")}`}
        onMouseMove={(e) => onMove(e.clientX)}
        onMouseLeave={() => setHover(null)}
        onTouchStart={(e) => onMove(e.touches[0].clientX)}
        onTouchMove={(e) => onMove(e.touches[0].clientX)}
        onTouchEnd={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line className="grid-line" x1={pad.left} x2={pad.left + w} y1={y(t)} y2={y(t)} />
            <text className="axis-label" x={pad.left - 8} y={y(t) + 4} textAnchor="end">
              {compact(t)}
            </text>
          </g>
        ))}
        {labels.map((l, i) =>
          i % every === 0 || i === n - 1 ? (
            <text key={i} className="axis-label" x={x(i)} y={height - 6} textAnchor={i === n - 1 ? "end" : i === 0 ? "start" : "middle"}>
              {l}
            </text>
          ) : null,
        )}
        {series.map((s) => {
          const d = s.values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
          return (
            <g key={s.id}>
              {area && (
                <path
                  d={`${d}L${x(n - 1)},${y(0)}L${x(0)},${y(0)}Z`}
                  fill={s.color}
                  opacity={0.1}
                />
              )}
              <path d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            </g>
          );
        })}
        {directLabels &&
          ends.map((e) => (
            <text key={e.id} className="direct-label" x={pad.left + w + 8} y={e.y + 4}>
              {e.label}
            </text>
          ))}
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.top} y2={pad.top + h} stroke="var(--ink-3)" strokeDasharray="3 3" />
            {series.map((s) => (
              <circle key={s.id} cx={x(hover)} cy={y(s.values[hover])} r={4.5} fill={s.color} stroke="var(--surface)" strokeWidth={2} />
            ))}
          </g>
        )}
      </svg>
      {hover !== null && (
        <div className="chart-tip" style={{ left: tipLeft, top: series.length > 1 ? 34 : 8 }}>
          <div className="chart-tip__title">{labels[hover]}</div>
          {series.map((s) => (
            <div key={s.id} className="chart-tip__row">
              <span className="net__swatch" style={{ background: s.color }} />
              {s.label}
              <strong>{format(s.values[hover])}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Tiny inline trend for KPI tiles — no axes, no hover (the number is the point). */
export function Sparkline({ values, color = "var(--ink-2)", width = 88, height = 26 }: { values: number[]; color?: string; width?: number; height?: number }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const d = values
    .map((v, i) => `${i ? "L" : "M"}${((i / (values.length - 1)) * (width - 4) + 2).toFixed(1)},${(height - 3 - ((v - min) / span) * (height - 6)).toFixed(1)}`)
    .join("");
  return (
    <svg width={width} height={height} aria-hidden style={{ display: "block", overflow: "visible" }}>
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** Horizontal bars with values printed — for shares, sources, top pages. */
export function Bars({
  rows,
  format = num,
  color = "var(--series-1)",
}: {
  rows: { label: string; value: number; color?: string }[];
  format?: (n: number) => string;
  color?: string;
}) {
  const max = Math.max(...rows.map((r) => r.value)) || 1;
  const total = rows.reduce((a, r) => a + r.value, 0);
  return (
    <div>
      {rows.map((r) => (
        <div className="bar-row" key={r.label} title={`${r.label}: ${format(r.value)}`}>
          <span className="truncate">{r.label}</span>
          <span className="num">
            {format(r.value)} <span className="faint">· {Math.round((r.value / total) * 100)}%</span>
          </span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${(r.value / max) * 100}%`, background: r.color ?? color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Weekday × time-slot heatmap on the sequential blue ramp. */
export function Heatmap({ data, rows, cols }: { data: number[][]; rows: string[]; cols: string[] }) {
  const [tip, setTip] = useState<string | null>(null);
  const step = (v: number) => `var(--seq-${Math.min(6, Math.max(1, Math.ceil(v * 6)))})`;
  return (
    <div>
      <div className="heat" role="table" aria-label="Melhores horas para publicar">
        <span />
        {cols.map((c) => (
          <span key={c} className="heat__col">{c}</span>
        ))}
        {data.map((row, r) => (
          <div key={rows[r]} style={{ display: "contents" }} role="row">
            <span className="heat__label">{rows[r]}</span>
            {row.map((v, c) => {
              const label = `${rows[r]} ${cols[c]} · ${Math.round(v * 100)}% do pico`;
              return (
                <span
                  key={c}
                  role="cell"
                  aria-label={label}
                  className="heat__cell"
                  style={{ background: step(v) }}
                  onMouseEnter={() => setTip(label)}
                  onMouseLeave={() => setTip(null)}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="spread" style={{ marginTop: 10, fontSize: 12 }}>
        <span className="faint">{tip ?? "Passa o cursor para ver o detalhe"}</span>
        <span className="row faint" style={{ gap: 4 }}>
          menos
          {[1, 2, 3, 4, 5, 6].map((s) => (
            <span key={s} style={{ width: 12, height: 8, borderRadius: 2, background: `var(--seq-${s})` }} />
          ))}
          mais
        </span>
      </div>
    </div>
  );
}
