"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Equal, Plus } from "lucide-react";
import { CLIENTS, NOW, TASKS, TASK_STATUSES, USERS, client, type Priority, type Task, type TaskStatus } from "@/lib/data";
import { dayMonth, sameDay } from "@/lib/format";
import { Avatar, ClientTile, PageHead } from "@/components/ui";

const STATUS_CLS: Record<TaskStatus, string> = {
  "a fazer": "",
  "em curso": "lozenge--info",
  "em revisão": "lozenge--warn",
  feito: "lozenge--good",
};

function Prio({ p }: { p: Priority }) {
  const Icon = p === "alta" ? ChevronUp : p === "média" ? Equal : ChevronDown;
  return (
    <span className={`prio prio--${p}`} title={`Prioridade ${p}`}>
      <Icon size={16} strokeWidth={2.5} />
    </span>
  );
}

function Due({ d }: { d: Date }) {
  const late = d < NOW && !sameDay(d, NOW);
  return <span style={late ? { color: "var(--bad)" } : undefined}>{sameDay(d, NOW) ? "hoje" : dayMonth(d)}</span>;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>(TASKS);
  const [view, setView] = useState<"quadro" | "lista">("quadro");
  const [who, setWho] = useState<string | null>(null);
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<TaskStatus | null>(null);
  const [title, setTitle] = useState("");

  const team = USERS.filter((u) => u.role !== "cliente" && u.role !== "rh");
  const visible = tasks.filter((t) => !who || t.assignee === who);

  const add = () => {
    if (!title.trim()) return;
    const n = 143 + tasks.length - TASKS.length;
    setTasks((ts) => [
      { id: `t${Date.now()}`, key: `MES-${n}`, title, assignee: who ?? "u-rui", due: NOW, status: "a fazer", priority: "média", tags: [] },
      ...ts,
    ]);
    setTitle("");
  };

  return (
    <>
      <PageHead
        title="Tarefas"
        lede="O trabalho da equipa, por cliente e por pessoa."
        actions={
          <div className="segmented" role="group" aria-label="Vista">
            <button aria-pressed={view === "quadro"} onClick={() => setView("quadro")}>Quadro</button>
            <button aria-pressed={view === "lista"} onClick={() => setView("lista")}>Lista</button>
          </div>
        }
      />

      <div className="filters" style={{ alignItems: "center" }}>
        <button className="chip" aria-pressed={!who} onClick={() => setWho(null)}>Todos</button>
        {team.map((u) => (
          <button key={u.id} className="chip" aria-pressed={who === u.id} onClick={() => setWho(who === u.id ? null : u.id)} style={{ paddingLeft: 4 }}>
            <Avatar userId={u.id} size={22} />
            {u.name.split(" ")[0]}
          </button>
        ))}
      </div>

      <form
        className="row"
        style={{ marginBottom: 16, maxWidth: 560 }}
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nova tarefa… (Enter para criar)" />
        <button className="btn" type="submit" aria-label="Criar tarefa"><Plus size={15} /></button>
      </form>

      {view === "quadro" ? (
        <div className="board">
          {TASK_STATUSES.map((s) => {
            const col = visible.filter((t) => t.status === s);
            return (
              <section
                key={s}
                className={`column ${over === s ? "column--over" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOver(s);
                }}
                onDragLeave={() => setOver((o) => (o === s ? null : o))}
                onDrop={() => {
                  if (drag) setTasks((ts) => ts.map((t) => (t.id === drag ? { ...t, status: s } : t)));
                  setDrag(null);
                  setOver(null);
                }}
              >
                <div className="column__head">
                  <h3>{s}</h3>
                  <span className="badge" style={{ height: 18 }}>{col.length}</span>
                </div>
                {col.map((t) => (
                  <div
                    key={t.id}
                    className={`ticket ${drag === t.id ? "ticket--dragging" : ""}`}
                    draggable
                    onDragStart={() => setDrag(t.id)}
                    onDragEnd={() => setDrag(null)}
                  >
                    <div className={`ticket__title ${t.status === "feito" ? "done-text" : ""}`}>{t.title}</div>
                    {t.clientId && (
                      <div className="row faint" style={{ fontSize: 12, marginTop: 6 }}>
                        <ClientTile clientId={t.clientId} size={14} /> {client(t.clientId)!.name}
                      </div>
                    )}
                    <div className="ticket__meta">
                      <Prio p={t.priority} />
                      <span className="ticket__key">{t.key}</span>
                      <span style={{ marginLeft: "auto" }}><Due d={t.due} /></span>
                      <Avatar userId={t.assignee} size={20} />
                    </div>
                    {/* Touch-friendly status change (no drag on phones) */}
                    <select
                      className="input status-select"
                      aria-label="Mudar estado"
                      value={t.status}
                      onChange={(e) => setTasks((ts) => ts.map((x) => (x.id === t.id ? { ...x, status: e.target.value as TaskStatus } : x)))}
                    >
                      {TASK_STATUSES.map((x) => <option key={x}>{x}</option>)}
                    </select>
                  </div>
                ))}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table table--cards">
            <thead>
              <tr>
                <th style={{ width: 30 }} />
                <th>Chave</th>
                <th>Tarefa</th>
                <th>Cliente</th>
                <th>Estado</th>
                <th>Prazo</th>
                <th>Responsável</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((t) => (
                <tr key={t.id}>
                  <td className="hide-sm"><Prio p={t.priority} /></td>
                  <td className="ticket__key">{t.key}</td>
                  <td style={{ fontWeight: 550 }}>{t.title}</td>
                  <td data-label="Cliente">{t.clientId ? client(t.clientId)!.name : <span className="faint">Agência</span>}</td>
                  <td><span className={`lozenge ${STATUS_CLS[t.status]}`}>{t.status}</span></td>
                  <td data-label="Prazo"><Due d={t.due} /></td>
                  <td><Avatar userId={t.assignee} size={22} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="faint" style={{ fontSize: 12, marginTop: 8 }}>
        {CLIENTS.length} clientes · {tasks.filter((t) => t.status !== "feito").length} tarefas abertas
      </p>
    </>
  );
}
