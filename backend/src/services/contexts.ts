import { pool } from "../config/database";

export type ContextType =
    | "travel"
    | "study"
    | "work"
    | "shared";

export interface ContextResponse {
    id: string;
    name: string;
    type: ContextType;
    status: "active" | "archived";
    startDate: string | null;
    endDate: string | null;
    budget: {
        currency: string;
        amount: string;
        spent: string;
    } | null;
    transactionCount: number;
    createdAt: Date;
}

interface WalletRow {
    id: string;
}

interface ContextRow {
    id: string;
    name: string;
    type: ContextType;
    status: "active" | "archived";
    start_date: string | null;
    end_date: string | null;
    created_at: Date;
    budget_currency: string | null;
    budget_amount: string | null;
    spent: string | null;
    transaction_count: string;
}

class ContextError extends Error {
    constructor(
        public code: string,
        message: string
    ) {
        super(message);
        this.name = "ContextError";
    }
}

async function getWalletId(userId: string): Promise<string> {
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
        throw new ContextError(
            "WALLET_NOT_FOUND",
            "No se encontró la wallet del usuario"
        );
    }

    return wallet.id;
}

function mapContext(row: ContextRow): ContextResponse {
    return {
        id: row.id,
        name: row.name,
        type: row.type,
        status: row.status,
        startDate: row.start_date,
        endDate: row.end_date,
        budget:
            row.budget_currency && row.budget_amount
                ? {
                    currency: row.budget_currency,
                    amount: row.budget_amount,
                    spent: row.spent ?? "0",
                }
                : null,
        transactionCount: Number(row.transaction_count),
        createdAt: row.created_at,
    };
}

export async function listContexts(
    userId: string,
    includeArchived = false
): Promise<ContextResponse[]> {
    const walletId = await getWalletId(userId);

    const result = await pool.query<ContextRow>(
        `
        SELECT
            c.id,
            c.name,
            c.type,
            c.status,
            c.start_date,
            c.end_date,
            c.created_at,
            cb.currency_code AS budget_currency,
            cb.amount AS budget_amount,

            COALESCE(
                SUM(
                    CASE
                        WHEN
                            t.status = 'completed'
                            AND t.currency_from = cb.currency_code
                        THEN t.amount_from
                        ELSE 0
                    END
                ),
                0
            ) AS spent,

            COUNT(
                CASE
                    WHEN t.status = 'completed'
                    THEN t.id
                END
            )::text AS transaction_count

        FROM contexts c

        LEFT JOIN context_budgets cb
            ON cb.context_id = c.id

        LEFT JOIN transactions t
            ON t.context_id = c.id

        WHERE
            c.wallet_id = $1
            AND ($2 = true OR c.status = 'active')

        GROUP BY
            c.id,
            c.name,
            c.type,
            c.status,
            c.start_date,
            c.end_date,
            c.created_at,
            cb.currency_code,
            cb.amount

        ORDER BY c.created_at DESC
        `,
        [walletId, includeArchived]
    );

    return result.rows.map(mapContext);
}

export async function getContext(
    userId: string,
    contextId: string
): Promise<ContextResponse> {
    const walletId = await getWalletId(userId);

    const result = await pool.query<ContextRow>(
        `
        SELECT
            c.id,
            c.name,
            c.type,
            c.status,
            c.start_date,
            c.end_date,
            c.created_at,
            cb.currency_code AS budget_currency,
            cb.amount AS budget_amount,

            COALESCE(
                SUM(
                    CASE
                        WHEN
                            t.status = 'completed'
                            AND t.currency_from = cb.currency_code
                        THEN t.amount_from
                        ELSE 0
                    END
                ),
                0
            ) AS spent,

            COUNT(
                CASE
                    WHEN t.status = 'completed'
                    THEN t.id
                END
            )::text AS transaction_count

        FROM contexts c

        LEFT JOIN context_budgets cb
            ON cb.context_id = c.id

        LEFT JOIN transactions t
            ON t.context_id = c.id

        WHERE
            c.id = $1
            AND c.wallet_id = $2

        GROUP BY
            c.id,
            c.name,
            c.type,
            c.status,
            c.start_date,
            c.end_date,
            c.created_at,
            cb.currency_code,
            cb.amount

        LIMIT 1
        `,
        [contextId, walletId]
    );

    const row = result.rows[0];

    if (!row) {
        throw new ContextError(
            "CONTEXT_NOT_FOUND",
            "No se encontró el contexto"
        );
    }

    return mapContext(row);
}

export interface CreateContextInput {
    name: string;
    type: ContextType;
    startDate?: string;
    endDate?: string;
    budget?: {
        currency: string;
        amount: string;
    };
}

export async function createContext(
    userId: string,
    input: CreateContextInput
): Promise<ContextResponse> {
    const walletId = await getWalletId(userId);

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const contextResult = await client.query<{
            id: string;
        }>(
            `
            INSERT INTO contexts (
                wallet_id,
                name,
                type,
                start_date,
                end_date
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
            `,
            [
                walletId,
                input.name,
                input.type,
                input.startDate ?? null,
                input.endDate ?? null,
            ]
        );

        const context = contextResult.rows[0];

        if (!context) {
            throw new ContextError(
                "CONTEXT_CREATE_ERROR",
                "No se pudo crear el contexto"
            );
        }

        if (input.budget) {
            await client.query(
                `
                INSERT INTO context_budgets (
                    context_id,
                    amount,
                    currency_code
                )
                VALUES ($1, $2, $3)
                `,
                [
                    context.id,
                    input.budget.amount,
                    input.budget.currency,
                ]
            );
        }

        await client.query("COMMIT");

        return getContext(userId, context.id);
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

export async function archiveContext(
    userId: string,
    contextId: string
): Promise<ContextResponse> {
    const walletId = await getWalletId(userId);

    const result = await pool.query(
        `
        UPDATE contexts
        SET
            status = 'archived',
            updated_at = NOW()
        WHERE
            id = $1
            AND wallet_id = $2
        RETURNING id
        `,
        [contextId, walletId]
    );

    if (!result.rows[0]) {
        throw new ContextError(
            "CONTEXT_NOT_FOUND",
            "No se encontró el contexto"
        );
    }

    return getContext(userId, contextId);
}

export async function activateContext(
    userId: string,
    contextId: string
): Promise<ContextResponse> {
    const walletId = await getWalletId(userId);

    const result = await pool.query(
        `
        UPDATE contexts
        SET
            status = 'active',
            updated_at = NOW()
        WHERE
            id = $1
            AND wallet_id = $2
        RETURNING id
        `,
        [contextId, walletId]
    );

    if (!result.rows[0]) {
        throw new ContextError(
            "CONTEXT_NOT_FOUND",
            "No se encontró el contexto"
        );
    }

    return getContext(userId, contextId);
}

export { ContextError };