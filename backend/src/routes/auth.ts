import { Router } from "express";
import { pool } from "../config/database";
import {
    comparePassword,
    generateToken,
    hashPassword,
} from "../auth/auth";
import {
    loginSchema,
    registerSchema,
    updateMeSchema,
} from "../schemas/auth";
import {
    AuthenticatedRequest,
    requireAuth,
} from "../middlewares/auth";

const router = Router();

function mapUser(row: {
    id: string;
    name: string;
    email: string;
    preferred_currency: string;
    created_at: Date;
}) {
    return {
        id: row.id,
        name: row.name,
        email: row.email,
        preferredCurrency: row.preferred_currency,
        createdAt: row.created_at,
    };
}

router.post("/register", async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);

    if (!parsed.success) {
        return res.status(400).json({
            error: {
                code: "VALIDATION_ERROR",
                message: "Datos de registro inválidos",
                details: parsed.error.flatten().fieldErrors,
            },
        });
    }

    const { name, email, password } = parsed.data;

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const existingUser = await client.query(
            "SELECT id FROM users WHERE email = $1",
            [email]
        );

        if (existingUser.rowCount && existingUser.rowCount > 0) {
            await client.query("ROLLBACK");

            return res.status(409).json({
                error: {
                    code: "EMAIL_TAKEN",
                    message: "El email ya está registrado",
                    details: {},
                },
            });
        }

        const passwordHash = await hashPassword(password);

        const userResult = await client.query(
            `
            INSERT INTO users (
                name,
                email,
                password_hash
            )
            VALUES ($1, $2, $3)
            RETURNING id, name, email, preferred_currency, created_at
            `,
            [name, email, passwordHash]
        );

        const user = userResult.rows[0];

        const walletResult = await client.query(
            `
            INSERT INTO wallets (user_id)
            VALUES ($1)
            RETURNING id
            `,
            [user.id]
        );

        const wallet = walletResult.rows[0];

        await client.query(
            `
            INSERT INTO balances (
                wallet_id,
                currency_code,
                amount
            )
            VALUES ($1, 'USD', 1000)
            `,
            [wallet.id]
        );

        await client.query("COMMIT");

        const token = generateToken(user.id);

        return res.status(201).json({
            token,
            user: mapUser(user),
        });
    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Register error:", error);

        return res.status(500).json({
            error: {
                code: "INTERNAL_ERROR",
                message: "No se pudo registrar el usuario",
                details: {},
            },
        });
    } finally {
        client.release();
    }
});

router.post("/login", async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
        return res.status(400).json({
            error: {
                code: "VALIDATION_ERROR",
                message: "Datos de login inválidos",
                details: parsed.error.flatten().fieldErrors,
            },
        });
    }

    const { email, password } = parsed.data;

    try {
        const result = await pool.query(
            `
            SELECT
                id,
                name,
                email,
                password_hash,
                preferred_currency,
                created_at
            FROM users
            WHERE email = $1
            `,
            [email]
        );

        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({
                error: {
                    code: "INVALID_CREDENTIALS",
                    message: "Email o contraseña incorrectos",
                    details: {},
                },
            });
        }

        const passwordMatches = await comparePassword(
            password,
            user.password_hash
        );

        if (!passwordMatches) {
            return res.status(401).json({
                error: {
                    code: "INVALID_CREDENTIALS",
                    message: "Email o contraseña incorrectos",
                    details: {},
                },
            });
        }

        const token = generateToken(user.id);

        return res.json({
            token,
            user: mapUser(user),
        });
    } catch (error) {
        console.error("Login error:", error);

        return res.status(500).json({
            error: {
                code: "INTERNAL_ERROR",
                message: "No se pudo iniciar sesión",
                details: {},
            },
        });
    }
});

router.get(
    "/me",
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
        try {
            const result = await pool.query(
                `
                SELECT
                    id,
                    name,
                    email,
                    preferred_currency,
                    created_at
                FROM users
                WHERE id = $1
                `,
                [req.userId]
            );

            const user = result.rows[0];

            if (!user) {
                return res.status(404).json({
                    error: {
                        code: "NOT_FOUND",
                        message: "Usuario no encontrado",
                        details: {},
                    },
                });
            }

            return res.json({
                user: mapUser(user),
            });
        } catch (error) {
            console.error("Get me error:", error);

            return res.status(500).json({
                error: {
                    code: "INTERNAL_ERROR",
                    message: "No se pudo obtener el usuario",
                    details: {},
                },
            });
        }
    }
);

router.patch(
    "/me",
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
        const parsed = updateMeSchema.safeParse(req.body);

        if (!parsed.success) {
            return res.status(400).json({
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Datos de actualización inválidos",
                    details: parsed.error.flatten().fieldErrors,
                },
            });
        }

        const { name, preferredCurrency } = parsed.data;

        try {
            const result = await pool.query(
                `
                UPDATE users
                SET
                    name = COALESCE($1, name),
                    preferred_currency = COALESCE($2, preferred_currency),
                    updated_at = NOW()
                WHERE id = $3
                RETURNING
                    id,
                    name,
                    email,
                    preferred_currency,
                    created_at
                `,
                [name ?? null, preferredCurrency ?? null, req.userId]
            );

            const user = result.rows[0];

            if (!user) {
                return res.status(404).json({
                    error: {
                        code: "NOT_FOUND",
                        message: "Usuario no encontrado",
                        details: {},
                    },
                });
            }

            return res.json({
                user: mapUser(user),
            });
        } catch (error) {
            console.error("Update me error:", error);

            return res.status(500).json({
                error: {
                    code: "INTERNAL_ERROR",
                    message: "No se pudo actualizar el usuario",
                    details: {},
                },
            });
        }
    }
);

export default router;