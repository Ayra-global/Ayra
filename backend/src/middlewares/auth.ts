import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../auth/auth";

export interface AuthenticatedRequest extends Request {
    userId?: string;
}

export function requireAuth(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) {
    const authorization = req.header("Authorization");

    if (!authorization?.startsWith("Bearer ")) {
        return res.status(401).json({
            error: {
                code: "UNAUTHORIZED",
                message: "Token requerido",
                details: {},
            },
        });
    }

    const token = authorization.slice("Bearer ".length).trim();

    try {
        const { userId } = verifyToken(token);

        req.userId = userId;

        next();
    } catch {
        return res.status(401).json({
            error: {
                code: "UNAUTHORIZED",
                message: "Token inválido o vencido",
                details: {},
            },
        });
    }
}