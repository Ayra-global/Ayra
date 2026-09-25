import { flag, money } from '../lib/format';
import type { WalletSummary } from '../lib/types';

export function BalanceCards({ summary }: { summary: WalletSummary | null }) {
  if (!summary) return <div className="card skeleton" style={{ height: 180 }} />;

  return (
    <section className="balance-hero">
      <div className="balance-total">
        <span className="muted-light">Balance total estimado</span>
        <strong>
          {summary.total.amount !== null ? money(summary.total.amount, summary.total.currency) : 'Tasas no disponibles'}
        </strong>
      </div>
      <div className="balance-grid">
        {summary.balances.map((b) => (
          <div key={b.currency} className="balance-chip">
            <span className="flag">{flag(b.currency)}</span>
            <span className="cur">{b.currency}</span>
            <span className="amt">{money(b.amount)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
