import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { ReactNode } from "react";
import { client as getClient, network, user as getUser, type NetworkId, type PostStatus } from "@/lib/data";
import { initials, signedPct } from "@/lib/format";

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
      <div className="kpi__value">{value}</div>
      {foot && <div className="kpi__foot">{foot}</div>}
    </div>
  );
}

export function Avatar({ userId, size = 26 }: { userId: string; size?: number }) {
  const u = getUser(userId);
  return (
    <span className="avatar" style={{ ["--size" as string]: `${size}px` }} title={u.name}>
      {initials(u.name)}
    </span>
  );
}

export function PersonAvatar({ name, size = 26 }: { name: string; size?: number }) {
  return (
    <span className="avatar" style={{ ["--size" as string]: `${size}px` }}>
      {initials(name.replace(/^@/, ""))}
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
  publicado: "",
  agendado: "lozenge--good",
  aprovação: "lozenge--warn",
  rascunho: "",
};
const STATUS_LABEL: Record<PostStatus, string> = {
  publicado: "Publicado",
  agendado: "Agendado",
  aprovação: "Em aprovação",
  rascunho: "Rascunho",
};

export function PostStatusLozenge({ status }: { status: PostStatus }) {
  return <span className={`lozenge ${STATUS_LOZENGE[status]}`}>{STATUS_LABEL[status]}</span>;
}
