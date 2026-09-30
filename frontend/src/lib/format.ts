const FLAGS: Record<string, string> = { USD: '🇺🇸', EUR: '🇪🇺', ARS: '🇦🇷', CLP: '🇨🇱', BRL: '🇧🇷', MXN: '🇲🇽', COP: '🇨🇴', GBP: '🇬🇧' };

export const flag = (c: string) => FLAGS[c] ?? '💱';

export function money(amount: string | number | null | undefined, currency?: string, maxDecimals = 2): string {
  if (amount === null || amount === undefined || amount === '') return '—';
  const n = Number(amount);
  const formatted = n.toLocaleString('es-AR', {
    minimumFractionDigits: Math.min(2, maxDecimals),
    maximumFractionDigits: maxDecimals,
  });
  return currency ? `${formatted} ${currency}` : formatted;
}

export function rate(value: string | null | undefined): string {
  if (!value) return '—';
  const n = Number(value);
  return n.toLocaleString('es-AR', { maximumSignificantDigits: 6 });
}

export function dateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}

export const TX_LABEL = { deposit: 'Depósito', buy: 'Compra', sell: 'Venta', exchange: 'Intercambio' } as const;

export const CONTEXT_META = {
  travel: { label: 'Viaje', icon: '✈️' },
  study: { label: 'Estudio', icon: '🎓' },
  work: { label: 'Trabajo', icon: '💼' },
  shared: { label: 'Compartido', icon: '👥' },
} as const;

export function percent(part: string | number, total: string | number): number {
  const t = Number(total);
  if (!t) return 0;
  return Math.min(100, Math.round((Number(part) / t) * 100));
}
