-- AYRA - Agrega monedas iniciales faltantes
-- Sprint 2 - N1
-- Agrega EUR y ARS a las wallets existentes sin modificar
-- los saldos que ya existen.

BEGIN;

INSERT INTO balances (
    wallet_id,
    currency_code,
    amount
)
SELECT
    w.id,
    c.currency_code,
    0
FROM wallets w
CROSS JOIN (
    VALUES
        ('EUR'),
        ('ARS')
) AS c(currency_code)
ON CONFLICT (wallet_id, currency_code) DO NOTHING;

COMMIT;