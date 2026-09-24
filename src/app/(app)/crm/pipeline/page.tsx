"use client";

import Link from "next/link";
import { useState } from "react";
import { Mail, Phone, Plus, X } from "lucide-react";
import { CONTACTS, DEALS, NOW, STAGES, company, user, type Deal, type Stage } from "@/lib/data";
import { ago, money } from "@/lib/format";
import { Avatar, Kpi, PageHead } from "@/components/ui";

const PROB: Record<Stage, number> = { Lead: 0.1, Qualificado: 0.25, Proposta: 0.5, Negociação: 0.75, Ganho: 1, Perdido: 0 };

export default function PipelinePage() {
  const [deals, setDeals] = useState<Deal[]>(DEALS);
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<Stage | null>(null);
  const [open, setOpen] = useState<Deal | null>(null);

  const setStage = (id: string, stage: Stage) => {
    setDeals((ds) => ds.map((d) => (d.id === id ? { ...d, stage, updated: NOW } : d)));
    setOpen((o) => (o && o.id === id ? { ...o, stage } : o));
  };

  const active = deals.filter((d) => !["Ganho", "Perdido"].includes(d.stage));
  const monthly = (d: Deal) => (d.recurring ? d.value : d.value / 12);
  const pipeline = active.reduce((a, d) => a + d.value, 0);
  const weighted = active.reduce((a, d) => a + d.value * PROB[d.stage], 0);
  const won = deals.filter((d) => d.stage === "Ganho").length;
  const lost = deals.filter((d) => d.stage === "Perdido").length;

  return (
    <>
      <PageHead
        title="Pipeline"
        lede="Negócios em curso, do primeiro contacto à assinatura. Arrasta os cartões entre fases."
        actions={
          <button className="btn btn--primary">
            <Plus size={15} /> Novo negócio
          </button>
        }
      />

      <div className="kpis" style={{ marginBottom: 20 }}>
        <Kpi label="Em aberto" value={money(pipeline)} foot={`${active.length} negócios`} />
        <Kpi label="Valor ponderado" value={money(weighted)} foot="pela probabilidade da fase" />
        <Kpi label="Recorrente em jogo" value={money(active.filter((d) => d.recurring).reduce((a, d) => a + monthly(d), 0))} foot="por mês" />
        <Kpi label="Taxa de ganho" value={`${Math.round((won / Math.max(1, won + lost)) * 100)}%`} foot={`${won} ganho${won === 1 ? "" : "s"} · ${lost} perdido${lost === 1 ? "" : "s"}`} />
      </div>

      <div className="board">
        {STAGES.map((stage) => {
          const col = deals.filter((d) => d.stage === stage);
          return (
            <section
              key={stage}
              className={`column ${over === stage ? "column--over" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(stage);
              }}
              onDragLeave={() => setOver((o) => (o === stage ? null : o))}
              onDrop={() => {
                if (drag) setStage(drag, stage);
                setDrag(null);
                setOver(null);
              }}
            >
              <div className="column__head">
                <h3>{stage}</h3>
                <span className="badge" style={{ height: 18 }}>{col.length}</span>
                <span className="column__sum">{money(col.reduce((a, d) => a + d.value, 0))}</span>
              </div>
              {col.map((d) => (
                <button
                  key={d.id}
                  className={`ticket ${drag === d.id ? "ticket--dragging" : ""}`}
                  draggable
                  onDragStart={() => setDrag(d.id)}
                  onDragEnd={() => setDrag(null)}
                  onClick={() => setOpen(d)}
                >
                  <div className="faint" style={{ fontSize: 12, fontWeight: 600 }}>{company(d.companyId).name}</div>
                  <div className="ticket__title" style={{ marginTop: 2 }}>{d.title}</div>
                  <div className="ticket__meta">
                    <strong className="num" style={{ color: "var(--ink)" }}>
                      {money(d.value)}
                      {d.recurring && <span className="faint" style={{ fontWeight: 400 }}>/mês</span>}
                    </strong>
                    <span style={{ marginLeft: "auto" }}>{ago(d.updated, NOW)}</span>
                    <Avatar userId={d.owner} size={20} />
                  </div>
                  {d.next && (
                    <div className="faint" style={{ fontSize: 12, marginTop: 8, paddingTop: 8, borderTop: "1px dashed var(--line)" }}>
                      → {d.next}
                    </div>
                  )}
                </button>
              ))}
            </section>
          );
        })}
      </div>

      {open && <DealDrawer deal={open} onClose={() => setOpen(null)} onStage={(s) => setStage(open.id, s)} />}
    </>
  );
}

function DealDrawer({ deal, onClose, onStage }: { deal: Deal; onClose: () => void; onStage: (s: Stage) => void }) {
  const co = company(deal.companyId);
  const contact = CONTACTS.find((c) => c.id === deal.contactId)!;
  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="drawer" role="dialog" aria-label={deal.title}>
        <div className="drawer__head">
          <div className="grow">
            <div className="faint" style={{ fontSize: 12, fontWeight: 600 }}>{co.name}</div>
            <h2>{deal.title}</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar"><X size={18} /></button>
        </div>
        <div className="drawer__body">
          <div className="grid grid--2">
            <label className="field">
              <span>Fase</span>
              <select className="input" value={deal.stage} onChange={(e) => onStage(e.target.value as Stage)}>
                {STAGES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
            <div className="field">
              <span>Valor</span>
              <div className="serif num" style={{ fontSize: 26, lineHeight: "36px" }}>
                {money(deal.value)}
                <span className="faint" style={{ fontSize: 15 }}>{deal.recurring ? " / mês" : " pontual"}</span>
              </div>
            </div>
          </div>
          <div className="card card__body stack" style={{ gap: 8 }}>
            <div className="eyebrow">Contacto</div>
            <div style={{ fontWeight: 650 }}>{contact.name}</div>
            <div className="faint" style={{ fontSize: 13 }}>{contact.role} · {co.city}</div>
            <div className="row" style={{ marginTop: 6, flexWrap: "wrap" }}>
              <a className="btn btn--sm" href={`mailto:${contact.email}`}><Mail size={14} /> {contact.email}</a>
              <a className="btn btn--sm" href={`tel:${contact.phone.replace(/\s/g, "")}`}><Phone size={14} /> Ligar</a>
            </div>
          </div>
          <div className="stack" style={{ gap: 8 }}>
            <div className="eyebrow">Próximo passo</div>
            <input className="input" defaultValue={deal.next} placeholder="Ex.: enviar proposta até sexta" />
          </div>
          <div className="stack" style={{ gap: 10 }}>
            <div className="eyebrow">Atividade</div>
            {[
              `${user(deal.owner).name} moveu para «${deal.stage}»`,
              `Chamada com ${contact.name.split(" ")[0]} — 25 min`,
              `Negócio criado a partir de ${contact.source}`,
            ].map((a, i) => (
              <div key={i} className="row" style={{ alignItems: "flex-start" }}>
                <Avatar userId={deal.owner} size={20} />
                <span className="muted" style={{ fontSize: 13 }}>{a}</span>
              </div>
            ))}
          </div>
          {co.clientId && (
            <Link className="btn" href={`/clientes/${co.clientId}`}>Ver métricas do cliente</Link>
          )}
        </div>
      </div>
    </>
  );
}
