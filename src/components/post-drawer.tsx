"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, ExternalLink, RotateCcw, Send, X } from "lucide-react";
import {
  CLIENTS, NETWORKS, NOW, POST_FLOW, POST_STATUS, POST_STATUS_HINT, client as getClient, user,
  type NetworkId, type Post, type PostStatus,
} from "@/lib/data";
import { ago } from "@/lib/format";
import { Avatar, PersonAvatar, PostStatusLozenge } from "./ui";
import { PreviewSwitcher } from "./social-preview";
import { useSession } from "./session";
import { useStore } from "./store";

const LIMITS: Record<NetworkId, number> = { instagram: 2200, facebook: 63206, tiktok: 2200, linkedin: 3000 };

function toLocalInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function FlowSteps({ status }: { status: PostStatus }) {
  const idx = status === "publicado" ? POST_FLOW.length : POST_FLOW.indexOf(status);
  return (
    <div className="flow" aria-label="Fluxo de aprovação">
      {POST_FLOW.map((s, i) => (
        <span key={s} className="row" style={{ gap: 6 }}>
          <span className={`flow__step ${i === idx ? "flow__step--on" : i < idx ? "flow__step--done" : ""}`}>
            {i < idx && <Check size={12} />}
            {POST_STATUS[s]}
          </span>
          {i < POST_FLOW.length - 1 && <ArrowRight size={12} className="flow__arrow" />}
        </span>
      ))}
    </div>
  );
}

