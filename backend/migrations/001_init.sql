-- AYRA - Migración inicial
-- Esquema alineado con el contrato actual de API y las necesidades del frontend.
-- Demo 1: un usuario registrado obtiene una wallet y un balance inicial de 1000 USD.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    preferred_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- WALLETS
-- ============================================================

CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT wallets_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

-- ============================================================
-- BALANCES
-- ============================================================

CREATE TABLE balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL,
    currency_code VARCHAR(3) NOT NULL,
    amount NUMERIC(18,8) NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT balances_wallet_id_fkey
        FOREIGN KEY (wallet_id)
        REFERENCES wallets(id)
        ON DELETE CASCADE,

    CONSTRAINT balances_amount_non_negative
        CHECK (amount >= 0),

    CONSTRAINT balances_wallet_currency_unique
        UNIQUE (wallet_id, currency_code)
);

-- ============================================================
-- CONTEXTS
-- ============================================================

CREATE TABLE contexts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL,
    name VARCHAR(120) NOT NULL,
    type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT contexts_wallet_id_fkey
        FOREIGN KEY (wallet_id)
        REFERENCES wallets(id)
        ON DELETE CASCADE,

    CONSTRAINT contexts_type_check
        CHECK (type IN ('travel', 'study', 'work', 'shared')),

    CONSTRAINT contexts_status_check
        CHECK (status IN ('active', 'archived')),

    CONSTRAINT contexts_date_range_check
        CHECK (
            end_date IS NULL
            OR start_date IS NULL
            OR end_date >= start_date
        ),

    -- Necesario para poder garantizar que una transacción
    -- solo se asocie a un contexto de la misma wallet.
    CONSTRAINT contexts_id_wallet_unique
        UNIQUE (id, wallet_id)
);

-- ============================================================
-- CONTEXT BUDGETS
-- ============================================================

CREATE TABLE context_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    context_id UUID NOT NULL UNIQUE,
    amount NUMERIC(18,8) NOT NULL,
    currency_code VARCHAR(3) NOT NULL,
    period_start DATE,
    period_end DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT context_budgets_context_id_fkey
        FOREIGN KEY (context_id)
        REFERENCES contexts(id)
        ON DELETE CASCADE,

    CONSTRAINT context_budgets_amount_non_negative
        CHECK (amount >= 0),

    CONSTRAINT context_budgets_period_check
        CHECK (
            period_end IS NULL
            OR period_start IS NULL
            OR period_end >= period_start
        )
);

-- ============================================================
-- TRANSACTIONS
-- ============================================================

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL,
    context_id UUID,
    type VARCHAR(20) NOT NULL,
    currency_from VARCHAR(3) NOT NULL,
    currency_to VARCHAR(3) NOT NULL,
    amount_from NUMERIC(18,8) NOT NULL,
    amount_to NUMERIC(18,8) NOT NULL,
    rate_used NUMERIC(18,8),
    mid_rate NUMERIC(18,8),
    fee NUMERIC(18,8) NOT NULL DEFAULT 0,
    fee_currency VARCHAR(3),
    status VARCHAR(20) NOT NULL DEFAULT 'completed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT transactions_wallet_id_fkey
        FOREIGN KEY (wallet_id)
        REFERENCES wallets(id)
        ON DELETE CASCADE,

    CONSTRAINT transactions_context_wallet_fkey
        FOREIGN KEY (context_id, wallet_id)
        REFERENCES contexts(id, wallet_id)
        ON DELETE NO ACTION,

    -- El frontend ya contempla 'deposit'.
    -- Buy/sell/exchange son los tipos definidos actualmente en API.md.
    CONSTRAINT transactions_type_check
        CHECK (type IN ('deposit', 'buy', 'sell', 'exchange')),

    CONSTRAINT transactions_status_check
        CHECK (status IN ('pending', 'completed', 'failed')),

    CONSTRAINT transactions_amount_from_positive
        CHECK (amount_from > 0),

    CONSTRAINT transactions_amount_to_positive
        CHECK (amount_to > 0),

    CONSTRAINT transactions_fee_non_negative
        CHECK (fee >= 0),

    CONSTRAINT transactions_rate_positive
        CHECK (rate_used IS NULL OR rate_used > 0),

    CONSTRAINT transactions_mid_rate_positive
        CHECK (mid_rate IS NULL OR mid_rate > 0),

    CONSTRAINT transactions_fee_currency_required
        CHECK (fee = 0 OR fee_currency IS NOT NULL)
);

-- ============================================================
-- EXCHANGE RATES CACHE
-- ============================================================

CREATE TABLE exchange_rates_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    currency_from VARCHAR(3) NOT NULL,
    currency_to VARCHAR(3) NOT NULL,
    rate NUMERIC(18,8) NOT NULL,
    source VARCHAR(120) NOT NULL,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMPTZ NOT NULL,

    CONSTRAINT exchange_rates_cache_rate_positive
        CHECK (rate > 0),

    CONSTRAINT exchange_rates_cache_pair_check
        CHECK (currency_from <> currency_to),

    CONSTRAINT exchange_rates_cache_validity_check
        CHECK (valid_until > fetched_at)
);

-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE INDEX idx_balances_wallet_id
    ON balances(wallet_id);

CREATE INDEX idx_contexts_wallet_id
    ON contexts(wallet_id);

CREATE INDEX idx_transactions_wallet_id_created_at
    ON transactions(wallet_id, created_at DESC);

CREATE INDEX idx_transactions_context_id_created_at
    ON transactions(context_id, created_at DESC);

CREATE INDEX idx_exchange_rates_cache_pair_valid_until
    ON exchange_rates_cache(currency_from, currency_to, valid_until DESC);

COMMIT;
