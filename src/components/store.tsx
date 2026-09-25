"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { NOW, POSTS, PROFILES, TASKS, client as getClient, upsertClient, type Client, type ClientProfile, type Post, type PostComment, type Task } from "@/lib/data";

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
  /** Clients created or edited in this browser (seed clients are in data.ts). */
  savedClients: { base: Client; profile: ClientProfile }[];
  saveClient: (base: Client, profile: ClientProfile) => void;
  reset: () => void;
};

type SavedClient = { base: Client; profile: ClientProfile };

const Ctx = createContext<Store | null>(null);
const KEY = "mesa:store:v2";

const isoRe = /^\d{4}-\d{2}-\d{2}T/;
const revive = (_: string, v: unknown) => (typeof v === "string" && isoRe.test(v) ? new Date(v) : v);

const contactName = (clientId: string) => PROFILES[clientId]?.contact.name || "Cliente";

const USER_NAME: Record<string, string> = { "u-rui": "Rui Silva" };

export function StoreProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<Post[]>(POSTS);
  const [tasks, setTasks] = useState<Task[]>(TASKS);
  const [savedClients, setSavedClients] = useState<SavedClient[]>([]);
  // Only write back once stored data has been read, or the seed would overwrite it.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const data = JSON.parse(raw, revive);
        if (Array.isArray(data.posts)) setPosts(data.posts);
        if (Array.isArray(data.tasks)) setTasks(data.tasks);
        if (Array.isArray(data.clients)) {
          (data.clients as SavedClient[]).forEach((c) => upsertClient(c.base, c.profile));
          setSavedClients(data.clients);
        }
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
      localStorage.setItem(KEY, JSON.stringify({ posts, tasks, clients: savedClients }));
    } catch {}
  }, [posts, tasks, savedClients, hydrated]);

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
        comments: [...p.comments, { by: "cliente", name: contactName(p.clientId), text: text?.trim() || "Aprovado.", date: new Date(), kind: "feedback" }],
      })),
    clientReject: (id, text) => {
      const p = posts.find((x) => x.id === id);
      patchPost(id, (x) => ({
        ...x,
        status: "todo",
        rounds: x.rounds + 1,
        comments: [...x.comments, { by: "cliente", name: contactName(x.clientId), text, date: new Date(), kind: "feedback" }],
      }));
      if (p) {
        addTask({
          title: `Alterações pedidas: «${p.caption}»`,
          clientId: p.clientId,
          assignee: p.author,
          due: new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() + 1, 12),
          priority: "alta",
          tags: ["conteúdo", "alterações"],
          description: `${contactName(p.clientId)} (${getClient(p.clientId)!.name}) pediu alterações:\n\n«${text}»\n\nCorrigir e voltar a enviar para aprovação.`,
        });
      }
    },
    confirmPost: (id, by) =>
      patchPost(id, (p) => ({ ...p, status: "agendado", comments: [...p.comments, note("Confirmado e agendado.", by)] })),
    reopenPost: (id, by) =>
      patchPost(id, (p) => ({ ...p, status: "todo", comments: [...p.comments, note("Voltou para produção.", by)] })),
    saveTask: (t) => setTasks((ts) => ts.map((x) => (x.id === t.id ? t : x))),
    addTask,
    savedClients,
    saveClient: (base, profile) => {
      upsertClient(base, profile);
      setSavedClients((cs) => [...cs.filter((c) => c.base.id !== base.id), { base, profile }]);
    },
    reset: () => {
      try {
        localStorage.removeItem(KEY);
      } catch {}
      window.location.reload();
    },
  };

  // Saved clients are merged into the in-memory tables on load, so render only
  // after that — otherwise server and browser HTML would disagree.
  return <Ctx.Provider value={store}>{hydrated ? children : null}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside StoreProvider");
  return s;
}
