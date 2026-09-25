"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Bookmark, Globe2, Heart, Images, MessageCircle, MoreHorizontal, Music2, Play, Plus, Repeat2, Send, Share2, ThumbsUp, X,
} from "lucide-react";
import {
  NOW, PROFILES, SOCIAL, client as getClient, network, topPosts, type NetworkId, type Post,
} from "@/lib/data";
import { compact, dayMonth, time } from "@/lib/format";
import { PostThumb } from "./ui";

/** Full caption as it would be published: text + the brand's hashtags. */
export function fullCaption(post: Pick<Post, "caption" | "clientId">) {
  const tags = PROFILES[post.clientId]?.hashtags ?? "";
  return `${post.caption}${tags ? `\n\n${tags}` : ""}`;
}

const handleFor = (clientId: string, n: NetworkId) => {
  const h = PROFILES[clientId]?.handles[n];
  const name = getClient(clientId)!.name;
  if (h) return h.replace(/^@/, "");
  return n === "instagram" || n === "tiktok" ? name.toLowerCase().replace(/[^a-z0-9]+/g, "") : name;
};

const when = (p: Pick<Post, "date" | "status">) =>
  p.date <= NOW ? dayMonth(p.date) : `${p.status === "agendado" ? "Agendado" : "Previsto"} · ${dayMonth(p.date)} às ${time(p.date)}`;

