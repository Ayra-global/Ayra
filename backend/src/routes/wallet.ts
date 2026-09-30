import { Router } from "express";
import { pool } from "../config/database";
import {
    AuthenticatedRequest,
    requireAuth,
} from "../middlewares/auth";

const router = Router();

router.get(
    "/",
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
        try {
            const result = await pool.query(
                `
                SELECT
                    b.currency_code,
                    b.amount
                FROM balances b
                INNER JOIN wallets w
                    ON w.id = b.wallet_id
                WHERE w.user_id = $1
                ORDER BY b.currency_code
                `,
                [req.userId]
            );

            const balances = result.rows.map((row) => ({
                currency: row.currency_code,
                amount: row.amount.toString(),
            }));

            const usdBalance = result.rows.find(
                (row) => row.currency_code === "USD"
            );

            return res.json({
                balances,
                total: {
                    currency: "USD",
                    amount: usdBalance
                        ? usdBalance.amount.toString()
                        : "0",
                },
            });
        } catch (error) {
            console.error("Get wallet error:", error);

            return res.status(500).json({
                error: {
                    code: "INTERNAL_ERROR",
                    message: "No se pudo obtener la wallet",
                    details: {},
                },
            });
        }
    }
);

router.get(
    "/balances",
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
        try {
            const result = await pool.query(
                `
                SELECT
                    b.currency_code,
                    b.amount
                FROM balances b
                INNER JOIN wallets w
                    ON w.id = b.wallet_id
                WHERE w.user_id = $1
                ORDER BY b.currency_code
                `,
                [req.userId]
            );

            return res.json({
                balances: result.rows.map((row) => ({
                    currency: row.currency_code,
                    amount: row.amount.toString(),
                })),
            });
        } catch (error) {
            console.error("Get balances error:", error);

            return res.status(500).json({
                error: {
                    code: "INTERNAL_ERROR",
                    message: "No se pudieron obtener los balances",
                    details: {},
                },
            });
        }
    }
);

export default router;