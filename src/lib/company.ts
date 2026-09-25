/**
 * Company control layer (Empresa → Cockpit / Finanças / Clientes).
 * Pure functions over the prototype data; every number the CEO sees is
 * derived here so the cockpit, alerts and health scores always agree.
 */
import {
  CLIENTS, CLIENT_ECONOMICS, DEALS, FINANCE, FIN_MONTHS, NOW, PROFILES, USERS, client,
  type NpsResponse, type Proposal, type TimeEntry,
} from "./data";
import { forecast, type Goal } from "./goals";

const day = 864e5;
const d = (y: number, m: number, dd: number) => new Date(y, m, dd, 12);
const Y = NOW.getFullYear();
const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / day);
export const VAT = 0.23;

/* ---------------------------------------------------------- fiscal profile */

/**
 * How the business is set up. A company (Lda. / Unipessoal) pays salaries and
 * IRC; a sole trader (trabalhador independente, «recibos verdes») pays
 * Segurança Social on what they bill, has IRS withheld by client companies and
 * may be exempt from VAT. Reference rules only — confirm with the accountant.
 */
export type Entity = "sociedade" | "independente";
export type VatRegime = "trimestral" | "mensal" | "isento";
export type FiscalProfile = {
  entity: Entity;
  vat: VatRegime;
  /** Independente: what the owner takes home each month. */
  ownerPay: number;
  /** Independente: estimated effective IRS rate on taxable income. */
  irsRate: number;
};

export const DEFAULT_FISCAL: FiscalProfile = { entity: "sociedade", vat: "trimestral", ownerPay: 2000, irsRate: 28 };
export const VAT_EXEMPT_LIMIT = 15000; // art. 53.º CIVA
export const WITHHOLDING = 0.23; // retenção na fonte, categoria B
export const SS_RATE = 0.214; // contribuição do independente
export const SS_BASE = 0.7; // rendimento relevante = 70% dos serviços

let FISCAL: FiscalProfile = DEFAULT_FISCAL;
/** The store pushes the saved profile here, like the other in-memory registries. */
export function setFiscalProfile(p: FiscalProfile) {
  FISCAL = p.entity === "sociedade" && p.vat === "isento" ? { ...p, vat: "trimestral" } : p;
}
export const fiscal = () => FISCAL;
export const isFreelancer = () => FISCAL.entity === "independente";
const vatRate = () => (FISCAL.vat === "isento" ? 0 : VAT);
/** Client companies withhold IRS on a freelancer's invoices (waived under the exemption limit). */
const withholding = () => (FISCAL.entity === "independente" && FISCAL.vat !== "isento" ? WITHHOLDING : 0);

export const ENTITY_LABEL: Record<Entity, string> = { sociedade: "Sociedade", independente: "Trabalhador independente" };
export const VAT_LABEL: Record<VatRegime, string> = { trimestral: "IVA trimestral", mensal: "IVA mensal", isento: "Isento de IVA" };

/* ---------------------------------------------------------------- invoices */

export type Invoice = {
  id: string;
  number: string;
  clientId: string;
  kind: "Avença" | "Projeto" | "Arranque";
  description: string;
  issued: Date;
  due: Date;
  net: number;
  paidAt?: Date;
};

let seq = 180;
const inv = (clientId: string, kind: Invoice["kind"], description: string, issued: Date, net: number, paidAt?: Date, terms = 15): Invoice => ({
  id: `inv${seq}`,
  number: `FT 2026/${seq++}`,
  clientId,
  kind,
  description,
  issued,
  due: new Date(issued.getTime() + terms * day),
  net,
  paidAt,
});

