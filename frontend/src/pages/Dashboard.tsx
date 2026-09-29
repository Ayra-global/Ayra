import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AssistantChat } from '../components/AssistantChat';
import { BalanceCards } from '../components/BalanceCards';
import { OperationForm } from '../components/OperationForm';
import { TransactionList } from '../components/TransactionList';
import { ContextCard } from './Contexts';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import type { Transaction, WalletContext, WalletSummary } from '../lib/types';

export function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [txs, setTxs] = useState<Transaction[] | null>(null);
  const [contexts, setContexts] = useState<WalletContext[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [w, t, c] = await Promise.all([api.wallet(), api.transactions({ limit: 6 }), api.contexts()]);
      setSummary(w);
      setTxs(t.items);
      setContexts(c.contexts);
      setError('');
    } catch {
      setError('No se pudieron cargar los datos. ¿Está corriendo el backend?');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <h1 className="greeting">Hola, {user?.name.split(' ')[0]} 👋</h1>
      <p className="muted">Que tus planes te lleven más lejos.</p>
      {error && <p className="alert error">{error}</p>}

      <BalanceCards summary={summary} />

      <div className="grid-2">
        {summary && <OperationForm balances={summary.balances} contexts={contexts} onDone={load} />}

        <div className="stack">
          <section className="card">
            <div className="section-head">
              <h2>Mis contextos</h2>
              <Link to="/contexts">Ver todos ›</Link>
            </div>
            {contexts.length === 0 ? (
              <p className="muted">Creá un contexto (viaje, estudio, trabajo…) para organizar tu dinero. <Link to="/contexts">Crear</Link></p>
            ) : (
              <div className="context-grid">
                {contexts.slice(0, 4).map((c) => <ContextCard key={c.id} ctx={c} />)}
              </div>
            )}
          </section>

          <section className="card">
            <div className="section-head">
              <h2>Últimos movimientos</h2>
              <Link to="/transactions">Ver todos ›</Link>
            </div>
            <TransactionList items={txs} />
          </section>
        </div>
      </div>

      <AssistantChat />
    </>
  );
}
