"use client";

import { useState } from "react";
import { CalendarClock, Download, Send } from "lucide-react";
import {
  CLIENTS, COMPETITORS, NOW, REPORTS, SITE, SOCIAL, client as getClient, network, topPosts,
} from "@/lib/data";
import { compact, dayMonth, num, pct } from "@/lib/format";
import { Bars, LineChart } from "@/components/charts";
import { ClientTile, Delta, Kpi, NetIcon, PageHead, SectionTitle } from "@/components/ui";

const SECTIONS = [
  { id: "resumo", label: "Resumo e números-chave" },
  { id: "redes", label: "Redes sociais" },
  { id: "posts", label: "Melhores publicações" },
  { id: "site", label: "Site (GA4)" },
  { id: "concorrentes", label: "Concorrentes" },
  { id: "notas", label: "Notas e próximos passos" },
] as const;
type SectionId = (typeof SECTIONS)[number]["id"];

const STATUS: Record<string, string> = { enviado: "lozenge--good", agendado: "lozenge--info", rascunho: "" };

export default function ReportsPage() {
  const [clientId, setClientId] = useState(CLIENTS[2].id);
  const [on, setOn] = useState<SectionId[]>(["resumo", "redes", "posts", "site", "notas"]);
  const [notes, setNotes] = useState(
    "Setembro foi o melhor mês do ano em alcance, puxado pelos Reels de treino curto. Em outubro vamos testar uma série semanal no TikTok e reforçar o LinkedIn com o programa para empresas.",
  );
  const [auto, setAuto] = useState(true);

  const c = getClient(clientId)!;
  const stats = SOCIAL[clientId];
  const site = SITE[clientId];
  const labels = Array.from({ length: 30 }, (_, i) => dayMonth(new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - 29 + i)));
  const has = (s: SectionId) => on.includes(s);

  return (
    <>
      <PageHead
        title="Relatórios"
        lede="Monta o relatório, pré-visualiza como o cliente o vai ver e exporta em PDF ou agenda o envio."
      />

      <div className="table-wrap no-print" style={{ marginBottom: 8 }}>
        <table className="table table--cards">
          <thead>
            <tr>
              <th>Relatório</th>
              <th>Período</th>
              <th>Estado</th>
              <th>Data</th>
              <th>Destinatários</th>
            </tr>
          </thead>
          <tbody>
            {REPORTS.map((r) => (
              <tr key={r.id}>
                <td>
                  <div className="row" style={{ gap: 10 }}>
                    <ClientTile clientId={r.clientId} size={24} />
                    <div>
                      <div style={{ fontWeight: 600 }}>{r.title}</div>
                      <div className="faint" style={{ fontSize: 12 }}>{getClient(r.clientId)!.name}</div>
                    </div>
                  </div>
                </td>
                <td data-label="Período">{r.period}</td>
                <td><span className={`lozenge ${STATUS[r.status]}`}>{r.status}</span></td>
                <td className="num" data-label="Data">{dayMonth(r.when)}</td>
                <td className="muted" data-label="Para">{r.recipients.join(", ") || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid report-layout" style={{ gap: 24 }}>
        <div className="no-print">
          <SectionTitle title="Construir relatório" />
          <div className="card card__body stack" style={{ gap: 16 }}>
            <label className="field">
              <span>Cliente</span>
              <select className="input" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                {CLIENTS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Período</span>
              <select className="input" defaultValue="30">
                <option value="30">Últimos 30 dias</option>
                <option>Setembro 2026</option>
                <option>3.º trimestre 2026</option>
              </select>
            </label>
            <div className="field">
              <span>Secções</span>
              {SECTIONS.map((s) => (
                <label key={s.id} className="row" style={{ cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={has(s.id)}
                    onChange={() => setOn((cur) => (cur.includes(s.id) ? cur.filter((x) => x !== s.id) : [...cur, s.id]))}
                  />
                  {s.label}
                </label>
              ))}
            </div>
            {has("notas") && (
              <label className="field">
                <span>Notas da agência</span>
                <textarea className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </label>
            )}
            <label className="row" style={{ cursor: "pointer" }}>
              <input type="checkbox" checked={auto} onChange={() => setAuto(!auto)} />
              <span>
                Enviar automaticamente no dia 1 de cada mês
                <span className="faint" style={{ display: "block", fontSize: 12 }}>Para os contactos do cliente no CRM</span>
              </span>
            </label>
            <div className="row" style={{ flexWrap: "wrap" }}>
              <button className="btn btn--primary" onClick={() => window.print()}>
                <Download size={15} /> Exportar PDF
              </button>
              <button className="btn">
                {auto ? <CalendarClock size={15} /> : <Send size={15} />} {auto ? "Agendar" : "Enviar agora"}
              </button>
            </div>
          </div>
        </div>

        <div>
          <SectionTitle title="Pré-visualização" />
          <article className="paper">
            <div className="spread" style={{ alignItems: "flex-start" }}>
              <div>
                <div className="eyebrow">Relatório mensal · últimos 30 dias</div>
                <h2 style={{ marginTop: 10 }}>{c.name}</h2>
              </div>
              <ClientTile clientId={c.id} size={44} />
            </div>

            {has("resumo") && (
              <>
                <h3>Resumo</h3>
                <div className="kpis" style={{ ["--cols" as string]: 4 }}>
                  <Kpi label="Seguidores" value={compact(stats.reduce((a, s) => a + s.followers, 0))} foot={<Delta value={stats.reduce((a, s) => a + s.followersDelta, 0)} suffix="" />} />
                  <Kpi label="Alcance" value={compact(stats.reduce((a, s) => a + s.reach, 0))} foot={<Delta value={6.2} />} />
                  <Kpi label="Envolvimento" value={pct(stats.reduce((a, s) => a + s.engagementRate, 0) / stats.length)} />
                  <Kpi label="Sessões no site" value={compact(site.sessions)} foot={<Delta value={site.sessionsDelta} />} />
                </div>
              </>
            )}

            {has("redes") && (
              <>
                <h3>Alcance por rede</h3>
                <LineChart
                  labels={labels}
                  format={num}
                  series={stats.map((s) => ({ id: s.network, label: network(s.network).name, color: `var(--series-${network(s.network).slot})`, values: s.reachSeries }))}
                />
              </>
            )}

            {has("posts") && (
              <>
                <h3>Melhores publicações</h3>
                <table className="table">
                  <tbody>
                    {topPosts(clientId).slice(0, 3).map((p, i) => (
                      <tr key={p.id}>
                        <td style={{ width: 24 }} className="serif">{i + 1}</td>
                        <td>
                          <div className="row"><NetIcon id={p.network} size={16} /> <strong>{p.caption}</strong></div>
                        </td>
                        <td className="r">{num(p.reach)} de alcance</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {has("site") && (
              <>
                <h3>Site</h3>
                <Bars rows={site.sources} />
              </>
            )}

            {has("concorrentes") && (
              <>
                <h3>Concorrentes</h3>
                <Bars
                  format={(n) => pct(n)}
                  rows={COMPETITORS[clientId].map((r) => ({ label: r.name, value: r.engagement, color: r.isClient ? "var(--series-1)" : "#85806f" }))}
                />
                <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>Taxa de envolvimento no Instagram.</p>
              </>
            )}

            {has("notas") && notes && (
              <>
                <h3>Notas e próximos passos</h3>
                <p style={{ fontSize: 15, lineHeight: 1.6 }}>{notes}</p>
              </>
            )}
          </article>
        </div>
      </div>
    </>
  );
}
