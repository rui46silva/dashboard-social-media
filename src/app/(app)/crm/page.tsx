"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { COMPANIES, CONTACTS, DEALS, NOW, company } from "@/lib/data";
import { ago, money } from "@/lib/format";
import { Avatar, PageHead, PersonAvatar } from "@/components/ui";

type Tab = "contactos" | "empresas";
const STATUS_CLS = { cliente: "lozenge--good", prospeto: "lozenge--info", antigo: "" } as const;

export default function CrmPage() {
  const [tab, setTab] = useState<Tab>("contactos");
  const [q, setQ] = useState("");
  const s = q.trim().toLowerCase();

  const contacts = useMemo(
    () => CONTACTS.filter((c) => !s || `${c.name} ${c.email} ${company(c.companyId).name}`.toLowerCase().includes(s)),
    [s],
  );
  const companies = useMemo(
    () => COMPANIES.filter((c) => !s || `${c.name} ${c.city} ${c.sector}`.toLowerCase().includes(s)),
    [s],
  );

  return (
    <>
      <PageHead
        title="Contactos e empresas"
        lede="O CRM da agência: clientes, prospetos e as pessoas com quem falamos."
        actions={
          <button className="btn btn--primary">
            <Plus size={15} /> {tab === "contactos" ? "Novo contacto" : "Nova empresa"}
          </button>
        }
      />

      <div className="tabs" role="tablist">
        <button role="tab" className="tab" aria-selected={tab === "contactos"} onClick={() => setTab("contactos")}>
          Contactos<span className="count">{CONTACTS.length}</span>
        </button>
        <button role="tab" className="tab" aria-selected={tab === "empresas"} onClick={() => setTab("empresas")}>
          Empresas<span className="count">{COMPANIES.length}</span>
        </button>
      </div>

      <label className="row" style={{ position: "relative", maxWidth: 360, marginBottom: 16 }}>
        <Search size={15} style={{ position: "absolute", left: 10, color: "var(--ink-3)" }} />
        <input className="input" style={{ paddingLeft: 32 }} placeholder="Procurar…" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>

      {tab === "contactos" ? (
        <div className="table-wrap">
          <table className="table table--cards">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Empresa</th>
                <th>Email</th>
                <th>Telefone</th>
                <th>Origem</th>
                <th className="r">Último contacto</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="row" style={{ gap: 10 }}>
                      <PersonAvatar name={c.name} size={30} />
                      <div>
                        <div style={{ fontWeight: 600 }}>{c.name}</div>
                        <div className="faint" style={{ fontSize: 12 }}>{c.role}</div>
                      </div>
                    </div>
                  </td>
                  <td data-label="Empresa">{company(c.companyId).name}</td>
                  <td><a href={`mailto:${c.email}`} className="muted">{c.email}</a></td>
                  <td className="muted num">{c.phone}</td>
                  <td data-label="Origem"><span className="badge">{c.source}</span></td>
                  <td className="r faint" data-label="Último contacto">{ago(c.lastTouch, NOW)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table table--cards">
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Estado</th>
                <th>Setor</th>
                <th>Cidade</th>
                <th className="r">Negócios</th>
                <th className="r">Avença</th>
                <th>Responsável</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id}>
                  <td>
                    {c.clientId ? (
                      <Link href={`/clientes/${c.clientId}`} style={{ fontWeight: 600 }}>{c.name}</Link>
                    ) : (
                      <span style={{ fontWeight: 600 }}>{c.name}</span>
                    )}
                  </td>
                  <td><span className={`lozenge ${STATUS_CLS[c.status]}`}>{c.status}</span></td>
                  <td data-label="Setor">{c.sector}</td>
                  <td data-label="Cidade">{c.city}</td>
                  <td className="r" data-label="Negócios">{DEALS.filter((d) => d.companyId === c.id).length}</td>
                  <td className="r" data-label="Avença">{c.mrr ? money(c.mrr) : "—"}</td>
                  <td><Avatar userId={c.owner} size={22} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
