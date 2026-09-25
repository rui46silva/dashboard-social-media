"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ExternalLink, FileText, Pencil, Plus, Target } from "lucide-react";
import {
  COMPANIES, CONTACTS, DEALS, NOW, PROFILES, SITE, SOCIAL, TIME_SLOTS, type Post,
  bestTimes, client as getClient, network, topPosts, user, type NetworkId,
} from "@/lib/data";
import { compact, dayMonth, duration, money, num, pct, time } from "@/lib/format";
import { Bars, Heatmap, LineChart } from "@/components/charts";
import {
  Avatar, CheckCircle, ClientTile, Delta, Due, Kpi, Net, NetIcon, PageHead, PostStatusLozenge, SectionTitle,
} from "@/components/ui";
import { useStore } from "@/components/store";
import { useSession } from "@/components/session";
import { ClientForm } from "@/components/client-form";

const TABS = ["Visão geral", "Perfil", "Redes sociais", "Site", "Negócio"] as const;
type Tab = (typeof TABS)[number];
const PERIODS = [
  { days: 7, label: "7 dias" },
  { days: 14, label: "14 dias" },
  { days: 30, label: "30 dias" },
];
const WEEK = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function dayLabels(days: number) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - (days - 1 - i));
    return dayMonth(d);
  });
}

