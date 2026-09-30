import { useEffect, useState } from 'react';
import { TransactionList } from '../components/TransactionList';
import { api } from '../lib/api';
import type { Transaction } from '../lib/types';

const PAGE = 20;

export function TransactionsPage() {
  const [items, setItems] = useState<Transaction[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);

  useEffect(() => {
    setItems(null);
    api.transactions({ limit: PAGE, offset: page * PAGE }).then((r) => {
      setItems(r.items);
      setTotal(r.total);
    });
  }, [page]);

  const pages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <>
      <h1>Movimientos</h1>
      <section className="card">
        <TransactionList items={items} />
        {pages > 1 && (
          <div className="pager">
            <button className="btn-ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>‹ Anterior</button>
            <span className="muted">{page + 1} / {pages}</span>
            <button className="btn-ghost" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>Siguiente ›</button>
          </div>
        )}
      </section>
    </>
  );
}
