import { pool } from "../config/database";
import {
    getQuote,
    type QuoteResponse,
    type QuoteType,
} from "./quote";
import type { TransactionInput } from "../schemas/transactions";
import { sendTransactionEmail } from "./email";

export interface TransactionResponse {
    id: string;
    type: QuoteType;
    fromCurrency: string;
    toCurrency: string;
    fromAmount: string;
    toAmount: string;
    rate: string;
    midRate: string;
    fee: string;
    feeCurrency: string | null;
    contextId: string | null;
    contextName: string | null;
    createdAt: Date;
}

interface WalletRow {
    id: string;
}

interface BalanceRow {
    id: string;
    currency_code: string;
    amount: string;
}

interface ContextRow {
    id: string;
    name: string;
}

interface InsertedTransactionRow {
    id: string;
}

class TransactionError extends Error {
    constructor(
        public code: string,
        message: string
    ) {
        super(message);
        this.name = "TransactionError";
    }
}

function getFeeCurrency(
    quote: QuoteResponse
): string | null {
    if (quote.fee === "0") {
        return null;
    }

    if (quote.feeSide === "from") {
        return quote.fromCurrency;
    }

    if (quote.feeSide === "to") {
        return quote.toCurrency;
    }

    return null;
}

function getBalanceAmount(
    balances: BalanceRow[],
    currency: string
): BalanceRow {
    const balance = balances.find(
        (row) => row.currency_code === currency
    );

    if (!balance) {
        throw new TransactionError(
            "BALANCE_NOT_FOUND",
            `No existe un balance para ${currency}`
        );
    }

    return balance;
}

async function getWalletId(
    userId: string
): Promise<string> {
    const result = await pool.query<WalletRow>(
        `
        SELECT id
        FROM wallets
        WHERE user_id = $1
        `,
        [userId]
    );

    const wallet = result.rows[0];

    if (!wallet) {
        throw new TransactionError(
            "WALLET_NOT_FOUND",
            "No se encontró la wallet del usuario"
        );
    }

    return wallet.id;
}

async function getTransactionById(
    client: {
        query: <T = any>(
            text: string,
            values?: unknown[]
        ) => Promise<{ rows: T[] }>;
    },
    transactionId: string,
    walletId: string
): Promise<TransactionResponse> {
    const result =
        await client.query<TransactionResponse>(
            `
            SELECT
                t.id,
                t.type,
                t.currency_from AS "fromCurrency",
                t.currency_to AS "toCurrency",
                t.amount_from AS "fromAmount",
                t.amount_to AS "toAmount",
                t.rate_used AS rate,
                t.mid_rate AS "midRate",
                t.fee,
                t.fee_currency AS "feeCurrency",
                t.context_id AS "contextId",
                c.name AS "contextName",
                t.created_at AS "createdAt"
            FROM transactions t
            LEFT JOIN contexts c
                ON c.id = t.context_id
            WHERE t.id = $1
              AND t.wallet_id = $2
            `,
            [transactionId, walletId]
        );

    const transaction = result.rows[0];

    if (!transaction) {
        throw new TransactionError(
            "TRANSACTION_NOT_FOUND",
            "No se pudo recuperar la transacción creada"
        );
    }

    return transaction;
}

