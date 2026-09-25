"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { CLIENTS, NOW, POST_STATUS, client as getClient, type Post, type PostStatus } from "@/lib/data";
import { dayMonth, monthName, sameDay, time, weekday } from "@/lib/format";
import { ClientTile, NetIcon, PageHead, PostStatusLozenge } from "@/components/ui";
import { useSession } from "@/components/session";
import { useStore } from "@/components/store";
import { PostDrawer } from "@/components/post-drawer";

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function monthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // Monday first
  return Array.from({ length: 42 }, (_, i) => new Date(year, month, 1 - offset + i));
}

export default function CalendarPage() {
  return (
    <Suspense>
      <Calendar />
    </Suspense>
  );
}

function Calendar() {
  const params = useSearchParams();
  const { can } = useSession();
  const { posts, savePost } = useStore();
  const [cursor, setCursor] = useState({ y: NOW.getFullYear(), m: NOW.getMonth() });
  const [clientFilter, setClientFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<PostStatus | null>(null);
  const [editing, setEditing] = useState<Post | "new" | null>(null);
  const [newDate, setNewDate] = useState<Date>(NOW);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overDay, setOverDay] = useState<string | null>(null);

  useEffect(() => {
    if (params.get("novo")) setEditing("new");
  }, [params]);

  const visible = useMemo(
    () =>
      posts
        .filter((p) => (!clientFilter || p.clientId === clientFilter) && (!statusFilter || p.status === statusFilter))
        .sort((a, b) => a.date.getTime() - b.date.getTime()),
    [posts, clientFilter, statusFilter],
  );

  const days = monthGrid(cursor.y, cursor.m);
  const move = (delta: number) =>
    setCursor(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  const openNew = (d: Date) => {
    setNewDate(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 18, 0));
    setEditing("new");
  };

  const dropOn = (d: Date) => {
    const p = posts.find((x) => x.id === dragId);
    if (!p) return;
    savePost({ ...p, date: new Date(d.getFullYear(), d.getMonth(), d.getDate(), p.date.getHours(), p.date.getMinutes()) });
    setDragId(null);
    setOverDay(null);
  };

  // Agenda (mobile): from today onwards, grouped per day.
  const agenda = visible.filter((p) => p.date >= new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - 2));
  const groups = agenda.reduce<{ day: Date; posts: Post[] }[]>((acc, p) => {
    const last = acc[acc.length - 1];
    if (last && sameDay(last.day, p.date)) last.posts.push(p);
    else acc.push({ day: p.date, posts: [p] });
    return acc;
  }, []);

  const counts = (s: PostStatus) => posts.filter((p) => p.status === s && (!clientFilter || p.clientId === clientFilter)).length;

  return (
    <>
      <PageHead
        title="Calendário editorial"
        lede="Planeia e agenda publicações para todas as redes. Arrasta uma publicação para mudar o dia."
        actions={
          <>
            <Link className="btn" href="/conteudo">Aprovações</Link>
            {can("publicar") && (
              <button className="btn btn--primary" onClick={() => openNew(NOW)}>
                <Plus size={15} /> Nova publicação
              </button>
            )}
          </>
        }
      />

      <div className="filters">
        <button className="chip" aria-pressed={!clientFilter} onClick={() => setClientFilter(null)}>
          Todos os clientes
        </button>
        {CLIENTS.map((c) => (
          <button key={c.id} className="chip" aria-pressed={clientFilter === c.id} onClick={() => setClientFilter(clientFilter === c.id ? null : c.id)}>
            <ClientTile clientId={c.id} size={16} />
            {c.name}
          </button>
        ))}
      </div>
      <div className="filters">
        {(Object.keys(POST_STATUS) as PostStatus[]).map((s) => (
          <button key={s} className="chip" aria-pressed={statusFilter === s} onClick={() => setStatusFilter(statusFilter === s ? null : s)}>
            <span className={`status-dot status-dot--${s}`} />
            {POST_STATUS[s]}
            <span className="num" style={{ opacity: 0.6 }}>{counts(s)}</span>
          </button>
        ))}
      </div>

      {/* Month grid — tablet and up */}
      <div className="cal-month">
        <div className="spread" style={{ marginBottom: 12 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, textTransform: "capitalize" }}>
            {monthName(cursor.m)} {cursor.y}
          </h2>
          <div className="row">
            <button className="btn btn--sm" onClick={() => setCursor({ y: NOW.getFullYear(), m: NOW.getMonth() })}>Hoje</button>
            <button className="icon-btn" onClick={() => move(-1)} aria-label="Mês anterior"><ChevronLeft size={18} /></button>
            <button className="icon-btn" onClick={() => move(1)} aria-label="Mês seguinte"><ChevronRight size={18} /></button>
          </div>
        </div>
        <div className="cal">
          <div className="cal__weekdays">
            {WEEKDAYS.map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="cal__grid">
            {days.map((d) => {
              const key = d.toDateString();
              const dayPosts = visible.filter((p) => sameDay(p.date, d));
              const out = d.getMonth() !== cursor.m;
              return (
                <div
                  key={key}
                  className={`cal__day ${out ? "cal__day--out" : ""}`}
                  style={overDay === key ? { background: "var(--mark-soft)" } : undefined}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setOverDay(key);
                  }}
                  onDragLeave={() => setOverDay((k) => (k === key ? null : k))}
                  onDrop={() => dropOn(d)}
                >
                  <div className={`cal__date ${sameDay(d, NOW) ? "cal__date--today" : ""}`}>
                    <span className="num">{d.getDate()}</span>
                    {can("publicar") && (
                      <button className="cal__add" onClick={() => openNew(d)} aria-label={`Nova publicação a ${dayMonth(d)}`}>
                        <Plus size={14} />
                      </button>
                    )}
                  </div>
                  {dayPosts.map((p) => (
                    <button
                      key={p.id}
                      className={`post-pill ${dragId === p.id ? "ticket--dragging" : ""}`}
                      draggable={p.status !== "publicado"}
                      onDragStart={() => setDragId(p.id)}
                      onDragEnd={() => setDragId(null)}
                      onClick={() => setEditing(p)}
                      title={`${getClient(p.clientId)!.name} · ${p.caption}`}
                    >
                      <span className={`status-dot status-dot--${p.status}`} />
                      <time>{time(p.date)}</time>
                      <span className="truncate grow" style={p.status === "publicado" ? { color: "var(--ink-3)" } : undefined}>
                        {p.caption}
                      </span>
                      <ClientTile clientId={p.clientId} size={14} />
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
        <div className="legend" style={{ marginTop: 10 }}>
          {(Object.keys(POST_STATUS) as PostStatus[]).map((s) => (
            <span key={s}><span className={`status-dot status-dot--${s}`} /> {POST_STATUS[s]}</span>
          ))}
        </div>
      </div>

      {/* Agenda — phones */}
      <div className="cal-agenda">
        {groups.map((g) => (
          <section key={g.day.toDateString()} className="agenda-day">
            <div className={`agenda-day__head ${sameDay(g.day, NOW) ? "agenda-day__head--today" : ""}`}>
              <b>{g.day.getDate()}</b>
              <span className="muted" style={{ textTransform: "capitalize" }}>{weekday(g.day)}</span>
              <span className="faint">{monthName(g.day.getMonth())}</span>
            </div>
            <div className="list">
              {g.posts.map((p) => (
                <button key={p.id} className="list-item" onClick={() => setEditing(p)}>
                  <div className="num" style={{ fontWeight: 600, minWidth: 42 }}>{time(p.date)}</div>
                  <div className="grow">
                    <div style={{ fontWeight: 550 }}>{p.caption}</div>
                    <div className="row faint" style={{ fontSize: 12, marginTop: 4 }}>
                      <ClientTile clientId={p.clientId} size={16} /> {getClient(p.clientId)!.name} · {p.kind}
                    </div>
                    <div className="row" style={{ marginTop: 8, gap: 4 }}>
                      {p.networks.map((n) => <NetIcon key={n} id={n} size={18} />)}
                      <PostStatusLozenge status={p.status} />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      {editing && (
        <PostDrawer
          post={editing === "new" ? null : editing}
          defaultDate={newDate}
          defaultClient={clientFilter}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

