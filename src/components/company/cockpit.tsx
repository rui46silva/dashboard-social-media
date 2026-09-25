"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, ArrowUpRight, Check, ChevronDown, CircleAlert, ListPlus, Pencil, RotateCcw, SlidersHorizontal } from "lucide-react";
import { CLIENT_ECONOMICS, NOW, USERS, user } from "@/lib/data";
import {
  RULES, TARGET_DEFS, evaluateAlerts, isFreelancer, freeCash, grossMargin, newClientsThisQuarter, npsNow, receivables, utilization, weightedPipeline,
  type Alert, type Severity, type TargetId,
} from "@/lib/company";
import { money } from "@/lib/format";
import { Avatar, SectionTitle } from "@/components/ui";
import { CountUp } from "@/components/count-up";
import { useStore, type AlertStatus } from "@/components/store";

/* ------------------------------------------------------------------ targets */

type Level = "good" | "warn" | "bad";
const LEVEL_LABEL: Record<Level, string> = { good: "Na meta", warn: "Perto", bad: "Longe" };

export function useActuals(): Record<TargetId, number> {
  const { time, nps, invoicePaid, proposals, savedClients } = useStore();
  const known = new Set(CLIENT_ECONOMICS.map((e) => e.clientId));
  const extra = savedClients.filter((c) => !known.has(c.base.id)).reduce((a, c) => a + (c.profile.fee || 0), 0);
  return {
    mrr: CLIENT_ECONOMICS.reduce((a, e) => a + e.fee, 0) + extra,
    margem: grossMargin(time) * 100,
    caixa: freeCash().months,
    ocupacao: utilization(time) * 100,
    nps: npsNow(nps),
    dso: receivables(invoicePaid).dso,
    pipeline: weightedPipeline(),
    novos: newClientsThisQuarter(proposals),
  };
}

export function level(actual: number, target: number, better: "up" | "down"): { level: Level; ratio: number } {
  const ratio = better === "up" ? (target > 0 ? actual / target : 1) : actual > 0 ? target / actual : 1;
  return { level: ratio >= 1 ? "good" : ratio >= 0.85 ? "warn" : "bad", ratio };
}

const fmt = (unit: string, n: number) => {
  if (unit === "€") return money(n);
  if (unit === "%") return `${Math.round(n)}%`;
  if (unit === "meses") return `${n.toLocaleString("pt-PT", { maximumFractionDigits: 1 })} meses`;
  if (unit === "dias") return `${Math.round(n)} dias`;
  return n > 0 && unit === "" && n !== Math.round(n) ? n.toLocaleString("pt-PT") : String(Math.round(n));
};

