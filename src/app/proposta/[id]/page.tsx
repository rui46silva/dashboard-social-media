"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, FileSignature, PartyPopper } from "lucide-react";
import { NOW, proposalTotals, user } from "@/lib/data";
import { money } from "@/lib/format";
import { useStore } from "@/components/store";
import { useSession } from "@/components/session";

/** What the prospect opens from the email: read, accept and sign. */
export default function ProposalPublicPage() {
  const { id } = useParams<{ id: string }>();
  const { proposals, viewProposal, signProposal, declineProposal } = useStore();
  const { viewAs } = useSession();
  const p = proposals.find((x) => x.id === id);
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);

  useEffect(() => {
    if (p) viewProposal(p.id);
  }, [p?.id]);

  if (!p) notFound();
  const t = proposalTotals(p);
  const author = user(p.createdBy);
  const expired = p.validUntil < NOW && p.status !== "aceite";

  return (
    <div className="portal">
      <header className="portal-top">
        <div className="portal-top__inner">
          <span className="logo"><span className="logo__mark" aria-hidden><i /><i /><i /><i /></span>Agência</span>
          <span className="grow" />
          {viewAs !== "cliente" && <Link className="link" href="/crm/propostas">Voltar à Mesa</Link>}
        </div>
      </header>
      <main className="portal-main" style={{ maxWidth: 820 }}>
        <article className="paper" style={{ boxShadow: "none" }}>
          <div className="eyebrow">Proposta para {p.company}</div>
          <h2 style={{ marginTop: 10 }}>{p.title}</h2>
          <p style={{ marginTop: 6, color: "#6d6e6f" }}>
            Preparada por {author.name} · válida até {p.validUntil.toLocaleDateString("pt-PT")}
          </p>
          {p.intro && <p style={{ marginTop: 20, fontSize: 16, lineHeight: 1.6 }}>{p.intro}</p>}

          <h3>O que inclui</h3>
          <table className="table">
            <tbody>
              {p.items.map((i) => (
                <tr key={i.id}>
                  <td>
                    <strong>{i.service}</strong>
                    <div style={{ color: "#6d6e6f", fontSize: 13 }}>{i.description}</div>
                  </td>
                  <td className="r" style={{ whiteSpace: "nowrap" }}>{money(i.price)}{i.recurring ? " / mês" : " (uma vez)"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>Investimento</h3>
          <div className="grid grid--3">
            <div><div className="eyebrow">Mensal</div><div className="big-number" style={{ fontSize: 28 }}>{money(t.monthly)}</div></div>
            <div><div className="eyebrow">Arranque</div><div className="big-number" style={{ fontSize: 28 }}>{money(t.once)}</div></div>
            <div><div className="eyebrow">Total {p.months} meses</div><div className="big-number" style={{ fontSize: 28 }}>{money(t.monthly * p.months + t.once)}</div></div>
          </div>
          <p style={{ color: "#6d6e6f", fontSize: 13, marginTop: 10 }}>Valores sem IVA. Faturação mensal no dia 1. Contrato de {p.months} meses, renovável; cancelamento com 30 dias de aviso.</p>

          <h3>Próximos passos</h3>
          <ol style={{ paddingLeft: 20, lineHeight: 1.8, margin: 0 }}>
            <li>Aceitam e assinam aqui em baixo.</li>
            <li>Marcamos a reunião de arranque na semana seguinte.</li>
            <li>Em 10 dias úteis têm o primeiro calendário de conteúdos para aprovar no vosso portal.</li>
          </ol>

          <h3>Aceitação</h3>
          {p.status === "aceite" ? (
            <div className="notice notice--good" style={{ fontSize: 15 }}>
              <PartyPopper size={18} />
              <span>
                Proposta aceite e assinada por <strong>{p.signedBy}</strong> em {p.signedAt?.toLocaleDateString("pt-PT")}. Bem-vindos! Vamos entrar em contacto para a reunião de arranque.
                {viewAs !== "cliente" && p.clientId && <> <Link className="link" href={`/clientes/${p.clientId}`}>Ver cliente na Mesa</Link></>}
              </span>
            </div>
          ) : p.status === "recusada" ? (
            <div className="notice">Esta proposta foi recusada. Se quiserem retomar a conversa, respondam ao email.</div>
          ) : expired ? (
            <div className="notice">Esta proposta expirou. Peçam-nos uma versão atualizada.</div>
          ) : (
            <form
              className="stack"
              style={{ gap: 12 }}
              onSubmit={(e) => {
                e.preventDefault();
                if (name.trim().length > 2 && agree) signProposal(p.id, name.trim());
              }}
            >
              <label className="field">
                <span>Nome completo de quem assina</span>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={p.contactName} />
              </label>
              {name.trim().length > 2 && <div className="signature">{name}</div>}
              <label className="row" style={{ cursor: "pointer", alignItems: "flex-start" }}>
                <input type="checkbox" checked={agree} onChange={() => setAgree(!agree)} style={{ marginTop: 3 }} />
                <span style={{ fontSize: 14 }}>Li e aceito a proposta e as condições acima, em nome de {p.company}.</span>
              </label>
              <div className="row" style={{ flexWrap: "wrap" }}>
                <button className="btn btn--good btn--lg" type="submit" disabled={name.trim().length < 3 || !agree}>
                  <FileSignature size={17} /> Aceitar e assinar
                </button>
                <button className="btn btn--ghost" type="button" onClick={() => declineProposal(p.id)}>Recusar</button>
              </div>
              <p style={{ color: "#6d6e6f", fontSize: 12 }}>
                <Check size={12} /> A assinatura fica registada com data, hora e endereço IP. Na versão final pode usar-se assinatura qualificada (Chave Móvel Digital).
              </p>
            </form>
          )}
        </article>
      </main>
    </div>
  );
}
