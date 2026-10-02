import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { pool } from "./config/database";
import authRoutes from "./routes/auth";
import walletRoutes from "./routes/wallet";

const app = express();

app.use(
    cors({
        origin: process.env.CORS_ORIGIN,
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

export default app;