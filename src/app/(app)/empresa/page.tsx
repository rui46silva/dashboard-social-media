"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, ShieldCheck } from "lucide-react";
import { CLIENT_ECONOMICS, DEALS, FINANCE, FIN_MONTHS, NOW, client } from "@/lib/data";
import { money, pct } from "@/lib/format";
import { LineChart } from "@/components/charts";
import { ClientTile, Kpi, PageHead, SectionTitle } from "@/components/ui";
import { useSession } from "@/components/session";
import { useStore } from "@/components/store";
import { Cockpit, useAlerts } from "@/components/company/cockpit";
import { FiscalCalendar, FreeCash, Receivables } from "@/components/company/finance";
import { HealthBoard } from "@/components/company/health";

const TABS = [
  { id: "cockpit", label: "Cockpit" },
  { id: "financas", label: "Finanças" },
  { id: "clientes", label: "Clientes" },
  { id: "planeamento", label: "Planeamento" },
] as const;
type Tab = (typeof TABS)[number]["id"];
const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const mLabel = (d: Date) => `${MONTHS_SHORT[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;

/* ---------------------------------------------------------------- figures */

const rev = FINANCE.recurring.map((r, i) => r + FINANCE.projects[i]);
const costs = rev.map((r, i) => FINANCE.fixedHistory[i] + r * FINANCE.variableRate);
const profit = rev.map((r, i) => r - costs[i]);
const fixedNow = FINANCE.fixed.reduce((a, f) => a + f.value, 0);
const mrr = FINANCE.recurring[11];
const breakEven = fixedNow / (1 - FINANCE.variableRate);
const avgFee = mrr / CLIENT_ECONOMICS.length;
const last3Profit = profit.slice(-3).reduce((a, b) => a + b, 0) / 3;
const recurringProfit = mrr - fixedNow - mrr * FINANCE.variableRate;
const churnMonthly = FINANCE.churnedLast12 / (3.5 * 12);
const econ = CLIENT_ECONOMICS.map((e) => {
  const cost = e.hours * FINANCE.hourCost;
  return { ...e, cost, margin: e.fee - cost, marginPct: (e.fee - cost) / e.fee, perHour: e.fee / e.hours, daysLeft: Math.round((e.contractEnd.getTime() - NOW.getTime()) / 864e5) };
});
const grossMargin = econ.reduce((a, e) => a + e.margin, 0) / econ.reduce((a, e) => a + e.fee, 0);
const cac = FINANCE.salesSpendLast12 / FINANCE.newClientsLast12;
const ltv = (avgFee * grossMargin) / churnMonthly;
const top = [...econ].sort((a, b) => b.fee - a.fee)[0];
const concentration = top.fee / mrr;
const renewals = econ.filter((e) => e.daysLeft <= 90);
const atRisk = renewals.reduce((a, e) => a + e.fee, 0);
const weightedPipeline = DEALS.filter((d) => d.recurring && !["Ganho", "Perdido"].includes(d.stage)).reduce(
  (a, d) => a + d.value * ({ Lead: 0.1, Qualificado: 0.25, Proposta: 0.5, Negociação: 0.75 } as Record<string, number>)[d.stage],
  0,
);

/* -------------------------------------------------------------- scenarios */

type Scenario = { newPerQuarter: number; fee: number; churn: number; priceUp: number; projects: number; hire: boolean; hireCost: number; hireMonth: number };
const PRESETS: Record<string, Scenario> = {
  Pessimista: { newPerQuarter: 1, fee: 900, churn: 5, priceUp: 0, projects: 600, hire: false, hireCost: 1800, hireMonth: 6 },
  Base: { newPerQuarter: 2, fee: 1200, churn: 2.5, priceUp: 5, projects: 1100, hire: false, hireCost: 1800, hireMonth: 6 },
  Otimista: { newPerQuarter: 3, fee: 1400, churn: 1.5, priceUp: 10, projects: 1800, hire: true, hireCost: 1800, hireMonth: 5 },
};

function project(s: Scenario) {
  let base = mrr;
  let cash = FINANCE.cash;
  const out = [];
  for (let m = 1; m <= 12; m++) {
    base = base * (1 - s.churn / 100) + (s.newPerQuarter / 3) * s.fee;
    if (m === 3) base *= 1 + s.priceUp / 100; // price review at renewals
    const revenue = base + s.projects;
    const fixed = fixedNow + (s.hire && m >= s.hireMonth ? s.hireCost : 0);
    const cost = fixed + revenue * FINANCE.variableRate;
    cash += revenue - cost;
    out.push({ date: new Date(NOW.getFullYear(), NOW.getMonth() + m, 1), mrr: base, revenue, cost, profit: revenue - cost, cash });
  }
  return out;
}

export default function CompanyPage() {
  return (
    <Suspense>
      <Company />
    </Suspense>
  );
}

function Company() {
  const { can } = useSession();
  const params = useSearchParams();
  const router = useRouter();
  const raw = params.get("tab");
  const tab: Tab = TABS.some((t) => t.id === raw) ? (raw as Tab) : "cockpit";
  const alerts = useAlerts();
  const { alertState } = useStore();
  const pending = alerts.filter((a) => (alertState[a.key]?.status ?? "aberto") === "aberto").length;

  if (!can("empresa")) {
    return (
      <div className="card empty" style={{ marginTop: 40 }}>
        <Lock size={28} style={{ marginBottom: 10 }} />
        <div style={{ fontWeight: 600, color: "var(--ink)" }}>Área reservada ao CEO</div>
        <p style={{ marginTop: 4 }}>Os dados financeiros da agência só estão visíveis para quem tem a permissão «Gestão da empresa».</p>
      </div>
    );
  }

  return (
    <>
      <PageHead
        title="Empresa"
        lede="O painel de controlo da agência: metas, o que precisa de decisão agora, dinheiro real disponível e a saúde de cada cliente."
        actions={<span className="badge"><Lock size={12} /> Só CEO</span>}
      />
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" className="tab" aria-selected={tab === t.id} onClick={() => router.replace(`/empresa?tab=${t.id}`, { scroll: false })}>
            {t.label}
            {t.id === "cockpit" && pending > 0 && <span className="badge-count">{pending}</span>}
          </button>
        ))}
      </div>
      {tab === "cockpit" && <Cockpit />}
      {tab === "financas" && <Finances />}
      {tab === "clientes" && (
        <>
          <HealthBoard />
          <SectionTitle title="Rentabilidade por cliente" />
          <Profitability />
        </>
      )}
      {tab === "planeamento" && <Planning />}
    </>
  );
}

function Planning() {
  const [view, setView] = useState<"be" | "sc">("be");
  return (
    <>
      <div className="filters">
        <div className="segmented" role="group" aria-label="Ferramenta de planeamento">
          <button aria-pressed={view === "be"} onClick={() => setView("be")}>Break-even</button>
          <button aria-pressed={view === "sc"} onClick={() => setView("sc")}>Cenários a 12 meses</button>
        </div>
      </div>
      {view === "be" ? <BreakEven /> : <Scenarios />}
    </>
  );
}

function Finances() {
  return (
    <>
      <div className="grid grid--main" style={{ gap: 24 }}>
        <div className="stack" style={{ gap: 12 }}>
          <FreeCash />
          <Receivables />
        </div>
        <div>
          <FiscalCalendar />
        </div>
      </div>
      <FinanceHistory />
    </>
  );
}

/* ---------------------------------------------------------------- overview */

function FinanceHistory() {
  const burn = last3Profit < 0 ? -last3Profit : 0;
  return (
    <>
      <SectionTitle title="Histórico" />
      <div className="kpis">
        <Kpi label="Receita recorrente (MRR)" value={money(mrr)} foot={<>{money(mrr * 12)}/ano</>} />
        <Kpi label="Custos fixos / mês" value={money(fixedNow)} foot={`+ ${pct(FINANCE.variableRate * 100, 0)} variáveis`} />
        <Kpi
          label="Resultado médio · 3 meses"
          value={<span style={{ color: last3Profit >= 0 ? "var(--good)" : "var(--bad)" }}>{money(last3Profit)}</span>}
          foot="com projetos pontuais"
        />
        <Kpi
          label="Caixa"
          value={money(FINANCE.cash)}
          foot={burn ? `${Math.floor(FINANCE.cash / burn)} meses de pista` : "sem queima de caixa"}
        />
      </div>

      <div className="grid grid--main" style={{ gap: 24, marginTop: 8 }}>
        <div>
          <SectionTitle title="Receita e custos · 12 meses" />
          <div className="card card__body">
            <LineChart
              labels={FIN_MONTHS.map(mLabel)}
              format={money}
              series={[
                { id: "rev", label: "Receita", color: "var(--series-1)", values: rev },
                { id: "cost", label: "Custos", color: "var(--series-2)", values: costs },
              ]}
            />
            <p className="faint" style={{ fontSize: 12, marginTop: 8 }}>
              Os meses em que a linha azul fica abaixo da laranja são meses com prejuízo. A equipa cresceu em março.
            </p>
          </div>

          <SectionTitle title="Economia por cliente" />
          <div className="kpis" style={{ ["--cols" as string]: 4 }}>
            <Kpi label="Avença média" value={money(avgFee)} />
            <Kpi label="Custo de aquisição (CAC)" value={money(cac)} foot="marketing + tempo comercial" />
            <Kpi label="Valor de vida (LTV)" value={money(ltv)} foot={`churn ${pct(churnMonthly * 100)}/mês`} />
            <Kpi label="LTV / CAC" value={`${(ltv / cac).toLocaleString("pt-PT", { maximumFractionDigits: 1 })}×`} foot={ltv / cac >= 3 ? "saudável (> 3×)" : "abaixo de 3×"} />
          </div>
        </div>
        <div>
          <SectionTitle title="Para onde vai o dinheiro" />
          <div className="card card__body">
            {FINANCE.fixed.map((f) => (
              <div className="bar-row" key={f.label}>
                <span>{f.label}</span>
                <span className="num">{money(f.value)} <span className="faint">· {Math.round((f.value / fixedNow) * 100)}%</span></span>
                <div className="bar-track"><div className="bar-fill" style={{ width: `${(f.value / FINANCE.fixed[0].value) * 100}%`, background: "var(--series-2)" }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/* --------------------------------------------------------------- break-even */

function BreakEven() {
  const [fixed, setFixed] = useState(fixedNow);
  const [rate, setRate] = useState(FINANCE.variableRate * 100);
  const [fee, setFee] = useState(Math.round(avgFee / 50) * 50);
  const be = fixed / (1 - rate / 100);
  const clientsNeeded = Math.ceil(be / fee);
  const current = mrr;
  const safety = (current - be) / current;
  const max = Math.max(be, current) * 1.6;
  const steps = 12;
  const xs = Array.from({ length: steps + 1 }, (_, i) => (max / steps) * i);

  return (
    <div className="grid grid--main" style={{ gap: 24 }}>
      <div>
        <div className="card card__body">
          <div className="eyebrow">Ponto de equilíbrio</div>
          <div className="big-number" style={{ marginTop: 4 }}>{money(be)}<span className="faint" style={{ fontSize: 16, fontWeight: 500 }}> / mês</span></div>
          <p className="muted" style={{ marginTop: 6 }}>
            É quanto a agência tem de faturar por mês para cobrir todos os custos. Com uma avença média de {money(fee)}, são{" "}
            <strong style={{ color: "var(--ink)" }}>{clientsNeeded} clientes</strong>. Hoje tens {CLIENT_ECONOMICS.length}.
          </p>

          <div style={{ margin: "30px 0 34px" }}>
            <div className="meter">
              <i style={{ width: `${Math.min(100, (current / max) * 100)}%`, background: current >= be ? "var(--good-strong)" : "var(--warn)" }} />
              <span className="meter__mark" style={{ left: `${(be / max) * 100}%` }} />
              <span className="meter__label" style={{ left: `${(be / max) * 100}%` }}>break-even {money(be)}</span>
            </div>
            <div className="faint" style={{ fontSize: 12, marginTop: 30 }}>
              Receita recorrente atual: <strong style={{ color: "var(--ink)" }}>{money(current)}</strong> ·{" "}
              {safety >= 0 ? (
                <span className="delta--up">margem de segurança de {pct(safety * 100, 0)}</span>
              ) : (
                <span className="delta--down">faltam {money(be - current)}/mês ({pct(-safety * 100, 0)})</span>
              )}
            </div>
          </div>

          <LineChart
            labels={xs.map((x) => money(x))}
            format={money}
            series={[
              { id: "rev", label: "Receita", color: "var(--series-1)", values: xs },
              { id: "cost", label: "Custos totais", color: "var(--series-2)", values: xs.map((x) => fixed + (x * rate) / 100) },
            ]}
          />
          <p className="faint" style={{ fontSize: 12, marginTop: 8 }}>Eixo horizontal: faturação mensal. As linhas cruzam-se no ponto de equilíbrio.</p>
        </div>
      </div>
      <div>
        <div className="card card__body stack" style={{ gap: 18 }}>
          <div className="eyebrow">Simula</div>
          <Slider label="Custos fixos por mês" value={fixed} min={3000} max={12000} step={50} format={money} onChange={setFixed} />
          <Slider label="Custos variáveis (% da receita)" value={rate} min={0} max={40} step={1} format={(v) => `${v}%`} onChange={setRate} />
          <Slider label="Avença média" value={fee} min={400} max={4000} step={50} format={money} onChange={setFee} />
          <button className="btn btn--sm" onClick={() => { setFixed(fixedNow); setRate(FINANCE.variableRate * 100); setFee(Math.round(avgFee / 50) * 50); }}>
            Repor valores atuais
          </button>
        </div>
        <div className="card card__body" style={{ marginTop: 12 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>O que isto quer dizer</div>
          <ul className="muted" style={{ margin: 0, paddingLeft: 18, fontSize: 13, display: "grid", gap: 6 }}>
            <li>Cada 100 € de custo fixo novo exige {money(100 / (1 - rate / 100))} de receita extra.</li>
            <li>Subir a avença média para {money(fee * 1.1)} (+10%) baixa o número de clientes necessários para {Math.ceil(be / (fee * 1.1))}.</li>
            <li>Uma contratação de 1800 €/mês empurra o break-even para {money((fixed + 1800) / (1 - rate / 100))}.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function Slider({ label, value, min, max, step, format, onChange }: { label: string; value: number; min: number; max: number; step: number; format: (v: number) => string; onChange: (v: number) => void }) {
  return (
    <label className="slider">
      <span className="slider__top">
        <span>{label}</span>
        <b>{format(value)}</b>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

/* ---------------------------------------------------------------- scenarios */

function Scenarios() {
  const [preset, setPreset] = useState("Base");
  const [s, setS] = useState<Scenario>(PRESETS.Base);
  const set = (patch: Partial<Scenario>) => {
    setPreset("");
    setS((x) => ({ ...x, ...patch }));
  };
  const rows = useMemo(() => project(s), [s]);
  const all = useMemo(() => Object.fromEntries(Object.entries(PRESETS).map(([k, v]) => [k, project(v)])), []);
  const firstProfit = rows.find((r) => r.mrr >= (fixedNow + (s.hire ? s.hireCost : 0)) / (1 - FINANCE.variableRate));
  const minCash = Math.min(...rows.map((r) => r.cash));
  const end = rows[rows.length - 1];

  return (
    <>
      <div className="filters">
        {Object.keys(PRESETS).map((k) => (
          <button key={k} className="chip" aria-pressed={preset === k} onClick={() => { setPreset(k); setS(PRESETS[k]); }}>{k}</button>
        ))}
        {!preset && <span className="badge badge--info">Personalizado</span>}
      </div>

      <div className="grid grid--main" style={{ gap: 24 }}>
        <div>
          <div className="kpis">
            <Kpi label="MRR daqui a 12 meses" value={money(end.mrr)} foot={<>{end.mrr >= mrr ? "+" : ""}{money(end.mrr - mrr)} vs. hoje</>} />
            <Kpi label="Resultado acumulado" value={<span style={{ color: rows.reduce((a, r) => a + r.profit, 0) >= 0 ? "var(--good)" : "var(--bad)" }}>{money(rows.reduce((a, r) => a + r.profit, 0))}</span>} foot="12 meses" />
            <Kpi label="Avenças pagam a estrutura" value={firstProfit ? mLabel(firstProfit.date) : "—"} foot={firstProfit ? "mês do break-even recorrente" : "não acontece em 12 meses"} />
            <Kpi label="Caixa mínima" value={<span style={{ color: minCash < 5000 ? "var(--bad)" : undefined }}>{money(minCash)}</span>} foot={minCash < 5000 ? "abaixo da almofada de 5000 €" : "acima da almofada de 5000 €"} />
          </div>

          <SectionTitle title="Projeção de receita recorrente · 3 cenários" />
          <div className="card card__body">
            <LineChart
              labels={rows.map((r) => mLabel(r.date))}
              format={money}
              series={[
                { id: "p", label: "Pessimista", color: "var(--series-2)", values: all.Pessimista.map((r) => r.mrr) },
                { id: "b", label: "Base", color: "var(--series-1)", values: all.Base.map((r) => r.mrr) },
                { id: "o", label: "Otimista", color: "var(--series-3)", values: all.Otimista.map((r) => r.mrr) },
                ...(!preset ? [{ id: "c", label: "O teu cenário", color: "var(--series-4)", values: rows.map((r) => r.mrr) }] : []),
              ]}
            />
          </div>

          <SectionTitle title="Caixa projetada" />
          <div className="card card__body">
            <LineChart area labels={rows.map((r) => mLabel(r.date))} format={money} series={[{ id: "cash", label: "Caixa", color: "var(--series-1)", values: rows.map((r) => r.cash) }]} />
          </div>
        </div>

        <div className="card card__body stack" style={{ gap: 18, alignSelf: "start" }}>
          <div className="eyebrow">Hipóteses</div>
          <Slider label="Clientes novos por trimestre" value={s.newPerQuarter} min={0} max={6} step={1} format={(v) => String(v)} onChange={(v) => set({ newPerQuarter: v })} />
          <Slider label="Avença dos clientes novos" value={s.fee} min={400} max={3000} step={50} format={money} onChange={(v) => set({ fee: v })} />
          <Slider label="Clientes perdidos (churn/mês)" value={s.churn} min={0} max={10} step={0.5} format={(v) => `${v.toLocaleString("pt-PT")}%`} onChange={(v) => set({ churn: v })} />
          <Slider label="Aumento de preços nas renovações" value={s.priceUp} min={0} max={25} step={1} format={(v) => `${v}%`} onChange={(v) => set({ priceUp: v })} />
          <Slider label="Projetos pontuais por mês" value={s.projects} min={0} max={5000} step={100} format={money} onChange={(v) => set({ projects: v })} />
          <label className="row" style={{ cursor: "pointer" }}>
            <input type="checkbox" checked={s.hire} onChange={() => set({ hire: !s.hire })} />
            Contratar mais uma pessoa
          </label>
          {s.hire && (
            <>
              <Slider label="Custo mensal da contratação" value={s.hireCost} min={900} max={3500} step={50} format={money} onChange={(v) => set({ hireCost: v })} />
              <Slider label="Entra no mês" value={s.hireMonth} min={1} max={12} step={1} format={(v) => mLabel(new Date(NOW.getFullYear(), NOW.getMonth() + v, 1))} onChange={(v) => set({ hireMonth: v })} />
            </>
          )}
          <p className="faint" style={{ fontSize: 12 }}>
            Parte de hoje: {money(mrr)} de MRR, {money(fixedNow)} de custos fixos e {money(FINANCE.cash)} em caixa.
          </p>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------ profitability */

function Profitability() {
  const { time } = useStore();
  const from = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - 29);
  // Real hours from the time log (last 30 days) replace the estimates.
  const rows = econ.map((e) => {
    const hours = time.filter((t) => t.clientId === e.clientId && t.date >= from).reduce((a, t) => a + t.minutes, 0) / 60 || e.hours;
    const cost = hours * FINANCE.hourCost;
    return { ...e, hours: Math.round(hours), cost, margin: e.fee - cost, marginPct: (e.fee - cost) / e.fee, perHour: e.fee / hours };
  });
  return (
    <>
      <div className="notice notice--info" style={{ marginBottom: 16 }}>
        <ShieldCheck size={16} />
        <span>
          Margem = avença − horas registadas × {money(FINANCE.hourCost)}/h (custo interno por hora, com salários e estrutura). As horas são as registadas nos últimos 30 dias em{" "}
          <Link href="/operacao" className="link">Operação → Horas</Link> e nas tarefas.
        </span>
      </div>
      <div className="table-wrap">
        <table className="table table--cards">
          <thead>
            <tr>
              <th>Cliente</th>
              <th className="r">Avença</th>
              <th className="r">Horas (30 d)</th>
              <th className="r">Custo</th>
              <th className="r">Margem</th>
              <th className="r">€ por hora</th>
              <th>Contrato</th>
              <th>Recomendação</th>
            </tr>
          </thead>
          <tbody>
            {[...rows].sort((a, b) => b.marginPct - a.marginPct).map((e) => {
              const tone = e.marginPct < 0.2 ? "bad" : e.marginPct < 0.35 ? "warn" : "good";
              const rec =
                e.marginPct < 0.2
                  ? `Subir para ${money(Math.ceil((e.cost / 0.65) / 50) * 50)} ou cortar ${Math.round(e.hours - (e.fee * 0.65) / FINANCE.hourCost)} h/mês`
                  : e.daysLeft <= 90
                    ? "Renovar com aumento de 5–10%"
                    : "Manter";
              return (
                <tr key={e.clientId}>
                  <td>
                    <span className="row" style={{ gap: 10 }}>
                      <ClientTile clientId={e.clientId} size={24} />
                      <strong>{client(e.clientId)!.name}</strong>
                    </span>
                  </td>
                  <td className="r" data-label="Avença">{money(e.fee)}</td>
                  <td className="r" data-label="Horas">{e.hours} h</td>
                  <td className="r" data-label="Custo">{money(e.cost)}</td>
                  <td className="r" data-label="Margem">
                    <span className={`badge badge--${tone}`}>{pct(e.marginPct * 100, 0)}</span> {money(e.margin)}
                  </td>
                  <td className="r" data-label="€/h">{money(e.perHour)}</td>
                  <td data-label="Renova em">
                    <span className={e.daysLeft <= 60 ? "due--late" : e.daysLeft <= 90 ? "due--soon" : ""}>{e.daysLeft} dias</span>
                  </td>
                  <td className="muted">{rec}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="kpis" style={{ marginTop: 16 }}>
        <Kpi label="Margem bruta média" value={pct(grossMargin * 100, 0)} foot="alvo de agência: 40–50%" />
        <Kpi label="Receita a renovar em 90 dias" value={money(atRisk)} foot={`${pct((atRisk / mrr) * 100, 0)} do MRR`} />
        <Kpi label="Maior cliente" value={pct(concentration * 100, 0)} foot={`do MRR · ${client(top.clientId)!.name}`} />
        <Kpi label="Horas vendidas / mês" value={`${econ.reduce((a, e) => a + e.hours, 0)} h`} foot="em avenças" />
      </div>
    </>
  );
}
