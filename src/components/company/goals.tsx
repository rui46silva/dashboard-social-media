"use client";

import { useState } from "react";
import { Check, Pencil, Plus, Target, Trash2, TrendingUp, X } from "lucide-react";
import { NOW, USERS } from "@/lib/data";
import { fixedTotal } from "@/lib/company";
import { METRICS, STATUS_TONE, forecast, metricHistory, type Forecast, type Goal, type GoalMetric, type GoalStatus, type GoalUnit } from "@/lib/goals";
import { money } from "@/lib/format";
import { Avatar, SectionTitle } from "@/components/ui";
import { useWidth } from "@/components/charts";
import { useStore } from "@/components/store";

const MON = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const monthYear = (d: Date) => `${MON[d.getMonth()]} ${d.getFullYear()}`;
const fullDate = (d: Date) => `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`;
const TEAM = USERS.filter((u) => u.role !== "cliente" && u.status === "ativo");

export function fmtGoal(unit: GoalUnit, n: number, signed = false) {
  const sign = signed && n > 0 ? "+" : signed && n < 0 ? "−" : "";
  const v = signed ? Math.abs(n) : n;
  if (unit === "€") return sign + money(v);
  if (unit === "%") return `${sign}${Math.round(v)}%`;
  return sign + v.toLocaleString("pt-PT", { maximumFractionDigits: Math.abs(v) < 10 && v % 1 ? 1 : 0 });
}

const STATUS_LABEL: Record<GoalStatus, string> = {
  alcançada: "Alcançada", "no bom caminho": "No bom caminho", "em risco": "Em risco", "fora de rota": "Fora de rota", "sem dados": "Sem dados",
};

/* ------------------------------------------------------------------ chart */

/**
 * History (solid), trend projection to the deadline (dashed, same hue), target
 * (dashed reference line) and deadline (vertical rule). Raw monthly values
 * show as faint dots when the line is a 3-month average.
 */
