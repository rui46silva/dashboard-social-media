"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { CLIENTS, COMPANIES, NETWORKS, SITE, SOCIAL, USERS, type NetworkId } from "@/lib/data";
import { compact, money, pct } from "@/lib/format";
import { Sparkline } from "@/components/charts";
import { Avatar, ClientTile, NetIcon, PageHead } from "@/components/ui";
import { useSession } from "@/components/session";

export default function ClientsPage() {
  const { can } = useSession();
  const [adding, setAdding] = useState(false);

  return (
    <>
      <PageHead
        title="Clientes"
        lede="Todas as marcas que a agência gere, com os números dos últimos 30 dias."
        actions={
          can("gerir_clientes") && (
            <button className="btn btn--primary" onClick={() => setAdding(true)}>
              <Plus size={15} /> Adicionar cliente
            </button>
          )
        }
      />

      <div className="table-wrap">
        <table className="table table--cards">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Redes</th>
              <th className="r">Seguidores</th>
              <th className="r">Envolvimento</th>
              <th className="r">Sessões site</th>
              <th className="r">Avença</th>
              <th className="hide-sm">Alcance · 30 d</th>
              <th>Gestor</th>
            </tr>
          </thead>
          <tbody>
            {CLIENTS.map((c) => {
              const s = SOCIAL[c.id];
              const co = COMPANIES.find((x) => x.clientId === c.id);
              return (
                <tr key={c.id}>
                  <td>
                    <Link href={`/clientes/${c.id}`} className="row" style={{ gap: 10 }}>
                      <ClientTile clientId={c.id} size={28} />
                      <span>
                        <span style={{ fontWeight: 650, display: "block" }}>{c.name}</span>
                        <span className="faint" style={{ fontSize: 12 }}>{c.sector}</span>
                      </span>
                    </Link>
                  </td>
                  <td>
                    <span className="row" style={{ gap: 4, padding: "6px 0" }}>
                      {c.networks.map((n) => <NetIcon key={n} id={n} size={18} />)}
                    </span>
                  </td>
                  <td className="r" data-label="Seguidores">{compact(s.reduce((a, x) => a + x.followers, 0))}</td>
                  <td className="r" data-label="Envolvimento">{pct(s.reduce((a, x) => a + x.engagementRate, 0) / s.length)}</td>
                  <td className="r" data-label="Sessões">{compact(SITE[c.id].sessions)}</td>
                  <td className="r" data-label="Avença">{money(co?.mrr ?? 0)}</td>
                  <td className="hide-sm">
                    <Sparkline values={Array.from({ length: 30 }, (_, i) => s.reduce((a, x) => a + x.reachSeries[i], 0))} />
                  </td>
                  <td>
                    <span className="row" style={{ paddingTop: 4 }}>
                      <Avatar userId={c.manager} size={22} />
                      <span className="muted">{USERS.find((u) => u.id === c.manager)?.name}</span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {adding && <AddClient onClose={() => setAdding(false)} />}
    </>
  );
}

function AddClient({ onClose }: { onClose: () => void }) {
  const [connected, setConnected] = useState<NetworkId[]>([]);
  const [ga, setGa] = useState(false);
  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="drawer" role="dialog" aria-label="Adicionar cliente">
        <div className="drawer__head">
          <h2>Novo cliente</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <div className="drawer__body">
          <label className="field">
            <span>Nome da marca</span>
            <input className="input" placeholder="Ex.: Vinhos Serra Alta" />
          </label>
          <div className="grid grid--2">
            <label className="field">
              <span>Setor</span>
              <input className="input" placeholder="Vinhos" />
            </label>
            <label className="field">
              <span>Gestor de conta</span>
              <select className="input">
                {USERS.filter((u) => u.role === "gestor" || u.role === "ceo").map((u) => (
                  <option key={u.id}>{u.name}</option>
                ))}
              </select>
            </label>
          </div>
          <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Ligar contas</div>
            <div className="list">
              {NETWORKS.map((n) => {
                const on = connected.includes(n.id);
                return (
                  <div key={n.id} className="list-item" style={{ alignItems: "center" }}>
                    <NetIcon id={n.id} size={24} />
                    <div className="grow">
                      <div style={{ fontWeight: 550 }}>{n.name}</div>
                      <div className="faint" style={{ fontSize: 12 }}>
                        {on ? "Ligado · a importar os últimos 90 dias" : "Autorização via login oficial da rede"}
                      </div>
                    </div>
                    <button
                      className={`btn btn--sm ${on ? "" : "btn--primary"}`}
                      onClick={() => setConnected((c) => (on ? c.filter((x) => x !== n.id) : [...c, n.id]))}
                    >
                      {on ? <><Check size={14} /> Ligado</> : "Ligar"}
                    </button>
                  </div>
                );
              })}
              <div className="list-item" style={{ alignItems: "center" }}>
                <span className="net-icon" style={{ width: 24, height: 24, background: "var(--ink-2)" }}>GA</span>
                <div className="grow">
                  <div style={{ fontWeight: 550 }}>Google Analytics 4</div>
                  <div className="faint" style={{ fontSize: 12 }}>{ga ? "Propriedade ligada" : "Escolher a propriedade do site"}</div>
                </div>
                <button className={`btn btn--sm ${ga ? "" : "btn--primary"}`} onClick={() => setGa(!ga)}>
                  {ga ? <><Check size={14} /> Ligado</> : "Ligar"}
                </button>
              </div>
            </div>
          </div>
          <p className="faint" style={{ fontSize: 12 }}>
            Protótipo: os botões simulam a ligação. Na versão final abrem o ecrã de autorização de cada rede.
          </p>
        </div>
        <div className="drawer__foot">
          <button className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn--primary" onClick={onClose}>Criar cliente</button>
        </div>
      </div>
    </>
  );
}
