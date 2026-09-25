"use client";

import { Check, Info, Mail } from "lucide-react";
import { NOW, client } from "@/lib/data";
import { INVOICES, daysOverdue, fiscalCalendar, freeCash, gross, receivables, TARGET_DEFS } from "@/lib/company";
import { dayMonth, money } from "@/lib/format";
import { ClientTile, SectionTitle } from "@/components/ui";
import { CountUp } from "@/components/count-up";
import { useStore } from "@/components/store";

const daysTo = (d: Date) => Math.round((d.getTime() - NOW.getTime()) / 864e5);
const MON = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/* ---------------------------------------------------------------- free cash */

export function FreeCash() {
  const { targets } = useStore();
  const cash = freeCash();
  const target = targets.caixa ?? TARGET_DEFS.find((t) => t.id === "caixa")!.default;
  const top = cash.steps[0].value;
  let running = 0;
  const rows = cash.steps.map((s, i) => {
    const from = running;
    running += s.value;
    return { ...s, left: (Math.min(from, running) / top) * 100, width: (Math.abs(s.value) / top) * 100, i };
  });
  const ok = cash.months >= target;

  return (
    <div className="card card__body">
      <div className="spread" style={{ alignItems: "flex-start", gap: 12 }}>
        <div>
          <div className="eyebrow">Caixa livre</div>
          <div className="big-number" style={{ marginTop: 4 }}><CountUp value={money(cash.free)} /></div>
          <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
            O que sobra do banco depois de tudo o que já é de outros.
          </p>
        </div>
        <span className={`lozenge lozenge--${ok ? "good" : cash.months >= target * 0.85 ? "warn" : "bad"}`}>
          {cash.months.toLocaleString("pt-PT", { maximumFractionDigits: 1 })} meses · meta {target}
        </span>
      </div>

      <div className="waterfall">
        {rows.map((r) => (
          <div key={r.label} className="waterfall__row">
            <span className="waterfall__label">{r.label}</span>
            <span className={`num waterfall__value${r.value < 0 ? " waterfall__value--neg" : ""}`}>
              {r.value < 0 ? "−" : ""}{money(Math.abs(r.value))}
            </span>
            <div className="waterfall__track">
              <i className={r.value < 0 ? "is-out" : "is-in"} style={{ left: `${r.left}%`, width: `${r.width}%`, animationDelay: `${r.i * 70}ms` }} />
            </div>
          </div>
        ))}
        <div className="waterfall__row waterfall__row--total">
          <span className="waterfall__label">Caixa livre</span>
          <span className="num waterfall__value">{money(cash.free)}</span>
          <div className="waterfall__track">
            <i className="is-total" style={{ left: 0, width: `${(cash.free / top) * 100}%`, animationDelay: `${rows.length * 70}ms` }} />
          </div>
        </div>
      </div>
      <p className="faint" style={{ fontSize: 12, margin: "14px 0 0" }}>
        {cash.months.toLocaleString("pt-PT", { maximumFractionDigits: 1 })} meses de custos fixos ({money(cash.fixed)}/mês).
        O IVA é uma estimativa: liquidado no trimestre menos o dedutível das despesas correntes.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------- receivables */

const BUCKET_COLOR = ["var(--series-3)", "var(--series-4)", "var(--series-2)", "var(--bad)"];

export function Receivables() {
  const { invoicePaid, reminders, markInvoicePaid, sendReminder, targets } = useStore();
  const r = receivables(invoicePaid);
  const dsoTarget = targets.dso ?? 30;
  const open = [...r.open].sort((a, b) => daysOverdue(b) - daysOverdue(a));
  const paidNow = INVOICES.filter((i) => invoicePaid[i.id]);

  return (
    <div className="card card__body">
      <div className="spread" style={{ alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div className="eyebrow">Por receber</div>
          <div className="big-number" style={{ marginTop: 4 }}><CountUp value={money(r.total)} /></div>
          <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
            {r.overdue.length ? <><b style={{ color: "var(--bad)" }}>{money(r.overdueTotal)}</b> já vencidos em {r.overdue.length} {r.overdue.length === 1 ? "fatura" : "faturas"}</> : "Nada vencido."}
          </p>
        </div>
        <div className="dso">
          <span className="faint">Prazo médio de recebimento</span>
          <b className="num">{r.dso} dias</b>
          <span className={`lozenge lozenge--${r.dso <= dsoTarget ? "good" : r.dso <= dsoTarget * 1.2 ? "warn" : "bad"}`}>máx. {dsoTarget}</span>
        </div>
      </div>

      <div className="aging" role="img" aria-label="Antiguidade dos valores por receber">
        {r.buckets.map((b, i) => b.total > 0 && <i key={b.label} style={{ flexGrow: b.total, background: BUCKET_COLOR[i] }} />)}
      </div>
      <div className="aging__legend">
        {r.buckets.map((b, i) => (
          <span key={b.label}>
            <span className="net__swatch" style={{ background: BUCKET_COLOR[i] }} />
            {b.label} <b className="num">{money(b.total)}</b>
          </span>
        ))}
      </div>

      <div className="invoices">
        {open.map((i) => {
          const late = daysOverdue(i);
          const sent = reminders[i.id] ?? [];
          return (
            <div key={i.id} className="invoice">
              <ClientTile clientId={i.clientId} size={28} />
              <div className="invoice__main">
                <div className="truncate" style={{ fontWeight: 600 }}>{client(i.clientId)?.name}</div>
                <div className="faint truncate" style={{ fontSize: 12 }}>{i.number} · {i.description}</div>
              </div>
              <div className="invoice__due">
                <b className="num">{money(gross(i))}</b>
                <span className={late > 30 ? "due--late" : late > 0 ? "due--soon" : "faint"}>
                  {late > 0 ? `venceu há ${late} dias` : late === 0 ? "vence hoje" : `vence a ${dayMonth(i.due)}`}
                </span>
              </div>
              <div className="invoice__actions">
                {late > 0 && (
                  <button className="btn btn--sm" onClick={() => sendReminder(i.id)} title={sent.length ? `Último lembrete ${dayMonth(sent[sent.length - 1])}` : "Enviar lembrete por email"}>
                    <Mail size={13} /> {sent.length ? `Lembrete enviado${sent.length > 1 ? ` (${sent.length})` : ""}` : "Lembrete"}
                  </button>
                )}
                <button className="btn btn--sm btn--ghost" onClick={() => markInvoicePaid(i.id)}><Check size={13} /> Paga</button>
              </div>
            </div>
          );
        })}
        {paidNow.map((i) => (
          <div key={i.id} className="invoice invoice--paid">
            <ClientTile clientId={i.clientId} size={28} />
            <div className="invoice__main">
              <div className="truncate" style={{ fontWeight: 600 }}>{client(i.clientId)?.name}</div>
              <div className="faint truncate" style={{ fontSize: 12 }}>{i.number} · {i.description}</div>
            </div>
            <div className="invoice__due">
              <b className="num">{money(gross(i))}</b>
              <span className="lozenge lozenge--good">Paga a {dayMonth(invoicePaid[i.id])}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="faint" style={{ fontSize: 12, margin: "12px 0 0" }}>O lembrete vai por email para o contacto do cliente. No produto final, as faturas chegam do programa de faturação.</p>
    </div>
  );
}

/* ---------------------------------------------------------- fiscal calendar */

export function FiscalCalendar() {
  const items = fiscalCalendar();
  return (
    <>
      <SectionTitle title="Calendário fiscal" />
      <div className="list">
        {items.map((f) => {
          const left = daysTo(f.date);
          const tone = f.done ? "good" : left < 7 ? "bad" : left < 15 ? "warn" : "info";
          return (
            <div key={f.id} className={`fiscal${f.done ? " fiscal--done" : ""}`}>
              <span className="fiscal__date">
                <b>{f.date.getDate()}</b>
                <span>{MON[f.date.getMonth()]}</span>
              </span>
              <div className="fiscal__main">
                <div style={{ fontWeight: 600 }}>{f.title}</div>
                <div className="faint" style={{ fontSize: 12 }}>{f.detail}</div>
              </div>
              <div className="fiscal__side">
                {f.amount ? <b className="num">{money(f.amount)}</b> : null}
                <span className={`lozenge lozenge--${tone}`}>{f.done ? "Pago" : left === 0 ? "Hoje" : `${left} dias`}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="notice notice--info" style={{ marginTop: 12 }}>
        <Info size={16} />
        <span>Datas de referência para uma Lda. com IVA trimestral. Valores estimados — confirma sempre com o contabilista certificado.</span>
      </div>
    </>
  );
}
