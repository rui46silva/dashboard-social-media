"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Plus, Trash2, X } from "lucide-react";
import {
  CLIENTS, NETWORKS, NOW, PROFILES, SERVICES, USERS,
  type Client, type ClientProfile, type Goal, type NetworkId,
} from "@/lib/data";
import { money } from "@/lib/format";
import { Avatar, NetIcon } from "./ui";
import { useStore } from "./store";

const STEPS = ["Cliente", "Contrato", "Equipa e redes", "Metas", "Marca e voz"] as const;
const HUES = [15, 38, 70, 140, 170, 200, 250, 300, 340];
const TEAM = USERS.filter((u) => u.role !== "cliente");

const slug = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `cliente-${Date.now()}`;

const toInput = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fromInput = (v: string) => {
  const [y, m, d] = v.split("-").map(Number);
  return new Date(y, m - 1, d);
};

function emptyProfile(): ClientProfile {
  return {
    clientId: "",
    description: "",
    city: "",
    nif: "",
    contact: { name: "", role: "", email: "", phone: "" },
    fee: 1000,
    setupFee: 0,
    start: new Date(NOW.getFullYear(), NOW.getMonth() + 1, 1),
    end: new Date(NOW.getFullYear() + 1, NOW.getMonth() + 1, 0),
    billingDay: 1,
    services: ["Gestão de redes sociais", "Criação de conteúdo"],
    postsPerMonth: 12,
    hoursPerMonth: 25,
    team: [],
    handles: {},
    goals: [],
    tone: "",
    audience: "",
    hashtags: "",
    avoid: "",
    competitors: "",
    notes: "",
  };
}

