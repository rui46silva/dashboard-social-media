/**
 * Goals the owner sets, with a forecast of whether (and when) each one is
 * reached at the current pace. Automatic goals read their history from the
 * finance data; manual goals use the check-ins the team records.
 */
import { FINANCE, FIN_MONTHS, NOW } from "./data";

const day = 864e5;
const MONTH = 30.44 * day;

export type GoalMetric = "mrr" | "receita" | "resultado" | "manual";
export type GoalUnit = "€" | "%" | "nº";
export type CheckIn = { date: Date; value: number; note?: string; by: string };

export type Goal = {
  id: string;
  title: string;
  metric: GoalMetric;
  unit: GoalUnit;
  /** Value when the goal was set (manual goals). */
  baseline: number;
  target: number;
  start: Date;
  deadline: Date;
  owner: string;
  why?: string;
  checkins: CheckIn[];
};

export const METRICS: { id: GoalMetric; label: string; hint: string; unit: GoalUnit }[] = [
  { id: "mrr", label: "Receita recorrente", hint: "Avenças por mês · atualiza sozinha", unit: "€" },
  { id: "receita", label: "Faturação mensal", hint: "Avenças + projetos, média de 3 meses · atualiza sozinha", unit: "€" },
  { id: "resultado", label: "Resultado mensal", hint: "Faturação − custos, média de 3 meses · atualiza sozinha", unit: "€" },
  { id: "manual", label: "Outra coisa", hint: "Um projeto, nº de clientes, seguidores… atualizas à mão", unit: "nº" },
];

const d = (y: number, m: number, dd: number) => new Date(y, m, dd, 12);
const Y = NOW.getFullYear();

export const GOALS: Goal[] = [
  {
    id: "g1", title: "Avenças a pagar a estrutura com folga", metric: "mrr", unit: "€", baseline: 4850, target: 7500,
    start: d(Y, 3, 1), deadline: d(Y + 1, 2, 31), owner: "u-rui",
    why: "Com 7500 € de avenças os custos fixos ficam pagos e sobra margem para contratar sem depender de projetos.", checkins: [],
  },
  {
    id: "g2", title: "Faturar 9000 € por mês, em média", metric: "receita", unit: "€", baseline: 6350, target: 9000,
    start: d(Y, 6, 1), deadline: d(Y, 11, 31), owner: "u-rui", checkins: [],
  },
  {
    id: "g3", title: "Lançar a formação em redes sociais para PME", metric: "manual", unit: "%", baseline: 0, target: 100,
    start: d(Y, 6, 1), deadline: d(Y, 11, 15), owner: "u-ana",
    why: "Receita que não depende de horas de produção.",
    checkins: [
      { date: d(Y, 6, 15), value: 10, note: "Programa fechado", by: "u-ana" },
      { date: d(Y, 7, 12), value: 22, note: "Guião dos 4 módulos", by: "u-ana" },
      { date: d(Y, 8, 5), value: 35, note: "Gravação do módulo 1", by: "u-ana" },
      { date: d(Y, 8, 20), value: 41, note: "Página de inscrição em rascunho", by: "u-ana" },
    ],
  },
  {
    id: "g4", title: "3 clientes novos até ao fim do ano", metric: "manual", unit: "nº", baseline: 0, target: 3,
    start: d(Y, 6, 1), deadline: d(Y, 11, 31), owner: "u-rui",
    checkins: [
      { date: d(Y, 7, 28), value: 1, note: "Adega Serra Alta assinou", by: "u-rui" },
      { date: d(Y, 8, 18), value: 2, note: "Clínica Sorriso Norte assinou", by: "u-rui" },
    ],
  },
];

/* --------------------------------------------------------------- history */

const revenue = () => FINANCE.recurring.map((r, i) => r + FINANCE.projects[i]);

/** Monthly points (1st of each month) for automatic metrics. */
export function metricHistory(metric: GoalMetric, fixedTotal: number): { date: Date; value: number }[] {
  if (metric === "manual") return [];
  const rev = revenue();
  const values =
    metric === "mrr" ? FINANCE.recurring
    : metric === "receita" ? rev
    : rev.map((r, i) => r - FINANCE.fixedHistory[i] * (fixedTotal / FINANCE.fixedHistory[11]) - r * FINANCE.variableRate);
  return FIN_MONTHS.map((date, i) => ({ date, value: values[i] }));
}