/** Last quarter of invoicing. Atlântico is the slow payer; the Maré campaign invoice is late. */
export const INVOICES: Invoice[] = [
  // July
  inv("kinetik", "Avença", "Avença julho", d(Y, 6, 1), 2100, d(Y, 6, 9)),
  inv("casa-lume", "Avença", "Avença julho", d(Y, 6, 1), 1450, d(Y, 6, 14)),
  inv("orvalho", "Avença", "Avença julho", d(Y, 6, 15), 900, d(Y, 6, 28)),
  inv("atlantico", "Avença", "Avença julho", d(Y, 6, 1), 750, d(Y, 7, 12)),
  // August
  inv("kinetik", "Avença", "Avença agosto", d(Y, 7, 1), 2100, d(Y, 7, 7)),
  inv("casa-lume", "Avença", "Avença agosto", d(Y, 7, 1), 1450, d(Y, 7, 18)),
  inv("orvalho", "Avença", "Avença agosto", d(Y, 7, 15), 900, d(Y, 7, 27)),
  inv("atlantico", "Avença", "Avença agosto", d(Y, 7, 1), 750),
  inv("casa-lume", "Projeto", "Campanha coleção Maré", d(Y, 7, 28), 3200, undefined, 15),
  // September
  inv("kinetik", "Avença", "Avença setembro", d(Y, 8, 1), 2100, d(Y, 8, 4)),
  inv("casa-lume", "Avença", "Avença setembro", d(Y, 8, 1), 1450, d(Y, 8, 12)),
  inv("orvalho", "Avença", "Avença setembro", d(Y, 8, 15), 900),
  inv("atlantico", "Avença", "Avença setembro", d(Y, 8, 1), 750),
  inv("orvalho", "Projeto", "Sessão fotográfica de outono", d(Y, 8, 20), 900, undefined, 30),
];

/** What the client actually transfers: net + VAT − IRS withheld (freelancers). */
export const gross = (i: Invoice) => i.net * (1 + vatRate()) - i.net * withholding();
export const isPaid = (i: Invoice, paid: Record<string, Date>) => !!(i.paidAt || paid[i.id]);
export const daysOverdue = (i: Invoice) => daysBetween(i.due, NOW);

export type AgingBucket = { label: string; total: number; invoices: Invoice[] };

export function receivables(paid: Record<string, Date>) {
  const open = INVOICES.filter((i) => !isPaid(i, paid));
  const buckets: AgingBucket[] = [
    { label: "Por vencer", total: 0, invoices: [] },
    { label: "1–30 dias", total: 0, invoices: [] },
    { label: "31–60 dias", total: 0, invoices: [] },
    { label: "+60 dias", total: 0, invoices: [] },
  ];
  for (const i of open) {
    const o = daysOverdue(i);
    const b = o <= 0 ? 0 : o <= 30 ? 1 : o <= 60 ? 2 : 3;
    buckets[b].total += gross(i);
    buckets[b].invoices.push(i);
  }
  const total = open.reduce((a, i) => a + gross(i), 0);
  const billed90 = INVOICES.filter((i) => daysBetween(i.issued, NOW) <= 90).reduce((a, i) => a + gross(i), 0);
  const dso = billed90 ? Math.round((total / billed90) * 90) : 0;
  const overdue = open.filter((i) => daysOverdue(i) > 0);
  return { open, buckets, total, dso, overdue, overdueTotal: overdue.reduce((a, i) => a + gross(i), 0) };
}

/* ------------------------------------------------------------ taxes & cash */

/** Bills already received and not yet paid. */
export const PAYABLES = [
  { label: "Cowork — outubro", amount: 350 * (1 + VAT), due: d(Y, 8, 30) },
  { label: "Software e licenças", amount: 280 * (1 + VAT), due: d(Y, 8, 28) },
  { label: "Contabilidade — setembro", amount: 150 * (1 + VAT), due: d(Y, 9, 8) },
];

const MONTH_NAMES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** Revenue billed per month over the last 12 months (recurring + projects). */
const monthlyRevenue = () => FINANCE.recurring.map((r, i) => r + FINANCE.projects[i]);

/** VAT collected minus VAT on running costs, for invoices issued from `from` on. */
function vatSince(from: Date) {
  if (FISCAL.vat === "isento") return { collected: 0, deductible: 0, due: 0 };
  const collected = INVOICES.filter((i) => i.issued >= from).reduce((a, i) => a + i.net * VAT, 0);
  const deductibleMonthly = FINANCE.fixed.filter((f) => f.label !== "Salários e encargos" && f.label !== "Seguros").reduce((a, f) => a + f.value, 0) * VAT;
  const months = (NOW.getFullYear() - from.getFullYear()) * 12 + NOW.getMonth() - from.getMonth() + 1;
  return { collected, deductible: deductibleMonthly * months, due: Math.max(0, collected - deductibleMonthly * months) };
}

