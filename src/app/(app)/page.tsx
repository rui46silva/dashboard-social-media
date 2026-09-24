"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, ArrowRight, Check, Clock } from "lucide-react";
import {
  CLIENTS, COMPANIES, DEALS, INBOX, NOW, POSTS, SITE, SOCIAL, TASKS, client, company,
} from "@/lib/data";
import { compact, dayMonth, longDate, money, num, sameDay, time } from "@/lib/format";
import { Sparkline } from "@/components/charts";
import { Avatar, ClientTile, Delta, Kpi, NetIcon, PostStatusLozenge, SectionTitle } from "@/components/ui";

const tomorrow = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() + 1);

export default function Home() {
  const today = POSTS.filter((p) => sameDay(p.date, NOW) || sameDay(p.date, tomorrow)).sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );
  const unread = INBOX.filter((m) => m.unread);
  const negative = INBOX.filter((m) => m.sentiment === "negativo" && m.unread);
  const awaiting = POSTS.filter((p) => p.status === "aprovação");
  const openDeals = DEALS.filter((d) => !["Ganho", "Perdido"].includes(d.stage));
  const openMonthly = openDeals.filter((d) => d.recurring).reduce((a, d) => a + d.value, 0);
  const mrr = COMPANIES.reduce((a, c) => a + (c.mrr ?? 0), 0);

  const reach = Object.values(SOCIAL).flat().reduce((a, s) => a + s.reach, 0);
  const newFollowers = Object.values(SOCIAL).flat().reduce((a, s) => a + s.followersDelta, 0);
  const sessions = Object.values(SITE).reduce((a, s) => a + s.sessions, 0);

  const [tasks, setTasks] = useState(() =>
    TASKS.filter((t) => t.assignee === "u-rui" || t.priority === "alta").map((t) => ({ ...t, done: t.status === "feito" })),
  );

  const scheduledToday = today.filter((p) => sameDay(p.date, NOW) && p.status !== "publicado").length;

  return (
    <>
      <div className="eyebrow">{longDate(NOW)}</div>
      <h1 className="greeting" style={{ marginTop: 8 }}>
        Bom dia, <em>Rui.</em>
      </h1>
      <p className="brief">
        Hoje há <strong>{scheduledToday} {scheduledToday === 1 ? "publicação" : "publicações"} por sair</strong>,{" "}
        <strong>{unread.length} mensagens</strong> por responder
        {negative.length > 0 && (
          <>
            {" "}e <span className="hl"><strong>{negative.length} comentário negativo</strong></span> na{" "}
            {client(negative[0].clientId)!.name}
          </>
        )}
        . O pipeline tem <strong>{money(openMonthly)}/mês</strong> em propostas abertas.
      </p>

      <div className="kpis" style={{ marginTop: 24 }}>
        <Kpi
          label="Alcance · 30 dias"
          value={compact(reach)}
          foot={
            <>
              <Delta value={8.4} /> vs. período anterior
            </>
          }
        />
        <Kpi label="Seguidores novos" value={`+${num(newFollowers)}`} foot={<>em {CLIENTS.length} clientes</>} />
        <Kpi label="Sessões nos sites" value={compact(sessions)} foot={<><Delta value={5.1} /> via GA4</>} />
        <Kpi label="Receita recorrente" value={money(mrr)} foot={<>{money(openMonthly)} em proposta</>} />
      </div>

      <div className="grid grid--main" style={{ marginTop: 8, gap: 24 }}>
        <div>
          <SectionTitle title="Agenda de publicações" action={<Link href="/calendario">Abrir calendário</Link>} />
          <div className="list timeline">
            {today.map((p) => {
              const c = client(p.clientId)!;
              const isToday = sameDay(p.date, NOW);
              return (
                <Link href="/calendario" key={p.id} className="timeline-item" style={{ display: "grid" }}>
                  <time className={p.status === "publicado" ? "faint" : ""}>
                    {time(p.date)}
                    <div className="faint" style={{ fontSize: 11, fontWeight: 500 }}>{isToday ? "hoje" : "amanhã"}</div>
                  </time>
                  <div style={{ minWidth: 0 }}>
                    <div className="spread" style={{ alignItems: "flex-start" }}>
                      <div className="grow">
                        <div className="truncate" style={{ fontWeight: 550 }}>{p.caption}</div>
                        <div className="row faint" style={{ marginTop: 4, fontSize: 12 }}>
                          <ClientTile clientId={c.id} size={16} />
                          {c.name} · {p.kind}
                        </div>
                      </div>
                      <div className="row" style={{ gap: 4 }}>
                        {p.networks.map((n) => (
                          <NetIcon key={n} id={n} size={18} />
                        ))}
                      </div>
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <PostStatusLozenge status={p.status} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          <SectionTitle title="Clientes" action={<Link href="/clientes">Ver todos</Link>} />
          <div className="grid grid--2">
            {CLIENTS.map((c) => {
              const stats = SOCIAL[c.id];
              const followers = stats.reduce((a, s) => a + s.followers, 0);
              const growth = stats.reduce((a, s) => a + s.followersDelta, 0);
              const eng = stats.reduce((a, s) => a + s.engagementRate, 0) / stats.length;
              const series = Array.from({ length: 30 }, (_, i) => stats.reduce((a, s) => a + s.reachSeries[i], 0));
              return (
                <Link key={c.id} href={`/clientes/${c.id}`} className="client-card">
                  <div className="spread">
                    <div className="row" style={{ gap: 10 }}>
                      <ClientTile clientId={c.id} size={30} />
                      <div>
                        <div style={{ fontWeight: 650 }}>{c.name}</div>
                        <div className="faint" style={{ fontSize: 12 }}>{c.sector}</div>
                      </div>
                    </div>
                    <Sparkline values={series} />
                  </div>
                  <div className="client-card__stats">
                    <div>
                      <b>{compact(followers)}</b>
                      <span>seguidores</span>
                    </div>
                    <div>
                      <b>+{num(growth)}</b>
                      <span>em 30 dias</span>
                    </div>
                    <div>
                      <b>{eng.toLocaleString("pt-PT", { maximumFractionDigits: 1 })}%</b>
                      <span>envolvimento</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          <div className="spread faint" style={{ marginTop: 10, fontSize: 12 }}>
            <span>Linha: alcance diário somado, últimos 30 dias.</span>
          </div>
        </div>

        <div>
          <SectionTitle title="Precisa de atenção" />
          <div className="list">
            {negative.map((m) => (
              <Link key={m.id} href={`/inbox?m=${m.id}`} className="list-item">
                <AlertTriangle size={16} style={{ color: "var(--bad)", marginTop: 2, flex: "none" }} />
                <div className="grow">
                  <div style={{ fontWeight: 550 }}>Comentário negativo · {client(m.clientId)!.name}</div>
                  <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>«{m.text}»</div>
                </div>
              </Link>
            ))}
            <Link href="/calendario" className="list-item">
              <Clock size={16} style={{ color: "var(--warn)", marginTop: 2, flex: "none" }} />
              <div className="grow">
                <div style={{ fontWeight: 550 }}>{awaiting.length} publicações à espera de aprovação</div>
                <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                  A mais próxima sai a {dayMonth([...awaiting].sort((a, b) => a.date.getTime() - b.date.getTime())[0].date)}.
                </div>
              </div>
            </Link>
          </div>

          <SectionTitle title="As minhas tarefas" action={<Link href="/tarefas">Todas</Link>} />
          <div className="list">
            {tasks.map((t) => (
              <div key={t.id} className="list-item">
                <button
                  className="checkbox"
                  role="checkbox"
                  aria-checked={t.done}
                  aria-label={`Concluir: ${t.title}`}
                  onClick={() => setTasks((ts) => ts.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)))}
                >
                  {t.done && <Check size={12} strokeWidth={3} />}
                </button>
                <div className="grow">
                  <div className={t.done ? "done-text" : ""} style={{ fontWeight: 500 }}>{t.title}</div>
                  <div className="row faint" style={{ fontSize: 12, marginTop: 3 }}>
                    <span className="ticket__key">{t.key}</span>
                    {t.clientId && <>· {client(t.clientId)!.name}</>}
                    · {sameDay(t.due, NOW) ? "hoje" : dayMonth(t.due)}
                  </div>
                </div>
                <Avatar userId={t.assignee} size={22} />
              </div>
            ))}
          </div>

          <SectionTitle title="Pipeline" action={<Link href="/crm/pipeline">Abrir</Link>} />
          <div className="list">
            {openDeals.slice(0, 4).map((d) => (
              <Link key={d.id} href="/crm/pipeline" className="list-item">
                <div className="grow">
                  <div style={{ fontWeight: 550 }}>{company(d.companyId).name}</div>
                  <div className="faint" style={{ fontSize: 12, marginTop: 2 }}>
                    {d.stage} · {d.next ?? "sem próximo passo"}
                  </div>
                </div>
                <div className="num" style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                  {money(d.value)}
                  {d.recurring && <span className="faint" style={{ fontWeight: 400 }}>/mês</span>}
                </div>
              </Link>
            ))}
            <Link href="/crm/pipeline" className="list-item" style={{ color: "var(--ink-2)", fontSize: 13 }}>
              Ver pipeline completo <ArrowRight size={14} style={{ marginLeft: "auto" }} />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
