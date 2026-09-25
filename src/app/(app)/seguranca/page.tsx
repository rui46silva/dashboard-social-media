"use client";

import { useMemo, useState } from "react";
import { Download, KeyRound, Laptop, Lock, ShieldCheck, Smartphone, Trash2, UserX } from "lucide-react";
import {
  CLIENTS, COMPANIES, CONTACTS, DEALS, INBOX, NOW, PROFILES, USERS, client as getClient, user,
} from "@/lib/data";
import { ago } from "@/lib/format";
import { Avatar, Kpi, PageHead, PersonAvatar, SectionTitle } from "@/components/ui";
import { useStore } from "@/components/store";
import { useSession } from "@/components/session";

const TABS = ["Registo de atividade", "Acessos e 2FA", "Dados e RGPD"] as const;
type Tab = (typeof TABS)[number];

export default function SecurityPage() {
  const { can } = useSession();
  const [tab, setTab] = useState<Tab>("Registo de atividade");
  if (!can("seguranca")) {
    return (
      <div className="card empty" style={{ marginTop: 40 }}>
        <Lock size={28} style={{ marginBottom: 10 }} />
        <div style={{ fontWeight: 600, color: "var(--ink)" }}>Área reservada</div>
        <p style={{ marginTop: 4 }}>Disponível para CEO e Dev.</p>
      </div>
    );
  }
  return (
    <>
      <PageHead title="Segurança e RGPD" lede="Quem fez o quê, como a equipa entra na Mesa e o que fazer quando um cliente pede os seus dados." />
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t} role="tab" className="tab" aria-selected={tab === t} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      {tab === "Registo de atividade" && <AuditLog />}
      {tab === "Acessos e 2FA" && <Access />}
      {tab === "Dados e RGPD" && <Gdpr />}
    </>
  );
}

function Who({ who }: { who: string }) {
  if (who.startsWith("cliente:")) {
    const name = who.slice(8);
    return (
      <span className="row" style={{ gap: 8 }}>
        <PersonAvatar name={name} size={24} />
        <span>{name} <span className="badge" style={{ height: 18 }}>cliente</span></span>
      </span>
    );
  }
  return (
    <span className="row" style={{ gap: 8 }}>
      <Avatar userId={who} size={24} />
      {user(who)?.name ?? who}
    </span>
  );
}

