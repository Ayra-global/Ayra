import type {
  Balance,
  ChatMessage,
  OperationType,
  Quote,
  Transaction,
  User,
  WalletContext,
  WalletSummary,
} from './types';

const BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const TOKEN_KEY = 'ayra_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, string[]>,
  ) {
    super(message);
  }
}

/** Se dispara cuando el backend responde 401 → el AuthContext cierra sesión. */
export const UNAUTHORIZED_EVENT = 'ayra:unauthorized';

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  const body = res.status === 204 ? null : await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 401 && token) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    const err = body?.error ?? {};
    throw new ApiError(res.status, err.code ?? 'UNKNOWN', err.message ?? 'Error inesperado', err.details);
  }
  return body as T;
}

const qs = (params: Record<string, string | number | undefined>) =>
  new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => [k, String(v)]),
  ).toString();

export const api = {
  // Auth
  register: (data: { name: string; email: string; password: string }) =>
    request<{ token: string; user: User }>('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    request<{ token: string; user: User }>('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  me: () => request<{ user: User }>('/api/auth/me'),

  // Wallet
  wallet: () => request<WalletSummary>('/api/wallet'),
  balances: () => request<{ balances: Balance[] }>('/api/wallet/balances'),
  currencies: () => request<{ currencies: string[] }>('/api/rates/currencies'),

  // Tasas y operaciones
  quote: (p: { type: OperationType; from: string; to: string; amount: string }) =>
    request<{ quote: Quote }>(`/api/rates/quote?${qs(p)}`),
  execute: (data: { type: OperationType; fromCurrency: string; toCurrency: string; amount: string; contextId?: string | null }) =>
    request<{ transaction: Transaction }>('/api/transactions', { method: 'POST', body: JSON.stringify(data) }),
  transactions: (p: { contextId?: string; limit?: number; offset?: number } = {}) =>
    request<{ items: Transaction[]; total: number }>(`/api/transactions?${qs(p)}`),

  // Contextos
  contexts: (includeArchived = false) =>
    request<{ contexts: WalletContext[] }>(`/api/contexts${includeArchived ? '?includeArchived=true' : ''}`),
  createContext: (data: {
    name: string;
    type: WalletContext['type'];
    startDate?: string | null;
    endDate?: string | null;
    budget?: { currency: string; amount: string } | null;
  }) => request<{ context: WalletContext }>('/api/contexts', { method: 'POST', body: JSON.stringify(data) }),
  archiveContext: (id: string) => request<{ context: WalletContext }>(`/api/contexts/${id}/archive`, { method: 'PATCH' }),

  // Asistente
  chat: (message: string, history: ChatMessage[]) =>
    request<{ reply: string }>('/api/assistant/chat', { method: 'POST', body: JSON.stringify({ message, history }) }),
};
