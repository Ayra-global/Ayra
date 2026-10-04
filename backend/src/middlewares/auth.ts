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
    const cookieToken = req.cookies?.ayra_token;

    const authorization = req.header("Authorization");

    const bearerToken = authorization?.startsWith("Bearer ")
        ? authorization.slice("Bearer ".length).trim()
        : undefined;

    const token = cookieToken ?? bearerToken;

    if (!token) {
        return res.status(401).json({
            error: {
                code: "UNAUTHORIZED",
                message: "Token requerido",
                details: {},
            },
        });
    }

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