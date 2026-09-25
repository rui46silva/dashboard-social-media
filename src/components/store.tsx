"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import {
  ASSETS, ASSET_SRC, AUDIT, CLIENTS, DEALS, NOW, NPS, ONBOARDING, POSTS, PROFILES, PROPOSALS, SERVICES, TASKS, TIME_ENTRIES, USERS,
  client as getClient, upsertClient, user as getUser,
  type Asset, type AuditEntry, type Client, type ClientProfile, type Notification, type NpsResponse, type Post, type PostComment,
  type Proposal, type Task, type TimeEntry,
} from "@/lib/data";
import { DEFAULT_FISCAL, INVOICES, gross, setFiscalProfile, type FiscalProfile, type RuleId, type TargetId } from "@/lib/company";
import { GOALS, type CheckIn, type Goal } from "@/lib/goals";

/**
 * Prototype data store. Everything that changes lives here so a change made in
 * one screen (the client approving in the portal, a proposal being signed)
 * shows up everywhere. Persisted to localStorage; in production each slice is
 * a Supabase table with realtime subscriptions.
 */

type SavedClient = { base: Client; profile: ClientProfile };
type Timer = { taskId: string; startedAt: number } | null;
export type AlertStatus = "aberto" | "em curso" | "resolvido";
export type AlertState = { status: AlertStatus; owner?: string; note?: string; taskId?: string; title: string; at: Date; by: string };

type State = {
  posts: Post[];
  tasks: Task[];
  savedClients: SavedClient[];
  time: TimeEntry[];
  proposals: Proposal[];
  assets: Asset[];
  notifications: Notification[];
  nps: NpsResponse[];
  audit: AuditEntry[];
  inboxAnswered: Record<string, Date>;
  twoFactor: Record<string, boolean>;
  enforce2FA: boolean;
  timer: Timer;
  thresholds: Partial<Record<RuleId, number>>;
  targets: Partial<Record<TargetId, number>>;
  alertState: Record<string, AlertState>;
  invoicePaid: Record<string, Date>;
  reminders: Record<string, Date[]>;
  goals: Goal[];
  fiscal: FiscalProfile;
};

type Store = State & {
  savePost: (p: Post) => void;
  sendToClient: (id: string, by?: string) => void;
  clientApprove: (id: string, text?: string) => void;
  clientReject: (id: string, text: string) => void;
  confirmPost: (id: string, by?: string) => void;
  reopenPost: (id: string, by?: string) => void;
  saveTask: (t: Task) => void;
  addTask: (t: Partial<Task> & { title: string }) => Task;
  saveClient: (base: Client, profile: ClientProfile, isNew?: boolean) => void;
  addTime: (e: Omit<TimeEntry, "id">) => void;
  removeTime: (id: string) => void;
  startTimer: (taskId: string) => void;
  stopTimer: () => void;
  saveProposal: (p: Proposal) => void;
  sendProposal: (id: string) => void;
  viewProposal: (id: string) => void;
  signProposal: (id: string, name: string) => string | undefined;
  declineProposal: (id: string) => void;
  addAsset: (a: Asset) => void;
  removeAsset: (id: string) => void;
  answerInbox: (id: string) => void;
  submitNps: (r: Omit<NpsResponse, "id" | "date">) => void;
  setTwoFactor: (userId: string, on: boolean) => void;
  setEnforce2FA: (on: boolean) => void;
  setThreshold: (id: RuleId, value: number) => void;
  setTarget: (id: TargetId, value: number) => void;
  updateAlert: (key: string, patch: Partial<Omit<AlertState, "at" | "by" | "title">>, label: string) => void;
  markInvoicePaid: (id: string) => void;
  sendReminder: (id: string) => void;
  saveGoal: (g: Goal) => void;
  removeGoal: (id: string) => void;
  addCheckin: (goalId: string, c: Omit<CheckIn, "date" | "by">) => void;
  setFiscal: (patch: Partial<FiscalProfile>) => void;
  log: (action: string, target: string, who?: string) => void;
  reset: () => void;
};

const Ctx = createContext<Store | null>(null);
const KEY = "mesa:store:v3";

