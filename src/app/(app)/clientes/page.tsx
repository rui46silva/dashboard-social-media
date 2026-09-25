"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus } from "lucide-react";
import { CLIENTS, COMPANIES, SITE, SOCIAL, USERS } from "@/lib/data";
import { compact, money, pct } from "@/lib/format";
import { Sparkline } from "@/components/charts";
import { Avatar, ClientTile, NetIcon, PageHead } from "@/components/ui";
import { useSession } from "@/components/session";
import { useStore } from "@/components/store";
import { ClientForm } from "@/components/client-form";

export default function ClientsPage() {
  const { can } = useSession();
  const [adding, setAdding] = useState(false);
  useStore(); // re-render when a client is created

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
                  <td className="r" data-label="Envolvimento">{s.length ? pct(s.reduce((a, x) => a + x.engagementRate, 0) / s.length) : "—"}</td>
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

      {adding && <ClientForm onClose={() => setAdding(false)} />}
    </>
  );
}

