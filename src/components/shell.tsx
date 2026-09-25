"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Contact,
  Eye,
  FileText,
  Home,
  Inbox,
  KanbanSquare,
  ListChecks,
  Menu,
  Monitor,
  Moon,
  Plus,
  Search,
  Sun,
  Swords,
  Users,
  type LucideIcon,
} from "lucide-react";
import { CLIENTS, INBOX, NOW, ROLES, ROLE_USER, user as getUser, type Permission } from "@/lib/data";
import { avatarColor, ClientTile } from "./ui";
import { useSession } from "./session";
import { useStore } from "./store";

type NavItem = { href: string; label: string; icon: LucideIcon; perm?: Permission; count?: number; alert?: boolean };

/** Unread comments/DMs for the clients this person answers. */
const unreadFor = (userId: string) =>
  INBOX.filter((m) => m.unread && CLIENTS.find((c) => c.id === m.clientId)?.inboxOwner === userId).length;

function useGroups(): { label: string; items: NavItem[] }[] {
  const { posts, tasks } = useStore();
  const { user } = useSession();
  const endOfTomorrow = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() + 2);
  const myDue = tasks.filter((t) => !t.done && t.assignee === user.id && t.due && t.due < endOfTomorrow).length;
  const unread = unreadFor(user.id);
  const toReview = posts.filter((p) => p.status === "confirmar" || (p.status === "todo" && p.rounds > 0)).length;
  return [
    {
      label: "",
      items: [
        { href: "/", label: "Início", icon: Home },
        { href: "/tarefas", label: "Tarefas", icon: ListChecks, perm: "tarefas", count: myDue },
        { href: "/inbox", label: "Inbox", icon: Inbox, perm: "inbox", count: unread, alert: true },
      ],
    },
    {
      label: "Conteúdo",
      items: [
        { href: "/conteudo", label: "Aprovações", icon: CheckCircle2, perm: "publicar", count: toReview, alert: true },
        { href: "/calendario", label: "Calendário", icon: CalendarDays, perm: "publicar" },
      ],
    },
    {
      label: "Análise",
      items: [
        { href: "/clientes", label: "Clientes", icon: BriefcaseBusiness },
        { href: "/concorrentes", label: "Concorrentes", icon: Swords },
        { href: "/relatorios", label: "Relatórios", icon: FileText, perm: "relatorios" },
      ],
    },
    {
      label: "Negócio",
      items: [
        { href: "/crm/pipeline", label: "Pipeline", icon: KanbanSquare, perm: "crm" },
        { href: "/crm", label: "Contactos e empresas", icon: Contact, perm: "crm" },
        { href: "/empresa", label: "Empresa", icon: Building2, perm: "empresa" },
      ],
    },
    {
      label: "Agência",
      items: [
        { href: "/equipa", label: "Equipa e papéis", icon: Users },
        { href: "/portal/kinetik", label: "Ver portal do cliente", icon: Eye },
      ],
    },
  ];
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/crm") return pathname === "/crm";
  return pathname === href || pathname.startsWith(href + "/");
}

function LogoMark() {
  return (
    <span className="logo__mark" aria-hidden>
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { can } = useSession();
  const groups = useGroups();
  return (
    <>
      {groups.map((g) => {
        const items = g.items.filter((i) => !i.perm || can(i.perm));
        if (!items.length) return null;
        return (
          <div className="nav-group" key={g.label || "main"}>
            {g.label && <div className="nav-group__label">{g.label}</div>}
            {items.map((i) => (
              <Link
                key={i.href}
                href={i.href}
                className="nav-link"
                aria-current={isActive(pathname, i.href) ? "page" : undefined}
                onClick={onNavigate}
              >
                <i.icon size={17} strokeWidth={1.8} />
                {i.label}
                {!!i.count && <span className={`count num ${i.alert ? "count--alert" : ""}`}>{i.count}</span>}
              </Link>
            ))}
          </div>
        );
      })}
      <div className="nav-group">
        <div className="nav-group__label">Clientes</div>
        {CLIENTS.map((c) => (
          <Link
            key={c.id}
            href={`/clientes/${c.id}`}
            className="nav-link"
            aria-current={pathname === `/clientes/${c.id}` ? "page" : undefined}
            onClick={onNavigate}
          >
            <ClientTile clientId={c.id} size={18} />
            <span className="truncate">{c.name}</span>
          </Link>
        ))}
      </div>
    </>
  );
}

function ThemeSwitch() {
  const { theme, setTheme } = useSession();
  const opts = [
    { id: "light", icon: Sun, label: "Claro" },
    { id: "dark", icon: Moon, label: "Escuro" },
    { id: "system", icon: Monitor, label: "Auto" },
  ] as const;
  return (
    <div className="segmented" role="group" aria-label="Tema" style={{ width: "100%" }}>
      {opts.map((o) => (
        <button
          key={o.id}
          aria-pressed={theme === o.id}
          onClick={() => setTheme(o.id)}
          style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5 }}
          title={o.label}
        >
          <o.icon size={14} />
          <span style={{ fontSize: 12 }}>{o.label}</span>
        </button>
      ))}
    </div>
  );
}