function AuditLog() {
  const { audit } = useStore();
  const [who, setWho] = useState("");
  const [q, setQ] = useState("");
  const rows = useMemo(
    () => audit.filter((a) => (!who || a.who === who || (who === "clientes" && a.who.startsWith("cliente:"))) && (!q || `${a.action} ${a.target}`.toLowerCase().includes(q.toLowerCase()))),
    [audit, who, q],
  );
  const exportCsv = () => {
    const csv = ["data;pessoa;ação;alvo;ip", ...rows.map((a) => [a.at.toISOString(), a.who.startsWith("cliente:") ? a.who.slice(8) : user(a.who)?.name, a.action, a.target, a.ip].join(";"))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "registo-de-atividade.csv";
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <>
      <div className="task-toolbar">
        <select className="input" style={{ width: "auto", height: 32 }} value={who} onChange={(e) => setWho(e.target.value)} aria-label="Pessoa">
          <option value="">Todas as pessoas</option>
          <option value="clientes">Só clientes</option>
          {USERS.filter((u) => u.role !== "cliente").map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <input className="input" style={{ width: 220, height: 32 }} placeholder="Procurar ação ou cliente" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn btn--sm" style={{ marginLeft: "auto" }} onClick={exportCsv}><Download size={14} /> Exportar CSV</button>
      </div>
      <div className="table-wrap">
        <table className="table table--cards">
          <thead><tr><th>Quando</th><th>Quem</th><th>Ação</th><th>Alvo</th><th>IP</th></tr></thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id}>
                <td className="faint" data-label="Quando" style={{ whiteSpace: "nowrap" }}>{ago(a.at, NOW)}</td>
                <td><Who who={a.who} /></td>
                <td style={{ fontWeight: 500 }}>{a.action}</td>
                <td className="muted">{a.target}</td>
                <td className="faint num" data-label="IP">{a.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="faint" style={{ fontSize: 12, marginTop: 10 }}>
        O registo não pode ser editado nem apagado e é guardado durante 2 anos. Inclui ações da equipa e dos clientes no portal.
      </p>
    </>
  );
}

function Access() {
  const { twoFactor, setTwoFactor, enforce2FA, setEnforce2FA } = useStore();
  const team = USERS.filter((u) => u.status === "ativo");
  const on = team.filter((u) => twoFactor[u.id]).length;
  const sessions = [
    { who: "u-rui", device: "MacBook · Chrome", where: "Lisboa", at: NOW, icon: Laptop, current: true },
    { who: "u-rui", device: "iPhone · App", where: "Lisboa", at: new Date(NOW.getTime() - 3 * 36e5), icon: Smartphone },
    { who: "u-ana", device: "Windows · Edge", where: "Porto", at: new Date(NOW.getTime() - 25 * 6e4), icon: Laptop },
    { who: "u-tiago", device: "Android · App", where: "Lisboa", at: new Date(NOW.getTime() - 50 * 6e4), icon: Smartphone },
  ];
  return (
    <>
      <div className="kpis">
        <Kpi label="Com 2FA ativo" value={`${on} de ${team.length}`} foot={on === team.length ? "toda a equipa" : "há contas sem 2FA"} />
        <Kpi label="Sessões ativas" value={sessions.length} />
        <Kpi label="Política de palavra-passe" value="12+" foot="caracteres, verificada contra fugas" />
        <Kpi label="Sessões expiram" value="30 dias" foot="ou 12 h sem atividade" />
      </div>

      <div className="card card__body spread" style={{ marginTop: 16, flexWrap: "wrap" }}>
        <div className="row" style={{ alignItems: "flex-start" }}>
          <ShieldCheck size={20} style={{ color: "var(--good)", flex: "none", marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 600 }}>Autenticação em dois passos obrigatória</div>
            <div className="muted" style={{ fontSize: 13 }}>Quem não tiver 2FA é obrigado a configurá-lo no próximo início de sessão. Recomendado antes de dar acesso a clientes.</div>
          </div>
        </div>
        <button className={`switch ${enforce2FA ? "is-on" : ""}`} role="switch" aria-checked={enforce2FA} onClick={() => setEnforce2FA(!enforce2FA)} aria-label="2FA obrigatório">
          <span />
        </button>
      </div>

      <SectionTitle title="Pessoas" />
      <div className="list">
        {USERS.map((u) => (
          <div key={u.id} className="list-item" style={{ alignItems: "center", flexWrap: "wrap" }}>
            <Avatar userId={u.id} size={28} />
            <div className="grow" style={{ minWidth: 160 }}>
              <div style={{ fontWeight: 600 }}>{u.name}</div>
              <div className="faint" style={{ fontSize: 12 }}>{u.email} · último acesso {ago(u.lastSeen, NOW)}</div>
            </div>
            {twoFactor[u.id] ? (
              <span className="badge badge--good"><KeyRound size={12} /> 2FA ativo</span>
            ) : (
              <span className={`badge ${enforce2FA ? "badge--bad" : "badge--warn"}`}>{enforce2FA ? "Bloqueado até ativar 2FA" : "Sem 2FA"}</span>
            )}
            <button className="btn btn--sm" onClick={() => setTwoFactor(u.id, !twoFactor[u.id])}>{twoFactor[u.id] ? "Repor 2FA" : "Pedir ativação"}</button>
          </div>
        ))}
      </div>

      <SectionTitle title="Sessões ativas" />
      <div className="list">
        {sessions.map((x, i) => (
          <div key={i} className="list-item" style={{ alignItems: "center" }}>
            <x.icon size={18} className="faint" />
            <div className="grow">
              <div style={{ fontWeight: 500 }}>{user(x.who).name} · {x.device}</div>
              <div className="faint" style={{ fontSize: 12 }}>{x.where} · {ago(x.at, NOW)}</div>
            </div>
            {x.current ? <span className="badge badge--info">Esta sessão</span> : <button className="btn btn--sm btn--danger">Terminar</button>}
          </div>
        ))}
      </div>
    </>
  );
}

function Gdpr() {
  const { posts, tasks, time, assets, nps, notifications, log } = useStore();
  const [clientId, setClientId] = useState(CLIENTS[0].id);
  const [erased, setErased] = useState<string[]>([]);
  const c = getClient(clientId)!;

  const exportData = () => {
    const co = COMPANIES.find((x) => x.clientId === clientId);
    const data = {
      exportadoEm: new Date().toISOString(),
      cliente: c,
      perfil: PROFILES[clientId],
      empresa: co,
      contactos: CONTACTS.filter((x) => x.companyId === co?.id),
      negocios: DEALS.filter((d) => d.companyId === co?.id),
      publicacoes: posts.filter((p) => p.clientId === clientId),
      tarefas: tasks.filter((t) => t.clientId === clientId),
      registosDeTempo: time.filter((t) => t.clientId === clientId),
      ficheiros: assets.filter((a) => a.clientId === clientId).map(({ src, ...a }) => a),
      mensagens: INBOX.filter((m) => m.clientId === clientId),
      satisfacao: nps.filter((n) => n.clientId === clientId),
      avisos: notifications.filter((n) => n.clientId === clientId),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `dados-${clientId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    log("Exportou dados (RGPD)", c.name);
  };

  const requests = [
    { who: "Rui Andrade", kind: "Acesso aos dados", via: "Comentário no Facebook da Casa Lume", date: new Date(NOW.getTime() - 2 * 864e5), status: "Em curso", due: 28 },
    { who: "Joana Serrão", kind: "Apagamento", via: "Email (ex-cliente Visão Clara)", date: new Date(NOW.getTime() - 20 * 864e5), status: "Concluído", due: 0 },
  ];

  return (
    <>
      <div className="notice notice--info" style={{ marginBottom: 16 }}>
        <ShieldCheck size={16} />
        <span>
          O RGPD dá a clientes e seguidores o direito de pedir uma cópia dos seus dados e de os apagar. A resposta tem de sair em <strong>30 dias</strong>. Aqui fica tudo num sítio, com registo.
        </span>
      </div>

      <div className="grid grid--2" style={{ gap: 24 }}>
        <div>
          <SectionTitle title="Dados de um cliente" />
          <div className="card card__body stack" style={{ gap: 14 }}>
            <label className="field">
              <span>Cliente</span>
              <select className="input" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                {CLIENTS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            </label>
            <dl className="kv">
              <dt>Publicações</dt><dd>{posts.filter((p) => p.clientId === clientId).length}</dd>
              <dt>Tarefas</dt><dd>{tasks.filter((t) => t.clientId === clientId).length}</dd>
              <dt>Ficheiros</dt><dd>{assets.filter((a) => a.clientId === clientId).length}</dd>
              <dt>Mensagens de seguidores</dt><dd>{INBOX.filter((m) => m.clientId === clientId).length}</dd>
              <dt>Registos de tempo</dt><dd>{time.filter((t) => t.clientId === clientId).length}</dd>
            </dl>
            <div className="row" style={{ flexWrap: "wrap" }}>
              <button className="btn" onClick={exportData}><Download size={15} /> Exportar tudo (JSON)</button>
              <button
                className="btn btn--danger"
                disabled={erased.includes(clientId)}
                onClick={() => {
                  if (!confirm(`Anonimizar os dados pessoais de ${c.name}? Os contactos e mensagens ficam sem nome, email e telefone. As faturas são mantidas por obrigação legal.`)) return;
                  setErased((e) => [...e, clientId]);
                  log("Anonimizou dados pessoais (RGPD)", c.name);
                }}
              >
                <UserX size={15} /> {erased.includes(clientId) ? "Anonimizado" : "Anonimizar dados pessoais"}
              </button>
            </div>
            <p className="faint" style={{ fontSize: 12 }}>Faturas e contratos são guardados 10 anos (obrigação fiscal) mesmo depois de um pedido de apagamento.</p>
          </div>
        </div>
        <div>
          <SectionTitle title="Pedidos de titulares de dados" />
          <div className="list">
            {requests.map((r) => (
              <div key={r.who} className="list-item" style={{ alignItems: "center" }}>
                <PersonAvatar name={r.who} size={28} />
                <div className="grow">
                  <div style={{ fontWeight: 600 }}>{r.who} · {r.kind}</div>
                  <div className="faint" style={{ fontSize: 12 }}>{r.via} · {ago(r.date, NOW)}</div>
                </div>
                <span className={`badge ${r.status === "Concluído" ? "badge--good" : "badge--warn"}`}>{r.status}{r.due ? ` · ${r.due} dias` : ""}</span>
              </div>
            ))}
          </div>
          <SectionTitle title="Retenção" />
          <div className="card card__body">
            <dl className="kv">
              <dt>Mensagens da inbox</dt><dd>24 meses</dd>
              <dt>Métricas das redes</dt><dd>Enquanto for cliente + 12 meses</dd>
              <dt>Ficheiros</dt><dd>Até 90 dias após o fim do contrato</dd>
              <dt>Registo de atividade</dt><dd>24 meses</dd>
              <dt>Faturas e contratos</dt><dd>10 anos</dd>
            </dl>
            <p className="faint" style={{ fontSize: 12, marginTop: 10 }}>
              <Trash2 size={12} /> Os dados passam o prazo e são apagados automaticamente todas as noites.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
