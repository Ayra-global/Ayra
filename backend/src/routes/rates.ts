import { Router } from "express";
import {
    AuthenticatedRequest,
    requireAuth,
} from "../middlewares/auth";
import { getRates } from "../services/rates";
import {
    getQuote,
    QuoteError,
} from "../services/quote";

const router = Router();

router.get(
    "/quote",
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
        const type =
            typeof req.query.type === "string"
                ? req.query.type
                : "";

        const from =
            typeof req.query.from === "string"
                ? req.query.from
                : "";

        const to =
            typeof req.query.to === "string"
                ? req.query.to
                : "";

        const amount =
            typeof req.query.amount === "string"
                ? req.query.amount
                : "";

        try {
            const quote = await getQuote({
                type,
                from,
                to,
                amount,
            });

            return res.json({
                quote,
            });
        } catch (error) {
            console.error(
                "Get quote error:",
                error
            );

            if (error instanceof QuoteError) {
                const status =
                    error.code ===
                        "RATES_UNAVAILABLE"
                        ? 503
                        : error.code ===
                            "INVALID_AMOUNT"
                            ? 422
                            : 400;

                return res.status(status).json({
                    error: {
                        code: error.code,
                        message: error.message,
                        details: {},
                    },
                });
            }

            return res.status(503).json({
                error: {
                    code: "RATES_UNAVAILABLE",
                    message:
                        "No se pudo obtener la cotización",
                    details: {},
                },
            });
        }
    }
);

router.get(
    "/",
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
        const base =
            typeof req.query.base === "string"
                ? req.query.base
                : "USD";

        try {
            const rates = await getRates(base);

            return res.json(rates);
        } catch (error) {
            console.error("Get rates error:", error);

            const message =
                error instanceof Error
                    ? error.message
                    : "No se pudieron obtener las tasas";

            if (
                message.startsWith("Moneda base no soportada")
            ) {
                return res.status(400).json({
                    error: {
                        code: "INVALID_CURRENCY",
                        message,
                        details: {},
                    },
                });
            }

            return res.status(503).json({
                error: {
                    code: "RATES_UNAVAILABLE",
                    message: "No se pudieron obtener las tasas",
                    details: {},
                },
            });
        }
    }
);

export default router;