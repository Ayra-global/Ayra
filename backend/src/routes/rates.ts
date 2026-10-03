import { Router } from "express";
import {
    AuthenticatedRequest,
    requireAuth,
} from "../middlewares/auth";
import { getRates } from "../services/rates";

const router = Router();

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