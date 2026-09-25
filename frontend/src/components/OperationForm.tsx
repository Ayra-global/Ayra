import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError } from '../lib/api';
import { CONTEXT_META, money, rate } from '../lib/format';
import type { Balance, OperationType, Quote, WalletContext } from '../lib/types';

interface Props {
  balances: Balance[];
  contexts: WalletContext[];
  onDone: () => void;
}

const TABS: { type: OperationType; label: string; noun: string; help: string }[] = [
  { type: 'buy', label: 'Comprar', noun: 'compra', help: 'Indicá cuánto querés RECIBIR. Se aplica un spread.' },
  { type: 'sell', label: 'Vender', noun: 'venta', help: 'Indicá cuánto querés VENDER. Se aplica un spread.' },
  { type: 'exchange', label: 'Intercambiar', noun: 'intercambio', help: 'Conversión directa a tasa de mercado, sin comisión.' },
];

export function OperationForm({ balances, contexts, onDone }: Props) {
  const currencies = balances.map((b) => b.currency);
  const [type, setType] = useState<OperationType>('exchange');
  // Por defecto: desde la moneda con mayor saldo hacia otra cualquiera
  const initialFrom = [...balances].sort((a, b) => Number(b.amount) - Number(a.amount))[0]?.currency ?? 'USD';
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(currencies.find((c) => c !== initialFrom) ?? 'EUR');
  const [amount, setAmount] = useState('');
  const [contextId, setContextId] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  // Cotización en vivo con debounce
  useEffect(() => {
    setQuote(null);
    if (!amount || Number(amount) <= 0 || from === to) return;
    const t = setTimeout(async () => {
      setQuoting(true);
      try {
        setQuote((await api.quote({ type, from, to, amount })).quote);
        setMessage(null);
      } catch (err) {
        setMessage({ kind: 'error', text: err instanceof ApiError ? err.message : 'No se pudo cotizar' });
      } finally {
        setQuoting(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [type, from, to, amount]);

  const available = balances.find((b) => b.currency === from)?.amount ?? '0';
  const insufficient = quote ? Number(quote.fromAmount) > Number(available) : false;

  function swap() {
    setFrom(to);
    setTo(from);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!quote) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const { transaction } = await api.execute({ type, fromCurrency: from, toCurrency: to, amount, contextId: contextId || null });
      setMessage({ kind: 'ok', text: `✅ Operación confirmada: +${money(transaction.toAmount, transaction.toCurrency)}. Te enviamos un email.` });
      setAmount('');
      onDone();
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof ApiError ? err.message : 'Error inesperado' });
    } finally {
      setSubmitting(false);
    }
  }

  const tab = TABS.find((t) => t.type === type)!;

  return (
    <section className="card">
      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.type} type="button" className={t.type === type ? 'tab active' : 'tab'} onClick={() => setType(t.type)}>
            {t.label}
          </button>
        ))}
      </div>
      <p className="muted small">{tab.help}</p>

      <form onSubmit={onSubmit} className="form">
        <div className="row">
          <label>
            {type === 'buy' ? 'Pago con' : 'Desde'}
            <select value={from} onChange={(e) => setFrom(e.target.value)}>
              {currencies.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <button type="button" className="btn-icon" onClick={swap} aria-label="Invertir monedas">⇄</button>
          <label>
            {type === 'buy' ? 'Compro' : 'Hacia'}
            <select value={to} onChange={(e) => setTo(e.target.value)}>
              {currencies.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
        </div>

        <label>
          Monto ({type === 'buy' ? to : from})
          <input inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value.replace(',', '.'))} />
          <small className="muted">Disponible: {money(available, from)}</small>
        </label>

        {contexts.length > 0 && (
          <label>
            Contexto (opcional)
            <select value={contextId} onChange={(e) => setContextId(e.target.value)}>
              <option value="">Sin contexto</option>
              {contexts.map((c) => (
                <option key={c.id} value={c.id}>{CONTEXT_META[c.type].icon} {c.name}</option>
              ))}
            </select>
          </label>
        )}

        {from === to && <p className="alert error">Elegí dos monedas distintas</p>}

        {(quote || quoting) && (
          <div className={`quote ${quoting ? 'loading' : ''}`}>
            {quote && (
              <>
                <div><span>Pagás</span><b>{money(quote.fromAmount, from, 8)}</b></div>
                <div><span>Recibís</span><b>{money(quote.toAmount, to, 8)}</b></div>
                <div><span>Tasa</span><b>1 {from} = {rate(quote.appliedRate)} {to}</b></div>
                {Number(quote.fee) > 0 && <div><span>Comisión</span><b>{money(quote.fee, quote.feeSide === 'from' ? from : to, 4)}</b></div>}
                {quote.rateStale && <p className="alert warn small">⚠️ Tasa en cache: la API de tasas no respondió.</p>}
              </>
            )}
          </div>
        )}

        {insufficient && <p className="alert error">Saldo insuficiente en {from}</p>}
        {message && <p className={`alert ${message.kind === 'ok' ? 'success' : 'error'}`}>{message.text}</p>}

        <button className="btn-primary" disabled={!quote || insufficient || submitting || quoting}>
          {submitting ? 'Procesando…' : `Confirmar ${tab.noun}`}
        </button>
      </form>
    </section>
  );
}
