"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CLIENT_ECONOMICS, client } from "@/lib/data";
import { clientHealth, type Health } from "@/lib/company";
import { Avatar, ClientTile, SectionTitle } from "@/components/ui";
import { useStore } from "@/components/store";

const TONE: Record<Health["level"], "good" | "warn" | "bad"> = { Saudável: "good", Atenção: "warn", "Em risco": "bad" };
const partTone = (n: number) => (n >= 75 ? "good" : n >= 50 ? "warn" : "bad");

function Ring({ score, tone }: { score: number; tone: string }) {
  const r = 26;
  return (
    <svg className={`ring ring--${tone}`} width="64" height="64" viewBox="0 0 64 64" role="img" aria-label={`${score} em 100`}>
      <circle cx="32" cy="32" r={r} className="ring__track" />
      <circle cx="32" cy="32" r={r} className="ring__value" pathLength={100} strokeDasharray={`${score} 100`} transform="rotate(-90 32 32)" />
      <text x="32" y="33" textAnchor="middle" dominantBaseline="middle">{score}</text>
    </svg>
  );
}

export function useHealth() {
  const { time, nps, invoicePaid } = useStore();
  return CLIENT_ECONOMICS.map((e) => clientHealth(e.clientId, { time, nps, paid: invoicePaid })).sort((a, b) => a.score - b.score);
}

export function HealthBoard() {
  const all = useHealth();
  const avg = Math.round(all.reduce((a, h) => a + h.score, 0) / all.length);
  const count = (l: Health["level"]) => all.filter((h) => h.level === l).length;

  return (
    <>
      <SectionTitle
        title="Saúde dos clientes"
        action={
          <span className="row" style={{ gap: 6, flexWrap: "wrap" }}>
            <span className="badge">Média {avg}</span>
            {count("Em risco") > 0 && <span className="badge badge--bad">{count("Em risco")} em risco</span>}
            {count("Atenção") > 0 && <span className="badge badge--warn">{count("Atenção")} em atenção</span>}
            <span className="badge badge--good">{count("Saudável")} saudáveis</span>
          </span>
        }
      />
      <div className="health-grid">
        {all.map((h) => {
          const c = client(h.clientId)!;
          const tone = TONE[h.level];
          return (
            <div key={h.clientId} className={`card health health--${tone}`}>
              <div className="health__head">
                <Ring score={h.score} tone={tone} />
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="row" style={{ gap: 8 }}>
                    <ClientTile clientId={h.clientId} size={20} />
                    <b className="truncate">{c.name}</b>
                  </div>
                  <div className="row" style={{ gap: 8, marginTop: 6 }}>
                    <span className={`lozenge lozenge--${tone}`}>{h.level}</span>
                    <Avatar userId={c.manager} size={20} />
                  </div>
                </div>
              </div>
              <div className="health__parts">
                {h.parts.map((p) => (
                  <div key={p.key} className="health__part">
                    <span>{p.label}</span>
                    <span className="faint num">{p.note}</span>
                    <div className="health__bar"><i className={`is-${partTone(p.score)}`} style={{ width: `${Math.max(3, p.score)}%` }} /></div>
                  </div>
                ))}
              </div>
              <div className="health__foot">
                {h.causes.length ? (
                  <span className="muted">A puxar para baixo: {h.causes.slice(0, 2).map((x) => x.split(":")[0].toLowerCase()).join(" e ")}</span>
                ) : (
                  <span className="muted">Sem sinais fracos.</span>
                )}
                <Link href={`/clientes/${h.clientId}`} className="link row" style={{ gap: 2 }}>Abrir <ArrowUpRight size={13} /></Link>
              </div>
            </div>
          );
        })}
      </div>
      <p className="faint" style={{ fontSize: 12, marginTop: 10 }}>
        Pontuação 0–100: margem 25%, satisfação 20%, pagamentos 15%, metas 15%, renovação 15%, tempo de aprovação 10%. Abaixo de 50 abre um alerta no Cockpit.
      </p>
    </>
  );
}
