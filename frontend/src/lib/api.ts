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

/** Se disparan cuando el backend deja de responder / vuelve a responder → <BackendStatus /> muestra el aviso. */
export const BACKEND_DOWN_EVENT = 'ayra:backend-down';
export const BACKEND_UP_EVENT = 'ayra:backend-up';

const NETWORK_ERROR_MESSAGE = 'No se pudo conectar con el servidor. Intentá de nuevo en unos segundos.';

/** Monedas que soporta el backend (USD, EUR, ARS). */
export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'ARS'];

/** W4: mensajes claros para el usuario según el código de error del backend. */
const SESSION_EXPIRED_KEY = 'ayra_session_expired';
export const SESSION_EXPIRED_MESSAGE = 'Tu sesión venció. Volvé a ingresar para continuar.';

function friendlyMessage(status: number, code: string, fallback: string): string {
  switch (code) {
    case 'INSUFFICIENT_BALANCE':
      return `${fallback || 'Saldo insuficiente'}. Revisá el monto o elegí otra moneda.`;
    case 'RATES_UNAVAILABLE':
      return 'Las tasas de cambio no están disponibles en este momento. Probá de nuevo en unos minutos.';
    case 'CONTEXT_NOT_FOUND':
      return 'El contexto elegido ya no existe. Elegí otro o dejalo sin contexto.';
    case 'VALIDATION_ERROR':
      return fallback || 'Revisá los datos ingresados.';
  }
  if (status === 401) return SESSION_EXPIRED_MESSAGE;
  if (status === 404 && !fallback) return 'Esta función todavía no está disponible.';
  if (status >= 500) return 'Algo salió mal en el servidor. Intentá de nuevo en unos segundos.';
  return fallback || 'Error inesperado';
}

/** Lee (y borra) la marca de "sesión vencida" para mostrar el aviso en el login. */
export function consumeSessionExpired(): boolean {
  try {
    const v = sessionStorage.getItem(SESSION_EXPIRED_KEY);
    sessionStorage.removeItem(SESSION_EXPIRED_KEY);
    return v === '1';
  } catch {
    return false;
  }
}

let backendDown = false;
function markBackend(up: boolean) {
  if (up === !backendDown) return; // sin cambios
  backendDown = !up;
  window.dispatchEvent(new Event(up ? BACKEND_UP_EVENT : BACKEND_DOWN_EVENT));
}

/** Ping a /health. Devuelve true si el backend y la base de datos responden. */
export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(5000) });
    const ok = res.ok;
    markBackend(ok);
    return ok;
  } catch {
    markBackend(false);
    return false;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  } catch {
    // Sin respuesta: backend caído, sin internet o CORS bloqueado
    markBackend(false);
    throw new ApiError(0, 'NETWORK_ERROR', NETWORK_ERROR_MESSAGE);
  }

  const body = res.status === 204 ? null : await res.json().catch(() => null);

  // 502/503/504 sin JSON = el servidor no está levantado (respuesta del proxy de Railway)
  if ([502, 503, 504].includes(res.status) && !body) {
    markBackend(false);
    throw new ApiError(res.status, 'NETWORK_ERROR', NETWORK_ERROR_MESSAGE);
  }
  markBackend(true);

  if (!res.ok) {
    if (res.status === 401 && token) {
      try {
        sessionStorage.setItem(SESSION_EXPIRED_KEY, '1');
      } catch {
        /* sin sessionStorage: solo se cierra la sesión */
      }
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    const err = body?.error ?? {};
    const code = err.code ?? 'UNKNOWN';
    // En login/registro el 401 es "credenciales inválidas", no sesión vencida
    const message = token ? friendlyMessage(res.status, code, err.message ?? '') : err.message ?? 'Error inesperado';
    throw new ApiError(res.status, code, message, err.details);
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
  // El backend no tiene /api/rates/currencies: usamos la lista fija de monedas soportadas
  currencies: async () => ({ currencies: SUPPORTED_CURRENCIES }),

  // Tasas y operaciones
  quote: (p: { type: OperationType; from: string; to: string; amount: string }) =>
    request<{ quote: Quote }>(`/api/rates/quote?${qs(p)}`),
  execute: ({ contextId, ...data }: { type: OperationType; fromCurrency: string; toCurrency: string; amount: string; contextId?: string | null }) =>
    // El backend no acepta contextId: null → solo lo mandamos si hay uno elegido
    request<{ transaction: Transaction }>('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(contextId ? { ...data, contextId } : data),
    }),
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
  }) =>
    // El backend no acepta null en los campos opcionales → los omitimos
    request<{ context: WalletContext }>('/api/contexts', {
      method: 'POST',
      body: JSON.stringify({
        name: data.name,
        type: data.type,
        ...(data.startDate ? { startDate: data.startDate } : {}),
        ...(data.endDate ? { endDate: data.endDate } : {}),
        ...(data.budget ? { budget: data.budget } : {}),
      }),
    }),
  archiveContext: (id: string) => request<{ context: WalletContext }>(`/api/contexts/${id}/archive`, { method: 'PATCH' }),

  // Asistente
  chat: (message: string, history: ChatMessage[]) =>
    request<{ reply: string }>('/api/assistant/chat', { method: 'POST', body: JSON.stringify({ message, history }) }),
};