function RoleSwitch() {
  const { viewAs, setViewAs } = useSession();
  const { reset } = useStore();
  return (
    <>
    <label className="field">
      <span>Ver como (protótipo)</span>
      <select className="input" style={{ height: 32 }} value={viewAs} onChange={(e) => setViewAs(e.target.value as typeof viewAs)}>
        {ROLES.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>
    </label>
    <button className="nav-link" style={{ height: 26, fontSize: 12, color: "var(--side-ink-2)" }} onClick={() => confirm("Repor os dados de demonstração?") && reset()}>
      Repor dados de demonstração
    </button>
    </>
  );
}

function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const groups = useGroups();
  const { tasks } = useStore();

  const results = useMemo(() => {
    const all = [
      { href: "/calendario?novo=1", label: "Nova publicação", hint: "Ação" },
      ...groups.flatMap((g) => g.items).map((i) => ({ href: i.href, label: i.label, hint: "Ir para" })),
      ...CLIENTS.map((c) => ({ href: `/clientes/${c.id}`, label: c.name, hint: "Cliente" })),
      ...tasks.filter((t) => !t.done).map((t) => ({ href: `/tarefas?t=${t.id}`, label: t.title, hint: "Tarefa" })),
    ];
    const s = q.trim().toLowerCase();
    return (s ? all.filter((r) => r.label.toLowerCase().includes(s)) : all).slice(0, 30);
  }, [q, groups, tasks]);

  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      setTimeout(() => input.current?.focus(), 0);
    }
  }, [open]);

  if (!open) return null;
  const go = (href: string) => {
    onClose();
    router.push(href);
  };
  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="palette" role="dialog" aria-label="Procurar">
        <input
          ref={input}
          value={q}
          placeholder="Procurar tarefas, clientes, páginas…"
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowDown") setActive((a) => Math.min(results.length - 1, a + 1));
            if (e.key === "ArrowUp") setActive((a) => Math.max(0, a - 1));
            if (e.key === "Enter" && results[active]) go(results[active].href);
          }}
        />
        <div className="palette__list">
          {results.map((r, i) => (
            <a
              key={r.href + r.label}
              href={r.href}
              data-active={i === active}
              onMouseEnter={() => setActive(i)}
              onClick={(e) => {
                e.preventDefault();
                go(r.href);
              }}
            >
              <span className="grow truncate">{r.label}</span>
              <span className="faint" style={{ fontSize: 12 }}>{r.hint}</span>
            </a>
          ))}
          {!results.length && <div className="empty">Nada encontrado para «{q}».</div>}
        </div>
      </div>
    </>
  );
}

const CRUMB: Record<string, string> = {
  tarefas: "Tarefas",
  inbox: "Inbox",
  calendario: "Calendário",
  conteudo: "Aprovações",
  clientes: "Clientes",
  concorrentes: "Concorrentes",
  relatorios: "Relatórios",
  crm: "CRM",
  pipeline: "Pipeline",
  equipa: "Equipa e papéis",
  empresa: "Empresa",
};

