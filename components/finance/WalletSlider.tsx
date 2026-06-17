import { formatCurrency } from "@/lib/financeUtils";
import type { Card, Transaction } from "@/store/useFinanceStore";
import { CreditCard } from "lucide-react";

interface WalletSliderProps {
  cards?: Card[];
  transactions?: Transaction[];
}

export function WalletSlider({ cards = [], transactions = [] }: WalletSliderProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-brand-300">Carteira</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white">
            Cartoes de credito
          </h2>
        </div>
        <span className="rounded-full border border-white/[0.08] bg-white/[0.045] px-3 py-1 text-xs font-medium text-zinc-300">
          {cards.length} {cards.length === 1 ? "cartao" : "cartoes"}
        </span>
      </div>

      {cards.length ? (
        <div className="-mx-5 flex snap-x gap-4 overflow-x-auto px-5 pb-2 sm:-mx-8 sm:px-8 lg:mx-0 lg:px-0">
          {cards.map((card) => {
            const cardTransactions = transactions.filter(
              (transaction) => transaction.cardId === card.id,
            );
            const total = cardTransactions.reduce(
              (sum, transaction) => sum + transaction.amount,
              0,
            );
            const paid = cardTransactions
              .filter((transaction) => transaction.status === "paid")
              .reduce((sum, transaction) => sum + transaction.amount, 0);
            const pending = Math.max(total - paid, 0);
            const limit = card.limitAmount || 0;
            const usage = limit > 0 ? Math.min((total / limit) * 100, 100) : 0;
            const isNearLimit = usage >= 85;
            const color = card.color || "#2dd4bf";

            return (
              <article
                key={card.id}
                className="relative min-h-64 w-[19rem] shrink-0 snap-start overflow-hidden rounded-[2rem] border border-white/[0.08] bg-white/[0.055] p-5 shadow-2xl shadow-black/20 backdrop-blur-2xl sm:w-[22rem]"
              >
                <div
                  className="absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-25 blur-2xl"
                  style={{ backgroundColor: color }}
                />
                <div className="relative flex h-full flex-col justify-between">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <span
                          className="flex h-10 w-10 items-center justify-center rounded-2xl border"
                          style={{
                            borderColor: `${color}44`,
                            backgroundColor: `${color}1f`,
                            color,
                          }}
                        >
                          <CreditCard className="h-5 w-5" strokeWidth={2} />
                        </span>
                        <h3 className="text-lg font-semibold text-white">{card.name}</h3>
                      </div>
                      <p className="mt-2 text-xs font-medium text-zinc-400">
                        Vence dia {card.dueDay || "--"} {"\u00b7"}{" "}
                        {cardTransactions.length} lancamentos
                      </p>
                    </div>
                    {isNearLimit ? (
                      <span className="rounded-full border border-red-300/20 bg-red-300/10 px-2.5 py-1 text-xs font-semibold text-red-200">
                        {usage.toFixed(0)}%
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-8">
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                      Fatura atual
                    </p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight text-white">
                      {formatCurrency(total)}
                    </p>
                    <p className="mt-2 text-xs text-zinc-400">
                      {limit > 0 ? `Limite ${formatCurrency(limit)}` : "Sem limite definido"}
                    </p>
                  </div>

                  <div className="mt-6 space-y-4">
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${usage}%`,
                          backgroundColor: isNearLimit ? "#f87171" : color,
                        }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-white/[0.08] bg-black/15 p-3">
                        <p className="text-xs text-zinc-400">Pago</p>
                        <p className="mt-1 text-sm font-semibold text-emerald-300">
                          {formatCurrency(paid)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/[0.08] bg-black/15 p-3">
                        <p className="text-xs text-zinc-400">Pendente</p>
                        <p className="mt-1 text-sm font-semibold text-amber-300">
                          {formatCurrency(pending)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="flex min-h-56 items-center justify-center rounded-[2rem] border border-dashed border-white/[0.08] bg-white/[0.04] p-8 text-center">
          <div>
            <CreditCard className="mx-auto h-8 w-8 text-zinc-500" strokeWidth={1.8} />
            <p className="mt-4 text-sm font-medium text-zinc-300">
              Nenhum cart{"\u00e3"}o adicionado
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              Adicione seu primeiro cartao para acompanhar limites e faturas.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
