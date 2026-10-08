import {
    beforeEach,
    afterEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

const {
    mockedGenerateContent,
    GoogleGenAIMock,
} = vi.hoisted(() => {
    const generateContent = vi.fn();

    const GoogleGenAI = vi.fn(function GoogleGenAI() {
        return {
            models: {
                generateContent,
            },
        };
    });

    return {
        mockedGenerateContent: generateContent,
        GoogleGenAIMock: GoogleGenAI,
    };
});

vi.mock("@google/genai", () => ({
    GoogleGenAI: GoogleGenAIMock,
}));

vi.mock("../config/database", () => ({
    pool: {
        query: vi.fn(),
    },
}));

vi.mock("../services/contexts", () => ({
    listContexts: vi.fn(),
}));

vi.mock("../services/transactions", () => ({
    getTransactionHistory: vi.fn(),
}));

import { pool } from "../config/database";
import { listContexts } from "../services/contexts";
import { getTransactionHistory } from "../services/transactions";
import {
    AssistantError,
    generateAssistantReply,
} from "../services/assistant";

const mockedPoolQuery = vi.mocked(pool.query);
const mockedListContexts = vi.mocked(listContexts);
const mockedGetTransactionHistory =
    vi.mocked(getTransactionHistory);

describe("generateAssistantReply", () => {
    const originalApiKey = process.env.GEMINI_API_KEY;

    beforeEach(() => {
        vi.clearAllMocks();

        process.env.GEMINI_API_KEY = "test-gemini-key";

        mockedPoolQuery.mockResolvedValue({
            rows: [
                {
                    currency_code: "USD",
                    amount: "1000.00000000",
                },
                {
                    currency_code: "EUR",
                    amount: "50.00000000",
                },
                {
                    currency_code: "ARS",
                    amount: "0.00000000",
                },
            ],
        } as never);

        mockedGetTransactionHistory.mockResolvedValue({
            items: [
                {
                    id: "transaction-1",
                    type: "exchange",
                    fromCurrency: "USD",
                    toCurrency: "EUR",
                    fromAmount: "100.00000000",
                    toAmount: "90.00000000",
                    rate: "0.90000000",
                    midRate: "0.90000000",
                    fee: "0.00000000",
                    feeCurrency: null,
                    contextId: "context-1",
                    contextName: "Viaje a Italia",
                    createdAt: new Date(
                        "2026-10-07T10:00:00.000Z"
                    ),
                },
            ],
            total: 1,
            limit: 10,
            offset: 0,
        });

        mockedListContexts.mockResolvedValue([
            {
                id: "context-1",
                name: "Viaje a Italia",
                type: "travel",
                status: "active",
                startDate: "2026-10-01",
                endDate: "2026-10-15",
                budget: {
                    currency: "USD",
                    amount: "500.00000000",
                    spent: "100.00000000",
                },
                transactionCount: 1,
                createdAt: new Date(
                    "2026-10-01T10:00:00.000Z"
                ),
            },
        ]);

        mockedGenerateContent.mockResolvedValue({
            text: "Tenés 1000 USD y 50 EUR disponibles.",
        });
    });

    afterEach(() => {
        if (originalApiKey === undefined) {
            delete process.env.GEMINI_API_KEY;
        } else {
            process.env.GEMINI_API_KEY = originalApiKey;
        }
    });

    it("genera una respuesta usando los datos de la wallet", async () => {
        const reply = await generateAssistantReply(
            "user-1",
            {
                message: "¿Cuánto tengo?",
                history: [],
            }
        );

        expect(reply).toBe(
            "Tenés 1000 USD y 50 EUR disponibles."
        );

        expect(mockedPoolQuery).toHaveBeenCalledTimes(1);

        expect(mockedGetTransactionHistory)
            .toHaveBeenCalledWith(
                "user-1",
                {
                    limit: 10,
                    offset: 0,
                }
            );

        expect(mockedListContexts)
            .toHaveBeenCalledWith("user-1");

        expect(mockedGenerateContent).toHaveBeenCalledTimes(1);

        const [request] =
            mockedGenerateContent.mock.calls[0] ?? [];

        expect(request).toEqual(
            expect.objectContaining({
                model: "gemini-3.1-flash-lite",
                config: expect.objectContaining({
                    maxOutputTokens: 350,
                    temperature: 0.2,
                }),
            })
        );

        expect(JSON.stringify(request))
            .toContain("Viaje a Italia");

        expect(JSON.stringify(request))
            .toContain("1000.00000000");

        expect(JSON.stringify(request))
            .toContain("¿Cuánto tengo?");
    });

    it("limita el historial a los últimos 10 mensajes", async () => {
        const history = Array.from(
            { length: 12 },
            (_, index) => ({
                role:
                    index % 2 === 0
                        ? ("user" as const)
                        : ("assistant" as const),
                text: `mensaje-${index}`,
            })
        );

        await generateAssistantReply(
            "user-1",
            {
                message: "¿Qué tengo ahora?",
                history,
            }
        );

        const [request] =
            mockedGenerateContent.mock.calls[0] ?? [];

        const contents = request.contents as Array<{
            role: "user" | "model";
            parts: Array<{ text: string }>;
        }>;

        expect(contents).toHaveLength(11);

        const historyTexts = contents
            .slice(0, -1)
            .map((content) => content.parts[0]?.text);

        expect(historyTexts).toEqual([
            "mensaje-2",
            "mensaje-3",
            "mensaje-4",
            "mensaje-5",
            "mensaje-6",
            "mensaje-7",
            "mensaje-8",
            "mensaje-9",
            "mensaje-10",
            "mensaje-11",
        ]);

        expect(contents[contents.length - 1]?.parts[0]?.text)
            .toContain("¿Qué tengo ahora?");
    });

    it("devuelve ASSISTANT_DISABLED si no existe la API key", async () => {
        delete process.env.GEMINI_API_KEY;

        await expect(
            generateAssistantReply(
                "user-1",
                {
                    message: "Hola",
                    history: [],
                }
            )
        ).rejects.toMatchObject({
            code: "ASSISTANT_DISABLED",
        });

        expect(mockedGenerateContent)
            .not.toHaveBeenCalled();
    });

    it("convierte un error de Gemini en ASSISTANT_ERROR", async () => {
        mockedGenerateContent.mockRejectedValueOnce({
            status: 400,
        });

        await expect(
            generateAssistantReply(
                "user-1",
                {
                    message: "Hola",
                    history: [],
                }
            )
        ).rejects.toMatchObject({
            code: "ASSISTANT_ERROR",
        });
    });
});