function Crumbs() {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean);
  if (!parts.length) return <strong>Início</strong>;
  return (
    <>
      {parts.map((p, i) => {
        const href = "/" + parts.slice(0, i + 1).join("/");
        const label = CRUMB[p] ?? CLIENTS.find((c) => c.id === p)?.name ?? p;
        const last = i === parts.length - 1;
        return (
          <span key={href} className="row" style={{ gap: 6 }}>
            {i > 0 && <ChevronRight size={14} />}
            {last ? <strong>{label}</strong> : <Link href={href}>{label}</Link>}
          </span>
        );
      })}
    </>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { viewAs, can, user } = useSession();
  const unread = unreadFor(user.id);
  const [sheet, setSheet] = useState(false);
  const [palette, setPalette] = useState(false);

  // Clients never see the agency workspace — only their own portal.
  const clientPortal = `/portal/${getUser(ROLE_USER.cliente).clients[0]}`;
  useEffect(() => {
    if (viewAs === "cliente") router.replace(clientPortal);
  }, [viewAs, clientPortal, router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const tabs: NavItem[] = [
    { href: "/", label: "Início", icon: Home },
    { href: "/tarefas", label: "Tarefas", icon: ListChecks, perm: "tarefas" },
    { href: "/conteudo", label: "Aprovações", icon: CheckCircle2, perm: "publicar" },
    { href: "/inbox", label: "Inbox", icon: Inbox, perm: "inbox", count: unread },
  ];
  const visibleTabs = tabs.filter((t) => !t.perm || can(t.perm)).slice(0, 4);
  while (visibleTabs.length < 4) visibleTabs.push({ href: "/clientes", label: "Clientes", icon: BriefcaseBusiness });

  if (viewAs === "cliente") {
    return (
      <main className="main empty" style={{ paddingTop: "20vh" }}>
        A abrir o portal do cliente…
      </main>
    );
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link href="/" className="logo">
          <LogoMark />
          Mesa
        </Link>
        <Link href="/calendario?novo=1" className="side-cta">
          <span><Plus size={14} strokeWidth={2.5} /></span>
          Criar
        </Link>
        <nav aria-label="Principal">
          <NavLinks />
        </nav>
        <div className="sidebar__foot">
          <RoleSwitch />
          <ThemeSwitch />
        </div>
      </aside>

      <div style={{ minWidth: 0 }}>
        <header className="topbar">
          <div className="topbar__title">
            <Link href="/" className="logo only-mobile">
              <LogoMark />
              Mesa
            </Link>
            <nav className="topbar__crumbs" aria-label="Localização">
              <Crumbs />
            </nav>
          </div>
          <button className="topbar__search" onClick={() => setPalette(true)}>
            <Search size={15} />
            Procurar
            <kbd>⌘K</kbd>
          </button>
          <button className="icon-btn only-mobile" onClick={() => setPalette(true)} aria-label="Procurar">
            <Search size={19} />
          </button>
          <Link href="/inbox" className="icon-btn" aria-label={`Notificações: ${unread} por ler`}>
            <Bell size={19} />
            {unread > 0 && <span className="dot" />}
          </Link>
          <span className="avatar" style={{ ["--size" as string]: "30px", ["--av" as string]: avatarColor(user.name) }} title={user.name}>
            {user.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
          </span>
        </header>

        {viewAs !== "ceo" && (
          <div className="notice notice--info" style={{ borderRadius: 0 }}>
            <Eye size={16} />
            <span>
              Estás a ver a Mesa como <strong>{ROLES.find((r) => r.id === viewAs)?.name}</strong>. Os menus e as ações
              mudam conforme as permissões do papel.
            </span>
          </div>
        )}

        <main className="main">{children}</main>
      </div>

      <nav className="tabbar" aria-label="Navegação rápida">
        {visibleTabs.map((t) => (
          <Link key={t.href} href={t.href} aria-current={isActive(pathname, t.href) ? "page" : undefined}>
            <t.icon size={21} strokeWidth={1.8} />
            {t.label}
            {!!t.count && <span className="badge-count num">{t.count}</span>}
          </Link>
        ))}
        <button onClick={() => setSheet(true)} aria-expanded={sheet}>
          <Menu size={21} strokeWidth={1.8} />
          Mais
        </button>
      </nav>

      {sheet && (
        <>
          <div className="sheet-backdrop" onClick={() => setSheet(false)} />
          <div className="sheet" role="dialog" aria-label="Menu">
            <div className="sheet__grip" />
            <NavLinks onNavigate={() => setSheet(false)} />
            <div className="sheet__foot" style={{ marginTop: 16 }}>
              <RoleSwitch />
              <ThemeSwitch />
            </div>
          </div>
        </>
      )}

      <CommandPalette open={palette} onClose={() => setPalette(false)} />
    </div>
  );
}
