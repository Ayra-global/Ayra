import express from "express";
import cors from "cors";
import { pool } from "./config/database";

const app = express();

app.use(cors());
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

export default app;