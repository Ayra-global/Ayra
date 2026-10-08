import { pool } from "../config/database";
import type { TransactionResponse } from "./transactions";

interface UserContact {
    name: string;
    email: string;
}

interface TransactionEmailPayload {
    to: string;
    name: string;
    transaction: {
        id: string;
        type: TransactionResponse["type"];
        fromCurrency: string | null;
        toCurrency: string;
        fromAmount: string | null;
        toAmount: string;
        rate: string | null;
        fee: string;
        feeCurrency: string | null;
        contextName: string | null;
        createdAt: string;
    };
}

async function getUserContact(
    userId: string
): Promise<UserContact | null> {
    const result = await pool.query<UserContact>(
        `
        SELECT
            name,
            email
        FROM users
        WHERE id = $1
        `,
        [userId]
    );

    return result.rows[0] ?? null;
}

export async function sendTransactionEmail(
    userId: string,
    transaction: TransactionResponse
): Promise<boolean> {
    const sendEmailUrl = process.env.SEND_EMAIL_URL;
    const internalSecret =
        process.env.INTERNAL_API_SECRET;

    if (!sendEmailUrl || !internalSecret) {
        console.warn(
            "[email] SEND_EMAIL_URL o INTERNAL_API_SECRET no configurado"
        );
        return false;
    }

    try {
        const user = await getUserContact(userId);

        if (!user) {
            console.error(
                "[email] No se encontró el usuario para enviar la confirmación"
            );
            return false;
        }

        const payload: TransactionEmailPayload = {
            to: user.email,
            name: user.name,
            transaction: {
                id: transaction.id,
                type: transaction.type,
                fromCurrency: transaction.fromCurrency,
                toCurrency: transaction.toCurrency,
                fromAmount: transaction.fromAmount,
                toAmount: transaction.toAmount,
                rate: transaction.rate,
                fee: transaction.fee,
                feeCurrency: transaction.feeCurrency,
                contextName: transaction.contextName,
                createdAt:
                    transaction.createdAt.toISOString(),
            },
        };

        const response = await fetch(sendEmailUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-internal-secret": internalSecret,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const responseBody =
                await response.text().catch(() => "");

            console.error(
                "[email] Error al enviar confirmación",
                {
                    status: response.status,
                    body: responseBody,
                }
            );

            return false;
        }

        return true;
    } catch (error) {
        console.error(
            "[email] Falló el envío de la confirmación",
            error
        );

        return false;
    }
}