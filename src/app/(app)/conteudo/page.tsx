"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Bell, Check, ExternalLink, Plus, RotateCcw, Send } from "lucide-react";
import { CLIENTS, NOW, POST_FLOW, POST_STATUS, POST_STATUS_HINT, client as getClient, type Post, type PostStatus } from "@/lib/data";
import { dayMonth, time } from "@/lib/format";
import { Avatar, ClientTile, Kpi, NetIcon, PageHead, PostThumb } from "@/components/ui";
import { FlowSteps, PostDrawer } from "@/components/post-drawer";
import { useStore } from "@/components/store";
import { useSession } from "@/components/session";

export default function ContentPage() {
  const { posts, sendToClient, confirmPost } = useStore();
  const { can, user: me } = useSession();
  const [clientId, setClientId] = useState<string | null>(null);
  const [open, setOpen] = useState<Post | "new" | null>(null);
  const [nudged, setNudged] = useState<string[]>([]);

  const active = useMemo(
    () => posts.filter((p) => p.status !== "publicado" && (!clientId || p.clientId === clientId)).sort((a, b) => a.date.getTime() - b.date.getTime()),
    [posts, clientId],
  );

  const withClient = active.filter((p) => p.status === "uat");
  const soon = withClient.filter((p) => p.date.getTime() - NOW.getTime() < 3 * 864e5);
  const reviewed = posts.filter((p) => p.status !== "todo" || p.rounds > 0);
  const firstTime = reviewed.filter((p) => p.rounds === 0 && ["confirmar", "agendado", "publicado"].includes(p.status));
  const ftr = reviewed.length ? Math.round((firstTime.length / reviewed.length) * 100) : 0;

  const lastFeedback = (p: Post) => [...p.comments].reverse().find((c) => c.kind === "feedback");

  return (
    <>
      <PageHead
        title="Aprovações de conteúdo"
        lede="Cada post e Reel passa pelo cliente antes de ser agendado. Se o cliente pedir alterações, volta para produção com o feedback agarrado."
        actions={
          can("publicar") && (
            <button className="btn btn--primary" onClick={() => setOpen("new")}>
              <Plus size={15} /> Nova publicação
            </button>
          )
        }
      />

      <div className="card card__body" style={{ marginBottom: 16 }}>
        <FlowSteps status="todo" />
        <div className="faint" style={{ fontSize: 12, marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
          <RotateCcw size={12} /> Se o cliente não aprovar, o post volta para «{POST_STATUS.todo}» e é criada uma tarefa com as alterações pedidas.
        </div>
      </div>

      <div className="kpis" style={{ marginBottom: 20 }}>
        <Kpi label="Com o cliente" value={withClient.length} foot={soon.length ? <span className="due--late">{soon.length} saem em menos de 3 dias</span> : "nada urgente"} />
        <Kpi label="Por confirmar" value={active.filter((p) => p.status === "confirmar").length} foot="aprovados pelo cliente" />
        <Kpi label="Aprovados à primeira" value={`${ftr}%`} foot="sem pedidos de alterações" />
        <Kpi label="Agendados" value={active.filter((p) => p.status === "agendado").length} foot="prontos a sair" />
      </div>

      <div className="filters">
        <button className="chip" aria-pressed={!clientId} onClick={() => setClientId(null)}>Todos os clientes</button>
        {CLIENTS.map((c) => (
          <button key={c.id} className="chip" aria-pressed={clientId === c.id} onClick={() => setClientId(clientId === c.id ? null : c.id)}>
            <ClientTile clientId={c.id} size={16} />
            {c.name}
          </button>
        ))}
      </div>

      <div className="board">
        {POST_FLOW.map((status: PostStatus) => {
          const col = active.filter((p) => p.status === status);
          return (
            <section key={status} className="column">
              <div className="column__head">
                <h3>{POST_STATUS[status]}</h3>
                <span className="faint" style={{ fontSize: 13 }}>{col.length}</span>
              </div>
              <div className="column__hint">{POST_STATUS_HINT[status]}</div>
              {col.map((p) => {
                const fb = lastFeedback(p);
                const urgent = p.status === "uat" && p.date.getTime() - NOW.getTime() < 3 * 864e5;
                return (
                  <div key={p.id} className="ticket" style={{ cursor: "pointer" }} onClick={() => setOpen(p)}>
                    <PostThumb post={p} className="ticket__thumb" />
                    <div className="row faint" style={{ fontSize: 12 }}>
                      <ClientTile clientId={p.clientId} size={16} />
                      <span className="truncate grow">{getClient(p.clientId)!.name}</span>
                      {p.networks.map((n) => <NetIcon key={n} id={n} size={16} />)}
                    </div>
                    <div className="ticket__title" style={{ marginTop: 6 }}>{p.caption}</div>

                    {p.status === "todo" && p.rounds > 0 && fb && (
                      <div className="comment comment--feedback" style={{ marginTop: 10, gridTemplateColumns: "1fr" }}>
                        <div className="comment__text" style={{ fontSize: 12, borderRadius: 8 }}>
                          <b>{fb.name.split(" ")[0]}:</b> {fb.text}
                        </div>
                      </div>
                    )}

                    <div className="ticket__meta">
                      <Avatar userId={p.author} size={20} />
                      <span className={urgent ? "due--late" : ""}>
                        {dayMonth(p.date)} · {time(p.date)}
                      </span>
                      {p.rounds > 0 && (
                        <span className="round-badge" style={{ marginLeft: "auto" }} title="Rondas de alterações">
                          <RotateCcw size={12} /> {p.rounds + 1}.ª versão
                        </span>
                      )}
                    </div>

                    <div className="row" style={{ marginTop: 10, flexWrap: "wrap" }} onClick={(e) => e.stopPropagation()}>
                      {p.status === "todo" && can("publicar") && (
                        <button className="btn btn--sm" onClick={() => sendToClient(p.id, me.id)}>
                          <Send size={13} /> Enviar ao cliente
                        </button>
                      )}
                      {p.status === "uat" && (
                        <>
                          <button
                            className="btn btn--sm"
                            disabled={nudged.includes(p.id)}
                            onClick={() => setNudged((n) => [...n, p.id])}
                          >
                            <Bell size={13} /> {nudged.includes(p.id) ? "Lembrete enviado" : "Lembrar cliente"}
                          </button>
                          <Link className="btn btn--sm btn--ghost" href={`/portal/${p.clientId}`}>
                            <ExternalLink size={13} /> Portal
                          </Link>
                        </>
                      )}
                      {p.status === "confirmar" && can("aprovar") && (
                        <button className="btn btn--sm btn--primary" onClick={() => confirmPost(p.id, me.id)}>
                          <Check size={13} /> Confirmar e agendar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {!col.length && <div className="empty" style={{ padding: 20 }}>Nada aqui.</div>}
            </section>
          );
        })}
      </div>

      {open && <PostDrawer post={open === "new" ? null : open} defaultClient={clientId} onClose={() => setOpen(null)} />}
    </>
  );
}
