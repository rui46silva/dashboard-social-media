"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CalendarDays, Check, ChevronDown, Clock, ChevronLeft, ChevronRight, KanbanSquare, List, MessageSquare,
  Plus, Search, ThumbsUp, Trash2, X, GitBranch,
} from "lucide-react";
import {
  CLIENTS, NOW, TASK_SECTIONS, USERS, client, user,
  type Priority, type Task, type TaskSection,
} from "@/lib/data";
import { ago, monthName, sameDay } from "@/lib/format";
import { Avatar, CheckCircle, ClientTile, Due, PageHead } from "@/components/ui";
import { useStore } from "@/components/store";
import { useSession } from "@/components/session";
import { TaskTime, hm } from "@/components/time";

type View = "lista" | "quadro" | "calendario";
type Scope = "minhas" | "todas";

const TEAM = USERS.filter((u) => u.role !== "cliente");
const toDateInput = (d: Date | null) =>
  d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : "";

export default function TasksPage() {
  return (
    <Suspense>
      <Tasks />
    </Suspense>
  );
}

function Tasks() {
  const params = useSearchParams();
  const { tasks, saveTask, addTask } = useStore();
  const { user: me } = useSession();
  const [view, setView] = useState<View>("lista");
  const [scope, setScope] = useState<Scope>("todas");
  const [who, setWho] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string>("");
  const [showDone, setShowDone] = useState(false);
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<TaskSection[]>([]);

  useEffect(() => {
    const t = params.get("t");
    if (t) setOpenId(t);
  }, [params]);

  const visible = useMemo(() => {
    const s = q.trim().toLowerCase();
    return tasks.filter(
      (t) =>
        (showDone || !t.done) &&
        (scope === "todas" || t.assignee === me.id) &&
        (!who || t.assignee === who) &&
        (!clientId || t.clientId === clientId) &&
        (!s || t.title.toLowerCase().includes(s)),
    );
  }, [tasks, showDone, scope, who, clientId, q, me.id]);

  const open = tasks.find((t) => t.id === openId) ?? null;
  const toggle = (t: Task) => saveTask({ ...t, done: !t.done });
  const openCount = tasks.filter((t) => !t.done).length;
  const lateCount = tasks.filter((t) => !t.done && t.due && t.due < new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate())).length;

  const newTask = (section: TaskSection = "backlog", title = "Nova tarefa") => {
    const t = addTask({ title, section, assignee: who ?? me.id, clientId: clientId || undefined, due: null });
    if (title === "Nova tarefa") setOpenId(t.id);
  };

  return (
    <>
      <PageHead
        title="Tarefas"
        lede={
          <>
            {openCount} tarefas abertas
            {lateCount > 0 && (
              <>
                {" · "}
                <span className="due--late">{lateCount} atrasada{lateCount === 1 ? "" : "s"}</span>
              </>
            )}
          </>
        }
      />

      <div className="tabs" role="tablist">
        {([
          ["lista", "Lista", List],
          ["quadro", "Quadro", KanbanSquare],
          ["calendario", "Calendário", CalendarDays],
        ] as const).map(([id, label, Icon]) => (
          <button key={id} role="tab" className="tab" aria-selected={view === id} onClick={() => setView(id)}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      <div className="task-toolbar">
        <button className="btn btn--primary" onClick={() => newTask()}>
          <Plus size={15} /> Adicionar tarefa
        </button>
        <div className="segmented" role="group" aria-label="Âmbito">
          <button aria-pressed={scope === "minhas"} onClick={() => setScope("minhas")}>As minhas</button>
          <button aria-pressed={scope === "todas"} onClick={() => setScope("todas")}>Equipa</button>
        </div>
        <select className="input" style={{ width: "auto", height: 32 }} value={clientId} onChange={(e) => setClientId(e.target.value)} aria-label="Cliente">
          <option value="">Todos os clientes</option>
          {CLIENTS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <label className="chip" style={{ cursor: "pointer" }}>
          <input type="checkbox" checked={showDone} onChange={() => setShowDone(!showDone)} style={{ margin: 0 }} />
          Concluídas
        </label>
        <label className="row" style={{ position: "relative", marginLeft: "auto" }}>
          <Search size={14} style={{ position: "absolute", left: 10, color: "var(--ink-3)" }} />
          <input className="input" style={{ height: 32, paddingLeft: 30, width: 200 }} placeholder="Procurar tarefas" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>

      {scope === "todas" && (
        <div className="filters">
          <button className="chip" aria-pressed={!who} onClick={() => setWho(null)}>Todos</button>
          {TEAM.map((u) => (
            <button key={u.id} className="chip" aria-pressed={who === u.id} onClick={() => setWho(who === u.id ? null : u.id)} style={{ paddingLeft: 4 }}>
              <Avatar userId={u.id} size={22} />
              {u.name.split(" ")[0]}
            </button>
          ))}
        </div>
      )}

      {view === "lista" && (
        <div className="tl">
          <div className="tl__head">
            <div>Nome da tarefa</div>
            <div className="tl__col-md">Responsável</div>
            <div>Prazo</div>
            <div className="tl__col-md">Cliente</div>
            <div className="tl__col-md">Prioridade</div>
          </div>
          {TASK_SECTIONS.map((sec) => {
            const rows = visible
              .filter((t) => t.section === sec.id)
              .sort((a, b) => Number(a.done) - Number(b.done) || (a.due?.getTime() ?? 9e15) - (b.due?.getTime() ?? 9e15));
            const isCollapsed = collapsed.includes(sec.id);
            return (
              <section key={sec.id}>
                <div className="tl__section">
                  <button
                    onClick={() => setCollapsed((c) => (c.includes(sec.id) ? c.filter((x) => x !== sec.id) : [...c, sec.id]))}
                    aria-expanded={!isCollapsed}
                  >
                    <ChevronDown size={16} style={{ transform: isCollapsed ? "rotate(-90deg)" : undefined, transition: "transform .15s" }} />
                    {sec.name}
                  </button>
                  <span className="faint" style={{ fontSize: 13, fontWeight: 500 }}>{rows.length}</span>
                </div>
                {!isCollapsed && (
                  <>
                    {rows.map((t) => (
                      <TaskRow key={t.id} task={t} selected={t.id === openId} onOpen={() => setOpenId(t.id)} onToggle={() => toggle(t)} />
                    ))}
                    <InlineAdd onAdd={(title) => newTask(sec.id, title)} />
                  </>
                )}
              </section>
            );
          })}
        </div>
      )}

      {view === "quadro" && <Board tasks={visible} onOpen={setOpenId} onToggle={toggle} onMove={(t, s) => saveTask({ ...t, section: s })} onAdd={newTask} />}

      {view === "calendario" && <TaskCalendar tasks={visible} onOpen={setOpenId} />}

      {open && <TaskPane task={open} onClose={() => setOpenId(null)} />}
    </>
  );
}

function TaskRow({ task: t, selected, onOpen, onToggle }: { task: Task; selected: boolean; onOpen: () => void; onToggle: () => void }) {
  const { time } = useStore();
  const tracked = (id: string) => time.filter((e) => e.taskId === id).reduce((a, e) => a + e.minutes, 0);
  const subDone = t.subtasks.filter((s) => s.done).length;
  return (
    <div className="tl__row" aria-selected={selected} onClick={onOpen}>
      <div>
        <CheckCircle checked={t.done} onToggle={onToggle} label={`Concluir: ${t.title}`} />
        <span className={`tl__name ${t.done ? "done-text" : ""}`}>{t.title}</span>
        <span className="tl__icons">
          {t.subtasks.length > 0 && (
            <span title="Subtarefas"><GitBranch size={12} />{subDone}/{t.subtasks.length}</span>
          )}
          {t.comments.length > 0 && (
            <span title="Comentários"><MessageSquare size={12} />{t.comments.length}</span>
          )}
          {t.likes.length > 0 && (
            <span title="Gostos"><ThumbsUp size={12} />{t.likes.length}</span>
          )}
          {tracked(t.id) > 0 && (
            <span title="Tempo registado"><Clock size={12} />{hm(tracked(t.id))}{t.estimate ? `/${t.estimate}h` : ""}</span>
          )}
        </span>
      </div>
      <div className="tl__col-md">
        <Avatar userId={t.assignee} size={22} />
        <span className="truncate muted">{user(t.assignee).name.split(" ")[0]}</span>
      </div>
      <div><Due date={t.due} done={t.done} /></div>
      <div className="tl__col-md">
        {t.clientId ? (
          <span className="tag" style={{ gap: 5, paddingLeft: 3 }}>
            <ClientTile clientId={t.clientId} size={14} />
            <span className="truncate">{client(t.clientId)!.name}</span>
          </span>
        ) : (
          <span className="faint">Agência</span>
        )}
      </div>
      <div className="tl__col-md">
        <span className={`tag tag--${t.priority}`}>{t.priority[0].toUpperCase() + t.priority.slice(1)}</span>
      </div>
    </div>
  );
}

function InlineAdd({ onAdd }: { onAdd: (title: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);
  if (!editing)
    return (
      <button className="tl__add" onClick={() => setEditing(true)}>
        <Plus size={14} /> Adicionar tarefa…
      </button>
    );
  return (
    <form
      className="tl__add"
      onSubmit={(e) => {
        e.preventDefault();
        if (v.trim()) onAdd(v.trim());
        setV("");
      }}
    >
      <span className="check" aria-hidden />
      <input
        ref={ref}
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => !v && setEditing(false)}
        onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
        placeholder="Escreve o nome e carrega em Enter"
      />
    </form>
  );
}

function Board({
  tasks, onOpen, onToggle, onMove, onAdd,
}: {
  tasks: Task[];
  onOpen: (id: string) => void;
  onToggle: (t: Task) => void;
  onMove: (t: Task, s: TaskSection) => void;
  onAdd: (s: TaskSection) => void;
}) {
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<TaskSection | null>(null);
  return (
    <div className="board">
      {TASK_SECTIONS.map((sec) => {
        const col = tasks.filter((t) => t.section === sec.id);
        return (
          <section
            key={sec.id}
            className={`column ${over === sec.id ? "column--over" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(sec.id);
            }}
            onDragLeave={() => setOver((o) => (o === sec.id ? null : o))}
            onDrop={() => {
              const t = tasks.find((x) => x.id === drag);
              if (t) onMove(t, sec.id);
              setDrag(null);
              setOver(null);
            }}
          >
            <div className="column__head">
              <h3>{sec.name}</h3>
              <span className="faint" style={{ fontSize: 13 }}>{col.length}</span>
              <button className="icon-btn" style={{ marginLeft: "auto", width: 28, height: 28 }} onClick={() => onAdd(sec.id)} aria-label={`Adicionar em ${sec.name}`}>
                <Plus size={16} />
              </button>
            </div>
            {col.map((t) => (
              <div
                key={t.id}
                className={`ticket ${drag === t.id ? "ticket--dragging" : ""}`}
                draggable
                onDragStart={() => setDrag(t.id)}
                onDragEnd={() => setDrag(null)}
                onClick={() => onOpen(t.id)}
              >
                <div className="row" style={{ alignItems: "flex-start" }}>
                  <CheckCircle checked={t.done} onToggle={() => onToggle(t)} label={`Concluir: ${t.title}`} />
                  <div className={`ticket__title ${t.done ? "done-text" : ""}`}>{t.title}</div>
                </div>
                <div className="row" style={{ flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                  <span className={`tag tag--${t.priority}`}>{t.priority[0].toUpperCase() + t.priority.slice(1)}</span>
                  {t.clientId && <span className="tag">{client(t.clientId)!.name}</span>}
                </div>
                <div className="ticket__meta">
                  <Avatar userId={t.assignee} size={22} />
                  <Due date={t.due} done={t.done} />
                  <span className="tl__icons" style={{ marginLeft: "auto" }}>
                    {t.subtasks.length > 0 && <span><GitBranch size={12} />{t.subtasks.filter((s) => s.done).length}/{t.subtasks.length}</span>}
                    {t.comments.length > 0 && <span><MessageSquare size={12} />{t.comments.length}</span>}
                  </span>
                </div>
                <select
                  className="input status-select"
                  aria-label="Mudar secção"
                  value={t.section}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => onMove(t, e.target.value as TaskSection)}
                >
                  {TASK_SECTIONS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            ))}
            <button className="btn btn--ghost btn--sm" style={{ justifyContent: "flex-start" }} onClick={() => onAdd(sec.id)}>
              <Plus size={14} /> Adicionar tarefa
            </button>
          </section>
        );
      })}
    </div>
  );
}

function TaskCalendar({ tasks, onOpen }: { tasks: Task[]; onOpen: (id: string) => void }) {
  const [cursor, setCursor] = useState({ y: NOW.getFullYear(), m: NOW.getMonth() });
  const first = new Date(cursor.y, cursor.m, 1);
  const offset = (first.getDay() + 6) % 7;
  const days = Array.from({ length: 42 }, (_, i) => new Date(cursor.y, cursor.m, 1 - offset + i));
  const move = (d: number) =>
    setCursor(({ y, m }) => {
      const x = new Date(y, m + d, 1);
      return { y: x.getFullYear(), m: x.getMonth() };
    });
  return (
    <>
      <div className="spread" style={{ marginBottom: 10 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, textTransform: "capitalize" }}>
          {monthName(cursor.m)} {cursor.y}
        </h2>
        <div className="row">
          <button className="icon-btn" onClick={() => move(-1)} aria-label="Mês anterior"><ChevronLeft size={18} /></button>
          <button className="icon-btn" onClick={() => move(1)} aria-label="Mês seguinte"><ChevronRight size={18} /></button>
        </div>
      </div>
      <div className="cal" style={{ overflowX: "auto" }}>
        <div style={{ minWidth: 700 }}>
          <div className="cal__weekdays">
            {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="cal__grid">
            {days.map((d) => (
              <div key={d.toDateString()} className={`cal__day ${d.getMonth() !== cursor.m ? "cal__day--out" : ""}`} style={{ minHeight: 100 }}>
                <div className={`cal__date ${sameDay(d, NOW) ? "cal__date--today" : ""}`}><span className="num">{d.getDate()}</span></div>
                {tasks.filter((t) => t.due && sameDay(t.due, d)).map((t) => (
                  <button key={t.id} className="post-pill" onClick={() => onOpen(t.id)}>
                    <Check size={12} style={{ color: t.done ? "var(--good-strong)" : "var(--ink-3)", flex: "none" }} />
                    <span className={`truncate grow ${t.done ? "done-text" : ""}`}>{t.title}</span>
                    <Avatar userId={t.assignee} size={16} />
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function TaskPane({ task, onClose }: { task: Task; onClose: () => void }) {
  const { saveTask } = useStore();
  const { user: me } = useSession();
  const [comment, setComment] = useState("");
  const [sub, setSub] = useState("");
  const set = (patch: Partial<Task>) => saveTask({ ...task, ...patch });
  const liked = task.likes.includes(me.id);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label={task.title}>
        <div className="drawer__head">
          <button className={`btn btn--sm ${task.done ? "btn--good" : ""}`} onClick={() => set({ done: !task.done })}>
            <Check size={14} /> {task.done ? "Concluída" : "Marcar como concluída"}
          </button>
          <span className="grow" />
          <button className="icon-btn like-btn" aria-pressed={liked} aria-label="Gosto" onClick={() => set({ likes: liked ? task.likes.filter((x) => x !== me.id) : [...task.likes, me.id] })}>
            <ThumbsUp size={17} />
          </button>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar"><X size={18} /></button>
        </div>
        <div className="drawer__body">
          {task.done && (
            <div className="notice notice--good"><Check size={16} /> Esta tarefa está concluída.</div>
          )}
          <textarea
            className="task-pane__title"
            rows={2}
            value={task.title}
            onChange={(e) => set({ title: e.target.value })}
            aria-label="Nome da tarefa"
          />

          <dl className="props" style={{ margin: 0 }}>
            <dt>Responsável</dt>
            <dd className="row">
              <Avatar userId={task.assignee} size={24} />
              <select className="input input--bare" style={{ height: 30 }} value={task.assignee} onChange={(e) => set({ assignee: e.target.value })}>
                {TEAM.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </dd>
            <dt>Prazo</dt>
            <dd className="row">
              <input
                type="date"
                className="input input--bare"
                style={{ height: 30, width: "auto" }}
                value={toDateInput(task.due)}
                onChange={(e) => {
                  const [y, m, d] = e.target.value.split("-").map(Number);
                  set({ due: e.target.value ? new Date(y, m - 1, d, 18) : null });
                }}
              />
              <Due date={task.due} done={task.done} />
            </dd>
            <dt>Cliente</dt>
            <dd>
              <select className="input input--bare" style={{ height: 30 }} value={task.clientId ?? ""} onChange={(e) => set({ clientId: e.target.value || undefined })}>
                <option value="">Agência (interno)</option>
                {CLIENTS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </dd>
            <dt>Secção</dt>
            <dd>
              <select className="input input--bare" style={{ height: 30 }} value={task.section} onChange={(e) => set({ section: e.target.value as TaskSection })}>
                {TASK_SECTIONS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </dd>
            <dt>Prioridade</dt>
            <dd className="row" style={{ gap: 6 }}>
              {(["alta", "média", "baixa"] as Priority[]).map((p) => (
                <button key={p} className={`tag ${task.priority === p ? `tag--${p}` : ""}`} style={{ opacity: task.priority === p ? 1 : 0.6 }} onClick={() => set({ priority: p })}>
                  {p[0].toUpperCase() + p.slice(1)}
                </button>
              ))}
            </dd>
            <dt>Etiquetas</dt>
            <dd className="row" style={{ flexWrap: "wrap", gap: 6 }}>
              {task.tags.length ? task.tags.map((t) => <span key={t} className="tag">{t}</span>) : <span className="faint">—</span>}
            </dd>
          </dl>

          <TaskTime task={task} onEstimate={(h) => set({ estimate: h })} />

          <div className="field">
            <span>Descrição</span>
            <textarea
              className="input"
              style={{ minHeight: 90 }}
              placeholder="De que se trata esta tarefa?"
              value={task.description}
              onChange={(e) => set({ description: e.target.value })}
            />
          </div>

          <div>
            <div className="spread" style={{ marginBottom: 6 }}>
              <span className="eyebrow">Subtarefas</span>
              {task.subtasks.length > 0 && (
                <span className="faint" style={{ fontSize: 12 }}>{task.subtasks.filter((s) => s.done).length} de {task.subtasks.length}</span>
              )}
            </div>
            {task.subtasks.map((s) => (
              <div key={s.id} className="subtask">
                <CheckCircle
                  checked={s.done}
                  label={`Concluir subtarefa: ${s.title}`}
                  onToggle={() => set({ subtasks: task.subtasks.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)) })}
                />
                <span className={`grow ${s.done ? "done-text" : ""}`}>{s.title}</span>
                <button className="icon-btn" style={{ width: 26, height: 26 }} aria-label="Apagar subtarefa" onClick={() => set({ subtasks: task.subtasks.filter((x) => x.id !== s.id) })}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <form
              className="row"
              style={{ marginTop: 8 }}
              onSubmit={(e) => {
                e.preventDefault();
                if (!sub.trim()) return;
                set({ subtasks: [...task.subtasks, { id: `s${Date.now()}`, title: sub.trim(), done: false }] });
                setSub("");
              }}
            >
              <input className="input" style={{ height: 32 }} placeholder="+ Adicionar subtarefa" value={sub} onChange={(e) => setSub(e.target.value)} />
            </form>
          </div>

          <div>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Comentários e atividade</div>
            <div className="stack" style={{ gap: 14 }}>
              <div className="comment">
                <Avatar userId={task.createdBy} size={26} />
                <div className="comment__meta" style={{ paddingTop: 4 }}>
                  <b>{user(task.createdBy).name}</b> criou esta tarefa
                </div>
              </div>
              {task.comments.map((c, i) => (
                <div key={i} className="comment">
                  <Avatar userId={c.by} size={26} />
                  <div>
                    <div className="comment__meta"><b>{user(c.by).name}</b>{ago(c.date, NOW)}</div>
                    <div className="comment__text" style={{ marginTop: 2 }}>{c.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <form
          className="drawer__foot"
          style={{ justifyContent: "stretch" }}
          onSubmit={(e) => {
            e.preventDefault();
            if (!comment.trim()) return;
            set({ comments: [...task.comments, { by: me.id, text: comment.trim(), date: new Date() }] });
            setComment("");
          }}
        >
          <Avatar userId={me.id} size={28} />
          <input className="input grow" style={{ flex: 1 }} placeholder="Escreve um comentário…" value={comment} onChange={(e) => setComment(e.target.value)} />
          <button className="btn btn--primary" type="submit" disabled={!comment.trim()}>Comentar</button>
        </form>
        <div className="faint" style={{ fontSize: 12, padding: "0 16px 10px", display: "flex", gap: 6, alignItems: "center" }}>
          Colaboradores:
          <span className="avatar-stack">
            {[task.assignee, ...task.collaborators].map((id) => <Avatar key={id} userId={id} size={20} />)}
          </span>
        </div>
      </aside>
    </>
  );
}