/** VAT already charged to clients that still has to go to the State. */
export function vatOutstanding() {
  if (FISCAL.vat === "trimestral") return { ...vatSince(new Date(Y, Math.floor(NOW.getMonth() / 3) * 3, 1)), label: "IVA a entregar (3.º tri)" };
  // Monthly: last month's return is due on the 20th of the month after next, so two months are open.
  return { ...vatSince(new Date(Y, NOW.getMonth() - 1, 1)), label: `IVA a entregar (${MONTH_NAMES[NOW.getMonth() - 1]} e ${MONTH_NAMES[NOW.getMonth()]})` };
}

/** Freelancer's monthly Segurança Social, set by last quarter's declared income. */
export function ssMonthly() {
  const rev = monthlyRevenue();
  const lastQuarter = rev.slice(-6, -3); // apr–jun sets jul–sep payments
  return Math.round((lastQuarter.reduce((a, b) => a + b, 0) / 3) * SS_BASE * SS_RATE);
}

/** Freelancer's IRS for the year so far, against what clients already withheld. */
export function irsEstimate() {
  const ytd = monthlyRevenue().filter((_, i) => FIN_MONTHS[i].getFullYear() === Y).reduce((a, b) => a + b, 0);
  const taxable = ytd * 0.75; // regime simplificado: 75% dos serviços
  const tax = taxable * (FISCAL.irsRate / 100);
  const withheld = ytd * withholding();
  return { ytd, taxable, tax, withheld, reserve: Math.max(0, tax - withheld), refund: Math.max(0, withheld - tax) };
}

/** Annual billing pace, to check the VAT exemption limit. */
export const annualBilling = () => monthlyRevenue().reduce((a, b) => a + b, 0);

/** Monthly fixed costs for the chosen setup (a freelancer pays themself instead of salaries). */
export function fixedCosts() {
  if (FISCAL.entity === "sociedade") return FINANCE.fixed;
  return [
    { label: "O teu ordenado", value: FISCAL.ownerPay },
    { label: "Segurança Social", value: ssMonthly() },
    ...FINANCE.fixed.filter((f) => f.label !== "Salários e encargos"),
  ].sort((a, b) => b.value - a.value);
}
export const fixedTotal = () => fixedCosts().reduce((a, f) => a + f.value, 0);

export const PAYROLL_MONTH = 3900; // salaries + employer social security, paid on the 30th
export const IRC_INSTALMENT = 420; // pagamento por conta

export type FiscalItem = { id: string; date: Date; title: string; detail: string; amount?: number; done?: boolean };