export function goalPoints(g: Goal, fixedTotal: number) {
  if (g.metric !== "manual") return metricHistory(g.metric, fixedTotal);
  return [{ date: g.start, value: g.baseline }, ...g.checkins.map((c) => ({ date: c.date, value: c.value }))].sort((a, b) => a.date.getTime() - b.date.getTime());
}

/* -------------------------------------------------------------- forecast */

export type GoalStatus = "alcançada" | "no bom caminho" | "em risco" | "fora de rota" | "sem dados";
export const STATUS_TONE: Record<GoalStatus, "good" | "warn" | "bad" | "info"> = {
  alcançada: "good", "no bom caminho": "good", "em risco": "warn", "fora de rota": "bad", "sem dados": "info",
};

export type Forecast = {
  status: GoalStatus;
  current: number;
  baseline: number;
  progress: number; // 0..1 from baseline to target
  projected: number; // value at the deadline at the current pace
  pace: number; // per month, from the trend
  needed: number; // per month, from now to the deadline
  eta: Date | null; // when the trend crosses the target
  monthsLeft: number;
  points: { date: Date; value: number }[];
  /** Smoothed points (3-month average) for volatile metrics, else the same as points. */
  series: { date: Date; value: number }[];
  smooth: boolean;
  /** Line of best fit, for the chart. */
  fit: (t: Date) => number;
};

/**
 * Linear trend over the recent points (last 6 months for monthly metrics,
 * every check-in for manual goals), with volatile series (monthly billing)
 * smoothed by a 3-month average first so one big project doesn't skew it.
 */
export function forecast(g: Goal, fixedTotal: number): Forecast {
  const all = goalPoints(g, fixedTotal);
  const smooth = g.metric === "receita" || g.metric === "resultado";
  const series = smooth
    ? all.map((p, i) => ({ date: p.date, value: all.slice(Math.max(0, i - 2), i + 1).reduce((a, x) => a + x.value, 0) / Math.min(3, i + 1) }))
    : all;
  const recent = g.metric === "manual" ? series : series.slice(-6);
  // Volatile series are judged on the 3-month average, not on one lucky month.
  const current = series.length ? series[series.length - 1].value : g.baseline;
  const baseline = g.metric === "manual" ? g.baseline : (series.find((p) => p.date >= new Date(g.start.getFullYear(), g.start.getMonth(), 1))?.value ?? g.baseline);
  const monthsLeft = Math.max(0, (g.deadline.getTime() - NOW.getTime()) / MONTH);
  const span = g.target - baseline || 1;
  const progress = Math.max(0, Math.min(1, (current - baseline) / span));

  let slope = 0;
  let intercept = current;
  const t0 = recent[0]?.date.getTime() ?? NOW.getTime();
  if (recent.length >= 2) {
    const xs = recent.map((p) => (p.date.getTime() - t0) / MONTH);
    const ys = recent.map((p) => p.value);
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
    const my = ys.reduce((a, b) => a + b, 0) / ys.length;
    const sxx = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
    slope = sxx ? xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / sxx : 0;
    intercept = my - slope * mx;
  }
  const fit = (t: Date) => intercept + slope * ((t.getTime() - t0) / MONTH);
  // Anchor the projection on today's real value, going forward at the trend's pace.
  const projected = current + slope * monthsLeft;
  const up = g.target >= baseline;
  const reached = up ? current >= g.target : current <= g.target;
  const needed = monthsLeft > 0 ? (g.target - current) / monthsLeft : g.target - current;
  const eta = reached ? NOW : slope !== 0 && (g.target - current) / slope > 0 ? new Date(NOW.getTime() + ((g.target - current) / slope) * MONTH) : null;
  const projectedProgress = (projected - baseline) / span;

  // Two check-ins a day apart say nothing about a pace; ask for at least two weeks of history.
  const spanDays = recent.length >= 2 ? (recent[recent.length - 1].date.getTime() - recent[0].date.getTime()) / day : 0;
  const status: GoalStatus =
    reached ? "alcançada"
    : spanDays < 14 ? "sem dados"
    : projectedProgress >= 1 ? "no bom caminho"
    : projectedProgress >= 0.85 ? "em risco"
    : "fora de rota";

  return { status, current, baseline, progress, projected, pace: slope, needed, eta, monthsLeft, points: all, series, smooth, fit };
}