/** Create or edit a client. Everything here feeds the CRM, the client page and the portal. */
export function ClientForm({ clientId, onClose }: { clientId?: string; onClose: () => void }) {
  const router = useRouter();
  const { saveClient } = useStore();
  const existing = clientId ? CLIENTS.find((c) => c.id === clientId) : undefined;
  const [step, setStep] = useState(0);
  const [base, setBase] = useState<Client>(
    existing ?? { id: "", name: "", sector: "", since: "", manager: "u-rui", networks: [], site: "", hue: HUES[Math.floor(Math.random() * HUES.length)], inboxOwner: "u-rui" },
  );
  const [p, setP] = useState<ClientProfile>(existing ? structuredClone(PROFILES[existing.id]) ?? emptyProfile() : emptyProfile());
  const [connected, setConnected] = useState<NetworkId[]>(existing?.networks ?? []);
  const [ga, setGa] = useState(!!existing);
  const [tried, setTried] = useState(false);

  const setContact = (k: keyof ClientProfile["contact"], v: string) => setP((x) => ({ ...x, contact: { ...x.contact, [k]: v } }));
  const valid = base.name.trim().length > 1 && connected.length > 0;

  const save = () => {
    setTried(true);
    if (!valid) {
      setStep(!base.name.trim() ? 0 : 2);
      return;
    }
    const id = existing?.id ?? (CLIENTS.some((c) => c.id === slug(base.name)) ? `${slug(base.name)}-${Date.now() % 1000}` : slug(base.name));
    const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    const finalBase: Client = {
      ...base,
      id,
      name: base.name.trim(),
      networks: connected,
      since: base.since || `${MONTHS[p.start.getMonth()]} ${p.start.getFullYear()}`,
    };
    const finalProfile: ClientProfile = {
      ...p,
      clientId: id,
      team: Array.from(new Set([base.manager, base.inboxOwner, ...p.team])),
    };
    saveClient(finalBase, finalProfile, !existing);
    onClose();
    if (!existing) router.push(`/clientes/${id}`);
  };

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <aside className="drawer drawer--wide" role="dialog" aria-label={existing ? "Editar cliente" : "Novo cliente"}>
        <div className="drawer__head">
          <h2>{existing ? `Editar ${existing.name}` : "Novo cliente"}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar"><X size={18} /></button>
        </div>

        <nav className="stepper" aria-label="Passos">
          {STEPS.map((s, i) => (
            <button key={s} className={`stepper__step ${i === step ? "is-on" : ""} ${i < step ? "is-done" : ""}`} onClick={() => setStep(i)}>
              <span>{i < step ? <Check size={12} strokeWidth={3} /> : i + 1}</span>
              {s}
            </button>
          ))}
        </nav>

        <div className="drawer__body">
          {step === 0 && (
            <>
              <label className="field">
                <span>Nome da marca *</span>
                <input className="input" autoFocus value={base.name} onChange={(e) => setBase({ ...base, name: e.target.value })} placeholder="Ex.: Vinhos Serra Alta" />
                {tried && base.name.trim().length < 2 && <em className="field-error">Indica o nome do cliente.</em>}
              </label>
              <div className="grid grid--2">
                <label className="field">
                  <span>Setor</span>
                  <input className="input" value={base.sector} onChange={(e) => setBase({ ...base, sector: e.target.value })} placeholder="Vinhos" />
                </label>
                <label className="field">
                  <span>Cidade</span>
                  <input className="input" value={p.city} onChange={(e) => setP({ ...p, city: e.target.value })} placeholder="Viseu" />
                </label>
                <label className="field">
                  <span>Site</span>
                  <input className="input" value={base.site} onChange={(e) => setBase({ ...base, site: e.target.value })} placeholder="serraalta.pt" />
                </label>
                <label className="field">
                  <span>NIF</span>
                  <input className="input" value={p.nif} onChange={(e) => setP({ ...p, nif: e.target.value })} placeholder="500 000 000" />
                </label>
              </div>
              <label className="field">
                <span>Descrição</span>
                <textarea
                  className="input"
                  value={p.description}
                  onChange={(e) => setP({ ...p, description: e.target.value })}
                  placeholder="O que faz a marca, o que a torna diferente e o que quer conseguir com a agência."
                />
              </label>
              <div className="field">
                <span>Cor do cliente</span>
                <div className="row" style={{ flexWrap: "wrap" }}>
                  {HUES.map((h) => (
                    <button
                      key={h}
                      className="swatch"
                      aria-pressed={base.hue === h}
                      aria-label={`Cor ${h}`}
                      style={{ background: `oklch(0.52 0.09 ${h})` }}
                      onClick={() => setBase({ ...base, hue: h })}
                    >
                      {base.hue === h && <Check size={14} strokeWidth={3} />}
                    </button>
                  ))}
                </div>
              </div>
              <div className="eyebrow" style={{ marginTop: 4 }}>Contacto principal</div>
              <div className="grid grid--2">
                <label className="field"><span>Nome</span><input className="input" value={p.contact.name} onChange={(e) => setContact("name", e.target.value)} /></label>
                <label className="field"><span>Cargo</span><input className="input" value={p.contact.role} onChange={(e) => setContact("role", e.target.value)} /></label>
                <label className="field"><span>Email</span><input className="input" type="email" value={p.contact.email} onChange={(e) => setContact("email", e.target.value)} /></label>
                <label className="field"><span>Telefone</span><input className="input" type="tel" value={p.contact.phone} onChange={(e) => setContact("phone", e.target.value)} /></label>
              </div>
              <p className="faint" style={{ fontSize: 12 }}>O contacto é criado no CRM e recebe o acesso ao portal.</p>
            </>
          )}

          {step === 1 && (
            <>
              <div className="grid grid--2">
                <label className="field">
                  <span>Avença mensal (€)</span>
                  <input className="input" type="number" min={0} step={50} value={p.fee} onChange={(e) => setP({ ...p, fee: Number(e.target.value) })} />
                </label>
                <label className="field">
                  <span>Taxa de arranque (€)</span>
                  <input className="input" type="number" min={0} step={50} value={p.setupFee} onChange={(e) => setP({ ...p, setupFee: Number(e.target.value) })} />
                </label>
                <label className="field">
                  <span>Início do contrato</span>
                  <input className="input" type="date" value={toInput(p.start)} onChange={(e) => e.target.value && setP({ ...p, start: fromInput(e.target.value) })} />
                </label>
                <label className="field">
                  <span>Fim / renovação</span>
                  <input className="input" type="date" value={toInput(p.end)} onChange={(e) => e.target.value && setP({ ...p, end: fromInput(e.target.value) })} />
                </label>
                <label className="field">
                  <span>Dia de faturação</span>
                  <select className="input" value={p.billingDay} onChange={(e) => setP({ ...p, billingDay: Number(e.target.value) })}>
                    {[1, 5, 8, 15, 20, 25].map((d) => <option key={d} value={d}>Dia {d}</option>)}
                  </select>
                </label>
                <div />
                <label className="field">
                  <span>Publicações por mês</span>
                  <input className="input" type="number" min={0} value={p.postsPerMonth} onChange={(e) => setP({ ...p, postsPerMonth: Number(e.target.value) })} />
                </label>
                <label className="field">
                  <span>Horas previstas por mês</span>
                  <input className="input" type="number" min={0} value={p.hoursPerMonth} onChange={(e) => setP({ ...p, hoursPerMonth: Number(e.target.value) })} />
                </label>
              </div>
              <div className="field">
                <span>Serviços incluídos</span>
                <div className="row" style={{ flexWrap: "wrap" }}>
                  {SERVICES.map((s) => (
                    <button
                      key={s}
                      className="chip"
                      aria-pressed={p.services.includes(s)}
                      onClick={() => setP({ ...p, services: p.services.includes(s) ? p.services.filter((x) => x !== s) : [...p.services, s] })}
                    >
                      {p.services.includes(s) && <Check size={13} />} {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="card card__body" style={{ fontSize: 13 }}>
                <div className="spread"><span className="muted">Valor anual</span><strong className="num">{money(p.fee * 12 + p.setupFee)}</strong></div>
                <div className="spread" style={{ marginTop: 6 }}>
                  <span className="muted">Valor por hora prevista</span>
                  <strong className="num" style={{ color: p.hoursPerMonth && p.fee / p.hoursPerMonth < 30 ? "var(--bad)" : undefined }}>
                    {p.hoursPerMonth ? money(p.fee / p.hoursPerMonth) : "—"}
                  </strong>
                </div>
                {p.hoursPerMonth > 0 && p.fee / p.hoursPerMonth < 30 && (
                  <p className="due--late" style={{ marginTop: 8 }}>Abaixo de 30 €/h a margem fica curta. Revê o preço ou o número de horas.</p>
                )}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="grid grid--2">
                <label className="field">
                  <span>Gestor de conta</span>
                  <select className="input" value={base.manager} onChange={(e) => setBase({ ...base, manager: e.target.value })}>
                    {TEAM.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </label>
                <label className="field">
                  <span>Responsável pela inbox</span>
                  <select className="input" value={base.inboxOwner} onChange={(e) => setBase({ ...base, inboxOwner: e.target.value })}>
                    {TEAM.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </label>
              </div>
              <p className="faint" style={{ fontSize: 12, marginTop: -8 }}>Só esta pessoa recebe os comentários e mensagens deste cliente.</p>
              <div className="field">
                <span>Avisar o cliente de publicações para aprovar por</span>
                <div className="row" style={{ flexWrap: "wrap" }}>
                  {(["email", "whatsapp"] as const).map((ch) => {
                    const on = p.notify?.[ch] ?? true;
                    return (
                      <button key={ch} className="chip" aria-pressed={on} onClick={() => setP({ ...p, notify: { email: p.notify?.email ?? true, whatsapp: p.notify?.whatsapp ?? true, [ch]: !on } })}>
                        {on && <Check size={13} />} {ch === "email" ? "Email" : "WhatsApp"}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="field">
                <span>Equipa</span>
                <div className="row" style={{ flexWrap: "wrap" }}>
                  {TEAM.map((u) => {
                    const on = p.team.includes(u.id) || u.id === base.manager || u.id === base.inboxOwner;
                    return (
                      <button
                        key={u.id}
                        className="chip"
                        style={{ paddingLeft: 4 }}
                        aria-pressed={on}
                        onClick={() => setP({ ...p, team: p.team.includes(u.id) ? p.team.filter((x) => x !== u.id) : [...p.team, u.id] })}
                      >
                        <Avatar userId={u.id} size={22} /> {u.name.split(" ")[0]}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <div className="eyebrow" style={{ marginBottom: 8 }}>Redes sociais *</div>
                <div className="list">
                  {NETWORKS.map((n) => {
                    const on = connected.includes(n.id);
                    return (
                      <div key={n.id} className="list-item" style={{ alignItems: "center", flexWrap: "wrap" }}>
                        <NetIcon id={n.id} size={24} />
                        <div className="grow" style={{ minWidth: 140 }}>
                          <input
                            className="input input--bare"
                            style={{ height: 30 }}
                            placeholder={n.id === "facebook" || n.id === "linkedin" ? `Página no ${n.name}` : `@conta no ${n.name}`}
                            value={p.handles[n.id] ?? ""}
                            onChange={(e) => setP({ ...p, handles: { ...p.handles, [n.id]: e.target.value } })}
                          />
                        </div>
                        <button className={`btn btn--sm ${on ? "" : "btn--primary"}`} onClick={() => setConnected((c) => (on ? c.filter((x) => x !== n.id) : [...c, n.id]))}>
                          {on ? <><Check size={14} /> Ligado</> : "Ligar"}
                        </button>
                      </div>
                    );
                  })}
                  <div className="list-item" style={{ alignItems: "center" }}>
                    <span className="net-icon" style={{ width: 24, height: 24, background: "var(--ink-2)" }}>GA</span>
                    <div className="grow">
                      <div style={{ fontWeight: 500 }}>Google Analytics 4</div>
                      <div className="faint" style={{ fontSize: 12 }}>{ga ? `Propriedade de ${base.site || "o site"} ligada` : "Escolher a propriedade do site"}</div>
                    </div>
                    <button className={`btn btn--sm ${ga ? "" : "btn--primary"}`} onClick={() => setGa(!ga)}>{ga ? <><Check size={14} /> Ligado</> : "Ligar"}</button>
                  </div>
                </div>
                {tried && !connected.length && <em className="field-error">Liga pelo menos uma rede.</em>}
                <p className="faint" style={{ fontSize: 12, marginTop: 8 }}>No protótipo o botão simula a ligação. Na versão final abre a autorização oficial de cada rede.</p>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <p className="muted" style={{ fontSize: 13 }}>
                As metas aparecem na página do cliente e no portal, com uma barra de progresso. Sê concreto: um número e uma data.
              </p>
              {p.goals.map((g, i) => (
                <div key={g.id} className="card card__body goal-row">
                  <label className="field" style={{ gridColumn: "1 / -1" }}>
                    <span>Meta</span>
                    <input className="input" value={g.label} placeholder="Ex.: Reservas por mês" onChange={(e) => setP({ ...p, goals: p.goals.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
                  </label>
                  <label className="field">
                    <span>Valor atual</span>
                    <input className="input" type="number" value={g.current} onChange={(e) => setP({ ...p, goals: p.goals.map((x, j) => (j === i ? { ...x, current: Number(e.target.value) } : x)) })} />
                  </label>
                  <label className="field">
                    <span>Objetivo</span>
                    <input className="input" type="number" value={g.target} onChange={(e) => setP({ ...p, goals: p.goals.map((x, j) => (j === i ? { ...x, target: Number(e.target.value) } : x)) })} />
                  </label>
                  <label className="field">
                    <span>Até</span>
                    <input className="input" value={g.due} placeholder="dez 2026" onChange={(e) => setP({ ...p, goals: p.goals.map((x, j) => (j === i ? { ...x, due: e.target.value } : x)) })} />
                  </label>
                  <button className="icon-btn" style={{ alignSelf: "end" }} aria-label="Remover meta" onClick={() => setP({ ...p, goals: p.goals.filter((_, j) => j !== i) })}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <div className="row" style={{ flexWrap: "wrap" }}>
                <button className="btn" onClick={() => setP({ ...p, goals: [...p.goals, { id: `g${Date.now()}`, label: "", current: 0, target: 0, due: "" } as Goal] })}>
                  <Plus size={15} /> Adicionar meta
                </button>
                {["Seguidores no Instagram", "Pedidos de contacto por mês", "Visitas ao site vindas das redes"].map((s) => (
                  <button key={s} className="chip" onClick={() => setP({ ...p, goals: [...p.goals, { id: `g${Date.now()}`, label: s, current: 0, target: 0, due: "" }] })}>
                    + {s}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <label className="field">
                <span>Tom de voz</span>
                <textarea className="input" style={{ minHeight: 70 }} value={p.tone} onChange={(e) => setP({ ...p, tone: e.target.value })} placeholder="Ex.: próximo, bem-disposto, trata por «tu»." />
              </label>
              <label className="field">
                <span>Público-alvo</span>
                <textarea className="input" style={{ minHeight: 70 }} value={p.audience} onChange={(e) => setP({ ...p, audience: e.target.value })} placeholder="Quem queremos alcançar: idade, zona, interesses." />
              </label>
              <div className="grid grid--2">
                <label className="field">
                  <span>Hashtags da marca</span>
                  <input className="input" value={p.hashtags} onChange={(e) => setP({ ...p, hashtags: e.target.value })} placeholder="#marca #produto" />
                </label>
                <label className="field">
                  <span>Concorrentes a seguir</span>
                  <input className="input" value={p.competitors} onChange={(e) => setP({ ...p, competitors: e.target.value })} placeholder="@concorrente1, @concorrente2" />
                </label>
              </div>
              <label className="field">
                <span>A evitar</span>
                <input className="input" value={p.avoid} onChange={(e) => setP({ ...p, avoid: e.target.value })} placeholder="Palavras, temas ou estilos que a marca não quer." />
              </label>
              <label className="field">
                <span>Notas internas</span>
                <textarea className="input" style={{ minHeight: 70 }} value={p.notes} onChange={(e) => setP({ ...p, notes: e.target.value })} placeholder="Quem aprova, melhores horários para falar, particularidades." />
              </label>
            </>
          )}
        </div>

        <div className="drawer__foot">
          {step > 0 && <button className="btn btn--ghost" onClick={() => setStep(step - 1)}>Anterior</button>}
          <span className="grow" />
          {step < STEPS.length - 1 && <button className="btn" onClick={() => setStep(step + 1)}>Seguinte</button>}
          <button className="btn btn--primary" onClick={save}>{existing ? "Guardar alterações" : "Criar cliente"}</button>
        </div>
      </aside>
    </>
  );
}
