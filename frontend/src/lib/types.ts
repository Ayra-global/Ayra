export interface User {
  id: string;
  name: string;
  email: string;
  preferredCurrency: string;
  createdAt: string;
}

export interface Balance {
  currency: string;
  amount: string;
}

export interface WalletSummary {
  balances: Balance[];
  total: { currency: string; amount: string | null };
}

export type OperationType = 'buy' | 'sell' | 'exchange';

export interface Transaction {
  id: string;
  type: 'deposit' | OperationType;
  fromCurrency: string | null;
  toCurrency: string;
  fromAmount: string | null;
  toAmount: string;
  rate: string | null;
  midRate: string | null;
  fee: string;
  feeCurrency: string | null;
  contextId: string | null;
  contextName: string | null;
  createdAt: string;
}

export interface Quote {
  type: OperationType;
  fromCurrency: string;
  toCurrency: string;
  fromAmount: string;
  toAmount: string;
  midRate: string;
  appliedRate: string;
  fee: string;
  feeSide: 'from' | 'to';
  rateFetchedAt: string;
  rateStale: boolean;
}

export type ContextType = 'travel' | 'study' | 'work' | 'shared';

export interface WalletContext {
  id: string;
  name: string;
  type: ContextType;
  status: 'active' | 'archived';
  startDate: string | null;
  endDate: string | null;
  budget: { currency: string; amount: string; spent: string } | null;
  transactionCount: number;
  createdAt: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}
