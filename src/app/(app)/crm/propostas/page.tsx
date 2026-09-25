"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Copy, ExternalLink, Plus, Send, Trash2, X } from "lucide-react";
import {
  CONTACTS, DEALS, NOW, PRICE_LIST, PROPOSAL_STATUS, company, proposalTotals,
  type Proposal, type ProposalItem, type ProposalStatus,
} from "@/lib/data";
import { ago, dayMonth, money } from "@/lib/format";
import { Avatar, Kpi, PageHead } from "@/components/ui";
import { useStore } from "@/components/store";
import { useSession } from "@/components/session";

const TONE: Record<ProposalStatus, string> = { rascunho: "", enviada: "lozenge--info", vista: "lozenge--warn", aceite: "lozenge--good", recusada: "lozenge--bad" };
const totals = proposalTotals;
const toInput = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function ProposalsPage() {
  return (
    <Suspense>
      <Proposals />
    </Suspense>
  );
}

function Proposals() {
  const params = useSearchParams();
  const { proposals } = useStore();
  const { user: me } = useSession();
  const [open, setOpen] = useState<Proposal | null>(null);

  const blank = (dealId?: string): Proposal => {
    const deal = DEALS.find((d) => d.id === dealId);
    const co = deal ? company(deal.companyId) : undefined;
    const ct = deal ? CONTACTS.find((c) => c.id === deal.contactId) : undefined;
    return {
      id: `pr${Date.now()}`, dealId, company: co?.name ?? "", sector: co?.sector ?? "", city: co?.city ?? "",
      contactName: ct?.name ?? "", contactEmail: ct?.email ?? "", title: deal?.title ?? "", intro: "",
      items: [{ id: "i1", ...PRICE_LIST[0] }], months: 12, validUntil: new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() + 15),
      status: "rascunho", createdBy: me.id,
    };
  };

  useEffect(() => {
    const deal = params.get("deal");
    if (deal) {
      const existing = proposals.find((p) => p.dealId === deal && p.status !== "recusada");
      setOpen(existing ?? blank(deal));
    }
  }, [params]);

  const open$ = proposals.filter((p) => p.status === "enviada" || p.status === "vista");
  const signed = proposals.filter((p) => p.status === "aceite");
  const decided = proposals.filter((p) => p.status === "aceite" || p.status === "recusada");

  return (
    <>
      <PageHead
        title="Propostas"
        lede="Monta a proposta a partir da tabela de preços, envia um link e o cliente aceita e assina online. Ao assinar, passa a cliente com o arranque já planeado."
        actions={<button className="btn btn--primary" onClick={() => setOpen(blank())}><Plus size={15} /> Nova proposta</button>}
      />
      <div className="kpis" style={{ marginBottom: 20 }}>
        <Kpi label="Em aberto" value={open$.length} foot={`${money(open$.reduce((a, p) => a + totals(p).monthly, 0))}/mês em jogo`} />
        <Kpi label="Vistas pelo cliente" value={proposals.filter((p) => p.status === "vista").length} foot="boa altura para ligar" />
        <Kpi label="Assinadas" value={signed.length} foot={`${money(signed.reduce((a, p) => a + totals(p).monthly, 0))}/mês`} />
        <Kpi label="Taxa de aceitação" value={`${decided.length ? Math.round((signed.length / decided.length) * 100) : 0}%`} foot={`${decided.length} decididas`} />
      </div>
      <div className="table-wrap">
        <table className="table table--cards">
          <thead>
            <tr><th>Proposta</th><th>Estado</th><th className="r">Mensal</th><th className="r">Pontual</th><th>Validade</th><th>Autor</th></tr>
          </thead>
          <tbody>
            {proposals.map((p) => {
              const t = totals(p);
              return (
                <tr key={p.id} style={{ cursor: "pointer" }} onClick={() => setOpen(p)}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{p.company || "Sem empresa"}</div>
                    <div className="faint" style={{ fontSize: 12 }}>{p.title}</div>
                  </td>
                  <td>
                    <span className={`lozenge ${TONE[p.status]}`}>{PROPOSAL_STATUS[p.status]}</span>
                    {p.status === "vista" && p.viewedAt && <div className="faint" style={{ fontSize: 12 }}>aberta {ago(p.viewedAt, NOW)}</div>}
                  </td>
                  <td className="r" data-label="Mensal">{money(t.monthly)}</td>
                  <td className="r" data-label="Pontual">{money(t.once)}</td>
                  <td data-label="Válida até"><span className={p.validUntil < NOW && p.status !== "aceite" ? "due--late" : ""}>{dayMonth(p.validUntil)}</span></td>
                  <td><Avatar userId={p.createdBy} size={22} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {open && <ProposalEditor proposal={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function ProposalEditor({ proposal, onClose }: { proposal: Proposal; onClose: () => void }) {
  const { saveProposal, sendProposal, proposals } = useStore();
  const live = proposals.find((p) => p.id === proposal.id) ?? proposal;
  const [p, setP] = useState<Proposal>(live);
  const locked = live.status === "aceite" || live.status === "recusada";
  const t = totals(p);
  const setItem = (id: string, patch: Partial<ProposalItem>) => setP({ ...p, items: p.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) });
  const link = `/proposta/${p.id}`;

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <aside className="drawer drawer--wide" role="dialog" aria-label="Proposta">
        <div className="drawer__head">
          <h2>{p.company || "Nova proposta"}</h2>
          <span className={`lozenge ${TONE[live.status]}`}>{PROPOSAL_STATUS[live.status]}</span>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar"><X size={18} /></button>
        </div>
        <div className="drawer__body">
          {live.status === "aceite" && (
            <div className="notice notice--good">
              <span>
                Assinada por <strong>{live.signedBy}</strong> {live.signedAt && ago(live.signedAt, NOW)}.{" "}
                {live.clientId && <Link className="link" href={`/clientes/${live.clientId}`}>Ver cliente e tarefas de arranque</Link>}
              </span>
            </div>
          )}
          <fieldset disabled={locked} style={{ border: 0, padding: 0, margin: 0, display: "grid", gap: 14 }}>
            <div className="grid grid--2">
              <label className="field"><span>Empresa</span><input className="input" value={p.company} onChange={(e) => setP({ ...p, company: e.target.value })} /></label>
              <label className="field"><span>Setor</span><input className="input" value={p.sector} onChange={(e) => setP({ ...p, sector: e.target.value })} /></label>
              <label className="field"><span>Contacto</span><input className="input" value={p.contactName} onChange={(e) => setP({ ...p, contactName: e.target.value })} /></label>
              <label className="field"><span>Email</span><input className="input" type="email" value={p.contactEmail} onChange={(e) => setP({ ...p, contactEmail: e.target.value })} /></label>
            </div>
            <label className="field"><span>Título</span><input className="input" value={p.title} onChange={(e) => setP({ ...p, title: e.target.value })} /></label>
            <label className="field">
              <span>Introdução</span>
              <textarea className="input" style={{ minHeight: 80 }} value={p.intro} onChange={(e) => setP({ ...p, intro: e.target.value })} placeholder="O que propomos e porquê, em duas ou três frases." />
            </label>

            <div>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Serviços</div>
              <div className="list">
                {p.items.map((i) => (
                  <div key={i.id} className="list-item" style={{ flexWrap: "wrap", alignItems: "center" }}>
                    <div className="grow" style={{ minWidth: 200 }}>
                      <input className="input input--bare" style={{ height: 28, fontWeight: 600 }} value={i.service} onChange={(e) => setItem(i.id, { service: e.target.value })} />
                      <input className="input input--bare" style={{ height: 26, fontSize: 13 }} value={i.description} onChange={(e) => setItem(i.id, { description: e.target.value })} />
                    </div>
                    <div className="segmented">
                      <button type="button" aria-pressed={i.recurring} onClick={() => setItem(i.id, { recurring: true })}>Mensal</button>
                      <button type="button" aria-pressed={!i.recurring} onClick={() => setItem(i.id, { recurring: false })}>Pontual</button>
                    </div>
                    <label className="row" style={{ gap: 4 }}>
                      <input className="input" style={{ width: 90, height: 30, textAlign: "right" }} type="number" min={0} step={50} value={i.price} onChange={(e) => setItem(i.id, { price: Number(e.target.value) })} aria-label="Preço" /> €
                    </label>
                    <button type="button" className="icon-btn" aria-label="Remover" onClick={() => setP({ ...p, items: p.items.filter((x) => x.id !== i.id) })}><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
              <div className="row" style={{ flexWrap: "wrap", marginTop: 10, gap: 6 }}>
                {PRICE_LIST.filter((x) => !p.items.some((i) => i.service === x.service)).map((x) => (
                  <button type="button" key={x.service} className="chip" onClick={() => setP({ ...p, items: [...p.items, { id: `i${Date.now()}`, ...x }] })}>
                    + {x.service} <span className="faint">{money(x.price)}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid--2">
              <label className="field">
                <span>Duração do contrato</span>
                <select className="input" value={p.months} onChange={(e) => setP({ ...p, months: Number(e.target.value) })}>
                  {[3, 6, 12, 24].map((m) => <option key={m} value={m}>{m} meses</option>)}
                </select>
              </label>
              <label className="field">
                <span>Válida até</span>
                <input className="input" type="date" value={toInput(p.validUntil)} onChange={(e) => { const [y, m, d] = e.target.value.split("-").map(Number); if (y) setP({ ...p, validUntil: new Date(y, m - 1, d) }); }} />
              </label>
            </div>
          </fieldset>

          <div className="card card__body" style={{ fontSize: 14 }}>
            <div className="spread"><span className="muted">Mensal</span><strong className="num">{money(t.monthly)}</strong></div>
            <div className="spread" style={{ marginTop: 4 }}><span className="muted">Pontual (arranque)</span><strong className="num">{money(t.once)}</strong></div>
            <div className="divider" style={{ margin: "10px 0" }} />
            <div className="spread"><span>Valor total do contrato</span><strong className="num" style={{ fontSize: 18 }}>{money(t.monthly * p.months + t.once)}</strong></div>
          </div>

          {live.status !== "rascunho" && (
            <div className="row faint" style={{ fontSize: 13 }}>
              Link para o cliente: <code>mesa.app{link}</code>
              <button className="icon-btn" style={{ width: 26, height: 26 }} aria-label="Copiar link" onClick={() => navigator.clipboard?.writeText(`${location.origin}${link}`)}><Copy size={13} /></button>
            </div>
          )}
        </div>
        <div className="drawer__foot">
          <Link className="btn btn--ghost" href={link} target="_blank" onClick={() => saveProposal(p)}><ExternalLink size={14} /> Ver como o cliente vê</Link>
          <span className="grow" />
          {!locked && <button className="btn" onClick={() => { saveProposal(p); onClose(); }}>Guardar</button>}
          {!locked && (
            <button className="btn btn--primary" disabled={!p.company || !p.contactEmail || !p.items.length} onClick={() => { saveProposal(p); sendProposal(p.id); onClose(); }}>
              <Send size={14} /> {live.status === "rascunho" ? "Enviar ao cliente" : "Reenviar"}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
