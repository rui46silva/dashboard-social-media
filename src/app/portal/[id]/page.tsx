"use client";

import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, ChevronDown, Download, Eye, Heart, LogOut, MessageCircle, Moon, RotateCcw, Sun, Target } from "lucide-react";
import {
  CONTACTS, COMPANIES, NOW, PROFILES, REPORTS, RESULTS, ROLE_USER, SITE, SOCIAL, client as getClient, network, topPosts, user as getUser,
  type Post,
} from "@/lib/data";
import { compact, dayMonth, monthName, num, time, weekday } from "@/lib/format";
import { LineChart } from "@/components/charts";
import { ClientTile, NetIcon, PostThumb, SectionTitle } from "@/components/ui";
import { FeedPreview, PostPreviewModal, fullCaption } from "@/components/social-preview";
import { useSession } from "@/components/session";
import { useStore } from "@/components/store";

const STADIUM = 64642; // Estádio da Luz

export default function PortalPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const c = getClient(id);
  const { theme, setTheme, viewAs, setViewAs } = useSession();
  const { posts, clientApprove, clientReject, nps, submitNps } = useStore();
  const [score, setScore] = useState<number | null>(null);
  const [npsComment, setNpsComment] = useState("");
  const [npsSent, setNpsSent] = useState(false);
  const [changing, setChanging] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [done, setDone] = useState<Record<string, "ok" | "changes">>({});
  const [details, setDetails] = useState(false);
  const [preview, setPreview] = useState<Post | null>(null);

  // A client login only ever sees its own portal.
  const clientUser = getUser(ROLE_USER.cliente);
  const ownId = clientUser.clients[0];
  const asClient = viewAs === "cliente";
  useEffect(() => {
    if (asClient && id !== ownId) router.replace(`/portal/${ownId}`);
  }, [asClient, id, ownId, router]);

  if (!c) notFound();

  const co = COMPANIES.find((x) => x.clientId === c.id);
  const contact = CONTACTS.find((x) => x.companyId === co?.id);
  const profile = PROFILES[c.id];
  const stats = SOCIAL[c.id] ?? [];
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
  const livePreview = preview ? posts.find((p) => p.id === preview.id) ?? preview : null;

  const approve = (p: Post) => {
    clientApprove(p.id);
    setDone((d) => ({ ...d, [p.id]: "ok" }));
  };

  /** Approve / request changes — same controls in the card and in the preview dialog. */
  const actions = (p: Post) => {
    const state = done[p.id];
    if (state === "ok") return <div className="notice notice--good"><Check size={16} /> Aprovado. A agência vai confirmar os últimos detalhes e agendar.</div>;
    if (state === "changes") return <div className="notice"><RotateCcw size={16} /> Pedido enviado. Vamos corrigir e enviar uma nova versão.</div>;
    if (p.status !== "uat") return null;
    if (changing === p.id)
      return (
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
            <textarea className="input" style={{ minHeight: 80 }} autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Ex.: trocar a foto, mudar o texto do fim, outra música…" />
          </label>
          <div className="row">
            <button className="btn btn--primary" type="submit" disabled={!text.trim()}>Enviar pedido</button>
            <button className="btn btn--ghost" type="button" onClick={() => setChanging(null)}>Cancelar</button>
          </div>
        </form>
      );
    return (
      <div className="row" style={{ flexWrap: "wrap" }}>
        <button className="btn btn--good btn--lg" onClick={() => approve(p)}><Check size={17} /> Aprovar</button>
        <button className="btn btn--lg" onClick={() => { setChanging(p.id); setText(""); }}><RotateCcw size={16} /> Pedir alterações</button>
      </div>
    );
  };

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

      <div className="notice notice--info" style={{ borderRadius: 0, flexWrap: "wrap" }}>
        {asClient ? (
          <>
            <Eye size={16} />
            <span className="grow">
              A ver como <strong>{clientUser.name}</strong> (cliente). Os clientes só têm acesso a este portal.
            </span>
            <button className="link row" style={{ gap: 4 }} onClick={() => { setViewAs("ceo"); router.push("/"); }}>
              <LogOut size={14} /> Sair do modo cliente
            </button>
          </>
        ) : (
          <>
            <ArrowLeft size={16} />
            <span className="grow">
              Pré-visualização do que o cliente vê. <Link href="/conteudo" className="link">Voltar à Mesa</Link>
            </span>
          </>
        )}
      </div>

      <main className="portal-main">
        <p className="muted" style={{ marginBottom: 10 }}>
          Olá, {(contact?.name ?? "").split(" ")[0]} 👋 Aqui está o vosso mês de {monthName(NOW.getMonth())}.
        </p>

        <section className="portal-hero" style={{ background: `linear-gradient(135deg, oklch(0.42 0.09 ${c.hue}) 0%, oklch(0.3 0.06 ${c.hue + 30}) 100%)` }}>
          <h1>{r.headline}</h1>
          {reach > 0 && (
            <p>
              {compact(reach)} pessoas viram a {c.name} nas redes este mês. Dava para encher o Estádio da Luz{" "}
              {stadiums >= 1.5 ? `${Math.round(stadiums)} vezes` : "uma vez"}.
            </p>
          )}
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
              {pending.map((p) => (
                <article key={p.id} className="approval-card">
                  <button className="approval-card__thumb" onClick={() => setPreview(p)} aria-label={`Ver como fica: ${p.caption}`}>
                    <PostThumb post={p} />
                    <span className="approval-card__hint"><Eye size={14} /> Ver como fica</span>
                  </button>
                  <div className="approval-card__body">
                    <div className="row faint" style={{ fontSize: 13, flexWrap: "wrap" }}>
                      {p.networks.map((n) => <NetIcon key={n} id={n} size={18} />)}
                      <span>{p.kind} · sai {weekday(p.date)}, {dayMonth(p.date)} às {time(p.date)}</span>
                    </div>
                    <p style={{ fontSize: 15, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{fullCaption(p)}</p>
                    {p.rounds > 0 && !done[p.id] && (
                      <span className="badge badge--info" style={{ justifySelf: "start" }}><RotateCcw size={12} /> Nova versão com as vossas alterações</span>
                    )}
                    <button className="link row" style={{ gap: 6, justifySelf: "start", fontSize: 14 }} onClick={() => setPreview(p)}>
                      <Eye size={15} /> Ver como fica no {p.networks.map((n) => network(n).name).join(" e no ")}
                    </button>
                    {actions(p)}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {(() => {
          const last = nps.filter((n) => n.clientId === c.id).sort((a, b) => b.date.getTime() - a.date.getTime())[0];
          const due = !last || NOW.getTime() - last.date.getTime() > 20 * 864e5;
          if (!due && !npsSent) return null;
          return (
            <section className="card card__body nps" style={{ marginTop: 24 }}>
              {npsSent ? (
                <div className="row" style={{ gap: 10 }}>
                  <Check size={18} style={{ color: "var(--good)" }} />
                  <span>Obrigado pela resposta! Lemos todas e falamos convosco se for preciso.</span>
                </div>
              ) : (
                <>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>De 0 a 10, qual a probabilidade de recomendarem a agência a um amigo ou parceiro?</div>
                  <div className="nps__scale" role="radiogroup" aria-label="Nota de 0 a 10">
                    {Array.from({ length: 11 }, (_, i) => (
                      <button key={i} role="radio" aria-checked={score === i} className={`nps__btn ${score === i ? "is-on" : ""}`} onClick={() => setScore(i)}>{i}</button>
                    ))}
                  </div>
                  <div className="spread faint" style={{ fontSize: 12 }}><span>Nada provável</span><span>Muito provável</span></div>
                  {score !== null && (
                    <form
                      className="stack"
                      style={{ gap: 8, marginTop: 10 }}
                      onSubmit={(e) => {
                        e.preventDefault();
                        submitNps({ clientId: c.id, by: contact?.name ?? "Cliente", score, comment: npsComment.trim() });
                        setNpsSent(true);
                      }}
                    >
                      <textarea className="input" style={{ minHeight: 70 }} value={npsComment} onChange={(e) => setNpsComment(e.target.value)} placeholder={score >= 9 ? "O que estamos a fazer bem? (opcional)" : "O que podíamos fazer melhor? (opcional)"} />
                      <button className="btn btn--primary" type="submit" style={{ justifySelf: "start" }}>Enviar</button>
                    </form>
                  )}
                </>
              )}
            </section>
          );
        })()}

        <div className="grid grid--main" style={{ gap: 24 }}>
          <div>
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
              * Estimativa: contactos e reservas vindos das redes × valor médio de venda que nos indicaram.
              {site && site.sources[1].value > 0 && <> Mais {num(site.sources[1].value)} visitas ao vosso site vieram das redes.</>}
            </p>

            <SectionTitle title="Os vossos melhores momentos" />
            <div className="gallery">
              {best.map((p) => (
                <article key={p.id} className="post-card">
                  <PostThumb post={{ id: p.id, clientId: c.id, kind: p.kind as Post["kind"] }} />
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
              {!best.length && <div className="card empty" style={{ gridColumn: "1 / -1" }}>As vossas melhores publicações aparecem aqui.</div>}
            </div>
          </div>
          <div>
            <SectionTitle title="O vosso feed" />
            <FeedPreview clientId={c.id} posts={posts} onOpen={setPreview} />
          </div>
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
              {!r.love.length && <div className="card empty">Os melhores comentários dos vossos seguidores aparecem aqui.</div>}
            </div>
          </div>
          <div>
            <SectionTitle title="Objetivos" />
            <div className="card card__body stack" style={{ gap: 18 }}>
              {(profile?.goals ?? []).map((g) => {
                const p = g.target ? Math.min(1, g.current / g.target) : 0;
                return (
                  <div key={g.id}>
                    <div className="spread" style={{ fontSize: 14 }}>
                      <span className="row" style={{ gap: 6 }}><Target size={15} className="faint" /> {g.label}</span>
                      <span className="num"><b>{num(g.current)}</b> <span className="faint">de {num(g.target)}</span></span>
                    </div>
                    <div className="progress" style={{ marginTop: 8 }}>
                      <i style={{ width: `${p * 100}%`, background: p >= 0.8 ? "var(--good-strong)" : "var(--warn)" }} />
                    </div>
                    <div className="faint" style={{ fontSize: 12, marginTop: 4 }}>
                      {p >= 1 ? "Objetivo atingido 🎉" : p >= 0.8 ? "Quase lá" : "Estamos a trabalhar nisto"} · {Math.round(p * 100)}% · até {g.due}
                    </div>
                  </div>
                );
              })}
              {!profile?.goals.length && <span className="faint">Ainda sem objetivos definidos.</span>}
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
                <button key={p.id} className="list-item" style={{ alignItems: "center" }} onClick={() => setPreview(p)}>
                  <PostThumb post={p} className="thumb-sm" label={false} />
                  <div className="grow">
                    <div style={{ fontWeight: 500 }}>{p.caption}</div>
                    <div className="faint" style={{ fontSize: 12, marginTop: 2 }}>{weekday(p.date)}, {dayMonth(p.date)} às {time(p.date)}</div>
                  </div>
                  <Eye size={16} className="faint" />
                </button>
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
              <span className="muted" style={{ fontSize: 13 }}>Dúvidas ou ideias? Falem connosco — respondemos no próprio dia útil.</span>
            </div>
          </div>
        </div>

        {stats.length > 0 && (
          <>
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
          </>
        )}
      </main>

      {livePreview && (
        <PostPreviewModal post={livePreview} onClose={() => setPreview(null)}>
          <div className="row faint" style={{ fontSize: 13, flexWrap: "wrap" }}>
            {livePreview.networks.map((n) => <NetIcon key={n} id={n} size={18} />)}
            {livePreview.kind} · {weekday(livePreview.date)}, {dayMonth(livePreview.date)} às {time(livePreview.date)}
          </div>
          <div style={{ fontWeight: 600, fontSize: 17, lineHeight: 1.35 }}>{livePreview.caption}</div>
          {livePreview.status === "publicado" && <span className="badge badge--violet" style={{ justifySelf: "start" }}>Já publicado</span>}
          {livePreview.status === "agendado" && <span className="badge badge--good" style={{ justifySelf: "start" }}>Aprovado e agendado</span>}
          {livePreview.status === "confirmar" && !done[livePreview.id] && <span className="badge badge--info" style={{ justifySelf: "start" }}>Aprovado por vocês</span>}
          <p className="faint" style={{ fontSize: 13 }}>
            A imagem final substitui este bloco de cor. Usa o seletor em cima para ver como fica em cada rede.
          </p>
          {actions(livePreview)}
        </PostPreviewModal>
      )}
    </div>
  );
}