/** Reference deadlines for the chosen setup. Confirm with the certified accountant. */
export function fiscalCalendar(): FiscalItem[] {
  const vat = vatOutstanding();
  const items: FiscalItem[] = [];
  if (FISCAL.vat === "trimestral")
    items.push({ id: "iva-q3", date: d(Y, 10, 20), title: "IVA do 3.º trimestre", detail: "Declaração periódica (pagamento até dia 25)", amount: Math.round(vat.due) });
  if (FISCAL.vat === "mensal") {
    const half = Math.round(vat.due / 2);
    items.push(
      { id: "iva-jul", date: d(Y, 8, 20), title: "IVA de julho", detail: "Declaração periódica mensal", done: true },
      { id: "iva-ago", date: d(Y, 9, 20), title: "IVA de agosto", detail: "Declaração periódica (pagamento até dia 25)", amount: half },
      { id: "iva-set", date: d(Y, 10, 20), title: "IVA de setembro", detail: "Declaração periódica (pagamento até dia 25)", amount: half },
    );
  }

  if (FISCAL.entity === "sociedade") {
    items.push(
      { id: "ss-set", date: d(Y, 8, 20), title: "Segurança Social e retenções IRS", detail: "Pagamento referente a agosto", amount: 1480, done: true },
      { id: "ppc2", date: d(Y, 8, 30), title: "2.º pagamento por conta de IRC", detail: "Modelo P1", amount: IRC_INSTALMENT },
      { id: "saft-set", date: d(Y, 9, 5), title: "SAF-T de faturação", detail: "Comunicação das faturas de setembro" },
      { id: "dmr-set", date: d(Y, 9, 10), title: "Declaração de remunerações e DMR", detail: "Segurança Social e retenções de setembro" },
      { id: "ss-out", date: d(Y, 9, 20), title: "Segurança Social e retenções IRS", detail: "Pagamento referente a setembro", amount: 1480 },
      { id: "saft-out", date: d(Y, 10, 5), title: "SAF-T de faturação", detail: "Comunicação das faturas de outubro" },
      { id: "ppc3", date: d(Y, 11, 15), title: "3.º pagamento por conta de IRC", detail: "Modelo P1", amount: IRC_INSTALMENT },
    );
  } else {
    const ss = ssMonthly();
    const irs = irsEstimate();
    items.push(
      { id: "ssi-set", date: d(Y, 8, 20), title: "Segurança Social", detail: "Contribuição de agosto", amount: ss, done: true },
      { id: "ssi-out", date: d(Y, 9, 20), title: "Segurança Social", detail: "Contribuição de setembro", amount: ss },
      { id: "ssi-decl", date: d(Y, 9, 31), title: "Declaração trimestral à Segurança Social", detail: "Rendimentos de julho a setembro, na Segurança Social Direta" },
      { id: "ssi-nov", date: d(Y, 10, 20), title: "Segurança Social", detail: "Contribuição de outubro (já com o valor do 3.º trimestre)", amount: ss },
      { id: "irs", date: d(Y + 1, 5, 30), title: "Declaração de IRS (anexo B)", detail: irs.refund > 0 ? `Entrega de 1 abr a 30 jun · reembolso estimado de ${Math.round(irs.refund).toLocaleString("pt-PT")} €` : "Entrega de 1 abr a 30 jun", amount: irs.reserve > 0 ? Math.round(irs.reserve) : undefined },
    );
  }
  return items.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function freeCash() {
  const vat = vatOutstanding();
  const payables = PAYABLES.reduce((a, p) => a + p.amount, 0);
  const steps: { label: string; value: number }[] = [{ label: "Saldo no banco", value: FINANCE.cash }];
  if (vat.due > 0) steps.push({ label: vat.label, value: -vat.due });
  if (FISCAL.entity === "sociedade") {
    steps.push(
      { label: "Salários e SS de setembro", value: -PAYROLL_MONTH },
      { label: "Fornecedores a pagar", value: -payables },
      { label: "Pagamento por conta IRC", value: -IRC_INSTALMENT },
    );
  } else {
    const irs = irsEstimate();
    steps.push(
      { label: "Segurança Social de setembro", value: -ssMonthly() },
      { label: "O teu ordenado de outubro", value: -FISCAL.ownerPay },
      { label: "Fornecedores a pagar", value: -payables },
    );
    if (irs.reserve > 0) steps.push({ label: "Reserva para o IRS", value: -irs.reserve });
  }
  const free = steps.reduce((a, s) => a + s.value, 0);
  const fixed = fixedTotal();
  return { steps, free, months: free / fixed, fixed };
}

/* ------------------------------------------------------------ client health */

/** Average hours clients take to approve content (from the approval log in production). */
export const APPROVAL_HOURS: Record<string, number> = { "casa-lume": 31, orvalho: 54, kinetik: 16, atlantico: 86 };

export type HealthPart = { key: string; label: string; weight: number; score: number; note: string };
export type Health = { clientId: string; score: number; level: "Saudável" | "Atenção" | "Em risco"; parts: HealthPart[]; causes: string[] };

export function clientHealth(clientId: string, ctx: { time: TimeEntry[]; nps: NpsResponse[]; paid: Record<string, Date> }): Health {
  const e = CLIENT_ECONOMICS.find((x) => x.clientId === clientId);
  const fee = e?.fee ?? PROFILES[clientId]?.fee ?? 0;
  const from = new Date(NOW.getTime() - 30 * day);
  const hours = ctx.time.filter((t) => t.clientId === clientId && t.date >= from).reduce((a, t) => a + t.minutes, 0) / 60 || e?.hours || 0;
  const margin = fee ? (fee - hours * FINANCE.hourCost) / fee : 0;
  const lastNps = ctx.nps.filter((n) => n.clientId === clientId).sort((a, b) => b.date.getTime() - a.date.getTime())[0];
  const open = INVOICES.filter((i) => i.clientId === clientId && !isPaid(i, ctx.paid));
  const worstOverdue = Math.max(0, ...open.map(daysOverdue));
  const goals = PROFILES[clientId]?.goals ?? [];
  const goalRate = goals.length ? goals.reduce((a, g) => a + Math.min(1, g.target ? g.current / g.target : 0), 0) / goals.length : 0.7;
  const daysLeft = e ? daysBetween(NOW, e.contractEnd) : 365;
  const approval = APPROVAL_HOURS[clientId] ?? 36;

  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
  const parts: HealthPart[] = [
    { key: "margem", label: "Margem", weight: 0.25, score: clamp((margin / 0.45) * 100), note: `${Math.round(margin * 100)}% (alvo 45%)` },
    { key: "nps", label: "Satisfação", weight: 0.2, score: lastNps ? clamp(lastNps.score * 10) : 60, note: lastNps ? `${lastNps.score}/10` : "sem resposta" },
    { key: "pagamentos", label: "Pagamentos", weight: 0.15, score: worstOverdue <= 0 ? 100 : worstOverdue <= 15 ? 65 : worstOverdue <= 30 ? 35 : 10, note: worstOverdue > 0 ? `${worstOverdue} dias em atraso` : "em dia" },
    { key: "metas", label: "Metas", weight: 0.15, score: clamp(goalRate * 100), note: `${Math.round(goalRate * 100)}% cumprido` },
    { key: "aprovacoes", label: "Aprovações", weight: 0.1, score: clamp(100 - Math.max(0, approval - 24) * 1.2), note: `${approval} h em média` },
    { key: "renovacao", label: "Renovação", weight: 0.15, score: daysLeft > 120 ? 100 : daysLeft > 60 ? 60 : 30, note: `${daysLeft} dias` },
  ];
  const score = Math.round(parts.reduce((a, p) => a + p.score * p.weight, 0));
  const causes = [...parts].filter((p) => p.score < 60).sort((a, b) => a.score - b.score).map((p) => `${p.label}: ${p.note}`);
  return { clientId, score, level: score >= 75 ? "Saudável" : score >= 50 ? "Atenção" : "Em risco", parts, causes };
}

/* --------------------------------------------------------------- targets */

export type TargetId = "mrr" | "margem" | "caixa" | "ocupacao" | "nps" | "dso" | "pipeline" | "novos";

export const TARGET_DEFS: { id: TargetId; label: string; unit: string; better: "up" | "down"; default: number; hint: string }[] = [
  { id: "mrr", label: "Receita recorrente", unit: "€", better: "up", default: 6000, hint: "avenças por mês" },
  { id: "margem", label: "Margem bruta", unit: "%", better: "up", default: 40, hint: "avenças − horas × custo/h" },
  { id: "caixa", label: "Caixa livre", unit: "meses", better: "up", default: 3, hint: "meses de custos fixos" },
  { id: "ocupacao", label: "Ocupação da equipa", unit: "%", better: "up", default: 75, hint: "horas faturáveis ÷ capacidade" },
  { id: "nps", label: "NPS", unit: "", better: "up", default: 30, hint: "−100 a +100" },
  { id: "dso", label: "Prazo médio de recebimento", unit: "dias", better: "down", default: 30, hint: "quanto demoram a pagar" },
  { id: "pipeline", label: "Pipeline ponderado", unit: "€", better: "up", default: 2400, hint: "avenças prováveis por mês" },
  { id: "novos", label: "Clientes novos no trimestre", unit: "", better: "up", default: 2, hint: "propostas assinadas" },
];

export const PROBABILITY: Record<string, number> = { Lead: 0.1, Qualificado: 0.25, Proposta: 0.5, Negociação: 0.75 };

export function weightedPipeline() {
  return DEALS.filter((x) => x.recurring && PROBABILITY[x.stage] !== undefined).reduce((a, x) => a + x.value * PROBABILITY[x.stage], 0);
}

export function grossMargin(time: TimeEntry[]) {
  const from = new Date(NOW.getTime() - 30 * day);
  let fees = 0;
  let cost = 0;
  for (const e of CLIENT_ECONOMICS) {
    const h = time.filter((t) => t.clientId === e.clientId && t.date >= from).reduce((a, t) => a + t.minutes, 0) / 60 || e.hours;
    fees += e.fee;
    cost += h * FINANCE.hourCost;
  }
  return fees ? (fees - cost) / fees : 0;
}

export function utilization(time: TimeEntry[]) {
  const from = new Date(NOW.getTime() - 7 * day);
  const billable = time.filter((t) => t.billable && t.date >= from).reduce((a, t) => a + t.minutes, 0) / 60;
  const capacity = USERS.reduce((a, u) => a + u.weeklyHours, 0);
  return capacity ? billable / capacity : 0;
}

export function npsNow(nps: NpsResponse[]) {
  const last = CLIENTS.map((c) => nps.filter((n) => n.clientId === c.id).sort((a, b) => b.date.getTime() - a.date.getTime())[0]).filter(Boolean) as NpsResponse[];
  if (!last.length) return 0;
  const p = last.filter((x) => x.score >= 9).length;
  const dd = last.filter((x) => x.score <= 6).length;
  return Math.round(((p - dd) / last.length) * 100);
}

export function newClientsThisQuarter(proposals: Proposal[]) {
  const qStart = new Date(Y, Math.floor(NOW.getMonth() / 3) * 3, 1);
  return proposals.filter((p) => p.status === "aceite" && p.signedAt && p.signedAt >= qStart).length;
}

/* ----------------------------------------------------------------- alerts */

export type RuleId =
  | "caixa" | "fatura" | "concentracao" | "renovacao" | "margem" | "ambito"
  | "ocupacao" | "nps" | "aprovacao" | "pipeline" | "fiscal" | "saude" | "meta" | "isencao";

export type Severity = "alta" | "média" | "baixa";

export type Rule = {
  id: RuleId;
  label: string;
  unit: string;
  default: number;
  comparator: "<" | ">";
  action: string;
  owner: "ceo" | "gestor";
  severity: Severity;
};

export const RULES: Rule[] = [
  { id: "caixa", label: "Caixa livre abaixo de", unit: "meses", default: 3, comparator: "<", action: "Travar custos novos e acelerar cobranças", owner: "ceo", severity: "alta" },
  { id: "fatura", label: "Fatura em atraso há mais de", unit: "dias", default: 15, comparator: ">", action: "Enviar lembrete; aos 30 dias, ligação do CEO", owner: "ceo", severity: "alta" },
  { id: "concentracao", label: "Maior cliente acima de", unit: "% da receita", default: 30, comparator: ">", action: "Dar prioridade comercial a novos clientes", owner: "ceo", severity: "média" },
  { id: "renovacao", label: "Renovação de contrato a menos de", unit: "dias", default: 60, comparator: "<", action: "Reunião com resultados do trimestre e proposta de aumento", owner: "gestor", severity: "alta" },
  { id: "margem", label: "Margem de um cliente abaixo de", unit: "%", default: 25, comparator: "<", action: "Rever preço ou âmbito na próxima conversa", owner: "ceo", severity: "média" },
  { id: "ambito", label: "Horas acima do contratado em mais de", unit: "%", default: 10, comparator: ">", action: "Conversa de âmbito ou proposta de serviço extra", owner: "gestor", severity: "média" },
  { id: "ocupacao", label: "Ocupação da equipa acima de", unit: "%", default: 90, comparator: ">", action: "Freelancer já; contratação se o pipeline confirmar", owner: "ceo", severity: "média" },
  { id: "nps", label: "Satisfação de um cliente igual ou abaixo de", unit: "/10", default: 6, comparator: "<", action: "Chamada do CEO esta semana", owner: "ceo", severity: "alta" },
  { id: "aprovacao", label: "Tempo de aprovação do cliente acima de", unit: "horas", default: 72, comparator: ">", action: "Rever o processo de aprovação com o cliente", owner: "gestor", severity: "baixa" },
  { id: "pipeline", label: "Pipeline ponderado abaixo de", unit: "× a meta de novos clientes", default: 2, comparator: "<", action: "Reforçar prospeção: 10 contactos novos esta semana", owner: "ceo", severity: "média" },
  { id: "fiscal", label: "Prazo fiscal a menos de", unit: "dias", default: 7, comparator: "<", action: "Confirmar valor com o contabilista e reservar caixa", owner: "ceo", severity: "alta" },
  { id: "saude", label: "Saúde de um cliente abaixo de", unit: "pontos", default: 50, comparator: "<", action: "Plano de recuperação com o gestor de conta", owner: "gestor", severity: "alta" },
  { id: "meta", label: "Previsão de uma meta abaixo de", unit: "% do caminho", default: 85, comparator: "<", action: "Rever o plano da meta: mais esforço, mais prazo ou meta mais realista", owner: "ceo", severity: "média" },
  { id: "isencao", label: "Faturação anual acima de", unit: "% do limite de isenção de IVA", default: 80, comparator: ">", action: "Falar com o contabilista sobre passar ao regime normal de IVA", owner: "ceo", severity: "alta" },
];

export type Alert = {
  key: string;
  rule: Rule;
  title: string;
  detail: string;
  clientId?: string;
  href: string;
  owner: string; // user id
};

type Ctx = {
  thresholds: Partial<Record<RuleId, number>>;
  targets: Partial<Record<TargetId, number>>;
  time: TimeEntry[];
  nps: NpsResponse[];
  paid: Record<string, Date>;
  goals?: Goal[];
};

export function evaluateAlerts(ctx: Ctx): Alert[] {
  const t = (id: RuleId) => ctx.thresholds[id] ?? RULES.find((r) => r.id === id)!.default;
  const rule = (id: RuleId) => RULES.find((r) => r.id === id)!;
  const ceo = "u-rui";
  const mgr = (clientId: string) => client(clientId)?.manager ?? ceo;
  const out: Alert[] = [];
  const money = (n: number) => `${Math.round(n).toLocaleString("pt-PT")} €`;

  const cash = freeCash();
  if (cash.months < t("caixa"))
    out.push({ key: "caixa", rule: rule("caixa"), title: `Caixa livre dá para ${cash.months.toLocaleString("pt-PT", { maximumFractionDigits: 1 })} meses`, detail: `Depois de IVA, salários e fornecedores sobram ${money(cash.free)} dos ${money(FINANCE.cash)} no banco.`, href: "/empresa?tab=financas", owner: ceo });

  for (const i of receivables(ctx.paid).overdue.filter((x) => daysOverdue(x) > t("fatura")))
    out.push({ key: `fatura:${i.id}`, rule: rule("fatura"), title: `${client(i.clientId)!.name} deve ${money(gross(i))} há ${daysOverdue(i)} dias`, detail: `${i.number} · ${i.description}`, clientId: i.clientId, href: "/empresa?tab=financas", owner: ceo });

  const mrr = CLIENT_ECONOMICS.reduce((a, e) => a + e.fee, 0);
  const top = [...CLIENT_ECONOMICS].sort((a, b) => b.fee - a.fee)[0];
  if (top && (top.fee / mrr) * 100 > t("concentracao"))
    out.push({ key: "concentracao", rule: rule("concentracao"), title: `${Math.round((top.fee / mrr) * 100)}% da receita vem da ${client(top.clientId)!.name}`, detail: `Se sair, a receita recorrente cai para ${money(mrr - top.fee)}.`, clientId: top.clientId, href: "/empresa?tab=clientes", owner: ceo });

  const from = new Date(NOW.getTime() - 30 * day);
  for (const e of CLIENT_ECONOMICS) {
    const name = client(e.clientId)!.name;
    const left = daysBetween(NOW, e.contractEnd);
    if (left < t("renovacao"))
      out.push({ key: `renovacao:${e.clientId}`, rule: rule("renovacao"), title: `Contrato da ${name} renova em ${left} dias`, detail: `${money(e.fee)}/mês em jogo.`, clientId: e.clientId, href: `/clientes/${e.clientId}`, owner: mgr(e.clientId) });

    const hours = ctx.time.filter((x) => x.clientId === e.clientId && x.date >= from).reduce((a, x) => a + x.minutes, 0) / 60 || e.hours;
    const margin = (e.fee - hours * FINANCE.hourCost) / e.fee;
    if (margin * 100 < t("margem"))
      out.push({ key: `margem:${e.clientId}`, rule: rule("margem"), title: `Margem da ${name} em ${Math.round(margin * 100)}%`, detail: `${Math.round(hours)} h no último mês para uma avença de ${money(e.fee)}.`, clientId: e.clientId, href: "/empresa?tab=clientes", owner: ceo });

    const contracted = PROFILES[e.clientId]?.hoursPerMonth ?? e.hours;
    const over = contracted ? (hours / contracted - 1) * 100 : 0;
    if (over > t("ambito"))
      out.push({ key: `ambito:${e.clientId}`, rule: rule("ambito"), title: `${name} a consumir ${Math.round(over)}% acima do contratado`, detail: `${Math.round(hours)} h registadas vs ${contracted} h contratadas ≈ ${money((hours - contracted) * FINANCE.hourCost)} de trabalho não pago.`, clientId: e.clientId, href: "/operacao", owner: mgr(e.clientId) });

    const approval = APPROVAL_HOURS[e.clientId];
    if (approval && approval > t("aprovacao"))
      out.push({ key: `aprovacao:${e.clientId}`, rule: rule("aprovacao"), title: `${name} demora ${approval} h a aprovar`, detail: "Os posts arriscam sair fora de horas ou fora de data.", clientId: e.clientId, href: "/conteudo", owner: mgr(e.clientId) });

    const h = clientHealth(e.clientId, ctx);
    if (h.score < t("saude"))
      out.push({ key: `saude:${e.clientId}`, rule: rule("saude"), title: `Saúde da ${name}: ${h.score}/100`, detail: h.causes.slice(0, 2).join(" · ") || "Vários sinais fracos.", clientId: e.clientId, href: "/empresa?tab=clientes", owner: mgr(e.clientId) });
  }

  const occ = utilization(ctx.time) * 100;
  if (occ > t("ocupacao"))
    out.push({ key: "ocupacao", rule: isFreelancer() ? { ...rule("ocupacao"), action: "Subir preços ou recusar trabalho novo até aliviar" } : rule("ocupacao"), title: `Equipa a ${Math.round(occ)}% da capacidade`, detail: "Na última semana.", href: "/operacao", owner: ceo });

  for (const c of CLIENTS) {
    const last = ctx.nps.filter((n) => n.clientId === c.id).sort((a, b) => b.date.getTime() - a.date.getTime())[0];
    if (last && last.score <= t("nps"))
      out.push({ key: `nps:${c.id}:${last.id}`, rule: rule("nps"), title: `${c.name} deu ${last.score}/10 na satisfação`, detail: last.comment ? `«${last.comment}»` : "Sem comentário.", clientId: c.id, href: "/operacao", owner: ceo });
  }

  const target = (ctx.targets.novos ?? 2) * (CLIENT_ECONOMICS.reduce((a, e) => a + e.fee, 0) / CLIENT_ECONOMICS.length);
  const wp = weightedPipeline();
  if (wp < t("pipeline") * target * 0.5)
    out.push({ key: "pipeline", rule: rule("pipeline"), title: `Pipeline ponderado de ${money(wp)}/mês`, detail: `Abaixo de ${t("pipeline")}× o necessário para a meta de novos clientes.`, href: "/crm/pipeline", owner: ceo });

  for (const f of fiscalCalendar().filter((x) => !x.done)) {
    const left = daysBetween(NOW, f.date);
    if (left >= 0 && left < t("fiscal"))
      out.push({ key: `fiscal:${f.id}`, rule: rule("fiscal"), title: `${f.title} em ${left} dias`, detail: `${f.detail}${f.amount ? ` · ${money(f.amount)}` : ""}`, href: "/empresa?tab=financas", owner: ceo });
  }

  for (const g of ctx.goals ?? []) {
    const f = forecast(g, fixedTotal());
    const span = g.target - f.baseline || 1;
    const onPath = ((f.projected - f.baseline) / span) * 100;
    if (f.status !== "alcançada" && f.status !== "sem dados" && onPath < t("meta"))
      out.push({ key: `meta:${g.id}`, rule: rule("meta"), title: `Meta «${g.title}» fora de rota`, detail: `Ao ritmo atual chega a ${Math.round(Math.max(0, Math.min(onPath, 100)))}% do caminho no prazo.`, href: "/empresa?tab=planeamento", owner: g.owner });
  }

  if (FISCAL.vat === "isento") {
    const billed = annualBilling();
    const share = (billed / VAT_EXEMPT_LIMIT) * 100;
    if (share > t("isencao"))
      out.push({ key: "isencao", rule: rule("isencao"), title: share > 100 ? `Faturação acima do limite de isenção de IVA` : `Faturação a ${Math.round(share)}% do limite de isenção de IVA`, detail: `${money(billed)} nos últimos 12 meses, para um limite de ${money(VAT_EXEMPT_LIMIT)}.`, href: "/empresa?tab=financas", owner: ceo });
  }

  const order: Record<Severity, number> = { alta: 0, média: 1, baixa: 2 };
  return out.sort((a, b) => order[a.rule.severity] - order[b.rule.severity]);
}
