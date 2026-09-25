"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, ArrowRight, RotateCcw } from "lucide-react";
import {
  CLIENTS, CLIENT_ECONOMICS, DEALS, FINANCE, INBOX, NOW, SOCIAL, client, company,
} from "@/lib/data";
import { compact, longDate, money, num, sameDay, time } from "@/lib/format";
import { Sparkline } from "@/components/charts";
import { Avatar, CheckCircle, ClientTile, Due, NetIcon, PostStatusLozenge } from "@/components/ui";
import { useStore } from "@/components/store";
import { useSession } from "@/components/session";

const tomorrow = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() + 1);
const startToday = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate());
type TaskTab = "proximas" | "atrasadas" | "concluidas";

export default function Home() {
  const { posts, tasks, saveTask } = useStore();
  const { user: me, can } = useSession();
  const [taskTab, setTaskTab] = useState<TaskTab>("proximas");

  const mine = tasks.filter((t) => t.assignee === me.id || t.collaborators.includes(me.id) || t.priority === "alta");
  const taskLists: Record<TaskTab, typeof tasks> = {
    proximas: mine.filter((t) => !t.done && (!t.due || t.due >= startToday)).sort((a, b) => (a.due?.getTime() ?? 9e15) - (b.due?.getTime() ?? 9e15)),
    atrasadas: mine.filter((t) => !t.done && t.due && t.due < startToday),
    concluidas: mine.filter((t) => t.done),
  };

  const agenda = posts
    .filter((p) => sameDay(p.date, NOW) || sameDay(p.date, tomorrow))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  const unread = INBOX.filter((m) => m.unread);
  const negative = INBOX.filter((m) => m.sentiment === "negativo" && m.unread);
  const withClient = posts.filter((p) => p.status === "uat");
  const toConfirm = posts.filter((p) => p.status === "confirmar");
  const rejected = posts.filter((p) => p.status === "todo" && p.rounds > 0);
  const openDeals = DEALS.filter((d) => !["Ganho", "Perdido"].includes(d.stage));
  const doneThisWeek = tasks.filter((t) => t.done).length;
  const mrr = FINANCE.recurring[11];
  const breakEven = FINANCE.fixed.reduce((a, f) => a + f.value, 0) / (1 - FINANCE.variableRate);

  return (
    <>
      <section className="home-hero">
        <div className="eyebrow">{longDate(NOW)[0].toUpperCase() + longDate(NOW).slice(1)}</div>
        <h1 className="greeting" style={{ marginTop: 6 }}>Bom dia, {me.name.split(" ")[0]}</h1>
        <div className="hero-stats">
          <span><b>{doneThisWeek}</b> tarefas concluídas</span>
          <span><b>{withClient.length}</b> posts com clientes</span>
          <span><b>{unread.length}</b> mensagens por responder</span>
        </div>
      </section>

      <div className="grid grid--2" style={{ gap: 16 }}>
        {/* My tasks */}
        <section className="widget">
          <div className="widget__head">
            <Avatar userId={me.id} size={32} />
            <h2 className="grow">As minhas tarefas</h2>
            <Link href="/tarefas">Ver todas</Link>
          </div>
          <div className="tabs" style={{ padding: "0 18px", marginBottom: 0 }} role="tablist">
            {([["proximas", "Próximas"], ["atrasadas", "Atrasadas"], ["concluidas", "Concluídas"]] as const).map(([id, label]) => (
              <button key={id} role="tab" className="tab" aria-selected={taskTab === id} onClick={() => setTaskTab(id)}>
                {label}
                {id === "atrasadas" && taskLists.atrasadas.length > 0 && <span className="count due--late">{taskLists.atrasadas.length}</span>}
              </button>
            ))}
          </div>
          <div>
            {taskLists[taskTab].slice(0, 6).map((t) => (
              <Link key={t.id} href={`/tarefas?t=${t.id}`} className="row" style={{ padding: "9px 18px", borderBottom: "1px solid var(--line)", gap: 10 }}>
                <CheckCircle checked={t.done} label={`Concluir: ${t.title}`} onToggle={() => saveTask({ ...t, done: !t.done })} />
                <span className={`grow truncate ${t.done ? "done-text" : ""}`}>{t.title}</span>
                {t.clientId && <span className="tag" style={{ maxWidth: 120 }}><span className="truncate">{client(t.clientId)!.name}</span></span>}
                <span style={{ fontSize: 13, minWidth: 54, textAlign: "right" }}><Due date={t.due} done={t.done} /></span>
              </Link>
            ))}
            {!taskLists[taskTab].length && <div className="empty">Nada por aqui. 🎉</div>}
          </div>
        </section>

        {/* Content approvals */}
        <section className="widget">
          <div className="widget__head">
            <h2 className="grow">Aprovações de conteúdo</h2>
            <Link href="/conteudo">Abrir</Link>
          </div>
          <div className="grid" style={{ gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 8, padding: "0 18px 12px" }}>
            <Link href="/conteudo" className="card" style={{ padding: 12 }}>
              <div className="kpi__value" style={{ fontSize: 24, marginTop: 0 }}>{withClient.length}</div>
              <div className="faint" style={{ fontSize: 12 }}>com o cliente</div>
            </Link>
            <Link href="/conteudo" className="card" style={{ padding: 12 }}>
              <div className="kpi__value" style={{ fontSize: 24, marginTop: 0, color: "var(--info)" }}>{toConfirm.length}</div>
              <div className="faint" style={{ fontSize: 12 }}>aprovados, por confirmar</div>
            </Link>
            <Link href="/conteudo" className="card" style={{ padding: 12 }}>
              <div className="kpi__value" style={{ fontSize: 24, marginTop: 0, color: rejected.length ? "var(--bad)" : undefined }}>{rejected.length}</div>
              <div className="faint" style={{ fontSize: 12 }}>com alterações pedidas</div>
            </Link>
          </div>
          {[...toConfirm, ...rejected].slice(0, 4).map((p) => (
            <Link key={p.id} href="/conteudo" className="row" style={{ padding: "9px 18px", borderTop: "1px solid var(--line)", gap: 10 }}>
              {p.status === "todo" ? <RotateCcw size={15} style={{ color: "var(--bad)", flex: "none" }} /> : <ClientTile clientId={p.clientId} size={18} />}
              <span className="grow truncate">{p.caption}</span>
              <PostStatusLozenge status={p.status} />
            </Link>
          ))}
        </section>

        {/* Agenda */}
        <section className="widget">
          <div className="widget__head">
            <h2 className="grow">Publicações de hoje e amanhã</h2>
            <Link href="/calendario">Calendário</Link>
          </div>
          {agenda.map((p) => (
            <Link href="/calendario" key={p.id} className="timeline-item">
              <time className={p.status === "publicado" ? "faint" : ""}>
                {time(p.date)}
                <div className="faint" style={{ fontSize: 11, fontWeight: 500 }}>{sameDay(p.date, NOW) ? "hoje" : "amanhã"}</div>
              </time>
              <div style={{ minWidth: 0 }}>
                <div className="row">
                  <span className="grow truncate" style={{ fontWeight: 500 }}>{p.caption}</span>
                  {p.networks.map((n) => <NetIcon key={n} id={n} size={18} />)}
                </div>
                <div className="row faint" style={{ marginTop: 4, fontSize: 12 }}>
                  <ClientTile clientId={p.clientId} size={16} />
                  <span className="grow">{client(p.clientId)!.name} · {p.kind}</span>
                  <PostStatusLozenge status={p.status} />
                </div>
              </div>
            </Link>
          ))}
        </section>

        {/* Attention */}
        <section className="widget">
          <div className="widget__head">
            <h2 className="grow">Precisa de atenção</h2>
          </div>
          {negative.map((m) => (
            <Link key={m.id} href={`/inbox?m=${m.id}`} className="row" style={{ padding: "10px 18px", borderTop: "1px solid var(--line)", alignItems: "flex-start", gap: 10 }}>
              <AlertTriangle size={16} style={{ color: "var(--bad)", marginTop: 2, flex: "none" }} />
              <div className="grow">
                <div style={{ fontWeight: 600 }}>Comentário negativo · {client(m.clientId)!.name}</div>
                <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>«{m.text}»</div>
              </div>
            </Link>
          ))}
          {CLIENT_ECONOMICS.filter((e) => e.contractEnd.getTime() - NOW.getTime() < 90 * 864e5).map((e) => (
            <Link key={e.clientId} href={can("empresa") ? "/empresa" : `/clientes/${e.clientId}`} className="row" style={{ padding: "10px 18px", borderTop: "1px solid var(--line)", alignItems: "flex-start", gap: 10 }}>
              <ClientTile clientId={e.clientId} size={18} />
              <div className="grow">
                <div style={{ fontWeight: 600 }}>Contrato da {client(e.clientId)!.name} renova em {Math.round((e.contractEnd.getTime() - NOW.getTime()) / 864e5)} dias</div>
                <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>Marcar reunião de renovação com resultados do trimestre.</div>
              </div>
            </Link>
          ))}
          {can("empresa") && (
            <Link href="/empresa" style={{ display: "block", padding: "12px 18px 16px", borderTop: "1px solid var(--line)" }}>
              <div className="spread" style={{ fontSize: 13 }}>
                <span style={{ fontWeight: 600 }}>Receita recorrente vs. break-even</span>
                <span className="num">{money(mrr)} / {money(breakEven)}</span>
              </div>
              <div className="progress" style={{ marginTop: 8 }}>
                <i style={{ width: `${Math.min(100, (mrr / breakEven) * 100)}%`, background: mrr >= breakEven ? "var(--good-strong)" : "var(--warn)" }} />
              </div>
            </Link>
          )}
        </section>
      </div>

      <div className="section-title">
        <h2>Clientes</h2>
        <Link href="/clientes">Ver todos</Link>
      </div>
      <div className="grid grid--4">
        {CLIENTS.map((c) => {
          const stats = SOCIAL[c.id];
          const followers = stats.reduce((a, s) => a + s.followers, 0);
          const growth = stats.reduce((a, s) => a + s.followersDelta, 0);
          const series = Array.from({ length: 30 }, (_, i) => stats.reduce((a, s) => a + s.reachSeries[i], 0));
          return (
            <Link key={c.id} href={`/clientes/${c.id}`} className="client-card">
              <div className="row" style={{ gap: 10 }}>
                <ClientTile clientId={c.id} size={32} />
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="truncate" style={{ fontWeight: 600 }}>{c.name}</div>
                  <div className="faint truncate" style={{ fontSize: 12 }}>{c.sector}</div>
                </div>
              </div>
              <div className="spread" style={{ marginTop: 12, alignItems: "flex-end" }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 600 }} className="num">{compact(followers)}</div>
                  <div className="faint" style={{ fontSize: 12 }}>seguidores · <span className="delta--up">+{num(growth)}</span></div>
                </div>
                <Sparkline values={series} color="var(--series-1)" />
              </div>
            </Link>
          );
        })}
      </div>

      {can("crm") && (
        <>
          <div className="section-title">
            <h2>Negócios em curso</h2>
            <Link href="/crm/pipeline">Pipeline</Link>
          </div>
          <div className="list">
            {openDeals.slice(0, 4).map((d) => (
              <Link key={d.id} href="/crm/pipeline" className="list-item" style={{ alignItems: "center" }}>
                <Avatar userId={d.owner} size={26} />
                <div className="grow">
                  <div style={{ fontWeight: 600 }}>{company(d.companyId).name}</div>
                  <div className="faint" style={{ fontSize: 12 }}>{d.title} · {d.next ?? "sem próximo passo"}</div>
                </div>
                <span className="badge">{d.stage}</span>
                <span className="num" style={{ fontWeight: 600, minWidth: 90, textAlign: "right" }}>
                  {money(d.value)}{d.recurring && <span className="faint" style={{ fontWeight: 400 }}>/mês</span>}
                </span>
              </Link>
            ))}
            <Link href="/crm/pipeline" className="list-item" style={{ color: "var(--primary)", fontSize: 13, fontWeight: 500 }}>
              Ver pipeline completo <ArrowRight size={14} style={{ marginLeft: "auto" }} />
            </Link>
          </div>
        </>
      )}
    </>
  );
}
