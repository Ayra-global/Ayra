import { Router } from "express";
import {
    AuthenticatedRequest,
    requireAuth,
} from "../middlewares/auth";
import { transactionSchema } from "../schemas/transactions";
import { createTransaction } from "../services/transactions";

const router = Router();

router.post(
    "/",
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
        const parsed = transactionSchema.safeParse(
            req.body
        );

        if (!parsed.success) {
            return res.status(400).json({
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Datos de transacción inválidos",
                    details: parsed.error.flatten().fieldErrors,
                },
            });
        }

        try {
            const transaction =
                await createTransaction(
                    req.userId!,
                    parsed.data
                );

            return res.status(201).json({
                transaction,
            });
        } catch (error) {
            console.error(
                "Create transaction error:",
                error
            );

            const code =
                error &&
                    typeof error === "object" &&
                    "code" in error
                    ? String(
                        (error as { code: unknown }).code
                    )
                    : undefined;

            const message =
                error instanceof Error
                    ? error.message
                    : "No se pudo crear la transacción";

            if (code === "INSUFFICIENT_BALANCE") {
                return res.status(409).json({
                    error: {
                        code,
                        message,
                        details: {},
                    },
                });
            }

            if (
                code === "WALLET_NOT_FOUND" ||
                code === "BALANCE_NOT_FOUND"
            ) {
                return res.status(404).json({
                    error: {
                        code,
                        message,
                        details: {},
                    },
                });
            }

            if (code === "CONTEXT_NOT_FOUND") {
                return res.status(404).json({
                    error: {
                        code,
                        message,
                        details: {},
                    },
                });
            }

            if (
                code === "INVALID_CURRENCY" ||
                code === "INVALID_AMOUNT" ||
                code === "VALIDATION_ERROR"
            ) {
                return res.status(400).json({
                    error: {
                        code,
                        message,
                        details: {},
                    },
                });
            }

            if (code === "RATES_UNAVAILABLE") {
                return res.status(503).json({
                    error: {
                        code,
                        message:
                            "No se pudieron obtener las tasas para realizar la operación",
                        details: {},
                    },
                });
            }

            return res.status(500).json({
                error: {
                    code: "INTERNAL_ERROR",
                    message:
                        "No se pudo crear la transacción",
                    details: {},
                },
            });
        }
    }
);

export default router;