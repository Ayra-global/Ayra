import { GoogleGenAI } from "@google/genai";
import { listContexts } from "./contexts";
import {
    getTransactionHistory,
    type TransactionHistoryResponse,
} from "./transactions";
import { pool } from "../config/database";

export interface AssistantChatMessage {
    role: "user" | "assistant";
    text: string;
}

export interface AssistantChatInput {
    message: string;
    history?: AssistantChatMessage[];
}

interface BalanceRow {
    currency_code: string;
    amount: string;
}

export class AssistantError extends Error {
    constructor(
        public code: "ASSISTANT_DISABLED" | "ASSISTANT_ERROR",
        message: string
    ) {
        super(message);
        this.name = "AssistantError";
    }
}

const MODEL = "gemini-3.1-flash-lite";
const MAX_HISTORY_MESSAGES = 10;
const MAX_TRANSACTIONS = 10;
const MAX_CONTEXTS = 10;
const MAX_OUTPUT_TOKENS = 350;
const MAX_RETRIES = 2;

const SYSTEM_INSTRUCTION = `
Sos AYRA, el asistente inteligente de una billetera digital multi-moneda.

Respondé siempre en español, de forma clara, breve y amigable.

Tu función es ayudar al usuario a entender exclusivamente la información que
recibís en los datos de su wallet.

Podés explicar:
- saldos;
- movimientos recientes;
- gastos asociados a contextos;
- presupuestos y cuánto se gastó;
- diferencias entre operaciones;
- información derivada directamente de los datos proporcionados.

Reglas importantes:
- No inventes saldos, movimientos, presupuestos, fechas ni valores.
- No supongas datos que no estén presentes.
- Si la información necesaria no está disponible, decilo claramente.
- No ejecutes operaciones ni modifiques dinero.
- No solicites ni reveles credenciales, tokens, API keys o datos sensibles.
- Usá únicamente los datos financieros proporcionados en esta conversación.
`;

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorStatus(error: unknown): number | undefined {
    if (!error || typeof error !== "object") {
        return undefined;
    }

    const status = (error as { status?: unknown }).status;

    if (typeof status === "number") {
        return status;
    }

    const response = (error as { response?: unknown }).response;

    if (response && typeof response === "object") {
        const responseStatus = (response as { status?: unknown }).status;

        if (typeof responseStatus === "number") {
            return responseStatus;
        }
    }

    return undefined;
}

function shouldRetry(error: unknown): boolean {
    const status = getErrorStatus(error);

    return (
        status === 429 ||
        status === 500 ||
        status === 502 ||
        status === 503 ||
        status === 504
    );
}

async function getBalances(userId: string) {
    const result = await pool.query<BalanceRow>(
        `
        SELECT
            b.currency_code,
            b.amount
        FROM balances b
        INNER JOIN wallets w
            ON w.id = b.wallet_id
        WHERE w.user_id = $1
        ORDER BY b.currency_code
        `,
        [userId]
    );

    return result.rows.map((row) => ({
        currency: row.currency_code,
        amount: row.amount.toString(),
    }));
}

function buildPrompt(
    input: AssistantChatInput,
    balances: Awaited<ReturnType<typeof getBalances>>,
    transactions: TransactionHistoryResponse["items"],
    contexts: Awaited<ReturnType<typeof listContexts>>
): string {
    const walletData = {
        balances,
        recentTransactions: transactions.slice(0, MAX_TRANSACTIONS),
        contexts: contexts.slice(0, MAX_CONTEXTS),
    };

    return `
DATOS DISPONIBLES DE LA WALLET DEL USUARIO:

${JSON.stringify(walletData, null, 2)}

El usuario pregunta:
${input.message}

Respondé usando únicamente estos datos.
`;
}

async function generateWithRetry(
    ai: GoogleGenAI,
    contents: Array<{
        role: "user" | "model";
        parts: Array<{ text: string }>;
    }>
): Promise<string> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
        try {
            const response = await ai.models.generateContent({
                model: MODEL,
                contents,
                config: {
                    systemInstruction: SYSTEM_INSTRUCTION,
                    maxOutputTokens: MAX_OUTPUT_TOKENS,
                    temperature: 0.2,
                },
            });

            const reply = response.text?.trim();

            if (!reply) {
                throw new AssistantError(
                    "ASSISTANT_ERROR",
                    "Gemini no devolvió una respuesta"
                );
            }

            return reply;
        } catch (error) {
            lastError = error;

            if (!shouldRetry(error) || attempt === MAX_RETRIES) {
                break;
            }

            const delay = 1000 * 2 ** attempt;

            console.warn(
                `Gemini request failed, retrying in ${delay}ms...`
            );

            await sleep(delay);
        }
    }

    console.error("Gemini assistant error:", lastError);

    throw new AssistantError(
        "ASSISTANT_ERROR",
        "No se pudo generar la respuesta del asistente"
    );
}

export async function generateAssistantReply(
    userId: string,
    input: AssistantChatInput
): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new AssistantError(
            "ASSISTANT_DISABLED",
            "El asistente AYRA no está configurado"
        );
    }

    const [
        balances,
        transactionHistory,
        contexts,
    ] = await Promise.all([
        getBalances(userId),
        getTransactionHistory(userId, {
            limit: MAX_TRANSACTIONS,
            offset: 0,
        }),
        listContexts(userId),
    ]);

    const history = (input.history ?? [])
        .slice(-MAX_HISTORY_MESSAGES)
        .map((message) => ({
            role: message.role,
            text: message.text.slice(0, 1000),
        }));

    const currentPrompt = buildPrompt(
        input,
        balances,
        transactionHistory.items,
        contexts
    );

    const contents: Array<{
        role: "user" | "model";
        parts: Array<{ text: string }>;
    }> = [
            ...history.map((message) => ({
                role: message.role === "assistant" ? "model" as const : "user" as const,
                parts: [{ text: message.text }],
            })),
            {
                role: "user",
                parts: [{ text: currentPrompt }],
            },
        ];

    const ai = new GoogleGenAI({
        apiKey,
    });

    return generateWithRetry(ai, contents);
}