export default function ClientPage() {
  const { id } = useParams<{ id: string }>();
  const c = getClient(id);
  const { posts: POSTS, tasks, saveTask } = useStore();
  const { can } = useSession();
  const [tab, setTab] = useState<Tab>("Visão geral");
  const [days, setDays] = useState(30);
  const [nets, setNets] = useState<NetworkId[]>(c?.networks ?? []);
  const [editing, setEditing] = useState(false);

  const stats = useMemo(() => (SOCIAL[id] ?? []).filter((s) => nets.includes(s.network)), [id, nets]);
  if (!c) notFound();

  const site = SITE[c.id];
  const labels = dayLabels(days);
  const slice = (arr: number[]) => arr.slice(30 - days);
  const scale = days / 30;

  const followers = stats.reduce((a, s) => a + s.followers, 0);
  const growth = stats.reduce((a, s) => a + s.followersDelta, 0) * scale;
  const reach = stats.reduce((a, s) => a + slice(s.reachSeries).reduce((x, y) => x + y, 0), 0);
  const eng = stats.length ? stats.reduce((a, s) => a + s.engagementRate, 0) / stats.length : 0;
  const engDelta = stats.length ? stats.reduce((a, s) => a + s.engagementDelta, 0) / stats.length : 0;
  const sessions = slice(site.sessionSeries).reduce((a, b) => a + b, 0);
  const co = COMPANIES.find((x) => x.clientId === c.id)!;

  const reachSeries = stats.map((s) => ({
    id: s.network,
    label: network(s.network).name,
    color: `var(--series-${network(s.network).slot})`,
    values: slice(s.reachSeries),
  }));

  const toggleNet = (n: NetworkId) =>
    setNets((cur) => (cur.includes(n) ? (cur.length > 1 ? cur.filter((x) => x !== n) : cur) : [...cur, n]));

  const posts = topPosts(c.id).filter((p) => nets.includes(p.network));
  const upcoming = POSTS.filter((p) => p.clientId === c.id && p.date >= NOW).sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <>
      <PageHead
        eyebrow={
          <span className="row" style={{ gap: 8 }}>
            {[c.sector, `cliente desde ${c.since}`].filter(Boolean).join(" · ")}
          </span>
        }
        title={
          <span className="row" style={{ gap: 14 }}>
            <ClientTile clientId={c.id} size={40} />
            {c.name}
          </span>
        }
        actions={
          <>
            {can("gerir_clientes") && (
              <button className="btn" onClick={() => setEditing(true)}>
                <Pencil size={15} /> Editar
              </button>
            )}
            <Link className="btn" href={`/portal/${c.id}`}>
              <ExternalLink size={15} /> Portal do cliente
            </Link>
            <Link className="btn" href="/relatorios">
              <FileText size={15} /> Relatório
            </Link>
            <Link className="btn btn--primary" href="/calendario?novo=1">
              <Plus size={15} /> Publicação
            </Link>
          </>
        }
      />

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t} role="tab" className="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Perfil" && <ProfileTab clientId={c.id} onEdit={can("gerir_clientes") ? () => setEditing(true) : undefined} />}

      {editing && <ClientForm clientId={c.id} onClose={() => setEditing(false)} />}

      {tab !== "Negócio" && tab !== "Perfil" && (
        <div className="filters">
          <div className="segmented" role="group" aria-label="Período">
            {PERIODS.map((p) => (
              <button key={p.days} aria-pressed={days === p.days} onClick={() => setDays(p.days)}>
                {p.label}
              </button>
            ))}
          </div>
          {tab !== "Site" &&
            c.networks.map((n) => (
              <button key={n} className="chip" aria-pressed={nets.includes(n)} onClick={() => toggleNet(n)}>
                <span className="net__swatch" style={{ background: `var(--series-${network(n).slot})` }} />
                {network(n).name}
              </button>
            ))}
        </div>
      )}

      {tab === "Visão geral" && (
        <>
          <div className="kpis" style={{ ["--cols" as string]: 4 }}>
            <Kpi label="Seguidores" value={compact(followers)} foot={<><Delta value={Math.round(growth)} suffix="" /> no período</>} />
            <Kpi label="Alcance" value={compact(reach)} foot={<><Delta value={6.2} /> vs. anterior</>} />
            <Kpi label="Envolvimento" value={pct(eng)} foot={<><Delta value={engDelta} suffix=" pp" /> vs. anterior</>} />
            <Kpi label="Sessões no site" value={compact(sessions)} foot={<><Delta value={site.sessionsDelta} /> GA4</>} />
          </div>

          <div className="grid grid--main" style={{ gap: 24, marginTop: 8 }}>
            <div>
              <SectionTitle title="Alcance diário por rede" />
              <div className="card card__body">
                <LineChart series={reachSeries} labels={labels} format={num} />
              </div>

              <SectionTitle title="Publicações com melhor desempenho" />
              <TopPostsTable posts={posts} />
            </div>
            <div>
              <SectionTitle title="Melhores horas para publicar" />
              <div className="card card__body">
                <Heatmap data={bestTimes(c.id)} rows={WEEK} cols={TIME_SLOTS} />
              </div>
              <SectionTitle title="De onde vêm as visitas ao site" />
              <div className="card card__body">
                <Bars rows={site.sources} />
              </div>
              <SectionTitle title="Próximas publicações" action={<Link href="/calendario">Calendário</Link>} />
              <UpcomingList posts={upcoming.slice(0, 4)} />
            </div>
          </div>
        </>
      )}

      {tab === "Redes sociais" && (
        <>
          <div className="table-wrap">
            <table className="table table--cards">
              <thead>
                <tr>
                  <th>Rede</th>
                  <th className="r">Seguidores</th>
                  <th className="r">Crescimento</th>
                  <th className="r">Alcance</th>
                  <th className="r">Impressões</th>
                  <th className="r">Envolvimento</th>
                  <th className="r">Cliques</th>
                  <th className="r">Posts</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => (
                  <tr key={s.network}>
                    <td><Net id={s.network} /></td>
                    <td className="r" data-label="Seguidores">{num(s.followers)}</td>
                    <td className="r" data-label="Crescimento"><Delta value={Math.round(s.followersDelta * scale)} suffix="" /></td>
                    <td className="r" data-label="Alcance">{compact(slice(s.reachSeries).reduce((a, b) => a + b, 0))}</td>
                    <td className="r" data-label="Impressões">{compact(s.impressions * scale)}</td>
                    <td className="r" data-label="Envolvimento">
                      {pct(s.engagementRate)} <Delta value={s.engagementDelta} suffix=" pp" />
                    </td>
                    <td className="r" data-label="Cliques">{num(s.clicks * scale)}</td>
                    <td className="r" data-label="Posts">{Math.round(s.posts * scale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid--2" style={{ gap: 24 }}>
            <div>
              <SectionTitle title="Seguidores" />
              <div className="card card__body">
                <LineChart
                  labels={labels}
                  format={num}
                  series={stats.map((s) => ({
                    id: s.network,
                    label: network(s.network).name,
                    color: `var(--series-${network(s.network).slot})`,
                    values: slice(s.followerSeries),
                  }))}
                />
              </div>
            </div>
            <div>
              <SectionTitle title="Alcance" />
              <div className="card card__body">
                <LineChart series={reachSeries} labels={labels} format={num} />
              </div>
            </div>
          </div>

          <SectionTitle title="Publicações com melhor desempenho" />
          <TopPostsTable posts={posts} />
        </>
      )}

      {tab === "Site" && (
        <>
          <div className="notice notice--info" style={{ marginBottom: 16 }}>
            <ExternalLink size={16} />
            <span>
              Dados do Google Analytics 4 de <strong>{c.site}</strong>. Na versão final vêm da API do GA4, sem instalar nada
              novo no site.
            </span>
          </div>
          <div className="kpis">
            <Kpi label="Sessões" value={compact(sessions)} foot={<Delta value={site.sessionsDelta} />} />
            <Kpi label="Utilizadores" value={compact(sessions * 0.74)} foot="únicos" />
            <Kpi label="Sessões envolvidas" value={pct(site.engagedRate)} foot={<>tempo médio {duration(site.avgDuration)}</>} />
            <Kpi label="Conversões" value={num(site.conversions * scale)} foot={<Delta value={site.conversionsDelta} />} />
          </div>
          <div className="grid grid--main" style={{ gap: 24, marginTop: 8 }}>
            <div>
              <SectionTitle title="Sessões por dia" />
              <div className="card card__body">
                <LineChart
                  area
                  labels={labels}
                  format={num}
                  series={[{ id: "s", label: "Sessões", color: "var(--series-1)", values: slice(site.sessionSeries) }]}
                />
              </div>
              <SectionTitle title="Páginas mais vistas" />
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Página</th>
                      <th className="r">Visualizações</th>
                      <th className="r">Tempo médio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {site.pages.map((p) => (
                      <tr key={p.path}>
                        <td><code style={{ fontSize: 13 }}>{p.path}</code></td>
                        <td className="r">{num(p.views * scale)}</td>
                        <td className="r">{duration(p.avg)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <SectionTitle title="Origem do tráfego" />
              <div className="card card__body">
                <Bars rows={site.sources.map((s) => ({ ...s, value: Math.round(s.value * scale) }))} />
              </div>
              <div className="card card__body" style={{ marginTop: 12 }}>
                <div className="eyebrow">Das redes para o site</div>
                <p style={{ marginTop: 8 }}>
                  <span style={{ fontSize: 26, fontWeight: 600 }}>{num(site.sources[1].value * scale)}</span>{" "}
                  <span className="muted">sessões vieram das redes sociais — {Math.round((site.sources[1].value / site.sessions) * 100)}% do total.</span>
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {tab === "Negócio" && (
        <div className="grid grid--main" style={{ gap: 24 }}>
          <div>
            <SectionTitle title="Negócios" action={<Link href="/crm/pipeline">Pipeline</Link>} />
            <div className="list">
              {DEALS.filter((d) => d.companyId === co.id).map((d) => (
                <div key={d.id} className="list-item">
                  <div className="grow">
                    <div style={{ fontWeight: 550 }}>{d.title}</div>
                    <div className="faint" style={{ fontSize: 12, marginTop: 2 }}>atualizado a {dayMonth(d.updated)}</div>
                  </div>
                  <span className={`lozenge ${d.stage === "Ganho" ? "lozenge--good" : d.stage === "Perdido" ? "lozenge--bad" : "lozenge--info"}`}>{d.stage}</span>
                  <span className="num" style={{ fontWeight: 600, minWidth: 80, textAlign: "right" }}>{money(d.value)}</span>
                </div>
              ))}
            </div>
            <SectionTitle title="Tarefas" action={<Link href="/tarefas">Todas</Link>} />
            <div className="list">
              {tasks.filter((t) => t.clientId === c.id).map((t) => (
                <Link key={t.id} href={`/tarefas?t=${t.id}`} className="list-item" style={{ alignItems: "center" }}>
                  <CheckCircle checked={t.done} label={`Concluir: ${t.title}`} onToggle={() => saveTask({ ...t, done: !t.done })} />
                  <div className={`grow ${t.done ? "done-text" : ""}`}>{t.title}</div>
                  <span style={{ fontSize: 13 }}><Due date={t.due} done={t.done} /></span>
                  <Avatar userId={t.assignee} size={22} />
                </Link>
              ))}
            </div>
          </div>
          <div>
            <SectionTitle title="Conta" />
            <div className="card card__body stack" style={{ gap: 10 }}>
              <div className="spread"><span className="muted">Avença mensal</span><strong className="num">{money(co.mrr ?? 0)}</strong></div>
              <div className="spread"><span className="muted">Gestor de conta</span><span className="row"><Avatar userId={c.manager} size={22} /> {user(c.manager).name}</span></div>
              <div className="spread"><span className="muted">Cidade</span><span>{co.city}</span></div>
              <div className="spread"><span className="muted">Site</span><span>{c.site}</span></div>
              <div className="spread"><span className="muted">Redes ligadas</span><span className="row" style={{ gap: 4 }}>{c.networks.map((n) => <NetIcon key={n} id={n} size={18} />)}</span></div>
            </div>
            <SectionTitle title="Contactos" action={<Link href="/crm">CRM</Link>} />
            <div className="list">
              {CONTACTS.filter((x) => x.companyId === co.id).map((x) => (
                <div key={x.id} className="list-item">
                  <div className="grow">
                    <div style={{ fontWeight: 550 }}>{x.name}</div>
                    <div className="faint" style={{ fontSize: 12 }}>{x.role}</div>
                    <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>{x.email}<br />{x.phone}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function TopPostsTable({ posts }: { posts: ReturnType<typeof topPosts> }) {
  return (
    <div className="table-wrap">
      <table className="table table--cards">
        <thead>
          <tr>
            <th>Publicação</th>
            <th className="r">Alcance</th>
            <th className="r">Interações</th>
            <th className="r">Guardados</th>
          </tr>
        </thead>
        <tbody>
          {posts.map((p) => (
            <tr key={p.id}>
              <td>
                <div className="row" style={{ alignItems: "flex-start", gap: 10 }}>
                  <NetIcon id={p.network} />
                  <div>
                    <div style={{ fontWeight: 550 }}>{p.caption}</div>
                    <div className="faint" style={{ fontSize: 12, marginTop: 2 }}>
                      {p.kind} · {dayMonth(p.date)}
                    </div>
                  </div>
                </div>
              </td>
              <td className="r" data-label="Alcance">{num(p.reach)}</td>
              <td className="r" data-label="Interações">{num(p.engagement)}</td>
              <td className="r" data-label="Guardados">{num(p.saves)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UpcomingList({ posts }: { posts: Post[] }) {
  if (!posts.length) return <div className="list empty">Nada agendado.</div>;
  return (
    <div className="list">
      {posts.map((p) => (
        <div key={p.id} className="list-item">
          <div style={{ minWidth: 48 }}>
            <div className="num" style={{ fontWeight: 600 }}>{dayMonth(p.date)}</div>
            <div className="faint num" style={{ fontSize: 12 }}>{time(p.date)}</div>
          </div>
          <div className="grow">
            <div style={{ fontWeight: 500 }}>{p.caption}</div>
            <div className="row" style={{ marginTop: 6, gap: 6 }}>
              {p.networks.map((n) => <NetIcon key={n} id={n} size={16} />)}
              <PostStatusLozenge status={p.status} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProfileTab({ clientId, onEdit }: { clientId: string; onEdit?: () => void }) {
  const c = getClient(clientId)!;
  const p = PROFILES[clientId];
  if (!p) return <div className="card empty">Sem perfil. {onEdit && <button className="link" onClick={onEdit}>Preencher agora</button>}</div>;
  const daysLeft = Math.round((p.end.getTime() - NOW.getTime()) / 864e5);
  const perHour = p.hoursPerMonth ? p.fee / p.hoursPerMonth : 0;
  const team = Array.from(new Set([c.manager, c.inboxOwner, ...p.team]));
  return (
    <div className="profile-grid">
      <div className="stack" style={{ gap: 16 }}>
        <section className="card card__body">
          <div className="spread" style={{ marginBottom: 8 }}>
            <div className="eyebrow">Sobre o cliente</div>
            {onEdit && <button className="link" style={{ fontSize: 13 }} onClick={onEdit}>Editar</button>}
          </div>
          <p style={{ fontSize: 15, lineHeight: 1.6 }}>{p.description || <span className="faint">Sem descrição.</span>}</p>
          <dl className="kv" style={{ marginTop: 14 }}>
            <dt>Setor</dt><dd>{c.sector || "—"}</dd>
            <dt>Cidade</dt><dd>{p.city || "—"}</dd>
            <dt>Site</dt><dd>{c.site || "—"}</dd>
            <dt>NIF</dt><dd>{p.nif || "—"}</dd>
          </dl>
        </section>

        <section className="card card__body">
          <div className="eyebrow" style={{ marginBottom: 12 }}>Metas</div>
          <div className="stack" style={{ gap: 16 }}>
            {p.goals.map((g) => {
              const r = g.target ? Math.min(1, g.current / g.target) : 0;
              return (
                <div key={g.id}>
                  <div className="spread" style={{ fontSize: 14 }}>
                    <span className="row" style={{ gap: 6 }}><Target size={15} className="faint" /> {g.label}</span>
                    <span className="num"><b>{num(g.current)}</b> <span className="faint">/ {num(g.target)}</span></span>
                  </div>
                  <div className="progress" style={{ marginTop: 8 }}>
                    <i style={{ width: `${r * 100}%`, background: r >= 0.8 ? "var(--good-strong)" : "var(--warn)" }} />
                  </div>
                  <div className="faint" style={{ fontSize: 12, marginTop: 4 }}>{Math.round(r * 100)}% · até {g.due || "—"}</div>
                </div>
              );
            })}
            {!p.goals.length && <span className="faint">Sem metas definidas.</span>}
          </div>
        </section>

        <section className="card card__body">
          <div className="eyebrow" style={{ marginBottom: 12 }}>Marca e voz</div>
          <dl className="kv">
            <dt>Tom de voz</dt><dd>{p.tone || "—"}</dd>
            <dt>Público-alvo</dt><dd>{p.audience || "—"}</dd>
            <dt>Hashtags</dt><dd>{p.hashtags || "—"}</dd>
            <dt>A evitar</dt><dd>{p.avoid || "—"}</dd>
            <dt>Concorrentes</dt><dd>{p.competitors || "—"}</dd>
            <dt>Notas internas</dt><dd>{p.notes || "—"}</dd>
          </dl>
        </section>
      </div>

      <div className="stack" style={{ gap: 16 }}>
        <section className="card card__body">
          <div className="eyebrow" style={{ marginBottom: 12 }}>Contrato</div>
          <div className="big-number">{money(p.fee)}<span className="faint" style={{ fontSize: 15, fontWeight: 500 }}> / mês</span></div>
          <dl className="kv" style={{ marginTop: 14 }}>
            <dt>Taxa de arranque</dt><dd>{money(p.setupFee)}</dd>
            <dt>Início</dt><dd>{p.start.toLocaleDateString("pt-PT")}</dd>
            <dt>Renovação</dt>
            <dd>
              {p.end.toLocaleDateString("pt-PT")}{" "}
              <span className={daysLeft <= 60 ? "due--late" : daysLeft <= 90 ? "due--soon" : "faint"}>({daysLeft} dias)</span>
            </dd>
            <dt>Faturação</dt><dd>Dia {p.billingDay} de cada mês</dd>
            <dt>Volume</dt><dd>{p.postsPerMonth} publicações · {p.hoursPerMonth} h/mês</dd>
            <dt>Valor por hora</dt><dd className={perHour && perHour < 30 ? "due--late" : ""}>{perHour ? money(perHour) : "—"}</dd>
          </dl>
          <div className="row" style={{ flexWrap: "wrap", gap: 6, marginTop: 14 }}>
            {p.services.map((sv) => <span key={sv} className="tag">{sv}</span>)}
          </div>
        </section>

        <section className="card card__body">
          <div className="eyebrow" style={{ marginBottom: 12 }}>Equipa</div>
          <div className="stack" style={{ gap: 10 }}>
            {team.map((u) => (
              <div key={u} className="row">
                <Avatar userId={u} size={26} />
                <span className="grow">{user(u).name}</span>
                {u === c.manager && <span className="badge">Gestor de conta</span>}
                {u === c.inboxOwner && <span className="badge badge--info">Inbox</span>}
              </div>
            ))}
          </div>
        </section>

        <section className="card card__body">
          <div className="eyebrow" style={{ marginBottom: 12 }}>Contacto principal</div>
          <div style={{ fontWeight: 600 }}>{p.contact.name || "—"}</div>
          <div className="faint" style={{ fontSize: 13 }}>{p.contact.role}</div>
          <div className="muted" style={{ fontSize: 13, marginTop: 8 }}>{p.contact.email}<br />{p.contact.phone}</div>
        </section>

        <section className="card card__body">
          <div className="eyebrow" style={{ marginBottom: 12 }}>Contas ligadas</div>
          <div className="stack" style={{ gap: 8 }}>
            {c.networks.map((n) => (
              <div key={n} className="row">
                <NetIcon id={n} size={20} />
                <span className="grow">{p.handles[n] || network(n).name}</span>
                <span className="badge badge--good">Ligada</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
