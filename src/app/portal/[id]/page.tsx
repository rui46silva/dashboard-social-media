"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Check, ChevronDown, Download, Heart, MessageCircle, Moon, RotateCcw, Sun, Target } from "lucide-react";
import { CONTACTS, COMPANIES, NOW, REPORTS, RESULTS, SITE, SOCIAL, client as getClient, network, topPosts } from "@/lib/data";
import { compact, dayMonth, monthName, num, time, weekday } from "@/lib/format";
import { LineChart } from "@/components/charts";
import { ClientTile, NetIcon, PostThumb, SectionTitle } from "@/components/ui";
import { useSession } from "@/components/session";
import { useStore } from "@/components/store";

const STADIUM = 64642; // Estádio da Luz

export default function PortalPage() {
  const { id } = useParams<{ id: string }>();
  const c = getClient(id);
  const { theme, setTheme } = useSession();
  const { posts, clientApprove, clientReject } = useStore();
  const [changing, setChanging] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [done, setDone] = useState<Record<string, "ok" | "changes">>({});
  const [details, setDetails] = useState(false);
  if (!c) notFound();

  const co = COMPANIES.find((x) => x.clientId === c.id)!;
  const contact = CONTACTS.find((x) => x.companyId === co.id)!;
  const stats = SOCIAL[c.id];
  const site = SITE[c.id];
  const r = RESULTS[c.id];
  const reach = stats.reduce((a, s) => a + s.reach, 0);
  const newFollowers = stats.reduce((a, s) => a + s.followersDelta, 0);
  const pending = posts.filter((p) => p.clientId === c.id && (p.status === "uat" || done[p.id])).sort((a, b) => a.date.getTime() - b.date.getTime());
  const waiting = pending.filter((p) => p.status === "uat").length;
  const upcoming = posts.filter((p) => p.clientId === c.id && p.date > NOW && p.status === "agendado").sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 4);
  const best = topPosts(c.id).slice(0, 3);
  const labels = Array.from({ length: 30 }, (_, i) => dayMonth(new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - 29 + i)));
  const dark = theme === "dark";
  const stadiums = reach / STADIUM;

  return (
    <div className="portal">
      <header className="portal-top">
        <div className="portal-top__inner">
          <ClientTile clientId={c.id} size={30} />
          <div className="grow" style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600 }} className="truncate">{c.name}</div>
            <div className="faint truncate" style={{ fontSize: 12 }}>O vosso espaço com a agência</div>
          </div>
          {waiting > 0 && (
            <a href="#aprovar" className="btn btn--sm btn--primary">
              Aprovar <span className="badge-count" style={{ background: "#fff", color: "var(--primary)" }}>{waiting}</span>
            </a>
          )}
          <button className="icon-btn" onClick={() => setTheme(dark ? "light" : "dark")} aria-label="Mudar tema">
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      <div className="notice notice--info" style={{ borderRadius: 0 }}>
        <ArrowLeft size={16} />
        <span>
          Pré-visualização do que o cliente vê. <Link href="/conteudo" className="link">Voltar à Mesa</Link>
        </span>
      </div>

      <main className="portal-main">
        <p className="muted" style={{ marginBottom: 10 }}>
          Olá, {contact.name.split(" ")[0]} 👋 Aqui está o vosso mês de {monthName(NOW.getMonth())}.
        </p>

        <section
          className="portal-hero"
          style={{ background: `linear-gradient(135deg, oklch(0.42 0.09 ${c.hue}) 0%, oklch(0.3 0.06 ${c.hue + 30}) 100%)` }}
        >
          <h1>{r.headline}</h1>
          <p>
            {compact(reach)} pessoas viram a {c.name} nas redes este mês. Dava para encher o Estádio da Luz{" "}
            {stadiums >= 1.5 ? `${Math.round(stadiums)} vezes` : "uma vez"}.
          </p>
          <div className="hero-figures">
            <div><b>{compact(reach)}</b><span>pessoas alcançadas</span></div>
            <div><b>+{num(newFollowers)}</b><span>novos seguidores</span></div>
            <div><b>{num(r.outcomes[0].value)}</b><span>{r.outcomes[0].label.toLowerCase()}</span></div>
            <div><b>≈ {compact(r.estValue)} €</b><span>em negócio gerado*</span></div>
          </div>
        </section>

        {pending.length > 0 && (
          <section id="aprovar" style={{ scrollMarginTop: 70 }}>
            <SectionTitle title={waiting ? `Precisamos da vossa aprovação (${waiting})` : "Obrigado pelas aprovações!"} />
            <div className="stack" style={{ gap: 12 }}>
              {pending.map((p) => {
                const state = done[p.id];
                return (
                  <article key={p.id} className="approval-card">
                    <PostThumb post={p} />
                    <div className="approval-card__body">
                      <div className="row faint" style={{ fontSize: 13, flexWrap: "wrap" }}>
                        {p.networks.map((n) => <NetIcon key={n} id={n} size={18} />)}
                        <span>
                          {p.kind} · sai {weekday(p.date)}, {dayMonth(p.date)} às {time(p.date)}
                        </span>
                      </div>
                      <p style={{ fontSize: 17, fontWeight: 500, lineHeight: 1.45 }}>{p.caption}</p>
                      {p.rounds > 0 && !state && (
                        <span className="badge badge--info" style={{ justifySelf: "start" }}>
                          <RotateCcw size={12} /> Nova versão com as vossas alterações
                        </span>
                      )}

                      {state === "ok" ? (
                        <div className="notice notice--good"><Check size={16} /> Aprovado. A agência vai confirmar os últimos detalhes e agendar.</div>
                      ) : state === "changes" ? (
                        <div className="notice"><RotateCcw size={16} /> Pedido enviado. Vamos corrigir e enviar uma nova versão.</div>
                      ) : changing === p.id ? (
                        <form
                          className="stack"
                          style={{ gap: 8 }}
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (!text.trim()) return;
                            clientReject(p.id, text.trim());
                            setDone((d) => ({ ...d, [p.id]: "changes" }));
                            setChanging(null);
                            setText("");
                          }}
                        >
                          <label className="field">
                            <span>O que gostavam de mudar?</span>
                            <textarea
                              className="input"
                              style={{ minHeight: 80 }}
                              autoFocus
                              value={text}
                              onChange={(e) => setText(e.target.value)}
                              placeholder="Ex.: trocar a foto, mudar o texto do fim, outra música…"
                            />
                          </label>
                          <div className="row">
                            <button className="btn btn--primary" type="submit" disabled={!text.trim()}>Enviar pedido</button>
                            <button className="btn btn--ghost" type="button" onClick={() => setChanging(null)}>Cancelar</button>
                          </div>
                        </form>
                      ) : (
                        <div className="row" style={{ flexWrap: "wrap" }}>
                          <button
                            className="btn btn--good btn--lg"
                            onClick={() => {
                              clientApprove(p.id);
                              setDone((d) => ({ ...d, [p.id]: "ok" }));
                            }}
                          >
                            <Check size={17} /> Aprovar
                          </button>
                          <button className="btn btn--lg" onClick={() => { setChanging(p.id); setText(""); }}>
                            <RotateCcw size={16} /> Pedir alterações
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        <SectionTitle title="O que isto trouxe ao vosso negócio" />
        <div className="grid grid--3">
          {r.outcomes.map((o) => (
            <div key={o.label} className="card outcome">
              <b>{num(o.value)}</b>
              <span className="outcome__label">{o.label}</span>
              <span className="faint" style={{ fontSize: 13 }}>{o.hint}</span>
            </div>
          ))}
        </div>
        <p className="faint" style={{ fontSize: 12, marginTop: 8 }}>
          * Estimativa: contactos e reservas vindos das redes × valor médio de venda que nos indicaram. Mais {num(site.sources[1].value)} visitas ao vosso site vieram das redes.
        </p>

        <SectionTitle title="Os vossos melhores momentos" />
        <div className="gallery">
          {best.map((p) => (
            <article key={p.id} className="post-card">
              <PostThumb post={{ id: p.id, clientId: c.id, kind: p.kind as "Reel" }} />
              <div className="post-card__body">
                <div style={{ fontWeight: 600, lineHeight: 1.35 }}>{p.caption}</div>
                <div className="row faint" style={{ marginTop: 8, gap: 12, flexWrap: "wrap" }}>
                  <NetIcon id={p.network} size={16} />
                  <span><b style={{ color: "var(--ink)" }}>{compact(p.reach)}</b> pessoas viram</span>
                  <span className="row" style={{ gap: 3 }}><Heart size={13} /> {num(p.engagement)}</span>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="grid grid--2" style={{ gap: 24 }}>
          <div>
            <SectionTitle title="O que dizem de vós" />
            <div className="stack" style={{ gap: 10 }}>
              {r.love.map((l) => (
                <blockquote key={l.author} className="love" style={{ margin: 0 }}>
                  {l.text}
                  <footer className="row faint" style={{ fontSize: 13, marginTop: 10 }}>
                    <NetIcon id={l.network} size={16} /> {l.author}
                  </footer>
                </blockquote>
              ))}
            </div>
          </div>
          <div>
            <SectionTitle title="Objetivos do trimestre" />
            <div className="card card__body stack" style={{ gap: 18 }}>
              {r.goals.map((g) => {
                const p = Math.min(1, g.current / g.target);
                return (
                  <div key={g.label}>
                    <div className="spread" style={{ fontSize: 14 }}>
                      <span className="row" style={{ gap: 6 }}><Target size={15} className="faint" /> {g.label}</span>
                      <span className="num"><b>{num(g.current)}</b> <span className="faint">de {num(g.target)}</span></span>
                    </div>
                    <div className="progress" style={{ marginTop: 8 }}>
                      <i style={{ width: `${p * 100}%`, background: p >= 0.8 ? "var(--good-strong)" : "var(--warn)" }} />
                    </div>
                    <div className="faint" style={{ fontSize: 12, marginTop: 4 }}>
                      {p >= 1 ? "Objetivo atingido 🎉" : p >= 0.8 ? "Quase lá" : "Estamos a trabalhar nisto"} · {Math.round(p * 100)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <SectionTitle title="O que fizemos por vocês este mês" />
        <div className="work-strip">
          {r.work.map((w) => (
            <span key={w.label}><b>{w.value}</b> {w.label}</span>
          ))}
        </div>

        <div className="grid grid--2" style={{ gap: 24 }}>
          <div>
            <SectionTitle title="A seguir" />
            <div className="list">
              {upcoming.map((p) => (
                <div key={p.id} className="list-item" style={{ alignItems: "center" }}>
                  <PostThumb post={p} className="thumb-sm" label={false} />
                  <div className="grow">
                    <div style={{ fontWeight: 500 }}>{p.caption}</div>
                    <div className="faint" style={{ fontSize: 12, marginTop: 2 }}>{weekday(p.date)}, {dayMonth(p.date)} às {time(p.date)}</div>
                  </div>
                </div>
              ))}
              {!upcoming.length && <div className="empty">As próximas publicações aparecem aqui depois de aprovadas.</div>}
            </div>
          </div>
          <div>
            <SectionTitle title="Relatórios" />
            <div className="list">
              {REPORTS.filter((x) => x.clientId === c.id && x.status === "enviado").map((x) => (
                <a key={x.id} className="list-item" href="#" title="Na versão final descarrega o PDF enviado">
                  <Download size={16} style={{ marginTop: 2 }} />
                  <div className="grow">
                    <div style={{ fontWeight: 500 }}>{x.title}</div>
                    <div className="faint" style={{ fontSize: 12 }}>{x.period}</div>
                  </div>
                </a>
              ))}
              {!REPORTS.some((x) => x.clientId === c.id && x.status === "enviado") && <div className="empty">O primeiro relatório chega no dia 1.</div>}
            </div>
            <div className="card card__body row" style={{ marginTop: 12, alignItems: "flex-start" }}>
              <MessageCircle size={18} style={{ color: "var(--primary)", flex: "none", marginTop: 2 }} />
              <span className="muted" style={{ fontSize: 13 }}>
                Dúvidas ou ideias? Falem connosco — respondemos no próprio dia útil.
              </span>
            </div>
          </div>
        </div>

        <button className="btn btn--ghost" style={{ marginTop: 28 }} onClick={() => setDetails(!details)} aria-expanded={details}>
          <ChevronDown size={15} style={{ transform: details ? "rotate(180deg)" : undefined }} /> Ver números detalhados
        </button>
        {details && (
          <div className="card card__body" style={{ marginTop: 8 }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Pessoas alcançadas por dia</div>
            <LineChart
              labels={labels}
              format={num}
              series={stats.map((s) => ({ id: s.network, label: network(s.network).name, color: `var(--series-${network(s.network).slot})`, values: s.reachSeries }))}
            />
          </div>
        )}
      </main>
    </div>
  );
}
