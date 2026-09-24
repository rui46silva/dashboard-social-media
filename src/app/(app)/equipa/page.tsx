"use client";

import { useState } from "react";
import { Check, Lock, Plus, ShieldAlert, X } from "lucide-react";
import { CLIENTS, NOW, PERMISSIONS, ROLES, USERS, type Permission, type Role, type RoleId, type User } from "@/lib/data";
import { ago } from "@/lib/format";
import { PageHead, PersonAvatar } from "@/components/ui";
import { useSession } from "@/components/session";

type Tab = "pessoas" | "papéis";

export default function TeamPage() {
  const { can } = useSession();
  const manage = can("gerir_utilizadores");
  const [tab, setTab] = useState<Tab>("pessoas");
  const [users, setUsers] = useState<User[]>(USERS);
  const [roles, setRoles] = useState<Role[]>(ROLES);
  const [inviting, setInviting] = useState(false);

  const togglePerm = (roleId: string, p: Permission) =>
    setRoles((rs) =>
      rs.map((r) =>
        r.id === roleId
          ? { ...r, permissions: r.permissions.includes(p) ? r.permissions.filter((x) => x !== p) : [...r.permissions, p] }
          : r,
      ),
    );

  const addRole = () => {
    const name = prompt("Nome do novo papel", "Copywriter");
    if (!name) return;
    setRoles((rs) => [
      ...rs,
      { id: name.toLowerCase().replace(/\W+/g, "-") as RoleId, name, description: "Papel personalizado.", system: false, permissions: ["ver_dashboard", "tarefas"] },
    ]);
  };

  return (
    <>
      <PageHead
        title="Equipa e papéis"
        lede="Quem tem acesso à Mesa e o que cada papel pode fazer. Só CEO, RH e Dev podem convidar pessoas e mudar papéis."
        actions={
          manage && (
            <>
              {tab === "papéis" && (
                <button className="btn" onClick={addRole}>
                  <Plus size={15} /> Novo papel
                </button>
              )}
              <button className="btn btn--primary" onClick={() => setInviting(true)}>
                <Plus size={15} /> Convidar pessoa
              </button>
            </>
          )
        }
      />

      {!manage && (
        <div className="notice" style={{ marginBottom: 16 }}>
          <ShieldAlert size={16} />
          <span>O teu papel pode ver a equipa, mas não pode convidar pessoas nem mudar permissões.</span>
        </div>
      )}

      <div className="tabs" role="tablist">
        <button role="tab" className="tab" aria-selected={tab === "pessoas"} onClick={() => setTab("pessoas")}>
          Pessoas<span className="count">{users.length}</span>
        </button>
        <button role="tab" className="tab" aria-selected={tab === "papéis"} onClick={() => setTab("papéis")}>
          Papéis e permissões<span className="count">{roles.length}</span>
        </button>
      </div>

      {tab === "pessoas" ? (
        <div className="table-wrap">
          <table className="table table--cards">
            <thead>
              <tr>
                <th>Pessoa</th>
                <th>Papel</th>
                <th>Acesso a clientes</th>
                <th>Estado</th>
                <th className="r">Última atividade</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="row" style={{ gap: 10 }}>
                      <PersonAvatar name={u.name} size={32} />
                      <div>
                        <div style={{ fontWeight: 600 }}>{u.name}</div>
                        <div className="faint" style={{ fontSize: 12 }}>{u.title} · {u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {manage && u.role !== "ceo" ? (
                      <select
                        className="input"
                        style={{ height: 30, width: "auto", margin: "4px 0" }}
                        value={u.role}
                        aria-label={`Papel de ${u.name}`}
                        onChange={(e) => setUsers((us) => us.map((x) => (x.id === u.id ? { ...x, role: e.target.value as RoleId } : x)))}
                      >
                        {roles.filter((r) => r.id !== "ceo").map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    ) : (
                      <span className="badge">{roles.find((r) => r.id === u.role)?.name}</span>
                    )}
                  </td>
                  <td className="muted" data-label="Clientes:">
                    {u.clients.includes("*")
                      ? "Todos"
                      : u.clients.length
                        ? u.clients.map((id) => CLIENTS.find((c) => c.id === id)?.name).join(", ")
                        : "—"}
                  </td>
                  <td>
                    <span className={`lozenge ${u.status === "ativo" ? "lozenge--good" : "lozenge--warn"}`}>{u.status}</span>
                  </td>
                  <td className="r faint" data-label="Visto">{ago(u.lastSeen, NOW)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div className="table-wrap">
            <table className="table matrix">
              <thead>
                <tr>
                  <th>Permissão</th>
                  {roles.map((r) => (
                    <th key={r.id} title={r.description}>
                      {r.name}
                      {r.system && <Lock size={10} style={{ marginLeft: 4, verticalAlign: -1 }} />}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERMISSIONS.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 550 }}>{p.label}</div>
                      <div className="faint" style={{ fontSize: 12 }}>{p.hint}</div>
                    </td>
                    {roles.map((r) => {
                      const on = r.permissions.includes(p.id);
                      const locked = !manage || r.id === "ceo";
                      return (
                        <td key={r.id}>
                          <button
                            className="tick"
                            role="checkbox"
                            aria-checked={on}
                            aria-label={`${r.name}: ${p.label}`}
                            disabled={locked}
                            onClick={() => togglePerm(r.id, p.id)}
                          >
                            <Check size={13} strokeWidth={3} />
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="faint" style={{ fontSize: 12, marginTop: 8 }}>
            <Lock size={10} /> Papéis de sistema. O CEO tem sempre acesso total. Os outros podem ser ajustados por CEO, RH ou Dev.
          </p>
        </>
      )}

      {inviting && <InviteDrawer roles={roles} onClose={() => setInviting(false)} />}
    </>
  );
}

function InviteDrawer({ roles, onClose }: { roles: Role[]; onClose: () => void }) {
  const [role, setRole] = useState<string>("gestor");
  const [clients, setClients] = useState<string[]>([]);
  const r = roles.find((x) => x.id === role)!;
  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="drawer" role="dialog" aria-label="Convidar pessoa">
        <div className="drawer__head">
          <h2>Convidar pessoa</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar"><X size={18} /></button>
        </div>
        <div className="drawer__body">
          <label className="field">
            <span>Email</span>
            <input className="input" type="email" placeholder="nome@agencia.pt" />
          </label>
          <label className="field">
            <span>Papel</span>
            <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
              {roles.filter((x) => x.id !== "ceo").map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </label>
          <div className="card card__body" style={{ fontSize: 13 }}>
            <div className="eyebrow" style={{ marginBottom: 6 }}>O que {r.name} pode fazer</div>
            <ul style={{ margin: 0, paddingLeft: 18, color: "var(--ink-2)" }}>
              {PERMISSIONS.filter((p) => r.permissions.includes(p.id)).map((p) => <li key={p.id}>{p.label}</li>)}
            </ul>
          </div>
          <div className="field">
            <span>{role === "cliente" ? "Portal de que cliente" : "Acesso a clientes"}</span>
            <div className="row" style={{ flexWrap: "wrap" }}>
              {CLIENTS.map((c) => (
                <button
                  key={c.id}
                  className="chip"
                  aria-pressed={clients.includes(c.id)}
                  onClick={() =>
                    setClients((cs) =>
                      role === "cliente" ? [c.id] : cs.includes(c.id) ? cs.filter((x) => x !== c.id) : [...cs, c.id],
                    )
                  }
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="drawer__foot">
          <button className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn--primary" onClick={onClose}>Enviar convite</button>
        </div>
      </div>
    </>
  );
}
