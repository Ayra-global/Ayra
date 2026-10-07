import { useState } from 'react';
import { money } from '../lib/format';
import { Flag } from './Flag';
import type { WalletSummary } from '../lib/types';
import { IconEye, IconEyeOff } from './Icons';

const HIDDEN = '••••••';

export function BalanceCards({ summary }: { summary: WalletSummary | null }) {
  const [hidden, setHidden] = useState(false);

  if (!summary) return <div className="card skeleton" style={{ height: 200 }} />;

  const show = (value: string) => (hidden ? HIDDEN : value);

  return (
    <section className="balance-hero">
      <div className="balance-top">
        <div className="balance-total">
          <span className="muted-light">Balance total</span>
          <strong>
            {summary.total.amount !== null
              ? show(money(summary.total.amount, summary.total.currency))
              : 'Tasas no disponibles'}
          </strong>
        </div>
        <button
          type="button"
          className="btn-eye"
          onClick={() => setHidden((h) => !h)}
          aria-label={hidden ? 'Mostrar saldos' : 'Ocultar saldos'}
          title={hidden ? 'Mostrar saldos' : 'Ocultar saldos'}
        >
          {hidden ? <IconEyeOff /> : <IconEye />}
        </button>
      </div>

      <div className="balance-grid">
        {summary.balances.map((b) => (
          <div key={b.currency} className="balance-chip">
            <span className="flag"><Flag currency={b.currency} /></span>
            <span className="cur">{b.currency}</span>
            <span className="amt">{show(money(b.amount))}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
