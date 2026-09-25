import { ArrowDownRight, ArrowUpRight, Check, FileText, Film, Images, Image as ImageIcon, Minus, Smartphone } from "lucide-react";
import type { ReactNode } from "react";
import { CountUp } from "./count-up";
import { ASSET_SRC, NOW, POST_STATUS, client as getClient, network, user as getUser, type NetworkId, type Post, type PostStatus } from "@/lib/data";
import { dayMonth, initials, sameDay, signedPct } from "@/lib/format";

export function PageHead({
  eyebrow,
  title,
  lede,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lede?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="page-head">
      <div>
        {eyebrow && <div className="eyebrow" style={{ marginBottom: 8 }}>{eyebrow}</div>}
        <h1>{title}</h1>
        {lede && <p>{lede}</p>}
      </div>
      {actions && <div className="page-head__actions">{actions}</div>}
    </header>
  );
}

export function SectionTitle({ title, action }: { title: ReactNode; action?: ReactNode }) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      {action}
    </div>
  );
}

/** Change indicator. Colour is backed by an arrow and sign, never colour alone. */
export function Delta({ value, suffix = "%", invert = false }: { value: number; suffix?: string; invert?: boolean }) {
  const good = invert ? value < 0 : value > 0;
  const flat = Math.abs(value) < 0.05;
  const cls = flat ? "delta--flat" : good ? "delta--up" : "delta--down";
  const Icon = flat ? Minus : value > 0 ? ArrowUpRight : ArrowDownRight;
  const text = suffix === "%" ? signedPct(value) : `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toLocaleString("pt-PT", { maximumFractionDigits: 1 })}${suffix}`;
  return (
    <span className={`delta ${cls}`}>
      <Icon size={13} strokeWidth={2.4} aria-hidden />
      {text}
    </span>
  );
}

export function Kpi({ label, value, foot }: { label: ReactNode; value: ReactNode; foot?: ReactNode }) {
  return (
    <div className="kpi">
      <div className="kpi__label">{label}</div>
      <div className="kpi__value">{typeof value === "string" || typeof value === "number" ? <CountUp value={String(value)} /> : value}</div>
      {foot && <div className="kpi__foot">{foot}</div>}
    </div>
  );
}

/** Stable, readable avatar colour per name (white initials pass AA on all of these). */
const AVATAR_COLORS = ["#c2508f", "#4573d2", "#2e7d5b", "#b35c1e", "#7a5bc4", "#1f7a8c", "#a8466b", "#5a6b2a"];
export function avatarColor(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function Avatar({ userId, size = 26 }: { userId: string; size?: number }) {
  const u = getUser(userId);
  return (
    <span className="avatar" style={{ ["--size" as string]: `${size}px`, ["--av" as string]: avatarColor(u.name) }} title={u.name}>
      {initials(u.name)}
    </span>
  );
}

export function PersonAvatar({ name, size = 26 }: { name: string; size?: number }) {
  const clean = name.replace(/^@/, "");
  return (
    <span className="avatar" style={{ ["--size" as string]: `${size}px`, ["--av" as string]: avatarColor(clean) }}>
      {initials(clean)}
    </span>
  );
}

export function ClientTile({ clientId, size = 22 }: { clientId: string; size?: number }) {
  const c = getClient(clientId)!;
  return (
    <span
      className="client-tile"
      style={{ ["--size" as string]: `${size}px`, background: `oklch(0.52 0.09 ${c.hue})` }}
      aria-hidden
    >
      {c.name[0]}
    </span>
  );
}

/** Networks carry the categorical slot colour plus a text abbreviation. */
export function NetIcon({ id, size = 20 }: { id: NetworkId; size?: number }) {
  const n = network(id);
  return (
    <span
      className="net-icon"
      style={{ width: size, height: size, background: `var(--series-${n.slot})`, fontSize: size * 0.45 }}
      title={n.name}
      aria-label={n.name}
    >
      {n.short}
    </span>
  );
}

export function Net({ id }: { id: NetworkId }) {
  const n = network(id);
  return (
    <span className="net">
      <span className="net__swatch" style={{ background: `var(--series-${n.slot})` }} />
      {n.name}
    </span>
  );
}

const STATUS_LOZENGE: Record<PostStatus, string> = {
  todo: "",
  uat: "lozenge--warn",
  confirmar: "lozenge--info",
  agendado: "lozenge--good",
  publicado: "lozenge--violet",
};

export function PostStatusLozenge({ status }: { status: PostStatus }) {
  return <span className={`lozenge ${STATUS_LOZENGE[status]}`}>{POST_STATUS[status]}</span>;
}

/** Asana-style completion circle. */
export function CheckCircle({ checked, onToggle, label, large }: { checked: boolean; onToggle: () => void; label: string; large?: boolean }) {
  return (
    <button
      className={`check ${large ? "check--lg" : ""}`}
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
    >
      <Check strokeWidth={3} />
    </button>
  );
}

/** Due date coloured like a task manager: late red, today green, next 2 days amber. */
export function Due({ date, done }: { date: Date | null; done?: boolean }) {
  if (!date) return <span className="faint">—</span>;
  const tomorrow = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() + 1);
  const startToday = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate());
  const late = date < startToday;
  const today = sameDay(date, NOW);
  const soon = sameDay(date, tomorrow);
  const cls = done ? "faint" : late ? "due--late" : today ? "due--today" : soon ? "due--soon" : "";
  const label = today ? "Hoje" : soon ? "Amanhã" : sameDay(date, new Date(startToday.getTime() - 864e5)) ? "Ontem" : dayMonth(date);
  return <span className={cls}>{label}</span>;
}

const KIND_ICON = { Reel: Film, Vídeo: Film, Carrossel: Images, Imagem: ImageIcon, Story: Smartphone, Artigo: FileText };

/**
 * Stand-in for the creative until real media is uploaded: a tinted tile in the
 * client's colour with the format, so previews feel like posts, not rows.
 */
export function PostThumb({ post, className = "preview-media", label = true }: { post: Pick<Post, "id" | "clientId" | "kind"> & { assetIds?: string[] }; className?: string; label?: boolean }) {
  const c = getClient(post.clientId)!;
  const img = post.assetIds?.map((id) => ASSET_SRC[id]).find(Boolean);
  if (img) {
    return (
      <div className={className} style={{ background: `center / cover no-repeat url("${img}")` }}>
        {label && (
          <span className="row thumb-label" style={{ gap: 6, position: "absolute", left: 10, bottom: 10, fontSize: 12, fontWeight: 600 }}>
            {post.kind}
          </span>
        )}
      </div>
    );
  }
  const n = post.id.split("").reduce((a, ch) => a + ch.charCodeAt(0), 0);
  const shift = (n % 5) * 14 - 28;
  const Icon = KIND_ICON[post.kind];
  return (
    <div
      className={className}
      style={{
        background: `radial-gradient(120% 90% at ${20 + (n % 60)}% 10%, oklch(0.78 0.09 ${c.hue + shift}) 0%, transparent 60%), linear-gradient(160deg, oklch(0.6 0.1 ${c.hue + shift}) 0%, oklch(0.36 0.07 ${c.hue - shift}) 100%)`,
      }}
    >
      {label && (
        <span className="row" style={{ gap: 6, position: "absolute", left: 10, bottom: 10, fontSize: 12, fontWeight: 600 }}>
          <Icon size={14} /> {post.kind}
        </span>
      )}
    </div>
  );
}
