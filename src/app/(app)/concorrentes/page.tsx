"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { CLIENTS, COMPETITORS } from "@/lib/data";
import { compact, pct } from "@/lib/format";
import { ClientTile, Delta, PageHead, SectionTitle } from "@/components/ui";

function Compare({
  rows,
  format,
}: {
  rows: { label: string; value: number; highlight?: boolean }[];
  format: (n: number) => string;
}) {
  const max = Math.max(...rows.map((r) => r.value)) || 1;
  return (
    <div>
      {[...rows]
        .sort((a, b) => b.value - a.value)
        .map((r) => (
          <div className="bar-row" key={r.label}>
            <span className="truncate" style={{ fontWeight: r.highlight ? 650 : 400 }}>
              {r.label}
              {r.highlight && <span className="badge badge--mark" style={{ marginLeft: 6, height: 18 }}>cliente</span>}
            </span>
            <span className="num">{format(r.value)}</span>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${(r.value / max) * 100}%`, background: r.highlight ? "var(--series-1)" : "var(--ink-3)" }} />
            </div>
          </div>
        ))}
    </div>
  );
}

export default function CompetitorsPage() {
  const [clientId, setClientId] = useState(CLIENTS[0].id);
  const rows = COMPETITORS[clientId];
  const me = rows.find((r) => r.isClient)!;
  const others = rows.filter((r) => !r.isClient);
  const avgEng = others.reduce((a, r) => a + r.engagement, 0) / others.length;
  const leader = [...others].sort((a, b) => b.growth - a.growth)[0];

  return (
    <>
      <PageHead
        title="Concorrentes"
        lede="Compara cada cliente com as marcas que disputam a mesma audiência. Dados públicos do Instagram, atualizados todos os dias."
        actions={
          <button className="btn">
            <Plus size={15} /> Seguir concorrente
          </button>
        }
      />

      <div className="filters">
        {CLIENTS.map((c) => (
          <button key={c.id} className="chip" aria-pressed={clientId === c.id} onClick={() => setClientId(c.id)}>
            <ClientTile clientId={c.id} size={16} />
            {c.name}
          </button>
        ))}
      </div>

      <div className="card card__body" style={{ marginBottom: 8 }}>
        <div className="eyebrow">Leitura rápida</div>
        <p style={{ fontSize: 18, fontWeight: 500, lineHeight: 1.45, marginTop: 8, maxWidth: "56ch" }}>
          {me.name} tem um envolvimento de <span className="hl">{pct(me.engagement)}</span>,{" "}
          {me.engagement >= avgEng ? "acima" : "abaixo"} da média dos concorrentes ({pct(avgEng)}).{" "}
          {leader.growth > me.growth
            ? `${leader.name} está a crescer mais depressa (${pct(leader.growth)} em 30 dias). Vale a pena ver o que publicam.`
            : `Nenhum concorrente cresce tão depressa (${pct(me.growth)} em 30 dias).`}
        </p>
      </div>

      <div className="grid grid--2" style={{ gap: 24 }}>
        <div>
          <SectionTitle title="Taxa de envolvimento" />
          <div className="card card__body">
            <Compare rows={rows.map((r) => ({ label: r.name, value: r.engagement, highlight: r.isClient }))} format={(n) => pct(n)} />
          </div>
        </div>
        <div>
          <SectionTitle title="Crescimento de seguidores · 30 dias" />
          <div className="card card__body">
            <Compare rows={rows.map((r) => ({ label: r.name, value: r.growth, highlight: r.isClient }))} format={(n) => pct(n)} />
          </div>
        </div>
      </div>

      <SectionTitle title="Tabela comparativa" />
      <div className="table-wrap">
        <table className="table table--cards">
          <thead>
            <tr>
              <th>Conta</th>
              <th className="r">Seguidores</th>
              <th className="r">Crescimento</th>
              <th className="r">Envolvimento</th>
              <th className="r">Posts / semana</th>
              <th>Melhor publicação</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.handle} style={r.isClient ? { background: "color-mix(in srgb, var(--mark-soft) 35%, transparent)" } : undefined}>
                <td>
                  <div style={{ fontWeight: 650 }}>{r.name}</div>
                  <div className="faint" style={{ fontSize: 12 }}>{r.handle}</div>
                </td>
                <td className="r" data-label="Seguidores">{compact(r.followers)}</td>
                <td className="r" data-label="Crescimento"><Delta value={r.growth} /></td>
                <td className="r" data-label="Envolvimento">{pct(r.engagement)}</td>
                <td className="r" data-label="Posts/semana">{r.postsPerWeek.toLocaleString("pt-PT")}</td>
                <td className="muted" data-label="Melhor:">{r.topPost}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
