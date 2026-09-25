"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { NOW, POSTS, TASKS, client as getClient, type Post, type PostComment, type Task } from "@/lib/data";

/**
 * Prototype data store. Posts and tasks live here so a change made in one
 * screen (e.g. the client approving in the portal) shows up everywhere.
 * Persisted to localStorage; in production this becomes Supabase + realtime.
 */

type Store = {
  posts: Post[];
  tasks: Task[];
  savePost: (p: Post) => void;
  sendToClient: (id: string, by?: string) => void;
  clientApprove: (id: string, text?: string) => void;
  clientReject: (id: string, text: string) => void;
  confirmPost: (id: string, by?: string) => void;
  reopenPost: (id: string, by?: string) => void;
  saveTask: (t: Task) => void;
  addTask: (t: Partial<Task> & { title: string }) => Task;
  reset: () => void;
};

const Ctx = createContext<Store | null>(null);
const KEY = "mesa:store:v2";

const isoRe = /^\d{4}-\d{2}-\d{2}T/;
const revive = (_: string, v: unknown) => (typeof v === "string" && isoRe.test(v) ? new Date(v) : v);

const CONTACT: Record<string, string> = {
  "casa-lume": "Sofia Mendes",
  orvalho: "Filipa Costa",
  kinetik: "Marco Teixeira",
  atlantico: "Nuno Ferraz",
};

const USER_NAME: Record<string, string> = { "u-rui": "Rui Silva" };

export function StoreProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<Post[]>(POSTS);
  const [tasks, setTasks] = useState<Task[]>(TASKS);
  // Only write back once stored data has been read, or the seed would overwrite it.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const data = JSON.parse(raw, revive);
        if (Array.isArray(data.posts)) setPosts(data.posts);
        if (Array.isArray(data.tasks)) setTasks(data.tasks);
      }
    } catch {
      /* corrupted or blocked storage — keep the seed data */
    }
    setHydrated(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEY || !e.newValue) return;
      try {
        const data = JSON.parse(e.newValue, revive);
        setPosts(data.posts);
        setTasks(data.tasks);
      } catch {}
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ posts, tasks }));
    } catch {}
  }, [posts, tasks, hydrated]);

  const patchPost = useCallback((id: string, fn: (p: Post) => Post) => {
    setPosts((ps) => ps.map((p) => (p.id === id ? fn(p) : p)));
  }, []);

  const note = (text: string, by = "u-rui", kind: PostComment["kind"] = "sistema"): PostComment => ({
    by,
    name: USER_NAME[by] ?? "Agência",
    text,
    date: new Date(),
    kind,
  });

  const addTask = useCallback((t: Partial<Task> & { title: string }) => {
    const task: Task = {
      id: `t${Date.now()}${Math.round(Math.random() * 1000)}`,
      assignee: "u-rui",
      due: null,
      section: "backlog",
      done: false,
      priority: "média",
      description: "",
      subtasks: [],
      comments: [],
      likes: [],
      collaborators: [],
      tags: [],
      createdBy: "u-rui",
      ...t,
    };
    setTasks((ts) => [task, ...ts]);
    return task;
  }, []);

  const store: Store = {
    posts,
    tasks,
    savePost: (p) => setPosts((ps) => (ps.some((x) => x.id === p.id) ? ps.map((x) => (x.id === p.id ? p : x)) : [...ps, p])),
    sendToClient: (id, by) =>
      patchPost(id, (p) => ({ ...p, status: "uat", comments: [...p.comments, note("Enviado ao cliente para aprovação.", by)] })),
    clientApprove: (id, text) =>
      patchPost(id, (p) => ({
        ...p,
        status: "confirmar",
        comments: [...p.comments, { by: "cliente", name: CONTACT[p.clientId], text: text?.trim() || "Aprovado.", date: new Date(), kind: "feedback" }],
      })),
    clientReject: (id, text) => {
      const p = posts.find((x) => x.id === id);
      patchPost(id, (x) => ({
        ...x,
        status: "todo",
        rounds: x.rounds + 1,
        comments: [...x.comments, { by: "cliente", name: CONTACT[x.clientId], text, date: new Date(), kind: "feedback" }],
      }));
      if (p) {
        addTask({
          title: `Alterações pedidas: «${p.caption}»`,
          clientId: p.clientId,
          assignee: p.author,
          due: new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() + 1, 12),
          priority: "alta",
          tags: ["conteúdo", "alterações"],
          description: `${CONTACT[p.clientId]} (${getClient(p.clientId)!.name}) pediu alterações:\n\n«${text}»\n\nCorrigir e voltar a enviar para aprovação.`,
        });
      }
    },
    confirmPost: (id, by) =>
      patchPost(id, (p) => ({ ...p, status: "agendado", comments: [...p.comments, note("Confirmado e agendado.", by)] })),
    reopenPost: (id, by) =>
      patchPost(id, (p) => ({ ...p, status: "todo", comments: [...p.comments, note("Voltou para produção.", by)] })),
    saveTask: (t) => setTasks((ts) => ts.map((x) => (x.id === t.id ? t : x))),
    addTask,
    reset: () => {
      setPosts(POSTS);
      setTasks(TASKS);
    },
  };

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside StoreProvider");
  return s;
}
