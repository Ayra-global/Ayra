import { dateTime, money, TX_LABEL } from '../lib/format';
import type { Transaction } from '../lib/types';

const ICON = { deposit: '⬇️', buy: '🛒', sell: '💸', exchange: '🔄' } as const;

export function TransactionList({ items, emptyText = 'Todavía no hay movimientos' }: { items: Transaction[] | null; emptyText?: string }) {
  if (!items) return <div className="card skeleton" style={{ height: 200 }} />;
  if (!items.length) return <p className="muted center">{emptyText}</p>;

  return (
    <ul className="tx-list">
      {items.map((t) => (
        <li key={t.id} className="tx">
          <span className="tx-icon">{ICON[t.type]}</span>
          <div className="tx-main">
            <b>{TX_LABEL[t.type]}</b>
            <span className="muted small">
              {dateTime(t.createdAt)}
              {t.contextName && <span className="tag">{t.contextName}</span>}
            </span>
          </div>
          <div className="tx-amounts">
            {t.fromAmount && <span className="neg">−{money(t.fromAmount, t.fromCurrency ?? '')}</span>}
            <span className="pos">+{money(t.toAmount, t.toCurrency)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
