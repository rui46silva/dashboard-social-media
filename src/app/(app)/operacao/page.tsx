"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, Clock, Lock, MessageCircle, Plus, Smile } from "lucide-react";
import {
  CLIENTS, INBOX, NOW, PROFILES, RESPONSE_STATS, SLA_MINUTES, USERS, client, npsScore, user,
} from "@/lib/data";
import { ago, money, pct } from "@/lib/format";
import { Avatar, ClientTile, Kpi, PageHead, SectionTitle } from "@/components/ui";
import { useStore } from "@/components/store";
import { useSession } from "@/components/session";
import { hm } from "@/components/time";

const TABS = ["Horas", "Carga da equipa", "Tempo de resposta", "Satisfação"] as const;
type Tab = (typeof TABS)[number];
const TEAM = USERS.filter((u) => u.weeklyHours > 0);
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export default function OperationsPage() {
  const { can } = useSession();
  const [tab, setTab] = useState<Tab>("Horas");
  if (!can("gerir_clientes")) {
    return (
      <div className="card empty" style={{ marginTop: 40 }}>
        <Lock size={28} style={{ marginBottom: 10 }} />
        <div style={{ fontWeight: 600, color: "var(--ink)" }}>Área de gestão</div>
        <p style={{ marginTop: 4 }}>Disponível para CEO, Dev e gestores de conta.</p>
      </div>
    );
  }
  return (
    <>
      <PageHead title="Operação" lede="Onde vai o tempo da equipa, quem está sobrecarregado, quão depressa respondemos e quão satisfeitos estão os clientes." />
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t} role="tab" className="tab" aria-selected={tab === t} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      {tab === "Horas" && <Hours />}
      {tab === "Carga da equipa" && <Capacity />}
      {tab === "Tempo de resposta" && <Response />}
      {tab === "Satisfação" && <Satisfaction />}
    </>
  );
}

/* ------------------------------------------------------------------ hours */

