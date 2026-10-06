import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { pool } from "./config/database";
import authRoutes from "./routes/auth";
import walletRoutes from "./routes/wallet";
import ratesRoutes from "./routes/rates";
import transactionsRoutes from "./routes/transactions";

const app = express();

const corsOrigins = (
    process.env.CORS_ORIGIN ?? "http://localhost:5173"
)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(
    cors({
        origin: corsOrigins,
        credentials: true,
    })
);

app.use(cookieParser());
app.use(express.json());

app.get("/health", async (_req, res) => {
    try {
        await pool.query("SELECT 1");

        res.json({
            status: "ok",
            db: "ok",
        });
    } catch (error) {
        console.error("Database health check failed:", error);

        res.status(503).json({
            status: "ok",
            db: "error",
        });
    }
});

app.use("/api/auth", authRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/rates", ratesRoutes);
app.use("/api/transactions", transactionsRoutes);

export default app;