function Caption({ text, limit, handle }: { text: string; limit: number; handle?: string }) {
  const [open, setOpen] = useState(false);
  const short = text.length > limit && !open;
  const shown = short ? text.slice(0, limit).trimEnd() : text;
  return (
    <p className="sp-caption">
      {handle && <b>{handle} </b>}
      {shown.split(/(\s#[\p{L}\d_]+)/u).map((part, i) =>
        part.trim().startsWith("#") ? <span key={i} className="sp-tag">{part}</span> : <span key={i}>{part}</span>,
      )}
      {short && (
        <button className="sp-more" onClick={() => setOpen(true)}>
          … mais
        </button>
      )}
    </p>
  );
}

function Avatar({ clientId, size = 32, ring }: { clientId: string; size?: number; ring?: boolean }) {
  const c = getClient(clientId)!;
  return (
    <span className={`sp-avatar ${ring ? "sp-avatar--ring" : ""}`} style={{ width: size, height: size }}>
      <span style={{ background: `oklch(0.5 0.09 ${c.hue})`, fontSize: size * 0.42 }}>{c.name[0]}</span>
    </span>
  );
}

function InstagramPost({ post }: { post: Post }) {
  const h = handleFor(post.clientId, "instagram");
  const vertical = post.kind === "Reel" || post.kind === "Vídeo" || post.kind === "Story";
  return (
    <article className="sp sp--ig">
      <header className="sp-head">
        <Avatar clientId={post.clientId} ring />
        <div className="grow">
          <b>{h}</b>
          {post.kind === "Reel" && <div className="sp-sub">Áudio original</div>}
        </div>
        <MoreHorizontal size={18} />
      </header>
      <div className="sp-media" style={{ aspectRatio: vertical ? "9 / 16" : "4 / 5" }}>
        <PostThumb post={post} className="sp-fill" label={false} />
        {post.kind === "Carrossel" && <span className="sp-count">1/5</span>}
        {vertical && <Play className="sp-play" size={36} fill="currentColor" />}
      </div>
      {post.kind === "Carrossel" && (
        <div className="sp-dots">
          {[0, 1, 2, 3, 4].map((i) => <i key={i} className={i === 0 ? "on" : ""} />)}
        </div>
      )}
      <div className="sp-actions">
        <Heart size={22} />
        <MessageCircle size={22} />
        <Send size={22} />
        <Bookmark size={22} style={{ marginLeft: "auto" }} />
      </div>
      <div className="sp-body">
        <Caption text={fullCaption(post)} limit={120} handle={h} />
        <div className="sp-time">{when(post)}</div>
      </div>
    </article>
  );
}

function FacebookPost({ post }: { post: Post }) {
  const name = getClient(post.clientId)!.name;
  return (
    <article className="sp sp--fb">
      <header className="sp-head">
        <Avatar clientId={post.clientId} size={38} />
        <div className="grow">
          <b>{name}</b>
          <div className="sp-sub row" style={{ gap: 4 }}>{when(post)} · <Globe2 size={11} /></div>
        </div>
        <MoreHorizontal size={18} />
      </header>
      <div className="sp-body" style={{ paddingTop: 0 }}>
        <Caption text={fullCaption(post)} limit={220} />
      </div>
      <div className="sp-media" style={{ aspectRatio: "1 / 1" }}>
        <PostThumb post={post} className="sp-fill" label={false} />
        {(post.kind === "Reel" || post.kind === "Vídeo") && <Play className="sp-play" size={40} fill="currentColor" />}
      </div>
      <div className="sp-bar">
        <span className="row" style={{ gap: 4 }}><span className="sp-react">👍</span><span className="sp-react">❤️</span></span>
        <span>0 comentários</span>
      </div>
      <div className="sp-fb-actions">
        <span><ThumbsUp size={17} /> Gosto</span>
        <span><MessageCircle size={17} /> Comentar</span>
        <span><Share2 size={17} /> Partilhar</span>
      </div>
    </article>
  );
}

function TikTokPost({ post }: { post: Post }) {
  const h = handleFor(post.clientId, "tiktok");
  return (
    <article className="sp sp--tt">
      <div className="sp-tt-frame">
        <PostThumb post={post} className="sp-fill" label={false} />
        <div className="sp-tt-top">Seguindo · <b>Para ti</b></div>
        <div className="sp-tt-side">
          <span className="sp-tt-av"><Avatar clientId={post.clientId} size={40} /><i><Plus size={10} strokeWidth={3} /></i></span>
          <span><Heart size={26} fill="currentColor" />0</span>
          <span><MessageCircle size={26} fill="currentColor" />0</span>
          <span><Bookmark size={26} fill="currentColor" />0</span>
          <span><Share2 size={26} />0</span>
        </div>
        <div className="sp-tt-bottom">
          <b>@{h}</b>
          <Caption text={fullCaption(post)} limit={80} />
          <div className="row" style={{ gap: 6, fontSize: 12 }}><Music2 size={12} /> som original · {h}</div>
        </div>
      </div>
      <div className="sp-time" style={{ padding: "8px 2px 0" }}>{when(post)}</div>
    </article>
  );
}

function LinkedInPost({ post }: { post: Post }) {
  const name = getClient(post.clientId)!.name;
  const followers = SOCIAL[post.clientId]?.find((s) => s.network === "linkedin")?.followers ?? 0;
  return (
    <article className="sp sp--in">
      <header className="sp-head">
        <Avatar clientId={post.clientId} size={42} />
        <div className="grow">
          <b>{name}</b>
          <div className="sp-sub">{compact(followers)} seguidores</div>
          <div className="sp-sub row" style={{ gap: 4 }}>{when(post)} · <Globe2 size={11} /></div>
        </div>
        <MoreHorizontal size={18} />
      </header>
      <div className="sp-body" style={{ paddingTop: 0 }}>
        <Caption text={fullCaption(post)} limit={180} />
      </div>
      <div className="sp-media" style={{ aspectRatio: "1.91 / 1" }}>
        <PostThumb post={post} className="sp-fill" label={false} />
      </div>
      <div className="sp-fb-actions">
        <span><ThumbsUp size={16} /> Gosto</span>
        <span><MessageCircle size={16} /> Comentar</span>
        <span><Repeat2 size={16} /> Partilhar</span>
        <span><Send size={16} /> Enviar</span>
      </div>
    </article>
  );
}

export function SocialPreview({ post, network: n }: { post: Post; network: NetworkId }) {
  if (n === "facebook") return <FacebookPost post={post} />;
  if (n === "tiktok") return <TikTokPost post={post} />;
  if (n === "linkedin") return <LinkedInPost post={post} />;
  return <InstagramPost post={post} />;
}

/** Network toggle + preview. */
export function PreviewSwitcher({ post }: { post: Post }) {
  const [n, setN] = useState<NetworkId>(post.networks[0]);
  useEffect(() => setN(post.networks[0]), [post.id, post.networks]);
  return (
    <div className="stack" style={{ gap: 12 }}>
      {post.networks.length > 1 && (
        <div className="segmented" role="group" aria-label="Ver como fica em" style={{ justifySelf: "center" }}>
          {post.networks.map((x) => (
            <button key={x} aria-pressed={n === x} onClick={() => setN(x)} className="row" style={{ gap: 6 }}>
              <span className="net__swatch" style={{ background: `var(--series-${network(x).slot})` }} />
              {network(x).name}
            </button>
          ))}
        </div>
      )}
      <div className="sp-phone">
        <SocialPreview post={post} network={post.networks.includes(n) ? n : post.networks[0]} />
      </div>
    </div>
  );
}

/** Centered dialog with the network preview on one side and details/actions on the other. */
export function PostPreviewModal({ post, onClose, children }: { post: Post; onClose: () => void; children?: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sp-modal" role="dialog" aria-label={`Pré-visualização: ${post.caption}`}>
        <button className="icon-btn sp-modal__close" onClick={onClose} aria-label="Fechar"><X size={18} /></button>
        <div className="sp-modal__preview">
          <PreviewSwitcher post={post} />
        </div>
        {children && <div className="sp-modal__side">{children}</div>}
      </div>
    </>
  );
}

/* ------------------------------------------------------------ feed preview */

type FeedItem = { id: string; post: Post; state: "approve" | "scheduled" | "live" };

/**
 * The client's profile grid with upcoming posts slotted in at the top, the way
 * a feed planner shows it — so they see how the new content sits with the old.
 */
export function FeedPreview({ clientId, posts, onOpen }: { clientId: string; posts: Post[]; onOpen: (p: Post) => void }) {
  const c = getClient(clientId)!;
  const grids = c.networks.filter((n) => n === "instagram" || n === "tiktok");
  const [n, setN] = useState<NetworkId>(grids[0] ?? c.networks[0]);
  const stats = SOCIAL[clientId]?.find((s) => s.network === n);
  const profile = PROFILES[clientId];

  const upcoming: FeedItem[] = posts
    .filter((p) => p.clientId === clientId && p.networks.includes(n) && p.date > NOW && ["uat", "confirmar", "agendado"].includes(p.status))
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .map((p) => ({ id: p.id, post: p, state: p.status === "agendado" ? "scheduled" : "approve" }));
  const published: FeedItem[] = [
    ...posts.filter((p) => p.clientId === clientId && p.networks.includes(n) && p.status === "publicado"),
    ...topPosts(clientId).map((t): Post => ({
      id: t.id, clientId, networks: [n], date: t.date, kind: t.kind as Post["kind"], caption: t.caption,
      status: "publicado", author: "u-ines", rounds: 0, comments: [],
    })).filter((_, i) => i < 6),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .map((p) => ({ id: p.id, post: p, state: "live" as const }));
  const items = [...upcoming, ...published];

  if (!grids.length) return <div className="card empty">A pré-visualização do feed está disponível para Instagram e TikTok.</div>;

  return (
    <div className="feed">
      {grids.length > 1 && (
        <div className="segmented" role="group" aria-label="Rede" style={{ marginBottom: 12 }}>
          {grids.map((x) => (
            <button key={x} aria-pressed={n === x} onClick={() => setN(x)}>{network(x).name}</button>
          ))}
        </div>
      )}
      <div className="feed__phone">
        <div className="feed__profile">
          <Avatar clientId={clientId} size={64} ring={n === "instagram"} />
          <div className="grow">
            <b>{n === "tiktok" ? "@" : ""}{handleFor(clientId, n)}</b>
            <div className="feed__stats">
              <span><b>{(stats?.posts ?? 0) * 9}</b> publicações</span>
              <span><b>{compact(stats?.followers ?? 0)}</b> seguidores</span>
              <span><b>{n === "tiktok" ? compact((stats?.followers ?? 0) * 11) : "312"}</b> {n === "tiktok" ? "gostos" : "a seguir"}</span>
            </div>
          </div>
        </div>
        {profile?.description && <p className="feed__bio"><b>{c.name}</b><br />{profile.description.split(".")[0]}.</p>}
        <div className={`feed__grid ${n === "tiktok" ? "feed__grid--tt" : ""}`}>
          {items.map((it) => (
            <button key={it.id} className={`feed__cell feed__cell--${it.state}`} onClick={() => onOpen(it.post)} title={it.post.caption}>
              <PostThumb post={it.post} className="sp-fill" label={false} />
              {it.post.kind === "Carrossel" && <Images className="feed__icon" size={16} />}
              {(it.post.kind === "Reel" || it.post.kind === "Vídeo") && <Play className="feed__icon" size={16} fill="currentColor" />}
              {it.state !== "live" && (
                <span className={`feed__badge feed__badge--${it.state}`}>
                  {it.state === "approve" ? "Por aprovar" : dayMonth(it.post.date)}
                </span>
              )}
              {n === "tiktok" && it.state === "live" && <span className="feed__views"><Play size={11} /> {compact(1200 + (it.id.length * 7919) % 40000)}</span>}
            </button>
          ))}
        </div>
      </div>
      <div className="legend" style={{ marginTop: 10 }}>
        <span><i style={{ background: "var(--warn)", height: 8, width: 8, borderRadius: 2 }} /> por aprovar</span>
        <span><i style={{ background: "var(--good-strong)", height: 8, width: 8, borderRadius: 2 }} /> agendado</span>
        <span className="faint">o resto já está publicado</span>
      </div>
    </div>
  );
}