const isoRe = /^\d{4}-\d{2}-\d{2}T/;
const revive = (_: string, v: unknown) => (typeof v === "string" && isoRe.test(v) ? new Date(v) : v);
const uid = (p: string) => `${p}${Date.now().toString(36)}${Math.round(Math.random() * 1e4)}`;
const contactName = (clientId: string) => PROFILES[clientId]?.contact.name || "Cliente";

const SEED: State = {
  posts: POSTS,
  tasks: TASKS,
  savedClients: [],
  time: TIME_ENTRIES,
  proposals: PROPOSALS,
  assets: ASSETS,
  notifications: [],
  nps: NPS,
  audit: AUDIT,
  inboxAnswered: {},
  twoFactor: Object.fromEntries(USERS.map((u) => [u.id, u.twoFactor])),
  enforce2FA: false,
  timer: null,
  thresholds: {},
  targets: {},
  alertState: {},
  invoicePaid: {},
  reminders: {},
  goals: GOALS,
  fiscal: DEFAULT_FISCAL,
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<State>(SEED);
  // Only write back once stored data has been read, or the seed would overwrite it.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const data = { ...SEED, ...JSON.parse(raw, revive) } as State;
        data.savedClients.forEach((c) => upsertClient(c.base, c.profile));
        data.assets.forEach((a) => a.src && (ASSET_SRC[a.id] = a.src));
        data.proposals.forEach((p) => {
          const deal = p.status === "aceite" && DEALS.find((d) => d.id === p.dealId);
          if (deal) deal.stage = "Ganho";
        });
        setS(data);
      }
    } catch {
      /* corrupted or blocked storage — keep the seed data */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* quota exceeded (large images) — keep working in memory */
    }
  }, [s, hydrated]);

  const set = useCallback(<K extends keyof State>(k: K, fn: (v: State[K]) => State[K]) => setS((x) => ({ ...x, [k]: fn(x[k]) })), []);

  const log = (action: string, target: string, who = "u-rui") =>
    set("audit", (a) => [{ id: uid("l"), at: new Date(), who, action, target, ip: "85.244.12.x" }, ...a]);

  const patchPost = (id: string, fn: (p: Post) => Post) => set("posts", (ps) => ps.map((p) => (p.id === id ? fn(p) : p)));

  const note = (text: string, by = "u-rui"): PostComment => ({ by, name: getUser(by)?.name ?? "Agência", text, date: new Date(), kind: "sistema" });

  const addTask = (t: Partial<Task> & { title: string }) => {
    const task: Task = {
      id: uid("t"), assignee: "u-rui", due: null, section: "backlog", done: false, priority: "média", description: "",
      subtasks: [], comments: [], likes: [], collaborators: [], tags: [], createdBy: "u-rui", ...t,
    };
    set("tasks", (ts) => [task, ...ts]);
    return task;
  };

  /** Checklist tasks for a new client, assigned by role. */
  const createOnboarding = (base: Client, start: Date) => {
    const who = { gestor: base.manager, dev: "u-pedro", designer: "u-ines", ceo: "u-rui" } as const;
    const tasks: Task[] = ONBOARDING.map((step, i) => ({
      id: uid(`ob${i}`), title: step.title, clientId: base.id, assignee: who[step.role],
      due: new Date(start.getFullYear(), start.getMonth(), start.getDate() + step.day, 18),
      section: "backlog", done: false, priority: i < 3 ? "alta" : "média", description: step.description,
      subtasks: [], comments: [], likes: [], collaborators: [], tags: ["arranque"], createdBy: "u-rui",
    }));
    set("tasks", (ts) => [...tasks, ...ts]);
  };

  const saveClient = (base: Client, profile: ClientProfile, isNew = false) => {
    upsertClient(base, profile);
    set("savedClients", (cs) => [...cs.filter((c) => c.base.id !== base.id), { base, profile }]);
    if (isNew) createOnboarding(base, NOW);
    log(isNew ? "Criou cliente" : "Editou cliente", base.name);
  };

  const store: Store = {
    ...s,
    savePost: (p) => set("posts", (ps) => (ps.some((x) => x.id === p.id) ? ps.map((x) => (x.id === p.id ? p : x)) : [...ps, p])),
    sendToClient: (id, by = "u-rui") => {
      const p = s.posts.find((x) => x.id === id);
      patchPost(id, (x) => ({ ...x, status: "uat", comments: [...x.comments, note("Enviado ao cliente para aprovação.", by)] }));
      if (!p) return;
      const prof = PROFILES[p.clientId];
      const prefs = prof?.notify ?? { email: true, whatsapp: true };
      const link = `mesa.app/aprovar/${p.id}`;
      const first = contactName(p.clientId).split(" ")[0];
      const msgs: Notification[] = [];
      if (prefs.whatsapp && prof?.contact.phone)
        msgs.push({
          id: uid("nt"), channel: "whatsapp", clientId: p.clientId, postIds: [p.id], to: prof.contact.phone,
          subject: "", body: `Olá ${first}! Há uma publicação nova para aprovar: «${p.caption}». Vê como fica e aprova num clique: ${link}`,
          sentAt: new Date(), status: "enviada",
        });
      if (prefs.email && prof?.contact.email)
        msgs.push({
          id: uid("nt"), channel: "email", clientId: p.clientId, postIds: [p.id], to: prof.contact.email,
          subject: `Para aprovar: ${p.caption}`, body: `Olá ${first},\n\nPreparámos uma nova publicação para ${getClient(p.clientId)!.name}. Podes ver exatamente como vai aparecer e aprovar (ou pedir alterações) aqui:\n${link}\n\nObrigado!`,
          sentAt: new Date(), status: "enviada",
        });
      set("notifications", (n) => [...msgs, ...n]);
      log("Enviou publicação ao cliente", `${getClient(p.clientId)!.name} · ${p.caption}`, by);
    },
    clientApprove: (id, text) => {
      const p = s.posts.find((x) => x.id === id);
      patchPost(id, (x) => ({
        ...x, status: "confirmar",
        comments: [...x.comments, { by: "cliente", name: contactName(x.clientId), text: text?.trim() || "Aprovado.", date: new Date(), kind: "feedback" }],
      }));
      set("notifications", (ns) => ns.map((n) => (n.postIds.includes(id) ? { ...n, status: "respondida" } : n)));
      if (p) log("Aprovou publicação", `${getClient(p.clientId)!.name} · ${p.caption}`, `cliente:${contactName(p.clientId)}`);
    },
    clientReject: (id, text) => {
      const p = s.posts.find((x) => x.id === id);
      patchPost(id, (x) => ({
        ...x, status: "todo", rounds: x.rounds + 1,
        comments: [...x.comments, { by: "cliente", name: contactName(x.clientId), text, date: new Date(), kind: "feedback" }],
      }));
      set("notifications", (ns) => ns.map((n) => (n.postIds.includes(id) ? { ...n, status: "respondida" } : n)));
      if (!p) return;
      addTask({
        title: `Alterações pedidas: «${p.caption}»`, clientId: p.clientId, assignee: p.author,
        due: new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() + 1, 12), priority: "alta", tags: ["conteúdo", "alterações"], estimate: 1,
        description: `${contactName(p.clientId)} (${getClient(p.clientId)!.name}) pediu alterações:\n\n«${text}»\n\nCorrigir e voltar a enviar para aprovação.`,
      });
      log("Pediu alterações", `${getClient(p.clientId)!.name} · ${p.caption}`, `cliente:${contactName(p.clientId)}`);
    },
    confirmPost: (id, by = "u-rui") => {
      patchPost(id, (p) => ({ ...p, status: "agendado", comments: [...p.comments, note("Confirmado e agendado.", by)] }));
      log("Confirmou e agendou publicação", s.posts.find((p) => p.id === id)?.caption ?? id, by);
    },
    reopenPost: (id, by = "u-rui") => patchPost(id, (p) => ({ ...p, status: "todo", comments: [...p.comments, note("Voltou para produção.", by)] })),
    saveTask: (t) => set("tasks", (ts) => ts.map((x) => (x.id === t.id ? t : x))),
    addTask,
    saveClient,
    addTime: (e) => set("time", (t) => [{ ...e, id: uid("te") }, ...t]),
    removeTime: (id) => set("time", (t) => t.filter((x) => x.id !== id)),
    startTimer: (taskId) => {
      if (s.timer) store.stopTimer();
      set("timer", () => ({ taskId, startedAt: Date.now() }));
    },
    stopTimer: () => {
      const t = s.timer;
      if (!t) return;
      const task = s.tasks.find((x) => x.id === t.taskId);
      const minutes = Math.max(1, Math.round((Date.now() - t.startedAt) / 60000));
      set("timer", () => null);
      if (task)
        set("time", (te) => [
          { id: uid("te"), userId: task.assignee, clientId: task.clientId, taskId: task.id, date: new Date(), minutes, note: task.title, billable: !!task.clientId },
          ...te,
        ]);
    },
    saveProposal: (p) => set("proposals", (ps) => (ps.some((x) => x.id === p.id) ? ps.map((x) => (x.id === p.id ? p : x)) : [p, ...ps])),
    sendProposal: (id) => {
      const p = s.proposals.find((x) => x.id === id);
      set("proposals", (ps) => ps.map((x) => (x.id === id ? { ...x, status: "enviada", sentAt: new Date() } : x)));
      if (!p) return;
      set("notifications", (n) => [
        {
          id: uid("nt"), channel: "email", clientId: "", postIds: [], to: p.contactEmail, subject: `Proposta: ${p.title}`,
          body: `Olá ${p.contactName.split(" ")[0]},\n\nSegue a nossa proposta para a ${p.company}. Podes lê-la e aceitá-la online: mesa.app/proposta/${p.id}`,
          sentAt: new Date(), status: "enviada",
        },
        ...n,
      ]);
      log("Enviou proposta", p.company);
    },
    viewProposal: (id) =>
      set("proposals", (ps) => ps.map((x) => (x.id === id && x.status === "enviada" ? { ...x, status: "vista", viewedAt: new Date() } : x))),
    signProposal: (id, name) => {
      const p = s.proposals.find((x) => x.id === id);
      if (!p || p.status === "aceite") return p?.clientId;
      const fee = p.items.filter((i) => i.recurring).reduce((a, i) => a + i.price, 0);
      const setup = p.items.filter((i) => !i.recurring).reduce((a, i) => a + i.price, 0);
      const slugId = p.company.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const clientId = CLIENTS.some((c) => c.id === slugId) ? `${slugId}-${Date.now() % 1000}` : slugId;
      const start = new Date(NOW.getFullYear(), NOW.getMonth() + 1, 1);
      const base: Client = {
        id: clientId, name: p.company, sector: p.sector, since: "", manager: p.createdBy, networks: ["instagram", "facebook"],
        site: "", hue: 300, inboxOwner: p.createdBy,
      };
      const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
      base.since = `${MONTHS[start.getMonth()]} ${start.getFullYear()}`;
      const profile: ClientProfile = {
        clientId, description: p.intro, city: p.city, nif: "",
        contact: { name: p.contactName, role: "", email: p.contactEmail, phone: "" },
        fee, setupFee: setup, start, end: new Date(start.getFullYear(), start.getMonth() + p.months, 0), billingDay: 1,
        services: p.items.map((i) => SERVICES.find((sv) => i.service.startsWith(sv.split(" ")[0])) ?? i.service),
        postsPerMonth: 12, hoursPerMonth: Math.round(fee / 38), team: [p.createdBy], handles: {}, goals: [],
        tone: "", audience: "", hashtags: "", avoid: "", competitors: "", notes: `Cliente desde a proposta «${p.title}».`,
        notify: { email: true, whatsapp: false },
      };
      set("proposals", (ps) => ps.map((x) => (x.id === id ? { ...x, status: "aceite", signedAt: new Date(), signedBy: name, clientId } : x)));
      const deal = DEALS.find((d) => d.id === p.dealId);
      if (deal) Object.assign(deal, { stage: "Ganho", updated: NOW });
      saveClient(base, profile, true);
      log("Assinou proposta", `${p.company} · ${name}`, `cliente:${name}`);
      return clientId;
    },
    declineProposal: (id) => set("proposals", (ps) => ps.map((x) => (x.id === id ? { ...x, status: "recusada" } : x))),
    addAsset: (a) => {
      if (a.src) ASSET_SRC[a.id] = a.src;
      set("assets", (as) => [a, ...as]);
      log("Carregou ficheiro", `${getClient(a.clientId)?.name} · ${a.name}`, a.uploadedBy);
    },
    removeAsset: (id) => set("assets", (as) => as.filter((a) => a.id !== id)),
    answerInbox: (id) => set("inboxAnswered", (m) => ({ ...m, [id]: new Date() })),
    submitNps: (r) => {
      set("nps", (n) => [{ ...r, id: uid("n"), date: new Date() }, ...n]);
      log("Respondeu ao inquérito de satisfação", `${getClient(r.clientId)?.name} · ${r.score}/10`, `cliente:${r.by}`);
    },
    setTwoFactor: (userId, on) => {
      set("twoFactor", (m) => ({ ...m, [userId]: on }));
      log(on ? "Ativou 2FA" : "Desativou 2FA", getUser(userId).name);
    },
    setEnforce2FA: (on) => {
      set("enforce2FA", () => on);
      log(on ? "Tornou 2FA obrigatório" : "Deixou 2FA opcional", "Toda a equipa");
    },
    setThreshold: (id, value) => set("thresholds", (t) => ({ ...t, [id]: value })),
    setTarget: (id, value) => set("targets", (t) => ({ ...t, [id]: value })),
    updateAlert: (key, patch, label) => {
      const prev = s.alertState[key];
      set("alertState", (m) => ({ ...m, [key]: { ...(m[key] ?? { status: "aberto" }), ...patch, title: label, at: new Date(), by: "u-rui" } }));
      if (patch.status && patch.status !== prev?.status) log(`Alerta ${patch.status}`, label);
    },
    markInvoicePaid: (id) => {
      const i = INVOICES.find((x) => x.id === id);
      set("invoicePaid", (m) => ({ ...m, [id]: new Date() }));
      if (i) log("Marcou fatura como paga", `${i.number} · ${getClient(i.clientId)?.name}`);
    },
    sendReminder: (id) => {
      const i = INVOICES.find((x) => x.id === id);
      if (!i) return;
      const prof = PROFILES[i.clientId];
      const first = contactName(i.clientId).split(" ")[0];
      const value = `${gross(i).toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
      set("reminders", (m) => ({ ...m, [id]: [...(m[id] ?? []), new Date()] }));
      set("notifications", (n) => [
        {
          id: uid("nt"), channel: "email", clientId: i.clientId, postIds: [], to: prof?.contact.email ?? "",
          subject: `Lembrete: fatura ${i.number}`,
          body: `Olá ${first},\n\nA fatura ${i.number} (${i.description}), no valor de ${value}, venceu a ${i.due.toLocaleDateString("pt-PT")}. Podes confirmar-nos a data de pagamento?\n\nObrigado!`,
          sentAt: new Date(), status: "enviada",
        },
        ...n,
      ]);
      log("Enviou lembrete de pagamento", `${i.number} · ${getClient(i.clientId)?.name}`);
    },
    saveGoal: (g) => {
      const isNew = !s.goals.some((x) => x.id === g.id);
      set("goals", (gs) => (isNew ? [...gs, g] : gs.map((x) => (x.id === g.id ? g : x))));
      log(isNew ? "Criou meta" : "Editou meta", g.title);
    },
    removeGoal: (id) => {
      const g = s.goals.find((x) => x.id === id);
      set("goals", (gs) => gs.filter((x) => x.id !== id));
      if (g) log("Apagou meta", g.title);
    },
    addCheckin: (goalId, c) =>
      set("goals", (gs) => gs.map((g) => (g.id === goalId ? { ...g, checkins: [...g.checkins, { ...c, date: new Date(), by: "u-rui" }] } : g))),
    setFiscal: (patch) => {
      set("fiscal", (f) => {
        const next = { ...f, ...patch };
        if (next.entity === "sociedade" && next.vat === "isento") next.vat = "trimestral";
        return next;
      });
      if (patch.entity || patch.vat) log("Mudou o perfil fiscal", [patch.entity, patch.vat].filter(Boolean).join(" · "));
    },
    log,
    reset: () => {
      try {
        localStorage.removeItem(KEY);
      } catch {}
      window.location.reload();
    },
  };

  // Fiscal rules are read by the pure functions in lib/company during render.
  setFiscalProfile(s.fiscal);

  // Saved clients are merged into the in-memory tables on load, so render only
  // after that — otherwise server and browser HTML would disagree.
  return <Ctx.Provider value={store}>{hydrated ? children : null}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside StoreProvider");
  return s;
}
