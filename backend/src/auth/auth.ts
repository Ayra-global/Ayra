import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

function getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        throw new Error("JWT_SECRET no está configurado");
    }

    return secret;
}

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
}

export async function comparePassword(
    password: string,
    passwordHash: string
): Promise<boolean> {
    return bcrypt.compare(password, passwordHash);
}

export function generateToken(userId: string): string {
    return jwt.sign(
        {
            userId,
        },
        getJwtSecret(),
        {
            expiresIn: "1d",
        }
    );
}

export function verifyToken(token: string): { userId: string } {
    const payload = jwt.verify(token, getJwtSecret());

    if (
        typeof payload !== "object" ||
        payload === null ||
        typeof payload.userId !== "string"
    ) {
        throw new Error("Token inválido");
    }

    return {
        userId: payload.userId,
    };
}