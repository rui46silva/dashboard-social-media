const nf = new Intl.NumberFormat("pt-PT");
const nfCompact = new Intl.NumberFormat("pt-PT", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const eur = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export const num = (n: number) => nf.format(Math.round(n));
export const compact = (n: number) => (Math.abs(n) < 10000 ? num(n) : nfCompact.format(n));
export const money = (n: number) => eur.format(n);
export const pct = (n: number, digits = 1) =>
  `${n.toLocaleString("pt-PT", { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;
export const signedPct = (n: number, digits = 1) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${pct(Math.abs(n), digits)}`;

export const duration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${String(s).padStart(2, "0")}s`;
};

const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const WEEKDAYS_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export const weekday = (d: Date) => WEEKDAYS[d.getDay()];
export const weekdayShort = (d: Date) => WEEKDAYS_SHORT[d.getDay()];
export const monthName = (m: number) => MONTHS[m];
export const dayMonth = (d: Date) => `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
export const longDate = (d: Date) => `${weekday(d)}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;

export const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** "há 3 h", "ontem", "12 set" — relative to `now`. */
export const ago = (d: Date, now: Date) => {
  const mins = Math.round((now.getTime() - d.getTime()) / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins} min`;
  const h = Math.round(mins / 60);
  if (h < 24) return `há ${h} h`;
  if (h < 48) return "ontem";
  return dayMonth(d);
};

export const time = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

export const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
