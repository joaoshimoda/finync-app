"use client";

import {
  motion,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type Owner = "voce" | "dependente";

type Purchase = {
  id: string;
  merchant: string;
  date: string;
  amount: number;
  installment?: string;
};

const purchases: Purchase[] = [
  { id: "mercado", merchant: "Mercado São Luiz", date: "18 set", amount: 284.9 },
  { id: "ifood", merchant: "iFood", date: "20 set", amount: 63.4 },
  {
    id: "notebook",
    merchant: "Magazine Luiza",
    date: "02 jun",
    amount: 389.9,
    installment: "4 de 10",
  },
  {
    id: "renner",
    merchant: "Renner",
    date: "14 ago",
    amount: 113.71,
    installment: "2 de 4",
  },
  { id: "uber", merchant: "Uber", date: "27 set", amount: 42.6 },
  { id: "spotify", merchant: "Spotify Família", date: "01 out", amount: 34.9 },
];

const initialOwners: Record<string, Owner> = {
  mercado: "voce",
  ifood: "dependente",
  notebook: "voce",
  renner: "dependente",
  uber: "voce",
  spotify: "voce",
};

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const total = purchases.reduce((sum, purchase) => sum + purchase.amount, 0);

function AnimatedAmount({ value }: { value: number }) {
  const reduceMotion = useReducedMotion();
  const spring = useSpring(value, { stiffness: 160, damping: 24 });
  const text = useTransform(spring, (current) => brl.format(current));

  useEffect(() => {
    if (reduceMotion) {
      spring.jump(value);
    } else {
      spring.set(value);
    }
  }, [reduceMotion, spring, value]);

  return (
    <>
      <motion.span aria-hidden>{text}</motion.span>
      <span className="sr-only" aria-live="polite">
        {brl.format(value)}
      </span>
    </>
  );
}

export function InvoiceSplitDemo() {
  const [owners, setOwners] = useState(initialOwners);

  const dependentTotal = purchases
    .filter((purchase) => owners[purchase.id] === "dependente")
    .reduce((sum, purchase) => sum + purchase.amount, 0);

  function toggleOwner(id: string) {
    setOwners((current) => ({
      ...current,
      [id]: current[id] === "dependente" ? "voce" : "dependente",
    }));
  }

  return (
    <div className="relative rounded-[20px] border border-border bg-ledger-sheet shadow-[0_1px_0_#cfd8cf,0_24px_48px_-28px_rgba(18,38,26,0.35)]">
      <div className="flex items-baseline justify-between gap-4 px-5 pt-5 sm:px-7 sm:pt-6">
        <div>
          <p className="text-[15px] font-semibold">Fatura de outubro</p>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Cartão final 4471
          </p>
        </div>
        <p className="text-[13px] text-muted-foreground">Vence em 10 nov</p>
      </div>

      <p className="px-5 pt-4 text-[13px] text-muted-foreground sm:px-7">
        Toque numa compra para mudar quem pagou.
      </p>

      <ul className="mt-3 border-t border-border">
        {purchases.map((purchase, index) => {
          const isDependent = owners[purchase.id] === "dependente";

          return (
            <motion.li
              key={purchase.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.4,
                delay: 0.25 + index * 0.06,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="border-b border-border last:border-0"
            >
              <button
                type="button"
                onClick={() => toggleOwner(purchase.id)}
                aria-pressed={isDependent}
                aria-label={`${purchase.merchant}, ${brl.format(purchase.amount)}. ${isDependent ? "Compra do dependente" : "Sua compra"}. Alternar responsável.`}
                className={cn(
                  "flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-3 text-left transition-colors outline-none hover:bg-secondary/70 focus-visible:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:px-7",
                  isDependent && "bg-ledger-amber-soft/45 hover:bg-ledger-amber-soft/70",
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate text-[15px]">
                    {purchase.merchant}
                  </span>
                  <span className="block text-[13px] text-muted-foreground">
                    {purchase.date}
                    {purchase.installment
                      ? `, parcela ${purchase.installment}`
                      : null}
                  </span>
                </span>
                <span className="flex flex-col items-end gap-1 sm:flex-row-reverse sm:items-center sm:gap-5">
                  <span className="text-[15px] tabular-nums sm:min-w-24 sm:text-right">
                    {brl.format(purchase.amount)}
                  </span>
                  <span
                    className={cn(
                      "inline-flex h-6 min-w-14 items-center justify-center rounded-full px-2.5 text-[12px] font-medium transition-colors",
                      isDependent
                        ? "bg-ledger-amber text-ledger-sheet"
                        : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {isDependent ? "Dependente" : "Você"}
                  </span>
                </span>
              </button>
            </motion.li>
          );
        })}
      </ul>

      <div className="rounded-b-[20px] border-t border-border bg-background/60 px-5 py-5 sm:px-7 sm:py-6">
        <dl className="grid gap-2 text-[14px]">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Total da fatura</dt>
            <dd className="tabular-nums">{brl.format(total)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ledger-amber">Dependente devolve</dt>
            <dd className="tabular-nums text-ledger-amber">
              <AnimatedAmount value={dependentTotal} />
            </dd>
          </div>
        </dl>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-1 border-t border-border pt-4">
          <p className="text-[15px] font-semibold">Sua parte</p>
          <p className="text-[clamp(2.5rem,5vw,3.5rem)] leading-none font-semibold tracking-[-0.02em] tabular-nums [font-stretch:75%]">
            <AnimatedAmount value={total - dependentTotal} />
          </p>
        </div>
      </div>
    </div>
  );
}
