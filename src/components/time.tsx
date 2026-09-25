"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Clock, Pause, Play, Trash2 } from "lucide-react";
import { NOW, type Task } from "@/lib/data";
import { dayMonth } from "@/lib/format";
import { Avatar } from "./ui";
import { useStore } from "./store";
import { useSession } from "./session";

export const hm = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h ? (m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`) : `${m}min`;
};

function useTick(active: boolean) {
  const [, setN] = useState(0);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setN((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [active]);
}

const clock = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

/** Running timer, shown in the top bar from any page. */
export function TimerPill() {
  const { timer, tasks, stopTimer } = useStore();
  useTick(!!timer);
  if (!timer) return null;
  const task = tasks.find((t) => t.id === timer.taskId);
  return (
    <div className="timer-pill">
      <span className="timer-pill__dot" />
      <Link href={`/tarefas?t=${timer.taskId}`} className="truncate timer-pill__name">{task?.title ?? "Tarefa"}</Link>
      <span className="num">{clock(Date.now() - timer.startedAt)}</span>
      <button onClick={stopTimer} aria-label="Parar cronómetro" title="Parar e registar"><Pause size={14} fill="currentColor" /></button>
    </div>
  );
}

/** Time section inside the task pane: estimate, timer, manual log and entries. */
export function TaskTime({ task, onEstimate }: { task: Task; onEstimate: (h: number | undefined) => void }) {
  const { time, timer, startTimer, stopTimer, addTime, removeTime } = useStore();
  const { user: me } = useSession();
  const [mins, setMins] = useState("");
  const [note, setNote] = useState("");
  const running = timer?.taskId === task.id;
  useTick(running);
  const entries = time.filter((e) => e.taskId === task.id);
  const total = entries.reduce((a, e) => a + e.minutes, 0) + (running && timer ? (Date.now() - timer.startedAt) / 60000 : 0);
  const est = task.estimate ? task.estimate * 60 : 0;
  const over = est && total > est;

  return (
    <div>
      <div className="spread" style={{ marginBottom: 8 }}>
        <span className="eyebrow">Tempo</span>
        <span className="faint" style={{ fontSize: 12 }}>
          {hm(total)}{est ? ` de ${hm(est)} estimadas` : " registadas"}
        </span>
      </div>
      {est > 0 && (
        <div className="progress" style={{ marginBottom: 12 }}>
          <i style={{ width: `${Math.min(100, (total / est) * 100)}%`, background: over ? "var(--bad)" : "var(--good-strong)" }} />
        </div>
      )}
      <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
        <button className={`btn btn--sm ${running ? "btn--danger" : "btn--primary"}`} onClick={() => (running ? stopTimer() : startTimer(task.id))}>
          {running ? <><Pause size={13} fill="currentColor" /> Parar · {clock(Date.now() - timer!.startedAt)}</> : <><Play size={13} fill="currentColor" /> Iniciar cronómetro</>}
        </button>
        <label className="row" style={{ gap: 6, fontSize: 13 }}>
          Estimativa
          <input
            className="input"
            style={{ width: 70, height: 28 }}
            type="number"
            min={0}
            step={0.5}
            value={task.estimate ?? ""}
            onChange={(e) => onEstimate(e.target.value ? Number(e.target.value) : undefined)}
            aria-label="Estimativa em horas"
          />
          h
        </label>
      </div>
      <form
        className="row"
        style={{ marginTop: 10, gap: 6 }}
        onSubmit={(e) => {
          e.preventDefault();
          const m = Number(mins);
          if (!m) return;
          addTime({ userId: me.id, clientId: task.clientId, taskId: task.id, date: NOW, minutes: m, note: note || task.title, billable: !!task.clientId });
          setMins("");
          setNote("");
        }}
      >
        <input className="input" style={{ width: 90, height: 30 }} type="number" min={5} step={5} placeholder="min" value={mins} onChange={(e) => setMins(e.target.value)} aria-label="Minutos" />
        <input className="input" style={{ height: 30 }} placeholder="O que fizeste? (opcional)" value={note} onChange={(e) => setNote(e.target.value)} />
        <button className="btn btn--sm" type="submit" disabled={!Number(mins)}><Clock size={13} /> Registar</button>
      </form>
      {entries.length > 0 && (
        <div style={{ marginTop: 10 }}>
          {entries.slice(0, 6).map((e) => (
            <div key={e.id} className="subtask">
              <Avatar userId={e.userId} size={20} />
              <span className="grow truncate" style={{ fontSize: 13 }}>{e.note}</span>
              <span className="faint" style={{ fontSize: 12 }}>{dayMonth(e.date)}</span>
              <span className="num" style={{ fontSize: 13, fontWeight: 600, minWidth: 48, textAlign: "right" }}>{hm(e.minutes)}</span>
              <button className="icon-btn" style={{ width: 24, height: 24 }} onClick={() => removeTime(e.id)} aria-label="Apagar registo"><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
