"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Check, Download, MessageSquareText, Moon, Sun } from "lucide-react";
import { NOW, POSTS, REPORTS, SITE, SOCIAL, client as getClient, network, topPosts } from "@/lib/data";
import { compact, dayMonth, longDate, num, pct, time } from "@/lib/format";
import { LineChart } from "@/components/charts";
import { ClientTile, Delta, Kpi, NetIcon, SectionTitle } from "@/components/ui";
import { useSession } from "@/components/session";

export default function PortalPage() {
  const { id } = useParams<{ id: string }>();
  const c = getClient(id);
  const { theme, setTheme } = useSession();
  const [decisions, setDecisions] = useState<Record<string, "ok" | "changes">>({});
  const [comment, setComment] = useState<Record<string, string>>({});
  if (!c) notFound();

  const stats = SOCIAL[c.id];
  const site = SITE[c.id];
  const pending = POSTS.filter((p) => p.clientId === c.id && p.status === "aprovação");
  const upcoming = POSTS.filter((p) => p.clientId === c.id && p.date > NOW && p.status === "agendado").slice(0, 5);
  const labels = Array.from({ length: 30 }, (_, i) => dayMonth(new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - 29 + i)));
  const dark = theme === "dark";

  return (
    <>
      <header className="portal-top">
        <div className="portal-top__inner">
          <ClientTile clientId={c.id} size={30} />
          <div className="grow">
            <div style={{ fontWeight: 650 }}>{c.name}</div>
            <div className="faint" style={{ fontSize: 12 }}>Portal do cliente · preparado pela agência</div>
          </div>
          <button className="icon-btn" onClick={() => setTheme(dark ? "light" : "dark")} aria-label="Mudar tema">
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      <div className="notice notice--info" style={{ borderRadius: 0 }}>
        <ArrowLeft size={16} />
        <span>
          Pré-visualização do que o cliente vê. <Link href={`/clientes/${c.id}`} style={{ textDecoration: "underline" }}>Voltar à Mesa</Link>
        </span>
      </div>

      <main className="portal-main">
        <div className="eyebrow">{longDate(NOW)}</div>
        <h1 className="greeting" style={{ marginTop: 8 }}>
          Olá, <em>{c.name}.</em>
        </h1>
        <p className="brief">
          Nos últimos 30 dias chegaram a <strong>{compact(stats.reduce((a, s) => a + s.reach, 0))} pessoas</strong> e
          ganharam <strong>{num(stats.reduce((a, s) => a + s.followersDelta, 0))} seguidores</strong>.
          {pending.length > 0 && (
            <>
              {" "}Há <span className="hl"><strong>{pending.length} publicaç{pending.length === 1 ? "ão" : "ões"} à espera da vossa aprovação</strong></span>.
            </>
          )}
        </p>

        <div className="kpis" style={{ marginTop: 24 }}>
          <Kpi label="Seguidores" value={compact(stats.reduce((a, s) => a + s.followers, 0))} foot={<Delta value={stats.reduce((a, s) => a + s.followersDelta, 0)} suffix="" />} />
          <Kpi label="Alcance" value={compact(stats.reduce((a, s) => a + s.reach, 0))} foot={<Delta value={6.2} />} />
          <Kpi label="Envolvimento" value={pct(stats.reduce((a, s) => a + s.engagementRate, 0) / stats.length)} />
          <Kpi label="Visitas ao site" value={compact(site.sessions)} foot={<Delta value={site.sessionsDelta} />} />
        </div>

        {pending.length > 0 && (
          <>
            <SectionTitle title="À espera de aprovação" />
            <div className="list">
              {pending.map((p) => {
                const d = decisions[p.id];
                return (
                  <div key={p.id} className="approval" style={{ borderBottom: "1px solid var(--line)" }}>
                    <div className="preview-media">{p.kind}</div>
                    <div className="stack" style={{ gap: 8 }}>
                      <div className="row faint" style={{ fontSize: 12 }}>
                        {p.networks.map((n) => <NetIcon key={n} id={n} size={16} />)}
                        {dayMonth(p.date)} às {time(p.date)} · {p.kind}
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{p.caption}</div>
                      {d === "ok" ? (
                        <span className="badge badge--good" style={{ justifySelf: "start" }}><Check size={13} /> Aprovada — vai ser publicada</span>
                      ) : d === "changes" ? (
                        <span className="badge badge--warn" style={{ justifySelf: "start" }}>Pedido de alterações enviado à agência</span>
                      ) : (
                        <>
                          <textarea
                            className="input"
                            style={{ minHeight: 60 }}
                            placeholder="Comentário opcional para a agência…"
                            value={comment[p.id] ?? ""}
                            onChange={(e) => setComment((c) => ({ ...c, [p.id]: e.target.value }))}
                          />
                          <div className="row" style={{ flexWrap: "wrap" }}>
                            <button className="btn btn--primary" onClick={() => setDecisions((x) => ({ ...x, [p.id]: "ok" }))}>
                              <Check size={15} /> Aprovar
                            </button>
                            <button className="btn" onClick={() => setDecisions((x) => ({ ...x, [p.id]: "changes" }))}>
                              <MessageSquareText size={15} /> Pedir alterações
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div className="grid grid--main" style={{ gap: 24 }}>
          <div>
            <SectionTitle title="Alcance diário" />
            <div className="card card__body">
              <LineChart
                labels={labels}
                format={num}
                series={stats.map((s) => ({ id: s.network, label: network(s.network).name, color: `var(--series-${network(s.network).slot})`, values: s.reachSeries }))}
              />
            </div>
            <SectionTitle title="O que resultou melhor" />
            <div className="list">
              {topPosts(c.id).slice(0, 3).map((p) => (
                <div key={p.id} className="list-item">
                  <NetIcon id={p.network} />
                  <div className="grow">
                    <div style={{ fontWeight: 550 }}>{p.caption}</div>
                    <div className="faint" style={{ fontSize: 12 }}>{p.kind} · {dayMonth(p.date)}</div>
                  </div>
                  <div className="num" style={{ textAlign: "right" }}>
                    <strong>{compact(p.reach)}</strong>
                    <div className="faint" style={{ fontSize: 11 }}>pessoas</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <SectionTitle title="Próximas publicações" />
            <div className="list">
              {upcoming.map((p) => (
                <div key={p.id} className="list-item">
                  <div style={{ minWidth: 46 }}>
                    <div className="num" style={{ fontWeight: 600 }}>{dayMonth(p.date)}</div>
                    <div className="faint num" style={{ fontSize: 12 }}>{time(p.date)}</div>
                  </div>
                  <div className="grow">{p.caption}</div>
                </div>
              ))}
              {!upcoming.length && <div className="empty">Sem publicações agendadas.</div>}
            </div>
            <SectionTitle title="Relatórios" />
            <div className="list">
              {REPORTS.filter((r) => r.clientId === c.id && r.status === "enviado").map((r) => (
                <a key={r.id} className="list-item" href="#" title="Na versão final descarrega o PDF enviado">
                  <Download size={16} style={{ marginTop: 2 }} />
                  <div className="grow">
                    <div style={{ fontWeight: 550 }}>{r.title}</div>
                    <div className="faint" style={{ fontSize: 12 }}>{r.period}</div>
                  </div>
                </a>
              ))}
              {!REPORTS.some((r) => r.clientId === c.id && r.status === "enviado") && <div className="empty">O primeiro relatório chega no dia 1.</div>}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
