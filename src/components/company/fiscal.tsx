"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, Briefcase, ChevronDown, Info, User } from "lucide-react";
import {
  ENTITY_LABEL, SS_BASE, SS_RATE, VAT_EXEMPT_LIMIT, VAT_LABEL, WITHHOLDING, annualBilling, irsEstimate, ssMonthly,
  type Entity, type VatRegime,
} from "@/lib/company";
import { money } from "@/lib/format";
import { useStore } from "@/components/store";

const pctPt = (n: number) => `${(n * 100).toLocaleString("pt-PT", { maximumFractionDigits: 1 })}%`;

export function FiscalProfileCard() {
  const { fiscal, setFiscal } = useStore();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (params.get("perfil")) setOpen(true);
  }, [params]);

  const solo = fiscal.entity === "independente";
  const billed = annualBilling();
  const overLimit = fiscal.vat === "isento" && billed > VAT_EXEMPT_LIMIT;
  const irs = irsEstimate();
  const Icon = solo ? User : Briefcase;

  const changes = solo
    ? [
        `Segurança Social: ${pctPt(SS_RATE)} sobre ${pctPt(SS_BASE)} do que faturas — cerca de ${money(ssMonthly())}/mês, com declaração trimestral.`,
        fiscal.vat === "isento"
          ? "Sem IVA nas faturas e, abaixo do limite, sem retenção na fonte."
          : `Os clientes empresa retêm ${pctPt(WITHHOLDING)} de IRS em cada fatura: recebes menos, mas é imposto já adiantado.`,
        irs.refund > 0
          ? `IRS deste ano: as retenções (${money(irs.withheld)}) já cobrem o imposto estimado (${money(irs.tax)}) — provável reembolso de ${money(irs.refund)}.`
          : `IRS deste ano: faltam cerca de ${money(irs.reserve)} além das retenções. Fica reservado na caixa livre.`,
        `O teu ordenado (${money(fiscal.ownerPay)}/mês) entra nos custos fixos no lugar dos salários.`,
      ]
    : [
        "Salários e Segurança Social da equipa entram nos custos fixos.",
        "IRC com pagamentos por conta em julho, setembro e dezembro.",
        "SAF-T de faturação até dia 5 e declaração de remunerações até dia 10, todos os meses.",
      ];

  return (
    <div className="card fiscal-card" id="perfil-fiscal">
      <button className="fiscal-card__head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="insight__icon insight__icon--info"><Icon size={15} /></span>
        <span className="grow" style={{ minWidth: 0 }}>
          <b>Perfil fiscal: {ENTITY_LABEL[fiscal.entity]} · {VAT_LABEL[fiscal.vat]}</b>
          <span className="faint fiscal-card__sub">Muda impostos, calendário, caixa livre e custos fixos.</span>
        </span>
        {overLimit && <span className="lozenge lozenge--bad">Rever</span>}
        <span className="fiscal-card__toggle">{open ? "Fechar" : "Alterar"} <ChevronDown size={15} style={{ transform: open ? "rotate(180deg)" : undefined }} /></span>
      </button>

      {open && (
        <div className="fiscal-card__body">
          <div className="fiscal-card__form">
            <div className="field">
              <span className="field__label">Como trabalhas</span>
              <div className="choice">
                {(["sociedade", "independente"] as Entity[]).map((e) => (
                  <button key={e} className="choice__item" aria-pressed={fiscal.entity === e} onClick={() => setFiscal({ entity: e })}>
                    {e === "sociedade" ? <Briefcase size={16} /> : <User size={16} />}
                    <span>
                      <b>{e === "sociedade" ? "Empresa" : "Em nome próprio"}</b>
                      <span className="faint">{e === "sociedade" ? "Lda. ou Unipessoal" : "Freelancer, recibos verdes"}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <span className="field__label">IVA</span>
              <div className="segmented" role="group" aria-label="Regime de IVA">
                {(["trimestral", "mensal", "isento"] as VatRegime[]).map((v) => (
                  <button
                    key={v}
                    aria-pressed={fiscal.vat === v}
                    disabled={v === "isento" && !solo}
                    title={v === "isento" && !solo ? "Só para quem trabalha em nome próprio" : undefined}
                    onClick={() => setFiscal({ vat: v })}
                  >
                    {v === "isento" ? "Isento (art. 53.º)" : v[0].toUpperCase() + v.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {solo && (
              <div className="fiscal-card__nums">
                <label className="field">
                  <span className="field__label">O teu ordenado por mês</span>
                  <div className="input-unit">
                    <input className="input" type="number" min={0} step={50} value={fiscal.ownerPay} onChange={(e) => setFiscal({ ownerPay: Math.max(0, Number(e.target.value)) })} />
                    <span>€</span>
                  </div>
                </label>
                <label className="field">
                  <span className="field__label">Taxa de IRS estimada</span>
                  <div className="input-unit">
                    <input className="input" type="number" min={0} max={53} step={1} value={fiscal.irsRate} onChange={(e) => setFiscal({ irsRate: Math.min(53, Math.max(0, Number(e.target.value))) })} />
                    <span>%</span>
                  </div>
                </label>
              </div>
            )}
          </div>

          <div className="fiscal-card__changes">
            <div className="eyebrow">O que isto muda</div>
            <ul>
              {changes.map((c) => <li key={c}>{c}</li>)}
            </ul>
            {overLimit && (
              <div className="notice notice--bad">
                <AlertTriangle size={16} />
                <span>
                  Faturaste {money(billed)} nos últimos 12 meses. A isenção de IVA só se aplica até {money(VAT_EXEMPT_LIMIT)} por ano — fala com o contabilista sobre o regime normal.
                </span>
              </div>
            )}
            <p className="faint" style={{ fontSize: 12, margin: 0 }}>
              <Info size={12} style={{ verticalAlign: -2 }} /> Regras de referência para Portugal. Confirma sempre com o contabilista certificado. No produto final, isto é escolhido ao criar a conta.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
