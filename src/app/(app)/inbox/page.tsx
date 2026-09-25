"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCheck, ListPlus, MessageCircle, Send, AtSign, MessageSquare, UserRound } from "lucide-react";
import { CLIENTS, INBOX, NOW, USERS, client as getClient, network, type InboxItem } from "@/lib/data";
import { ago, time } from "@/lib/format";
import { Avatar, ClientTile, NetIcon, PageHead, PersonAvatar } from "@/components/ui";
import { useSession } from "@/components/session";

const SAVED_REPLIES = [
  "Olá! Obrigado pela mensagem. Vamos verificar e respondemos já por mensagem privada.",
  "Muito obrigado pelas palavras! 🙌",
  "Olá! Podes enviar-nos os detalhes por email? Assim tratamos mais depressa.",
];

const KIND_ICON = { comentário: MessageCircle, mensagem: MessageSquare, menção: AtSign };
type Filter = "todas" | "por ler" | "negativas";
type Scope = "minhas" | "equipa";

export default function InboxPage() {
  return (
    <Suspense>
      <Inbox />
    </Suspense>
  );
}

function Inbox() {
  const params = useSearchParams();
  const { user: me, viewAs } = useSession();
  const supervisor = viewAs === "ceo";
  const [scope, setScope] = useState<Scope>("minhas");
  const [items, setItems] = useState<InboxItem[]>(INBOX);
  const [filter, setFilter] = useState<Filter>("todas");
  const [clientId, setClientId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [assignee, setAssignee] = useState<Record<string, string>>({});
  const [resolved, setResolved] = useState<string[]>([]);

  useEffect(() => {
    const m = params.get("m");
    if (m) setSelected(m);
  }, [params]);

  // Each client's comments and DMs go to one person (set on the client page);
  // a message can also be handed over to someone else.
  const ownerOf = (m: InboxItem) => assignee[m.id] || getClient(m.clientId)!.inboxOwner;
  const myClients = CLIENTS.filter((c) => c.inboxOwner === me.id);
  const inScope = (m: InboxItem) => (scope === "equipa" && supervisor) || ownerOf(m) === me.id;

  const list = useMemo(
    () =>
      items.filter(
        (m) =>
          inScope(m) &&
          !resolved.includes(m.id) &&
          (!clientId || m.clientId === clientId) &&
          (filter === "todas" || (filter === "por ler" ? m.unread : m.sentiment === "negativo")),
      ),
    [items, filter, clientId, resolved, scope, assignee, me.id, supervisor],
  );

  const current = items.find((m) => m.id === selected);

  const open = (id: string) => {
    setSelected(id);
    setDraft("");
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, unread: false } : x)));
  };

  const send = () => {
    if (!current || !draft.trim()) return;
    setItems((xs) =>
      xs.map((x) =>
        x.id === current.id
          ? { ...x, thread: [...(x.thread ?? [{ from: "them" as const, text: x.text, date: x.date }]), { from: "us" as const, text: draft, date: NOW }] }
          : x,
      ),
    );
    setDraft("");
  };

  const unreadCount = items.filter((m) => inScope(m) && m.unread && !resolved.includes(m.id)).length;

  return (
    <>
      <PageHead
        title="Inbox"
        lede={
          scope === "equipa" && supervisor
            ? "Todas as conversas da agência, com o responsável de cada uma."
            : myClients.length
              ? <>Recebes os comentários e mensagens de <strong>{myClients.map((c) => c.name).join(", ")}</strong>. O responsável muda-se na página de cada cliente.</>
              : "Ainda não tens clientes atribuídos para responder."
        }
        actions={
          supervisor && (
            <div className="segmented" role="group" aria-label="Âmbito">
              <button aria-pressed={scope === "minhas"} onClick={() => setScope("minhas")}>As minhas</button>
              <button aria-pressed={scope === "equipa"} onClick={() => setScope("equipa")}>Toda a equipa</button>
            </div>
          )
        }
      />

      <div className="inbox">
        <div className={current ? "inbox__list hide-when-detail" : "inbox__list"}>
          <div className="filters">
            {(["todas", "por ler", "negativas"] as Filter[]).map((f) => (
              <button key={f} className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)} >
                {f[0].toUpperCase() + f.slice(1)}
                {f === "por ler" && <span className="num" style={{ opacity: 0.6 }}>{unreadCount}</span>}
              </button>
            ))}
            <select
              className="input"
              style={{ width: "auto", height: 30, borderRadius: 999 }}
              value={clientId ?? ""}
              onChange={(e) => setClientId(e.target.value || null)}
              aria-label="Filtrar por cliente"
            >
              <option value="">Todos os clientes</option>
              {(scope === "equipa" && supervisor ? CLIENTS : myClients).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="list">
            {list.map((m) => {
              const Icon = KIND_ICON[m.kind];
              return (
                <button
                  key={m.id}
                  className={`list-item msg ${m.unread ? "msg--unread" : ""}`}
                  aria-current={selected === m.id}
                  onClick={() => open(m.id)}
                >
                  <div style={{ position: "relative" }}>
                    <PersonAvatar name={m.author} size={34} />
                    <span style={{ position: "absolute", right: -4, bottom: -4 }}><NetIcon id={m.network} size={16} /></span>
                  </div>
                  <div className="grow">
                    <div className="spread">
                      <span className="truncate" style={{ fontWeight: m.unread ? 700 : 550 }}>{m.author}</span>
                      <span className="faint num" style={{ fontSize: 12, whiteSpace: "nowrap" }}>{ago(m.date, NOW)}</span>
                    </div>
                    <div className="muted" style={{ fontSize: 13, marginTop: 2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {m.text}
                    </div>
                    <div className="row faint" style={{ fontSize: 12, marginTop: 6 }}>
                      <Icon size={13} /> {m.kind} · <ClientTile clientId={m.clientId} size={14} /> {getClient(m.clientId)!.name}
                      {m.sentiment === "negativo" && <span className="badge badge--bad" style={{ height: 18, marginLeft: "auto" }}>negativo</span>}
                      {scope === "equipa" && supervisor && (
                        <span style={{ marginLeft: m.sentiment === "negativo" ? 0 : "auto" }}><Avatar userId={ownerOf(m)} size={18} /></span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
            {!list.length && <div className="empty">{myClients.length || scope === "equipa" ? "Inbox limpa. Bom trabalho." : "Nada para ti — não és responsável pela inbox de nenhum cliente."}</div>}
          </div>
        </div>

        <div className={`inbox__detail ${current ? "" : "hide-sm-empty"}`}>
          {!current ? (
            <div className="card empty">Escolhe uma conversa à esquerda.</div>
          ) : (
            <div className="card">
              <div className="card__head" style={{ paddingBottom: 12, borderBottom: "1px solid var(--line)" }}>
                <div className="row" style={{ gap: 10, minWidth: 0 }}>
                  <button className="icon-btn back-btn" onClick={() => setSelected(null)} aria-label="Voltar"><ArrowLeft size={18} /></button>
                  <PersonAvatar name={current.author} size={34} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 650 }} className="truncate">{current.author}</div>
                    <div className="faint truncate" style={{ fontSize: 12 }}>
                      {current.handle} · {network(current.network).name} · {getClient(current.clientId)!.name}
                    </div>
                  </div>
                </div>
                <button
                  className="btn btn--sm"
                  onClick={() => {
                    setResolved((r) => [...r, current.id]);
                    setSelected(null);
                  }}
                >
                  <CheckCheck size={14} /> Resolver
                </button>
              </div>

              <div className="card__body stack" style={{ gap: 12 }}>
                {current.context && (
                  <div className="quote">
                    Comentário em <strong>«{current.context}»</strong>
                  </div>
                )}
                {(current.thread ?? [{ from: "them" as const, text: current.text, date: current.date }]).map((t, i) => (
                  <div key={i} className="stack" style={{ gap: 2 }}>
                    <div className={`bubble ${t.from === "us" ? "bubble--us" : ""}`}>{t.text}</div>
                    <span className="faint num" style={{ fontSize: 11, textAlign: t.from === "us" ? "right" : "left" }}>{time(t.date)}</span>
                  </div>
                ))}

                <div className="divider" style={{ margin: "4px 0" }} />
                <div className="eyebrow">Respostas rápidas</div>
                <div className="stack" style={{ gap: 6 }}>
                  {SAVED_REPLIES.map((r) => (
                    <button key={r} className="suggestion" onClick={() => setDraft(r)}>{r}</button>
                  ))}
                </div>
                <label className="field">
                  <span className="sr-only">Resposta</span>
                  <textarea
                    className="input"
                    style={{ minHeight: 80 }}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={`Responder como ${getClient(current.clientId)!.name}…`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
                    }}
                  />
                </label>
                <div className="spread" style={{ flexWrap: "wrap" }}>
                  <div className="row">
                    <UserRound size={15} className="faint" />
                    <select
                      className="input"
                      style={{ width: "auto", height: 30 }}
                      value={ownerOf(current)}
                      onChange={(e) => setAssignee((a) => ({ ...a, [current.id]: e.target.value }))}
                      aria-label="Responsável por esta conversa"
                      title="Passar esta conversa a outra pessoa"
                    >
                      {USERS.filter((u) => u.role !== "cliente").map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}{u.id === getClient(current.clientId)!.inboxOwner ? " (responsável do cliente)" : ""}
                        </option>
                      ))}
                    </select>
                    <button className="btn btn--sm btn--ghost" title="Criar tarefa a partir desta conversa">
                      <ListPlus size={14} /> Tarefa
                    </button>
                  </div>
                  <button className="btn btn--primary" onClick={send} disabled={!draft.trim()}>
                    <Send size={14} /> Enviar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
