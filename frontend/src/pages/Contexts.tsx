import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { TransactionList } from '../components/TransactionList';
import { api, ApiError } from '../lib/api';
import { CONTEXT_META, money, percent } from '../lib/format';
import type { ContextType, Transaction, WalletContext } from '../lib/types';

export function ContextCard({ ctx, onClick, selected }: { ctx: WalletContext; onClick?: () => void; selected?: boolean }) {
  const meta = CONTEXT_META[ctx.type];
  const pct = ctx.budget ? percent(ctx.budget.spent, ctx.budget.amount) : 0;
  return (
    <button type="button" className={`context-card ctx-${ctx.type} ${selected ? 'selected' : ''}`} onClick={onClick}>
      <span className="ctx-icon">{meta.icon}</span>
      <b>{ctx.name}</b>
      <span className="muted small">{meta.label}{ctx.endDate ? ` · hasta ${ctx.endDate}` : ''}</span>
      {ctx.budget ? (
        <>
          <span className="small">{money(ctx.budget.spent)} / {money(ctx.budget.amount, ctx.budget.currency)}</span>
          <span className="progress"><span style={{ width: `${pct}%` }} className={pct >= 90 ? 'danger' : ''} /></span>
        </>
      ) : (
        <span className="muted small">{ctx.transactionCount} movimientos</span>
      )}
    </button>
  );
}

export function ContextsPage() {
  const [contexts, setContexts] = useState<WalletContext[] | null>(null);
  const [currencies, setCurrencies] = useState<string[]>([]);
  const [selected, setSelected] = useState<WalletContext | null>(null);
  const [txs, setTxs] = useState<Transaction[] | null>(null);

  const load = useCallback(async () => {
    const [c, cur] = await Promise.all([api.contexts(), api.currencies()]);
    setContexts(c.contexts);
    setCurrencies(cur.currencies);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selected) return;
    setTxs(null);
    api.transactions({ contextId: selected.id, limit: 50 }).then((r) => setTxs(r.items));
  }, [selected]);

  async function archive(id: string) {
    await api.archiveContext(id);
    setSelected(null);
    await load();
  }

  return (
    <>
      <h1>Mis contextos</h1>
      <p className="muted">Organizá tu dinero según lo que estás viviendo. La wallet es una sola; el contexto agrupa y da sentido.</p>

      <div className="grid-2">
        <NewContextForm currencies={currencies} onCreated={load} />
        <section className="card">
          {contexts === null ? (
            <div className="skeleton" style={{ height: 160 }} />
          ) : contexts.length === 0 ? (
            <p className="muted">Todavía no creaste contextos.</p>
          ) : (
            <div className="context-grid">
              {contexts.map((c) => (
                <ContextCard key={c.id} ctx={c} selected={selected?.id === c.id} onClick={() => setSelected(c)} />
              ))}
            </div>
          )}
        </section>
      </div>

      {selected && (
        <section className="card">
          <div className="section-head">
            <h2>{CONTEXT_META[selected.type].icon} {selected.name}</h2>
            <button className="btn-ghost" onClick={() => void archive(selected.id)}>Archivar</button>
          </div>
          <TransactionList items={txs} emptyText="Sin movimientos en este contexto. Asociá operaciones desde el dashboard." />
        </section>
      )}
    </>
  );
}

function NewContextForm({ currencies, onCreated }: { currencies: string[]; onCreated: () => void }) {
  const empty = { name: '', type: 'travel' as ContextType, startDate: '', endDate: '', budgetAmount: '', budgetCurrency: 'USD' };
  const [f, setF] = useState(empty);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.createContext({
        name: f.name,
        type: f.type,
        startDate: f.startDate || null,
        endDate: f.endDate || null,
        budget: f.budgetAmount ? { currency: f.budgetCurrency, amount: f.budgetAmount } : null,
      });
      setF(empty);
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error inesperado');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card">
      <h2>Nuevo contexto</h2>
      <form className="form" onSubmit={onSubmit}>
        <label>
          Nombre
          <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Viaje a España" required minLength={2} />
        </label>
        <label>
          Tipo
          <div className="type-picker">
            {(Object.keys(CONTEXT_META) as ContextType[]).map((t) => (
              <button type="button" key={t} className={f.type === t ? 'active' : ''} onClick={() => setF({ ...f, type: t })}>
                {CONTEXT_META[t].icon} {CONTEXT_META[t].label}
              </button>
            ))}
          </div>
        </label>
        <div className="row">
          <label>Desde<input type="date" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} /></label>
          <label>Hasta<input type="date" value={f.endDate} onChange={(e) => setF({ ...f, endDate: e.target.value })} /></label>
        </div>
        <div className="row">
          <label>
            Presupuesto (opcional)
            <input inputMode="decimal" value={f.budgetAmount} onChange={(e) => setF({ ...f, budgetAmount: e.target.value.replace(',', '.') })} placeholder="800" />
          </label>
          <label>
            Moneda
            <select value={f.budgetCurrency} onChange={(e) => setF({ ...f, budgetCurrency: e.target.value })}>
              {currencies.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
        </div>
        {error && <p className="alert error">{error}</p>}
        <button className="btn-primary" disabled={saving}>{saving ? 'Creando…' : 'Crear contexto'}</button>
      </form>
    </section>
  );
}