function Targets() {
  const { targets, setTarget } = useStore();
  const actual = useActuals();
  const [editing, setEditing] = useState<TargetId | null>(null);

  return (
    <div className="targets">
      {TARGET_DEFS.map((d) => {
        const target = targets[d.id] ?? d.default;
        const a = actual[d.id];
        const { level: lv, ratio } = level(a, target, d.better);
        const shown = d.id === "nps" && a > 0 ? `+${a}` : fmt(d.unit, a);
        return (
          <div key={d.id} className={`card target target--${lv}`}>
            <div className="target__top">
              <span className="target__label">{d.id === "ocupacao" && isFreelancer() ? "Ocupação" : d.label}</span>
              <span className={`lozenge lozenge--${lv}`}>
                {LEVEL_LABEL[lv]}
              </span>
            </div>
            <div className="target__value"><CountUp value={shown} /></div>
            <div className="target__bar" role="img" aria-label={`${Math.round(Math.min(ratio, 1) * 100)}% da meta`}>
              <i style={{ width: `${Math.max(4, Math.min(100, ratio * 100))}%` }} />
            </div>
            <div className="target__foot">
              {editing === d.id ? (
                <form
                  className="target__edit"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const v = Number(new FormData(e.currentTarget).get("v"));
                    if (Number.isFinite(v)) setTarget(d.id, v);
                    setEditing(null);
                  }}
                >
                  <label className="sr-only" htmlFor={`t-${d.id}`}>Meta para {d.label}</label>
                  <input id={`t-${d.id}`} name="v" className="input" type="number" step="any" defaultValue={target} autoFocus onBlur={(e) => e.currentTarget.form?.requestSubmit()} />
                  <span className="faint">{d.unit}</span>
                </form>
              ) : (
                <button className="target__meta" onClick={() => setEditing(d.id)} title="Editar a meta">
                  {d.better === "down" ? "máx." : "meta"} {fmt(d.unit, target)} <Pencil size={11} />
                </button>
              )}
              <span className="faint target__hint">{d.hint}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------- alerts */

const SEV_TONE: Record<Severity, "bad" | "warn" | "info"> = { alta: "bad", média: "warn", baixa: "info" };
const STATUSES: AlertStatus[] = ["aberto", "em curso", "resolvido"];
const TEAM = USERS.filter((u) => u.role !== "cliente" && u.status === "ativo");
const when = (d: Date) => {
  const days = Math.round((NOW.getTime() - d.getTime()) / 864e5);
  return days <= 0 ? "hoje" : days === 1 ? "ontem" : `há ${days} dias`;
};

export function useAlerts() {
  const { thresholds, targets, time, nps, invoicePaid, goals, fiscal } = useStore();
  return useMemo(
    () => evaluateAlerts({ thresholds, targets, time, nps, paid: invoicePaid, goals }),
    // fiscal is read through lib/company, so it must re-run the rules too
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [thresholds, targets, time, nps, invoicePaid, goals, fiscal],
  );
}

function AlertRow({ a, open, onToggle }: { a: Alert; open: boolean; onToggle: () => void }) {
  const { alertState, updateAlert, addTask } = useStore();
  const st = alertState[a.key];
  const status = st?.status ?? "aberto";
  const owner = st?.owner ?? a.owner;
  const tone = SEV_TONE[a.rule.severity];

  const createTask = () => {
    const t = addTask({
      title: a.title,
      assignee: owner,
      clientId: a.clientId,
      priority: a.rule.severity === "alta" ? "alta" : a.rule.severity === "média" ? "média" : "baixa",
      due: new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() + (a.rule.severity === "alta" ? 2 : 5), 18),
      tags: ["alerta"],
      description: `${a.detail}\n\nAção sugerida: ${a.rule.action}.${st?.note ? `\n\nDecisão: ${st.note}` : ""}`,
    });
    updateAlert(a.key, { status: "em curso", taskId: t.id, owner }, a.title);
  };

  return (
    <div className={`alert${open ? " alert--open" : ""}`}>
      <button className="alert__head" onClick={onToggle} aria-expanded={open}>
        <span className={`insight__icon insight__icon--${tone}`}><CircleAlert size={15} /></span>
        <span className="alert__main">
          <span className="alert__title">{a.title}</span>
          <span className="alert__detail">{a.detail}</span>
        </span>
        <span className="alert__meta">
          {status === "em curso" && <span className="lozenge lozenge--info">Em curso</span>}
          <Avatar userId={owner} size={24} />
          <ChevronDown size={16} className="alert__chev" />
        </span>
      </button>
      {open && (
        <div className="alert__body">
          <div className="alert__action">
            <ArrowRight size={14} />
            <span><b>Ação sugerida:</b> {a.rule.action}.</span>
          </div>
          <div className="alert__controls">
            <label className="alert__field">
              <span>Responsável</span>
              <select className="input" value={owner} onChange={(e) => updateAlert(a.key, { owner: e.target.value }, a.title)}>
                {TEAM.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </label>
            <div className="alert__field">
              <span>Estado</span>
              <div className="segmented" role="group" aria-label="Estado do alerta">
                {STATUSES.map((s) => (
                  <button key={s} aria-pressed={status === s} onClick={() => updateAlert(a.key, { status: s, owner }, a.title)}>
                    {s[0].toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <label className="alert__field alert__note">
            <span>Decisão tomada</span>
            <input
              className="input"
              placeholder="Ex.: ligar ao cliente na segunda e propor plano de pagamento"
              defaultValue={st?.note ?? ""}
              onBlur={(e) => e.target.value !== (st?.note ?? "") && updateAlert(a.key, { note: e.target.value, owner }, a.title)}
            />
          </label>
          <div className="alert__buttons">
            {st?.taskId ? (
              <Link className="btn btn--sm" href={`/tarefas?t=${st.taskId}`}><Check size={14} /> Tarefa criada</Link>
            ) : (
              <button className="btn btn--sm btn--primary" onClick={createTask}><ListPlus size={14} /> Criar tarefa</button>
            )}
            <Link className="btn btn--sm btn--ghost" href={a.href}>Ver detalhe <ArrowUpRight size={14} /></Link>
          </div>
        </div>
      )}
    </div>
  );
}

function AlertCentre() {
  const alerts = useAlerts();
  const { alertState } = useStore();
  const [view, setView] = useState<AlertStatus>("aberto");
  const [openKey, setOpenKey] = useState<string | null>(null);

  const active = alerts.filter((a) => (alertState[a.key]?.status ?? "aberto") !== "resolvido");
  const byStatus = (s: AlertStatus) => active.filter((a) => (alertState[a.key]?.status ?? "aberto") === s);
  const resolved = Object.entries(alertState).filter(([, v]) => v.status === "resolvido").sort((a, b) => b[1].at.getTime() - a[1].at.getTime());
  const list = view === "resolvido" ? [] : byStatus(view);
  const firstOpen = openKey ?? list[0]?.key ?? null;

  return (
    <>
      <SectionTitle
        title="Momentos focais"
        action={
          <div className="segmented" role="group" aria-label="Filtrar alertas">
            <button aria-pressed={view === "aberto"} onClick={() => setView("aberto")}>Por tratar {byStatus("aberto").length}</button>
            <button aria-pressed={view === "em curso"} onClick={() => setView("em curso")}>Em curso {byStatus("em curso").length}</button>
            <button aria-pressed={view === "resolvido"} onClick={() => setView("resolvido")}>Registo</button>
          </div>
        }
      />
      {view !== "resolvido" ? (
        <div className="list alerts">
          {list.length ? (
            list.map((a) => <AlertRow key={a.key} a={a} open={firstOpen === a.key} onToggle={() => setOpenKey(firstOpen === a.key ? "" : a.key)} />)
          ) : (
            <div className="empty">
              <Check size={22} style={{ marginBottom: 6 }} />
              <div style={{ fontWeight: 600, color: "var(--ink)" }}>{view === "aberto" ? "Nada por tratar" : "Nada em curso"}</div>
              <p>{view === "aberto" ? "Todos os alertas têm dono e decisão." : "Muda um alerta para «Em curso» quando alguém pegar nele."}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="list">
          {resolved.length ? (
            resolved.map(([key, v]) => (
              <div key={key} className="log-row">
                <span className="insight__icon insight__icon--good"><Check size={15} /></span>
                <div>
                  <div style={{ fontWeight: 600 }}>{v.title}</div>
                  <div className="muted" style={{ fontSize: 13 }}>{v.note ? `Decisão: ${v.note}` : "Resolvido sem nota."}</div>
                  <div className="faint" style={{ fontSize: 12, marginTop: 2 }}>
                    {user(v.owner ?? v.by)?.name} · {when(v.at)}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="empty"><p>Os alertas resolvidos ficam aqui com a decisão tomada — o histórico do que a empresa fez e porquê.</p></div>
          )}
        </div>
      )}
    </>
  );
}

function AlertSummary() {
  const alerts = useAlerts();
  const { alertState } = useStore();
  const active = alerts.filter((a) => (alertState[a.key]?.status ?? "aberto") !== "resolvido");
  const sev = (s: Severity) => active.filter((a) => a.rule.severity === s).length;
  const owners = new Map<string, number>();
  for (const a of active) {
    const o = alertState[a.key]?.owner ?? a.owner;
    owners.set(o, (owners.get(o) ?? 0) + 1);
  }
  return (
    <div className="card card__body">
      <div className="eyebrow">Por tratar</div>
      <div className="sev-strip">
        {(["alta", "média", "baixa"] as Severity[]).map((s) => (
          <div key={s} className={`sev sev--${SEV_TONE[s]}`}>
            <b className="num">{sev(s)}</b>
            <span>{s === "alta" ? "urgentes" : s === "média" ? "importantes" : "a vigiar"}</span>
          </div>
        ))}
      </div>
      <div className="eyebrow" style={{ marginTop: 16 }}>Com quem estão</div>
      <div className="stack" style={{ gap: 8, marginTop: 8 }}>
        {[...owners].sort((a, b) => b[1] - a[1]).map(([id, n]) => (
          <div key={id} className="row" style={{ gap: 10 }}>
            <Avatar userId={id} size={24} />
            <span className="grow">{user(id)?.name}</span>
            <span className="num muted">{n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RulesEditor() {
  const { thresholds, setThreshold } = useStore();
  const [open, setOpen] = useState(false);
  return (
    <div className="card">
      <button className="card__head rules__toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="row" style={{ gap: 8 }}><SlidersHorizontal size={15} /> Regras dos alertas</span>
        <ChevronDown size={16} className="alert__chev" style={{ transform: open ? "rotate(180deg)" : undefined }} />
      </button>
      {open && (
        <div className="card__body rules">
          <p className="faint" style={{ fontSize: 12, marginTop: 0 }}>Os limites que disparam cada alerta. Ajusta à realidade da agência.</p>
          {RULES.map((r) => (
            <label key={r.id} className="rule">
              <span className="rule__label">{r.label}</span>
              <span className="rule__input">
                <input
                  className="input"
                  type="number"
                  step="any"
                  value={thresholds[r.id] ?? r.default}
                  onChange={(e) => e.target.value !== "" && setThreshold(r.id, Number(e.target.value))}
                />
                <span className="faint">{r.unit}</span>
              </span>
            </label>
          ))}
          <button className="btn btn--sm" onClick={() => RULES.forEach((r) => setThreshold(r.id, r.default))}>
            <RotateCcw size={13} /> Repor predefinições
          </button>
        </div>
      )}
    </div>
  );
}

export function Cockpit() {
  return (
    <>
      <SectionTitle title="Metas do trimestre" action={<span className="faint" style={{ fontSize: 12 }}>Clica numa meta para a mudar</span>} />
      <Targets />
      <div className="grid grid--main" style={{ gap: 24, marginTop: 8 }}>
        <div>
          <AlertCentre />
        </div>
        <div>
          <SectionTitle title="Resumo" />
          <div className="stack" style={{ gap: 12 }}>
            <AlertSummary />
            <RulesEditor />
          </div>
        </div>
      </div>
    </>
  );
}
