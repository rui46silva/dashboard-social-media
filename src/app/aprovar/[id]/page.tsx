"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { client as getClient, network, PROFILES } from "@/lib/data";
import { dayMonth, time, weekday } from "@/lib/format";
import { ClientTile } from "@/components/ui";
import { PreviewSwitcher } from "@/components/social-preview";
import { useStore } from "@/components/store";

/**
 * The page the client lands on from the email / WhatsApp link: see the post as
 * it will look and approve in one tap. No login needed (signed link in production).
 */
export default function QuickApprovePage() {
  const { id } = useParams<{ id: string }>();
  const { posts, clientApprove, clientReject } = useStore();
  const post = posts.find((p) => p.id === id);
  const [changing, setChanging] = useState(false);
  const [text, setText] = useState("");
  const [done, setDone] = useState<"ok" | "changes" | null>(null);
  if (!post) notFound();
  const c = getClient(post.clientId)!;
  const first = PROFILES[c.id]?.contact.name.split(" ")[0];

  return (
    <div className="portal">
      <header className="portal-top">
        <div className="portal-top__inner" style={{ maxWidth: 560 }}>
          <ClientTile clientId={c.id} size={28} />
          <strong className="grow">{c.name}</strong>
        </div>
      </header>
      <main className="portal-main" style={{ maxWidth: 560 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>{first ? `${first}, ` : ""}{post.status === "uat" ? "aprovam esta publicação?" : "obrigado!"}</h1>
        <p className="muted" style={{ marginTop: 4 }}>
          {post.kind} para {post.networks.map((n) => network(n).name).join(" e ")} · sai {weekday(post.date)}, {dayMonth(post.date)} às {time(post.date)}
        </p>
        <div style={{ margin: "18px 0" }}>
          <PreviewSwitcher post={post} />
        </div>

        {done === "ok" || (!done && post.status !== "uat" && post.status !== "todo") ? (
          <div className="notice notice--good" style={{ fontSize: 15 }}><Check size={18} /> Aprovado. Tratamos do resto e publicamos na data indicada.</div>
        ) : done === "changes" || (!done && post.status === "todo") ? (
          <div className="notice" style={{ fontSize: 15 }}><RotateCcw size={18} /> Recebemos o pedido de alterações. Enviamos uma nova versão em breve.</div>
        ) : changing ? (
          <form
            className="stack"
            style={{ gap: 10 }}
            onSubmit={(e) => {
              e.preventDefault();
              if (!text.trim()) return;
              clientReject(post.id, text.trim());
              setDone("changes");
            }}
          >
            <textarea className="input" autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="O que gostavam de mudar?" />
            <div className="row">
              <button className="btn btn--primary btn--lg" type="submit" disabled={!text.trim()}>Enviar pedido</button>
              <button className="btn btn--ghost" type="button" onClick={() => setChanging(false)}>Cancelar</button>
            </div>
          </form>
        ) : (
          <div className="quick-actions">
            <button className="btn btn--good btn--lg" onClick={() => { clientApprove(post.id); setDone("ok"); }}>
              <Check size={18} /> Aprovar
            </button>
            <button className="btn btn--lg" onClick={() => setChanging(true)}>
              <RotateCcw size={16} /> Pedir alterações
            </button>
          </div>
        )}

        <p className="faint" style={{ fontSize: 13, marginTop: 24, textAlign: "center" }}>
          Querem ver tudo o que está planeado e os resultados? <Link className="link" href={`/portal/${c.id}`}>Abrir o vosso portal</Link>
        </p>
      </main>
    </div>
  );
}