export async function createTransaction(
    userId: string,
    input: TransactionInput
): Promise<TransactionResponse> {
    const walletId = await getWalletId(userId);

    const quote = await getQuote({
        type: input.type,
        from: input.fromCurrency,
        to: input.toCurrency,
        amount: input.amount,
    });

    const client = await pool.connect();
    let committed = false;
    let createdTransaction: TransactionResponse;

    try {
        await client.query("BEGIN");

        let context: ContextRow | null = null;

        if (input.contextId) {
            const contextResult =
                await client.query<ContextRow>(
                    `
                SELECT id, name
                FROM contexts
                WHERE id = $1
                  AND wallet_id = $2
                `,
                    [input.contextId, walletId]
                );

            context = contextResult.rows[0] ?? null;

            if (!context) {
                throw new TransactionError(
                    "CONTEXT_NOT_FOUND",
                    "El contexto no existe o no pertenece a la wallet"
                );
            }
        }

        const balancesResult =
            await client.query<BalanceRow>(
                `
            SELECT
                id,
                currency_code,
                amount
            FROM balances
            WHERE wallet_id = $1
              AND currency_code IN ($2, $3)
            ORDER BY currency_code
            FOR UPDATE
            `,
                [
                    walletId,
                    quote.fromCurrency,
                    quote.toCurrency,
                ]
            );

        if (balancesResult.rows.length !== 2) {
            throw new TransactionError(
                "BALANCE_NOT_FOUND",
                "No se encontraron los balances necesarios para realizar la operación"
            );
        }

        const balances = balancesResult.rows;

        const fromBalance = getBalanceAmount(
            balances,
            quote.fromCurrency
        );

        const toBalance = getBalanceAmount(
            balances,
            quote.toCurrency
        );

        function compareDecimalStrings(
            valueA: string,
            valueB: string
        ): number {
            const [integerA, decimalA = ""] = valueA.split(".");
            const [integerB, decimalB = ""] = valueB.split(".");

            const normalizedIntegerA =
                integerA.replace(/^0+(?=\d)/, "") || "0";
            const normalizedIntegerB =
                integerB.replace(/^0+(?=\d)/, "") || "0";

            if (
                normalizedIntegerA.length !==
                normalizedIntegerB.length
            ) {
                return normalizedIntegerA.length >
                    normalizedIntegerB.length
                    ? 1
                    : -1;
            }

            if (normalizedIntegerA !== normalizedIntegerB) {
                return normalizedIntegerA > normalizedIntegerB
                    ? 1
                    : -1;
            }

            const maxDecimals = Math.max(
                decimalA.length,
                decimalB.length
            );

            const normalizedDecimalA =
                decimalA.padEnd(maxDecimals, "0");
            const normalizedDecimalB =
                decimalB.padEnd(maxDecimals, "0");

            if (normalizedDecimalA === normalizedDecimalB) {
                return 0;
            }

            return normalizedDecimalA >
                normalizedDecimalB
                ? 1
                : -1;
        }

        if (
            compareDecimalStrings(
                fromBalance.amount,
                quote.fromAmount
            ) < 0
        ) {
            throw new TransactionError(
                "INSUFFICIENT_BALANCE",
                `Saldo insuficiente en ${quote.fromCurrency}`
            );
        }

        await client.query(
            `
        UPDATE balances
        SET
            amount = amount - $1,
            updated_at = NOW()
        WHERE id = $2
        `,
            [
                quote.fromAmount,
                fromBalance.id,
            ]
        );

        await client.query(
            `
        UPDATE balances
        SET
            amount = amount + $1,
            updated_at = NOW()
        WHERE id = $2
        `,
            [
                quote.toAmount,
                toBalance.id,
            ]
        );

        const feeCurrency =
            getFeeCurrency(quote);

        const transactionResult =
            await client.query<InsertedTransactionRow>(
                `
            INSERT INTO transactions (
                wallet_id,
                context_id,
                type,
                currency_from,
                currency_to,
                amount_from,
                amount_to,
                rate_used,
                mid_rate,
                fee,
                fee_currency,
                status
            )
            VALUES (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                $8,
                $9,
                $10,
                $11,
                'completed'
            )
            RETURNING id
            `,
                [
                    walletId,
                    input.contextId ?? null,
                    quote.type,
                    quote.fromCurrency,
                    quote.toCurrency,
                    quote.fromAmount,
                    quote.toAmount,
                    quote.appliedRate,
                    quote.midRate,
                    quote.fee,
                    feeCurrency,
                ]
            );

        const inserted =
            transactionResult.rows[0];

        if (!inserted) {
            throw new TransactionError(
                "TRANSACTION_CREATE_FAILED",
                "No se pudo registrar la transacción"
            );
        }

        await client.query("COMMIT");
        committed = true;

        createdTransaction = await getTransactionById(
            client,
            inserted.id,
            walletId
        );
    } catch (error) {
        if (!committed) {
            await client.query("ROLLBACK");
        }

        throw error;
    } finally {
        client.release();
    }

    await sendTransactionEmail(
        userId,
        createdTransaction
    );

    return createdTransaction;
}