/** Create / review a post. Also where the approval flow is driven from the agency side. */
export function PostDrawer({
  post,
  defaultDate,
  defaultClient,
  onClose,
}: {
  post: Post | null;
  defaultDate?: Date;
  defaultClient?: string | null;
  onClose: () => void;
}) {
  const { can, user: me } = useSession();
  const store = useStore();
  const live = post ? store.posts.find((p) => p.id === post.id) ?? post : null;
  const [clientId, setClientId] = useState(live?.clientId ?? defaultClient ?? CLIENTS[0].id);
  const c = getClient(clientId)!;
  const [networks, setNetworks] = useState<NetworkId[]>(live?.networks ?? [c.networks[0]]);
  const [caption, setCaption] = useState(live?.caption ?? "");
  const [kind, setKind] = useState<Post["kind"]>(live?.kind ?? "Imagem");
  const [when, setWhen] = useState(toLocalInput(live?.date ?? defaultDate ?? NOW));
  const [note, setNote] = useState("");

  const editable = !live || live.status === "todo";
  const minLimit = Math.min(...networks.map((n) => LIMITS[n]));

  const draft = (status: PostStatus): Post => ({
    id: live?.id ?? `p${Date.now()}`,
    clientId,
    networks,
    caption: caption || "Sem legenda",
    kind,
    date: new Date(when),
    status,
    author: live?.author ?? me.id,
    rounds: live?.rounds ?? 0,
    comments: live?.comments ?? [],
  });

  const saveDraft = () => {
    store.savePost(draft(live?.status ?? "todo"));
    onClose();
  };
  const sendToClient = () => {
    const p = draft("todo");
    store.savePost(p);
    store.sendToClient(p.id, me.id);
    onClose();
  };

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label={live ? "Publicação" : "Nova publicação"}>
        <div className="drawer__head">
          <h2>{live ? "Publicação" : "Nova publicação"}</h2>
          {live && <PostStatusLozenge status={live.status} />}
          <button className="icon-btn" onClick={onClose} aria-label="Fechar"><X size={18} /></button>
        </div>
        <div className="drawer__body">
          {live && live.status !== "publicado" && (
            <div className="stack" style={{ gap: 8 }}>
              <FlowSteps status={live.status} />
              <span className="faint" style={{ fontSize: 12 }}>{POST_STATUS_HINT[live.status]}</span>
            </div>
          )}

          {live && live.status === "todo" && live.rounds > 0 && (
            <div className="notice notice--bad">
              <RotateCcw size={16} />
              <span>
                <strong>O cliente pediu alterações</strong> ({live.rounds}.ª ronda). Corrige e volta a enviar para aprovação.
              </span>
            </div>
          )}
          {live && live.status === "confirmar" && (
            <div className="notice notice--good">
              <Check size={16} />
              <span><strong>O cliente aprovou.</strong> Revê legenda, horário e ficheiros finais e confirma para agendar.</span>
            </div>
          )}

          <div className="grid grid--2">
            <label className="field">
              <span>Cliente</span>
              <select
                className="input"
                value={clientId}
                disabled={!editable}
                onChange={(e) => {
                  setClientId(e.target.value);
                  setNetworks([getClient(e.target.value)!.networks[0]]);
                }}
              >
                {CLIENTS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Data e hora</span>
              <input className="input" type="datetime-local" value={when} disabled={live?.status === "publicado"} onChange={(e) => setWhen(e.target.value)} />
            </label>
          </div>

          <div className="field">
            <span>Redes</span>
            <div className="row" style={{ flexWrap: "wrap" }}>
              {NETWORKS.filter((n) => c.networks.includes(n.id)).map((n) => (
                <button
                  key={n.id}
                  className="chip"
                  disabled={!editable}
                  aria-pressed={networks.includes(n.id)}
                  onClick={() =>
                    setNetworks((cur) => (cur.includes(n.id) ? (cur.length > 1 ? cur.filter((x) => x !== n.id) : cur) : [...cur, n.id]))
                  }
                >
                  <span className="net__swatch" style={{ background: `var(--series-${n.slot})` }} />
                  {n.name}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <span>Formato</span>
            <div className="segmented" style={{ flexWrap: "wrap" }}>
              {(["Imagem", "Carrossel", "Reel", "Vídeo", "Story", "Artigo"] as const).map((k) => (
                <button key={k} aria-pressed={kind === k} disabled={!editable} onClick={() => setKind(k)}>{k}</button>
              ))}
            </div>
          </div>

          <label className="field">
            <span className="spread">
              Legenda
              <span className={`num ${caption.length > minLimit ? "delta--down" : "faint"}`} style={{ fontWeight: 500 }}>
                {caption.length} / {minLimit.toLocaleString("pt-PT")}
              </span>
            </span>
            <textarea className="input" value={caption} disabled={!editable} placeholder="Escreve a legenda…" onChange={(e) => setCaption(e.target.value)} />
          </label>

          <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Como vai aparecer</div>
            <div className="preview-phone">
              <PreviewSwitcher post={{ ...draft(live?.status ?? "todo"), caption: caption || "A legenda aparece aqui." }} />
            </div>
          </div>

          {live && (
            <div>
              <div className="eyebrow" style={{ marginBottom: 10 }}>Histórico e feedback</div>
              <div className="stack" style={{ gap: 14 }}>
                <div className="comment">
                  <Avatar userId={live.author} size={26} />
                  <div className="comment__meta" style={{ paddingTop: 4 }}><b>{user(live.author).name}</b> criou a publicação</div>
                </div>
                {live.comments.map((cm, i) => {
                  const approved = cm.kind === "feedback" && /aprov/i.test(cm.text);
                  return (
                    <div key={i} className={`comment ${cm.kind === "feedback" ? "comment--feedback" : ""} ${approved ? "comment--approved" : ""}`}>
                      {cm.by.startsWith("u-") ? <Avatar userId={cm.by} size={26} /> : <PersonAvatar name={cm.name} size={26} />}
                      <div>
                        <div className="comment__meta">
                          <b>{cm.name}</b>
                          {cm.kind === "feedback" && <span className="badge" style={{ height: 18, marginRight: 6 }}>cliente</span>}
                          {ago(cm.date, NOW)}
                        </div>
                        <div className="comment__text">{cm.text}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {live && live.status === "uat" && (
            <div className="notice notice--info">
              <ExternalLink size={16} />
              <span>
                Está com o cliente. Ele aprova ou pede alterações no{" "}
                <Link href={`/portal/${live.clientId}`} className="link">portal</Link>. Se precisares, podes registar aqui a resposta que chegou por outro canal.
              </span>
            </div>
          )}
          {live && live.status === "uat" && (
            <label className="field">
              <span>Resposta do cliente (opcional)</span>
              <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: «Aprovado por telefone»" />
            </label>
          )}
        </div>

        <div className="drawer__foot">
          {(!live || live.status === "todo") && can("publicar") && (
            <>
              <button className="btn btn--ghost" onClick={saveDraft}>Guardar</button>
              <button className="btn btn--primary" onClick={sendToClient}>
                <Send size={14} /> Enviar ao cliente
              </button>
            </>
          )}
          {live?.status === "uat" && can("publicar") && (
            <>
              <button
                className="btn btn--danger"
                onClick={() => {
                  store.clientReject(live.id, note.trim() || "Pedido de alterações (registado pela agência).");
                  onClose();
                }}
              >
                <RotateCcw size={14} /> Cliente pediu alterações
              </button>
              <button
                className="btn btn--good"
                onClick={() => {
                  store.clientApprove(live.id, note.trim() || "Aprovado (registado pela agência).");
                  onClose();
                }}
              >
                <Check size={14} /> Cliente aprovou
              </button>
            </>
          )}
          {live?.status === "confirmar" && (
            <>
              <button className="btn btn--ghost" onClick={() => { store.reopenPost(live.id, me.id); onClose(); }}>
                Voltar a produção
              </button>
              <button
                className="btn btn--primary"
                disabled={!can("aprovar")}
                title={can("aprovar") ? undefined : "O teu papel não pode confirmar"}
                onClick={() => {
                  store.savePost({ ...draft("confirmar") });
                  store.confirmPost(live.id, me.id);
                  onClose();
                }}
              >
                <Check size={14} /> Confirmar e agendar
              </button>
            </>
          )}
          {live?.status === "agendado" && can("aprovar") && (
            <button className="btn" onClick={() => { store.reopenPost(live.id, me.id); onClose(); }}>
              <RotateCcw size={14} /> Tirar do agendamento
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
