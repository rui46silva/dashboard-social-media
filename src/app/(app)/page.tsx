"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, Plus, RefreshCw, Search, Send } from "lucide-react";
import {
  CLIENTS, CLIENT_ECONOMICS, FINANCE, INBOX, NETWORKS, NOW, SLA_MINUTES, SOCIAL, TASK_SECTIONS, client, network,
  type NetworkId,
} from "@/lib/data";
import { compact, dayMonth, longDate, money, num, sameDay, time } from "@/lib/format";
import { GlassBars, GradientLine } from "@/components/charts";
import { CheckCircle, ClientTile, Due, NetIcon } from "@/components/ui";
import { useStore } from "@/components/store";
import { useSession } from "@/components/session";

const tomorrow = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() + 1);
const startToday = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate());

export default function Home() {
  const { posts, tasks, saveTask, inboxAnswered, nps, sendToClient } = useStore();
  const { user: me, can } = useSession();
  const [days, setDays] = useState<7 | 30>(30);
  const [pick, setPick] = useState(CLIENTS[0].id);
  const [sent, setSent] = useState<string | null>(null);
  const [allAlerts, setAllAlerts] = useState(false);

  /* ------------------------------------------------------------ figures */
  const stats = Object.values(SOCIAL).flat();
  const slice = (xs: number[]) => xs.slice(30 - days);
  const byNetwork = NETWORKS.map((n) => ({
    id: n.id as NetworkId,
    value: stats.filter((s) => s.network === n.id).reduce((a, s) => a + slice(s.reachSeries).reduce((x, y) => x + y, 0), 0),
  })).sort((a, b) => b.value - a.value);
  const total = byNetwork.reduce((a, n) => a + n.value, 0);
  const bubbles = [byNetwork[1], byNetwork[0], byNetwork[2]].filter(Boolean);

  const daily = Array.from({ length: 30 }, (_, i) => stats.reduce((a, s) => a + s.reachSeries[i], 0));
  const weeks = Array.from({ length: 5 }, (_, w) => {
    const from = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - 29 + w * 6);
    return { label: dayMonth(from), value: daily.slice(w * 6, w * 6 + 6).reduce((a, b) => a + b, 0) };
  });

  const mrr = FINANCE.recurring;
  const mrrGrowth = Math.round(((mrr[11] - mrr[0]) / mrr[0]) * 100);

  const mine = tasks
    .filter((t) => !t.done && (t.assignee === me.id || t.collaborators.includes(me.id) || t.priority === "alta"))
    .sort((a, b) => (a.due?.getTime() ?? 9e15) - (b.due?.getTime() ?? 9e15))
    .slice(0, 6);

  const agenda = posts
    .filter((p) => sameDay(p.date, NOW) || sameDay(p.date, tomorrow))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const myInbox = INBOX.filter((m) => client(m.clientId)?.inboxOwner === me.id);
  const alerts = (() => {
    const out: { title: string; text: string; href: string }[] = [];
    myInbox.filter((m) => m.sentiment === "negativo" && m.unread).forEach((m) =>
      out.push({ title: `Comentário negativo na ${client(m.clientId)!.name}`, text: `«${m.text}»`, href: `/inbox?m=${m.id}` }),
    );
    myInbox.filter((m) => !m.answered && !inboxAnswered[m.id] && NOW.getTime() - m.date.getTime() > SLA_MINUTES * 6e4).forEach((m) =>
      out.push({ title: `${m.author} espera resposta há mais de 4 h`, text: `«${m.text}»`, href: `/inbox?m=${m.id}` }),
    );
    if (can("gerir_clientes")) {
      CLIENTS.forEach((c) => {
        const last = nps.filter((n) => n.clientId === c.id).sort((a, b) => b.date.getTime() - a.date.getTime())[0];
        if (last && last.score <= 6) out.push({ title: `${c.name} deu ${last.score}/10 na satisfação`, text: last.comment || "Ligar esta semana.", href: "/operacao" });
      });
      CLIENT_ECONOMICS.filter((e) => e.contractEnd.getTime() - NOW.getTime() < 90 * 864e5).forEach((e) =>
        out.push({
          title: `Contrato da ${client(e.clientId)!.name} renova em ${Math.round((e.contractEnd.getTime() - NOW.getTime()) / 864e5)} dias`,
          text: "Marcar reunião de renovação com os resultados do trimestre.",
          href: can("empresa") ? "/empresa" : `/clientes/${e.clientId}`,
        }),
      );
    }
    return out;
  })();

  const toSend = posts.filter((p) => p.clientId === pick && p.status === "todo");
  const withClient = posts.filter((p) => p.status === "uat").length;

  return (
    <div className="home">
      {/* Header like the reference: title + subtitle left, summary pill right */}
      <header className="home__head">
        <div>
          <h1>Bom dia, {me.name.split(" ")[0]}</h1>
          <p>{longDate(NOW)[0].toUpperCase() + longDate(NOW).slice(1)} · {mine.length} tarefas e {withClient} posts com clientes</p>
        </div>
        <Link href="/conteudo" className="head-pill">
          <span className="head-pill__dot" />
          {posts.filter((p) => p.status === "confirmar").length} aprovados por confirmar
          <ChevronRight size={15} />
        </Link>
      </header>

      <div className="home__grid">
        <div className="home__main">
          {/* Hero: total reach with network bubbles */}
          <section className="card hero-card">
            <div className="spread" style={{ alignItems: "flex-start" }}>
              <div>
                <div className="muted" style={{ fontWeight: 500 }}>Alcance total</div>
                <div className="hero-card__value">
                  <small>≈</small>
                  {num(total)}
                </div>
              </div>
              <div className="segmented" role="group" aria-label="Período">
                <button aria-pressed={days === 7} onClick={() => setDays(7)}>7 dias</button>
                <button aria-pressed={days === 30} onClick={() => setDays(30)}>30 dias</button>
              </div>
            </div>
            <div className="hero-card__row">
              <div className="bubbles">
                {bubbles.map((b, i) => (
                  <div key={b.id} className={`bubble-stat ${i === 1 ? "is-main" : ""}`} style={{ animationDelay: `${i * 90}ms` }}>
                    <b>{compact(b.value)}</b>
                    <span>{network(b.id).name}</span>
                  </div>
                ))}
              </div>
              <div className="hero-card__actions">
                <Link href="/relatorios" className="btn btn--lg">Ver relatórios</Link>
                <Link href="/calendario?novo=1" className="btn btn--primary btn--lg">Nova publicação</Link>
              </div>
            </div>
          </section>

          <div className="home__pair">
            <section className="card card__body">
              <div className="spread" style={{ marginBottom: 18 }}>
                <h2 className="card-title">Alcance por semana</h2>
                <span className="chip" style={{ height: 28, pointerEvents: "none" }}>30 dias</span>
              </div>
              <GlassBars data={weeks} />
            </section>

            <section className="card card--accent card__body gradient-card">
              <div className="spread">
                <h2 className="card-title" style={{ color: "#fff" }}>{can("empresa") ? "Saúde do negócio" : "Ritmo das redes"}</h2>
                <Link href={can("empresa") ? "/empresa" : "/clientes"} className="icon-btn gradient-card__btn" aria-label="Abrir detalhe">
                  <RefreshCw size={15} />
                </Link>
              </div>
              <div className="gradient-card__value">
                {can("empresa") ? `+${mrrGrowth}%` : compact(daily.slice(-7).reduce((a, b) => a + b, 0))}
              </div>
              <div className="gradient-card__sub">{can("empresa") ? "receita recorrente em 12 meses" : "pessoas alcançadas esta semana"}</div>
              <GradientLine values={can("empresa") ? mrr : daily.slice(-14)} format={can("empresa") ? (n) => `${compact(n)} €` : compact} height={110} />
            </section>
          </div>

          {/* Upcoming posts, like "Upcoming payments" */}
          <section className="card card__body">
            <div className="spread" style={{ marginBottom: 8 }}>
              <h2 className="card-title">Publicações de hoje e amanhã</h2>
              <Link href="/calendario" className="pill-link">Ver todas</Link>
            </div>
            <div className="rows">
              {agenda.map((p) => (
                <Link key={p.id} href="/calendario" className="rows__item">
                  <span className="rows__icon"><NetIcon id={p.networks[0]} size={18} /></span>
                  <span className="rows__title truncate">{p.caption}</span>
                  <span className={`date-pill ${sameDay(p.date, NOW) ? "is-today" : ""}`}>{sameDay(p.date, NOW) ? "Hoje" : "Amanhã"}</span>
                  <span className="rows__meta truncate hide-sm">{client(p.clientId)!.name}</span>
                  <span className="rows__value num">{time(p.date)}</span>
                </Link>
              ))}
            </div>
          </section>
        </div>

        {/* Right column, sitting on the frame like "Transactions" */}
        <aside className="home__side">
          <div className="spread">
            <div>
              <h2 className="side-title">Tarefas</h2>
              <p className="faint" style={{ fontSize: 13 }}>As tuas próximas</p>
            </div>
            <div className="row">
              <Link href="/tarefas" className="icon-btn" aria-label="Procurar tarefas"><Search size={17} /></Link>
              <Link href="/tarefas" className="pill-link">Ver todas</Link>
            </div>
          </div>
          <div className="rows rows--plain">
            {mine.map((t) => {
              const late = t.due && t.due < startToday;
              const sec = TASK_SECTIONS.find((s) => s.id === t.section)!;
              return (
                <Link key={t.id} href={`/tarefas?t=${t.id}`} className="rows__item">
                  <span className="rows__icon rows__icon--check">
                    <CheckCircle checked={t.done} label={`Concluir: ${t.title}`} onToggle={() => saveTask({ ...t, done: !t.done })} />
                  </span>
                  <span className="rows__title truncate">{t.title}</span>
                  <span className={`status-pill ${t.section === "curso" || late ? "is-pending" : ""}`}>{late ? "Atrasada" : sec.name}</span>
                  <span className="rows__value"><Due date={t.due} /></span>
                </Link>
              );
            })}
          </div>

          {alerts.length > 0 && (
            <div className="tip">
              <h3>{alerts[0].title}</h3>
              <p>{alerts[0].text}</p>
              {allAlerts &&
                alerts.slice(1).map((a) => (
                  <Link key={a.title} href={a.href} className="tip__more">
                    <b>{a.title}</b>
                    <span>{a.text}</span>
                  </Link>
                ))}
              <div className="row" style={{ gap: 14 }}>
                <Link href={alerts[0].href} className="tip__link">Resolver</Link>
                {alerts.length > 1 && (
                  <button className="tip__link" onClick={() => setAllAlerts(!allAlerts)}>
                    {allAlerts ? "Mostrar menos" : `Mais ${alerts.length - 1} alertas`}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Quick action card, like "Quick transfer" */}
          <section className="card card__body quick">
            <div className="spread">
              <h2 className="card-title">Enviar para aprovação</h2>
              <span className="faint" style={{ fontSize: 12 }}>por cliente</span>
            </div>
            <div className="quick__people">
              <Link href="/calendario?novo=1" className="quick__person">
                <span className="quick__add"><Plus size={18} /></span>
                <span>Novo post</span>
              </Link>
              {CLIENTS.slice(0, 4).map((c) => (
                <button key={c.id} className={`quick__person ${pick === c.id ? "is-on" : ""}`} onClick={() => { setPick(c.id); setSent(null); }}>
                  <ClientTile clientId={c.id} size={44} />
                  <span className="truncate">{c.name.split(" ")[0]}</span>
                </button>
              ))}
            </div>
            <div className="quick__foot">
              <div>
                <div className="quick__value">{sent === pick ? "Enviado" : `${toSend.length} ${toSend.length === 1 ? "post" : "posts"}`}</div>
                <div className="faint" style={{ fontSize: 12 }}>{sent === pick ? "o cliente recebeu o aviso" : "prontos em produção"}</div>
              </div>
              <button
                className="btn btn--primary btn--lg"
                disabled={!toSend.length}
                onClick={() => {
                  toSend.forEach((p) => sendToClient(p.id, me.id));
                  setSent(pick);
                }}
              >
                <Send size={15} /> Enviar
              </button>
            </div>
          </section>

          {can("empresa") && (
            <Link href="/empresa" className="mini-meter">
              <div className="spread" style={{ fontSize: 13 }}>
                <span style={{ fontWeight: 600 }}>Receita recorrente vs. break-even</span>
                <span className="num faint">{money(mrr[11])} / {money(FINANCE.fixed.reduce((a, f) => a + f.value, 0) / (1 - FINANCE.variableRate))}</span>
              </div>
              <div className="progress" style={{ marginTop: 8 }}>
                <i style={{ width: `${Math.min(100, (mrr[11] / (FINANCE.fixed.reduce((a, f) => a + f.value, 0) / (1 - FINANCE.variableRate))) * 100)}%` }} />
              </div>
            </Link>
          )}
        </aside>
      </div>
    </div>
  );
}