function GoalChart({ g, f }: { g: Goal; f: Forecast }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const H = 150;
  const pad = { l: 8, r: 64, t: 18, b: 22 };
  const pts = f.series;
  if (!pts.length) return <div ref={ref} className="goal-chart goal-chart--empty faint">Sem pontos ainda.</div>;
  const x0 = pts[0].date.getTime();
  const x1 = Math.max(g.deadline.getTime(), NOW.getTime()) + 5 * 864e5;
  const vals = [...pts.map((p) => p.value), ...f.points.map((p) => p.value), g.target, f.projected, f.baseline];
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  const span = hi - lo || 1;
  lo = g.unit === "%" || g.unit === "nº" ? Math.max(0, lo - span * 0.1) : lo - span * 0.12;
  hi += span * 0.12;
  const X = (t: number) => pad.l + ((t - x0) / (x1 - x0)) * (width - pad.l - pad.r);
  const Yv = (v: number) => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${X(p.date.getTime()).toFixed(1)},${Yv(p.value).toFixed(1)}`).join("");
  const last = pts[pts.length - 1];
  const reached = f.status === "alcançada";
  const tone = STATUS_TONE[f.status];

  return (
    <div ref={ref} className="goal-chart">
      <svg width={width} height={H} role="img" aria-label={`Evolução de ${g.title}: atual ${fmtGoal(g.unit, f.current)}, meta ${fmtGoal(g.unit, g.target)}, previsão no prazo ${fmtGoal(g.unit, f.projected)}`}>
        {/* target */}
        <line x1={pad.l} x2={width - pad.r} y1={Yv(g.target)} y2={Yv(g.target)} className="goal-chart__target" />
        <text x={width - pad.r + 6} y={Yv(g.target) + 4} className="goal-chart__label goal-chart__label--strong">meta</text>
        {/* deadline */}
        <line x1={X(g.deadline.getTime())} x2={X(g.deadline.getTime())} y1={pad.t - 6} y2={H - pad.b} className="goal-chart__deadline" />
        <text x={X(g.deadline.getTime())} y={H - 6} textAnchor="middle" className="goal-chart__label">prazo</text>
        <text x={pad.l} y={H - 6} className="goal-chart__label">{monthYear(pts[0].date)}</text>
        {/* raw monthly values behind a smoothed line */}
        {f.smooth && f.points.map((p) => <circle key={p.date.getTime()} cx={X(p.date.getTime())} cy={Yv(p.value)} r={2.5} className="goal-chart__raw" />)}
        <path d={line} pathLength={1} className="chart-line goal-chart__line" />
        {!f.smooth && pts.map((p) => <circle key={p.date.getTime()} cx={X(p.date.getTime())} cy={Yv(p.value)} r={3} className="goal-chart__dot" />)}
        {/* projection */}
        {!reached && f.status !== "sem dados" && (
          <>
            <line x1={X(last.date.getTime())} y1={Yv(last.value)} x2={X(g.deadline.getTime())} y2={Yv(f.projected)} className={`goal-chart__proj goal-chart__proj--${tone}`} />
            <circle cx={X(g.deadline.getTime())} cy={Yv(f.projected)} r={4} className={`goal-chart__end goal-chart__end--${tone}`} />
            <text x={width - pad.r + 6} y={Yv(f.projected) + 4 + (Math.abs(Yv(f.projected) - Yv(g.target)) < 14 ? 12 : 0)} className="goal-chart__label">previsão</text>
          </>
        )}
        <circle cx={X(last.date.getTime())} cy={Yv(last.value)} r={4} className="goal-chart__now" />
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------- card */

function GoalCard({ g, onEdit }: { g: Goal; onEdit: () => void }) {
  const { addCheckin, removeGoal } = useStore();
  const f = forecast(g, fixedTotal());
  const tone = STATUS_TONE[f.status];
  const [logging, setLogging] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const metric = METRICS.find((m) => m.id === g.metric)!;
  const late = f.eta && f.eta > g.deadline;
  const months = Math.round(f.monthsLeft);

  let story: string;
  if (f.status === "alcançada") story = "Meta alcançada. Boa altura para subir a fasquia ou fechar a meta.";
  else if (f.status === "sem dados") story = "Ainda não há ritmo para prever. Regista o progresso ao longo de pelo menos duas semanas.";
  else if (f.pace <= 0) story = `O valor não está a subir. Para chegar lá precisas de ${fmtGoal(g.unit, f.needed, true)}/mês até ao prazo.`;
  else
    story = `Ao ritmo atual (${fmtGoal(g.unit, f.pace, true)}/mês) chegas a ${fmtGoal(g.unit, f.projected)} no prazo. ${
      f.needed > f.pace ? `Precisas de ${fmtGoal(g.unit, f.needed, true)}/mês.` : "Chega e sobra."
    }`;

  return (
    <div className={`card goal goal--${tone}`}>
      <div className="goal__head">
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="goal__title">{g.title}</div>
          <div className="faint goal__meta">
            {g.metric === "manual" ? "Atualizada à mão" : `${metric.label} · automática`} · até {fullDate(g.deadline)}
            {f.status !== "alcançada" && ` · ${months <= 0 ? "prazo a terminar" : months === 1 ? "falta 1 mês" : `faltam ${months} meses`}`}
          </div>
        </div>
        <Avatar userId={g.owner} size={24} />
      </div>

      <div className="goal__numbers">
        <div>
          <span className="goal__current num">{fmtGoal(g.unit, f.current)}</span>
          <span className="faint"> de {fmtGoal(g.unit, g.target)}{f.smooth ? " · média 3 meses" : ""}</span>
        </div>
        <span className={`lozenge lozenge--${tone}`}>{STATUS_LABEL[f.status]}</span>
      </div>
      <div className={`goal__bar goal__bar--${tone}`} role="img" aria-label={`${Math.round(f.progress * 100)}% do caminho`}>
        <i style={{ width: `${Math.max(2, f.progress * 100)}%` }} />
      </div>

      <GoalChart g={g} f={f} />

      <div className="goal__story">
        <TrendingUp size={15} />
        <span>
          {story}
          {f.status !== "alcançada" && f.status !== "sem dados" && f.eta && (
            <> {late ? <b>Ao ritmo atual, só lá chegas em {monthYear(f.eta)}.</b> : <>Previsão de chegada: <b>{monthYear(f.eta)}</b>.</>}</>
          )}
        </span>
      </div>
      {g.why && <p className="goal__why">{g.why}</p>}

      {g.metric === "manual" && g.checkins.length > 0 && (
        <div className="goal__log">
          {g.checkins.slice(-3).reverse().map((c) => (
            <div key={c.date.getTime()} className="goal__log-row">
              <span className="num"><b>{fmtGoal(g.unit, c.value)}</b></span>
              <span className="muted truncate">{c.note || "—"}</span>
              <span className="faint">{c.date.getDate()} {MON[c.date.getMonth()]}</span>
            </div>
          ))}
        </div>
      )}

      {logging && (
        <form
          className="goal__checkin"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const v = Number(fd.get("value"));
            if (!Number.isFinite(v)) return;
            addCheckin(g.id, { value: v, note: String(fd.get("note") || "") });
            setLogging(false);
          }}
        >
          <label className="field">
            <span>Valor atual</span>
            <input name="value" className="input" type="number" step="any" defaultValue={f.current} autoFocus required />
          </label>
          <label className="field grow">
            <span>O que mudou</span>
            <input name="note" className="input" placeholder="Ex.: módulo 2 gravado" />
          </label>
          <div className="row" style={{ gap: 6, alignSelf: "end" }}>
            <button className="btn btn--sm btn--primary" type="submit"><Check size={14} /> Guardar</button>
            <button className="btn btn--sm btn--ghost" type="button" onClick={() => setLogging(false)}>Cancelar</button>
          </div>
        </form>
      )}

      <div className="goal__actions">
        {g.metric === "manual" && !logging && (
          <button className="btn btn--sm" onClick={() => setLogging(true)}><Plus size={14} /> Registar progresso</button>
        )}
        {g.metric !== "manual" && <span className="faint" style={{ fontSize: 12 }}>Atualiza-se com os dados financeiros.</span>}
        <span className="grow" />
        <button className="icon-btn" onClick={onEdit} aria-label="Editar meta" title="Editar"><Pencil size={15} /></button>
        {confirmDelete ? (
          <button className="btn btn--sm btn--danger" onClick={() => removeGoal(g.id)} onBlur={() => setConfirmDelete(false)} autoFocus>Apagar?</button>
        ) : (
          <button className="icon-btn" onClick={() => setConfirmDelete(true)} aria-label="Apagar meta" title="Apagar"><Trash2 size={15} /></button>
        )}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- editor */

const toInput = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function GoalEditor({ goal, onClose }: { goal?: Goal; onClose: () => void }) {
  const { saveGoal } = useStore();
  const [metric, setMetric] = useState<GoalMetric>(goal?.metric ?? "mrr");
  const [unit, setUnit] = useState<GoalUnit>(goal?.unit ?? "€");
  const auto = metric !== "manual";
  const effectiveUnit = auto ? "€" : unit;
  const history = metricHistory(metric, fixedTotal()).map((p) => p.value);
  // Same basis as the forecast: billing and result are judged on a 3-month average.
  const currentAuto = !history.length ? 0 : metric === "mrr" ? history[history.length - 1] : history.slice(-3).reduce((a, b) => a + b, 0) / 3;

  return (
    <form
      className="card goal-editor"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const [y, m, d] = String(fd.get("deadline")).split("-").map(Number);
        saveGoal({
          id: goal?.id ?? `g${Date.now().toString(36)}`,
          title: String(fd.get("title")).trim(),
          metric,
          unit: effectiveUnit,
          baseline: auto ? 0 : Number(fd.get("baseline") || 0),
          target: Number(fd.get("target")),
          start: goal?.start ?? new Date(NOW),
          deadline: new Date(y, m - 1, d, 12),
          owner: String(fd.get("owner")),
          why: String(fd.get("why") || "").trim() || undefined,
          checkins: goal?.checkins ?? [],
        });
        onClose();
      }}
    >
      <div className="spread">
        <h3 className="goal-editor__title"><Target size={16} /> {goal ? "Editar meta" : "Nova meta"}</h3>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar"><X size={16} /></button>
      </div>

      <label className="field">
        <span>O que queres alcançar</span>
        <input name="title" className="input" required defaultValue={goal?.title} placeholder="Ex.: Chegar a 10 clientes com avença" />
      </label>

      <div className="field">
        <span>Como se mede</span>
        <div className="choice choice--4">
          {METRICS.map((m) => (
            <button
              type="button"
              key={m.id}
              className="choice__item"
              aria-pressed={metric === m.id}
              onClick={() => {
                setMetric(m.id);
                if (!goal) setUnit(m.unit);
              }}
            >
              <span>
                <b>{m.label}</b>
                <span className="faint">{m.hint}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="goal-editor__grid">
        {!auto && (
          <>
            <div className="field">
              <span>Unidade</span>
              <div className="segmented" role="group" aria-label="Unidade">
                {(["nº", "%", "€"] as GoalUnit[]).map((u) => (
                  <button type="button" key={u} aria-pressed={unit === u} onClick={() => setUnit(u)}>{u === "nº" ? "Número" : u === "%" ? "Percentagem" : "Euros"}</button>
                ))}
              </div>
            </div>
            <label className="field">
              <span>Ponto de partida</span>
              <input name="baseline" className="input" type="number" step="any" defaultValue={goal?.baseline ?? 0} />
            </label>
          </>
        )}
        <label className="field">
          <span>Meta {auto && <em className="faint" style={{ fontStyle: "normal", fontWeight: 400 }}>· hoje {money(currentAuto)}</em>}</span>
          <input name="target" className="input" type="number" step="any" required defaultValue={goal?.target ?? (auto ? Math.round((currentAuto * 1.25) / 100) * 100 : undefined)} />
        </label>
        <label className="field">
          <span>Prazo</span>
          <input name="deadline" className="input" type="date" required min={toInput(NOW)} defaultValue={toInput(goal?.deadline ?? new Date(NOW.getFullYear(), NOW.getMonth() + 6, 0))} />
        </label>
        <label className="field">
          <span>Responsável</span>
          <select name="owner" className="input" defaultValue={goal?.owner ?? "u-rui"}>
            {TEAM.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </label>
      </div>

      <label className="field">
        <span>Porque é que importa <em className="faint" style={{ fontStyle: "normal", fontWeight: 400 }}>· opcional</em></span>
        <input name="why" className="input" defaultValue={goal?.why} placeholder="Ex.: deixar de depender de projetos pontuais" />
      </label>

      <div className="row" style={{ gap: 8 }}>
        <button className="btn btn--primary" type="submit"><Check size={15} /> {goal ? "Guardar" : "Criar meta"}</button>
        <button className="btn btn--ghost" type="button" onClick={onClose}>Cancelar</button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ board */

export function Goals() {
  const { goals } = useStore();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const fx = fixedTotal();
  const statuses = goals.map((g) => forecast(g, fx).status);
  const count = (s: GoalStatus[]) => statuses.filter((x) => s.includes(x)).length;

  return (
    <>
      <SectionTitle
        title="As nossas metas"
        action={
          <button onClick={() => setEditing("new")}>
            <Plus size={14} style={{ marginRight: 4 }} /> Nova meta
          </button>
        }
      />
      <div className="row goal-summary">
        <span className="badge badge--good">{count(["no bom caminho", "alcançada"])} no bom caminho</span>
        <span className="badge badge--warn">{count(["em risco"])} em risco</span>
        <span className="badge badge--bad">{count(["fora de rota"])} fora de rota</span>
        <span className="faint" style={{ fontSize: 12 }}>A previsão segue a tendência dos últimos meses (ou dos registos de progresso).</span>
      </div>

      {editing === "new" && <GoalEditor onClose={() => setEditing(null)} />}

      {goals.length ? (
        <div className="goal-grid">
          {goals.map((g) =>
            editing === g.id ? (
              <GoalEditor key={g.id} goal={g} onClose={() => setEditing(null)} />
            ) : (
              <GoalCard key={g.id} g={g} onEdit={() => setEditing(g.id)} />
            ),
          )}
        </div>
      ) : (
        <div className="card empty">
          <Target size={24} style={{ marginBottom: 8 }} />
          <div style={{ fontWeight: 600, color: "var(--ink)" }}>Ainda sem metas</div>
          <p>Cria a primeira: uma meta de receita atualiza-se sozinha; as outras atualizas com um clique.</p>
        </div>
      )}
    </>
  );
}