function Hours() {
  const { time, addTime } = useStore();
  const { user: me } = useSession();
  const [days, setDays] = useState(30);
  const [form, setForm] = useState({ userId: me.id, clientId: "", minutes: "", note: "" });
  const from = new Date(startOfDay(NOW).getTime() - (days - 1) * 864e5);
  const entries = time.filter((e) => e.date >= from);
  const total = entries.reduce((a, e) => a + e.minutes, 0);
  const billable = entries.filter((e) => e.billable).reduce((a, e) => a + e.minutes, 0);
  const scale = days / 30;

  const byClient = CLIENTS.map((c) => {
    const mins = entries.filter((e) => e.clientId === c.id).reduce((a, e) => a + e.minutes, 0);
    const contracted = (PROFILES[c.id]?.hoursPerMonth ?? 0) * 60 * scale;
    const fee = (PROFILES[c.id]?.fee ?? 0) * scale;
    return { c, mins, contracted, perHour: mins ? fee / (mins / 60) : 0 };
  });
  const byPerson = TEAM.map((u) => {
    const mine = entries.filter((e) => e.userId === u.id);
    const m = mine.reduce((a, e) => a + e.minutes, 0);
    return { u, m, bill: mine.filter((e) => e.billable).reduce((a, e) => a + e.minutes, 0) };
  }).filter((x) => x.m > 0);

  return (
    <>
      <div className="filters">
        <div className="segmented" role="group" aria-label="Período">
          {[7, 30].map((d) => (
            <button key={d} aria-pressed={days === d} onClick={() => setDays(d)}>{d} dias</button>
          ))}
        </div>
      </div>
      <div className="kpis">
        <Kpi label="Horas registadas" value={hm(total)} foot={`últimos ${days} dias`} />
        <Kpi label="Faturáveis" value={pct((billable / Math.max(1, total)) * 100, 0)} foot={`${hm(billable)} em clientes`} />
        <Kpi label="Internas" value={hm(total - billable)} foot="comercial, gestão, produto" />
        <Kpi label="Receita por hora faturável" value={money(byClient.reduce((a, x) => a + (PROFILES[x.c.id]?.fee ?? 0) * scale, 0) / Math.max(1, billable / 60))} foot="avenças ÷ horas em clientes" />
      </div>

      <SectionTitle title="Horas por cliente vs. contratadas" />
      <div className="table-wrap">
        <table className="table table--cards">
          <thead>
            <tr><th>Cliente</th><th className="r">Registadas</th><th className="r">Contratadas</th><th>Consumo</th><th className="r">€ por hora real</th></tr>
          </thead>
          <tbody>
            {byClient.map(({ c, mins, contracted, perHour }) => {
              const ratio = contracted ? mins / contracted : 0;
              return (
                <tr key={c.id}>
                  <td><span className="row" style={{ gap: 8 }}><ClientTile clientId={c.id} size={22} /><strong>{c.name}</strong></span></td>
                  <td className="r" data-label="Registadas">{hm(mins)}</td>
                  <td className="r" data-label="Contratadas">{contracted ? hm(contracted) : "—"}</td>
                  <td style={{ minWidth: 160 }}>
                    <div className="progress"><i style={{ width: `${Math.min(100, ratio * 100)}%`, background: ratio > 1.05 ? "var(--bad)" : ratio > 0.9 ? "var(--warn)" : "var(--good-strong)" }} /></div>
                    <span className={ratio > 1.05 ? "due--late" : "faint"} style={{ fontSize: 12 }}>
                      {contracted ? `${Math.round(ratio * 100)}%${ratio > 1.05 ? " · acima do contratado" : ""}` : "sem horas contratadas"}
                    </span>
                  </td>
                  <td className="r" data-label="€/h">
                    <span className={perHour && perHour < 30 ? "due--late" : ""}>{perHour ? money(perHour) : "—"}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid grid--main" style={{ gap: 24 }}>
        <div>
          <SectionTitle title="Registos recentes" />
          <div className="list">
            {entries.slice(0, 12).map((e) => (
              <div key={e.id} className="list-item" style={{ alignItems: "center" }}>
                <Avatar userId={e.userId} size={24} />
                <div className="grow">
                  <div className="truncate" style={{ fontWeight: 500 }}>{e.note}</div>
                  <div className="faint" style={{ fontSize: 12 }}>
                    {e.clientId ? client(e.clientId)?.name : "Interno"} · {ago(e.date, NOW)}
                    {e.taskId && <> · <Link className="link" href={`/tarefas?t=${e.taskId}`}>tarefa</Link></>}
                  </div>
                </div>
                <span className="num" style={{ fontWeight: 600 }}>{hm(e.minutes)}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <SectionTitle title="Registar tempo" />
          <form
            className="card card__body stack"
            style={{ gap: 12 }}
            onSubmit={(e) => {
              e.preventDefault();
              const m = Number(form.minutes);
              if (!m) return;
              addTime({ userId: form.userId, clientId: form.clientId || undefined, date: NOW, minutes: m, note: form.note || "Trabalho", billable: !!form.clientId });
              setForm({ ...form, minutes: "", note: "" });
            }}
          >
            <label className="field"><span>Pessoa</span>
              <select className="input" value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })}>
                {TEAM.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </label>
            <label className="field"><span>Cliente</span>
              <select className="input" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
                <option value="">Interno (não faturável)</option>
                {CLIENTS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <div className="grid grid--2">
              <label className="field"><span>Minutos</span><input className="input" type="number" min={5} step={5} value={form.minutes} onChange={(e) => setForm({ ...form, minutes: e.target.value })} /></label>
              <label className="field"><span>Nota</span><input className="input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
            </div>
            <button className="btn btn--primary" type="submit" disabled={!Number(form.minutes)}><Plus size={15} /> Registar</button>
          </form>
          <SectionTitle title="Por pessoa" />
          <div className="list">
            {byPerson.map(({ u, m, bill }) => (
              <div key={u.id} className="list-item" style={{ alignItems: "center" }}>
                <Avatar userId={u.id} size={24} />
                <span className="grow">{u.name}</span>
                <span className="faint" style={{ fontSize: 12 }}>{pct((bill / m) * 100, 0)} faturável</span>
                <span className="num" style={{ fontWeight: 600, minWidth: 56, textAlign: "right" }}>{hm(m)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/* --------------------------------------------------------------- capacity */

function Capacity() {
  const { time, tasks } = useStore();
  const weekAgo = new Date(startOfDay(NOW).getTime() - 6 * 864e5);
  const nextWeek = new Date(startOfDay(NOW).getTime() + 7 * 864e5);
  const last4w = new Date(startOfDay(NOW).getTime() - 27 * 864e5);

  const rows = TEAM.map((u) => {
    // Recurring load: each client's monthly hours, split by who did the work over the last 4 weeks.
    const recurring = CLIENTS.reduce((acc, c) => {
      const cl = time.filter((e) => e.clientId === c.id && e.date >= last4w);
      const all = cl.reduce((a, e) => a + e.minutes, 0);
      const mine = cl.filter((e) => e.userId === u.id).reduce((a, e) => a + e.minutes, 0);
      const monthly = PROFILES[c.id]?.hoursPerMonth ?? 0;
      return acc + (all ? (mine / all) * (monthly / 4.33) : 0);
    }, 0);
    const extra = tasks
      .filter((t) => !t.done && t.assignee === u.id && t.due && t.due < nextWeek && t.tags.every((x) => x !== "conteúdo"))
      .reduce((a, t) => a + (t.estimate ?? 1), 0);
    const planned = recurring + extra;
    const logged = time.filter((e) => e.userId === u.id && e.date >= weekAgo).reduce((a, e) => a + e.minutes, 0) / 60;
    return { u, recurring, extra, planned, logged, load: planned / u.weeklyHours };
  });
  const cap = rows.reduce((a, r) => a + r.u.weeklyHours, 0);
  const planned = rows.reduce((a, r) => a + r.planned, 0);
  const free = Math.max(0, cap - planned);

  return (
    <>
      <div className="kpis">
        <Kpi label="Capacidade semanal" value={`${Math.round(cap)} h`} foot={`${TEAM.length} pessoas, tempo para clientes`} />
        <Kpi label="Planeado próx. 7 dias" value={`${Math.round(planned)} h`} foot="avenças + tarefas com prazo" />
        <Kpi label="Ocupação da equipa" value={<span style={{ color: planned / cap > 0.9 ? "var(--bad)" : undefined }}>{pct((planned / cap) * 100, 0)}</span>} foot="alvo saudável: 75–85%" />
        <Kpi label="Horas livres" value={`${Math.round(free)} h`} foot={free > 10 ? `≈ ${Math.floor((free * 4.33) / 35)} cliente(s) médio(s) a mais` : "sem espaço para novos clientes"} />
      </div>

      <SectionTitle title="Carga por pessoa · próximos 7 dias" />
      <div className="list">
        {rows.map((r) => {
          const tone = r.load > 1 ? "var(--bad)" : r.load > 0.85 ? "var(--warn)" : r.load < 0.5 ? "var(--info)" : "var(--good-strong)";
          return (
            <div key={r.u.id} className="list-item" style={{ alignItems: "center", flexWrap: "wrap" }}>
              <Avatar userId={r.u.id} size={30} />
              <div style={{ minWidth: 150 }}>
                <div style={{ fontWeight: 600 }}>{r.u.name}</div>
                <div className="faint" style={{ fontSize: 12 }}>{r.u.weeklyHours} h/semana para clientes</div>
              </div>
              <div className="grow" style={{ minWidth: 200 }}>
                <div className="capbar">
                  <i style={{ width: `${Math.min(100, (r.recurring / r.u.weeklyHours) * 100)}%`, background: tone }} />
                  <i style={{ width: `${Math.min(100, (r.extra / r.u.weeklyHours) * 100)}%`, background: tone, opacity: 0.5 }} />
                  {r.load > 1 && <span className="capbar__over" />}
                </div>
                <div className="faint" style={{ fontSize: 12, marginTop: 4 }}>
                  {Math.round(r.recurring)} h avenças + {Math.round(r.extra)} h tarefas · registou {Math.round(r.logged)} h nos últimos 7 dias
                </div>
              </div>
              <strong className="num" style={{ color: tone, minWidth: 54, textAlign: "right" }}>{Math.round(r.load * 100)}%</strong>
            </div>
          );
        })}
      </div>
      <div className="legend" style={{ marginTop: 10 }}>
        <span><i style={{ background: "var(--info)", height: 8 }} /> &lt; 50% disponível</span>
        <span><i style={{ background: "var(--good-strong)", height: 8 }} /> 50–85% saudável</span>
        <span><i style={{ background: "var(--warn)", height: 8 }} /> 85–100% no limite</span>
        <span><i style={{ background: "var(--bad)", height: 8 }} /> &gt; 100% sobrecarregado</span>
      </div>
      <div className="notice notice--info" style={{ marginTop: 16 }}>
        <Clock size={16} />
        <span>
          Quando a ocupação passa dos 85% de forma estável é altura de contratar. Simula o impacto de uma contratação em{" "}
          <Link className="link" href="/empresa">Empresa → Cenários</Link>.
        </span>
      </div>
    </>
  );
}

/* --------------------------------------------------------------- response */

function Response() {
  const { inboxAnswered } = useStore();
  const pending = INBOX.filter((m) => !m.answered && !inboxAnswered[m.id])
    .map((m) => ({ m, age: (NOW.getTime() - m.date.getTime()) / 60000 }))
    .sort((a, b) => b.age - a.age);
  const late = pending.filter((x) => x.age > SLA_MINUTES);
  const stats = Object.entries(RESPONSE_STATS);
  const replies = stats.reduce((a, [, v]) => a + v.replies, 0);
  const avg = stats.reduce((a, [, v]) => a + v.avgMinutes * v.replies, 0) / replies;
  const within = stats.reduce((a, [, v]) => a + v.within4h * v.replies, 0) / replies;

  const byPerson = useMemo(() => {
    const m = new Map<string, { replies: number; mins: number; within: number }>();
    for (const [cid, v] of stats) {
      const owner = client(cid)?.inboxOwner;
      if (!owner) continue;
      const cur = m.get(owner) ?? { replies: 0, mins: 0, within: 0 };
      m.set(owner, { replies: cur.replies + v.replies, mins: cur.mins + v.avgMinutes * v.replies, within: cur.within + v.within4h * v.replies });
    }
    return [...m.entries()];
  }, [stats]);

  return (
    <>
      <div className="kpis">
        <Kpi label="Tempo médio de resposta" value={hm(avg)} foot="últimos 30 dias" />
        <Kpi label="Respondidas em menos de 4 h" value={pct(within * 100, 0)} foot="objetivo: 90%" />
        <Kpi label="Respostas dadas" value={replies} foot="comentários e mensagens" />
        <Kpi label="Sem resposta há +4 h" value={<span style={{ color: late.length ? "var(--bad)" : undefined }}>{late.length}</span>} foot={`${pending.length} por responder no total`} />
      </div>

      {late.length > 0 && (
        <>
          <SectionTitle title="Fora do prazo" action={<Link href="/inbox">Abrir inbox</Link>} />
          <div className="list">
            {late.map(({ m, age }) => (
              <Link key={m.id} href={`/inbox?m=${m.id}`} className="list-item" style={{ alignItems: "center" }}>
                <AlertTriangle size={16} style={{ color: "var(--bad)", flex: "none" }} />
                <div className="grow">
                  <div className="truncate" style={{ fontWeight: 500 }}>{m.author}: «{m.text}»</div>
                  <div className="faint" style={{ fontSize: 12 }}>{client(m.clientId)?.name} · à espera há {hm(age)}</div>
                </div>
                <Avatar userId={client(m.clientId)!.inboxOwner} size={24} />
              </Link>
            ))}
          </div>
        </>
      )}

      <div className="grid grid--2" style={{ gap: 24 }}>
        <div>
          <SectionTitle title="Por cliente" />
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Cliente</th><th className="r">Tempo médio</th><th className="r">&lt; 4 h</th></tr></thead>
              <tbody>
                {stats.map(([cid, v]) => (
                  <tr key={cid}>
                    <td><span className="row" style={{ gap: 8 }}><ClientTile clientId={cid} size={20} />{client(cid)?.name}</span></td>
                    <td className="r">{hm(v.avgMinutes)}</td>
                    <td className="r"><span className={`badge badge--${v.within4h >= 0.9 ? "good" : v.within4h >= 0.75 ? "warn" : "bad"}`}>{pct(v.within4h * 100, 0)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <SectionTitle title="Por responsável" />
          <div className="list">
            {byPerson.map(([uid, v]) => (
              <div key={uid} className="list-item" style={{ alignItems: "center" }}>
                <Avatar userId={uid} size={26} />
                <div className="grow">
                  <div style={{ fontWeight: 600 }}>{user(uid).name}</div>
                  <div className="faint" style={{ fontSize: 12 }}>{v.replies} respostas · {CLIENTS.filter((c) => c.inboxOwner === uid).map((c) => c.name).join(", ")}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="num" style={{ fontWeight: 600 }}>{hm(v.mins / v.replies)}</div>
                  <div className="faint" style={{ fontSize: 12 }}>{pct((v.within / v.replies) * 100, 0)} &lt; 4 h</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="faint" style={{ fontSize: 12, marginTop: 12 }}>
        <MessageCircle size={12} /> A Mesa marca uma conversa como fora do prazo quando passa 4 horas úteis sem resposta e avisa o responsável.
      </p>
    </>
  );
}

/* ------------------------------------------------------------ satisfaction */

function Satisfaction() {
  const { nps } = useStore();
  const latest = CLIENTS.map((c) => ({ c, rs: nps.filter((n) => n.clientId === c.id).sort((a, b) => b.date.getTime() - a.date.getTime()) }));
  const current = latest.map((x) => x.rs[0]).filter(Boolean);
  const score = npsScore(current);
  const counts = {
    promotores: current.filter((x) => x.score >= 9).length,
    passivos: current.filter((x) => x.score >= 7 && x.score <= 8).length,
    detratores: current.filter((x) => x.score <= 6).length,
  };
  return (
    <>
      <div className="kpis">
        <Kpi label="NPS da agência" value={<span style={{ color: score >= 30 ? "var(--good)" : score < 0 ? "var(--bad)" : undefined }}>{score > 0 ? "+" : ""}{score}</span>} foot="de −100 a +100 · última resposta de cada cliente" />
        <Kpi label="Promotores (9–10)" value={counts.promotores} />
        <Kpi label="Passivos (7–8)" value={counts.passivos} />
        <Kpi label="Detratores (0–6)" value={<span style={{ color: counts.detratores ? "var(--bad)" : undefined }}>{counts.detratores}</span>} foot={counts.detratores ? "risco de não renovar" : "nenhum"} />
      </div>
      <SectionTitle title="Por cliente" />
      <div className="list">
        {latest.map(({ c, rs }) => {
          const last = rs[0];
          const prev = rs[1];
          const tone = !last ? "" : last.score >= 9 ? "good" : last.score >= 7 ? "warn" : "bad";
          return (
            <div key={c.id} className="list-item" style={{ alignItems: "flex-start" }}>
              <ClientTile clientId={c.id} size={28} />
              <div className="grow">
                <div className="row" style={{ flexWrap: "wrap" }}>
                  <strong>{c.name}</strong>
                  {last && <span className={`badge badge--${tone}`}>{last.score}/10</span>}
                  {last && prev && last.score !== prev.score && (
                    <span className={last.score > prev.score ? "delta--up" : "delta--down"} style={{ fontSize: 12, fontWeight: 600 }}>
                      {last.score > prev.score ? "▲" : "▼"} antes {prev.score}
                    </span>
                  )}
                </div>
                {last?.comment && <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>«{last.comment}» — {last.by}, {ago(last.date, NOW)}</p>}
                {!last && <p className="faint" style={{ fontSize: 13 }}>Ainda sem respostas.</p>}
              </div>
              {tone === "bad" && <span className="badge badge--bad"><AlertTriangle size={12} /> Ligar esta semana</span>}
            </div>
          );
        })}
      </div>
      <p className="faint" style={{ fontSize: 12, marginTop: 12 }}>
        <Smile size={12} /> O inquérito aparece no portal de cada cliente uma vez por mês: «De 0 a 10, qual a probabilidade de recomendar a agência?»
      </p>
    </>
  );
}
