import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import { pool } from "../config/database";
import { transactionHistoryQuerySchema } from "../schemas/transactions";
import {
    getTransactionHistory,
    type TransactionResponse,
} from "../services/transactions";

vi.mock("../config/database", () => ({
    pool: {
        query: vi.fn(),
        connect: vi.fn(),
    },
}));

const mockedPoolQuery = vi.mocked(pool.query);

const sampleTransaction1: TransactionResponse = {
    id: "tx-uuid-1",
    type: "exchange",
    fromCurrency: "USD",
    toCurrency: "EUR",
    fromAmount: "100.00000000",
    toAmount: "89.19000000",
    rate: "0.89190000",
    midRate: "0.89190000",
    fee: "0.00000000",
    feeCurrency: null,
    contextId: null,
    contextName: null,
    createdAt: new Date("2026-10-07T12:00:00.000Z"),
};

const sampleTransaction2: TransactionResponse = {
    id: "tx-uuid-2",
    type: "buy",
    fromCurrency: "USD",
    toCurrency: "EUR",
    fromAmount: "11.44083600",
    toAmount: "10.00000000",
    rate: "0.87406200",
    midRate: "0.89190000",
    fee: "0.22881672",
    feeCurrency: "USD",
    contextId: "c56a4180-65aa-42ec-a945-5fd21dec0538",
    contextName: "Viaje a Europa",
    createdAt: new Date("2026-10-07T14:30:00.000Z"),
};

describe("getTransactionHistory (N5)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("paginación", () => {
        it("obtiene el historial con paginación por defecto (limit=20, offset=0)", async () => {
            mockedPoolQuery
                .mockResolvedValueOnce({
                    rows: [{ id: "wallet-1" }],
                } as never)
                .mockResolvedValueOnce({
                    rows: [{ total: 1 }],
                } as never)
                .mockResolvedValueOnce({
                    rows: [sampleTransaction1],
                } as never);

            const result = await getTransactionHistory("user-1", {});

            expect(result).toEqual({
                items: [sampleTransaction1],
                total: 1,
                limit: 20,
                offset: 0,
            });

            // Conteo
            expect(mockedPoolQuery).toHaveBeenNthCalledWith(
                2,
                expect.stringContaining("SELECT COUNT(*)::int AS total"),
                ["wallet-1"]
            );

            // Consulta paginada
            expect(mockedPoolQuery).toHaveBeenNthCalledWith(
                3,
                expect.stringContaining("LIMIT $2 OFFSET $3"),
                ["wallet-1", 20, 0]
            );

            // Ordenamiento por movimientos más recientes primero
            expect(mockedPoolQuery).toHaveBeenNthCalledWith(
                3,
                expect.stringContaining("ORDER BY t.created_at DESC, t.id DESC"),
                ["wallet-1", 20, 0]
            );
        });

        it("aplica límite y offset personalizados", async () => {
            mockedPoolQuery
                .mockResolvedValueOnce({
                    rows: [{ id: "wallet-1" }],
                } as never)
                .mockResolvedValueOnce({
                    rows: [{ total: 25 }],
                } as never)
                .mockResolvedValueOnce({
                    rows: [sampleTransaction1],
                } as never);

            const result = await getTransactionHistory("user-1", {
                limit: 5,
                offset: 10,
            });

            expect(result).toEqual({
                items: [sampleTransaction1],
                total: 25,
                limit: 5,
                offset: 10,
            });

            expect(mockedPoolQuery).toHaveBeenNthCalledWith(
                3,
                expect.stringContaining("LIMIT $2 OFFSET $3"),
                ["wallet-1", 5, 10]
            );
        });

        it("devuelve lista vacía si el offset supera el total disponible", async () => {
            mockedPoolQuery
                .mockResolvedValueOnce({
                    rows: [{ id: "wallet-1" }],
                } as never)
                .mockResolvedValueOnce({
                    rows: [{ total: 2 }],
                } as never)
                .mockResolvedValueOnce({
                    rows: [],
                } as never);

            const result = await getTransactionHistory("user-1", {
                limit: 10,
                offset: 20,
            });

            expect(result).toEqual({
                items: [],
                total: 2,
                limit: 10,
                offset: 20,
            });
        });
    });

    describe("filtro por contextId", () => {
        it("filtra por contextId y mantiene el filtro por wallet_id", async () => {
            const contextUuid = "c56a4180-65aa-42ec-a945-5fd21dec0538";

            mockedPoolQuery
                .mockResolvedValueOnce({
                    rows: [{ id: "wallet-1" }],
                } as never)
                .mockResolvedValueOnce({
                    rows: [{ total: 1 }],
                } as never)
                .mockResolvedValueOnce({
                    rows: [sampleTransaction2],
                } as never);

            const result = await getTransactionHistory("user-1", {
                contextId: contextUuid,
                limit: 10,
                offset: 0,
            });

            expect(result.items).toEqual([sampleTransaction2]);
            expect(result.total).toBe(1);

            // Verifica filtro de conteo con wallet_id y context_id
            const countCallSql = mockedPoolQuery.mock.calls[1][0] as string;
            expect(countCallSql).toContain("WHERE t.wallet_id = $1");
            expect(countCallSql).toContain("AND t.context_id = $2");
            expect(mockedPoolQuery.mock.calls[1][1]).toEqual([
                "wallet-1",
                contextUuid,
            ]);

            // Verifica consulta paginada con wallet_id, context_id y parámetros de límite
            const itemsCallSql = mockedPoolQuery.mock.calls[2][0] as string;
            expect(itemsCallSql).toContain("WHERE t.wallet_id = $1");
            expect(itemsCallSql).toContain("AND t.context_id = $2");
            expect(itemsCallSql).toContain("LEFT JOIN contexts c");
            expect(itemsCallSql).toContain("ON c.id = t.context_id");
            expect(mockedPoolQuery.mock.calls[2][1]).toEqual([
                "wallet-1",
                contextUuid,
                10,
                0,
            ]);

        });

        it("sin contextId no agrega condición de contexto a las consultas", async () => {
            mockedPoolQuery
                .mockResolvedValueOnce({
                    rows: [{ id: "wallet-1" }],
                } as never)
                .mockResolvedValueOnce({
                    rows: [{ total: 0 }],
                } as never)
                .mockResolvedValueOnce({
                    rows: [],
                } as never);

            await getTransactionHistory("user-1", {});

            const countCallSql = mockedPoolQuery.mock.calls[1][0] as string;
            const itemsCallSql = mockedPoolQuery.mock.calls[2][0] as string;

            expect(countCallSql).not.toContain("AND t.context_id");
            expect(itemsCallSql).not.toContain("AND t.context_id");
        });
    });

    describe("aislamiento por wallet/usuario", () => {
        it("obtiene la wallet del usuario por userId y consulta siempre por wallet_id", async () => {
            mockedPoolQuery
                .mockResolvedValueOnce({
                    rows: [{ id: "wallet-usuario-seguro" }],
                } as never)
                .mockResolvedValueOnce({
                    rows: [{ total: 1 }],
                } as never)
                .mockResolvedValueOnce({
                    rows: [sampleTransaction1],
                } as never);

            await getTransactionHistory("user-999", {});

            // Primera query busca la wallet del usuario
            expect(mockedPoolQuery).toHaveBeenNthCalledWith(
                1,
                expect.stringContaining("SELECT id\n        FROM wallets\n        WHERE user_id = $1"),
                ["user-999"]
            );

            // Conteo y búsqueda filtran estrictamente por wallet_id, nunca por userId
            expect(mockedPoolQuery).toHaveBeenNthCalledWith(
                2,
                expect.stringContaining("WHERE t.wallet_id = $1"),
                ["wallet-usuario-seguro"]
            );

            expect(mockedPoolQuery).toHaveBeenNthCalledWith(
                3,
                expect.stringContaining("WHERE t.wallet_id = $1"),
                ["wallet-usuario-seguro", 20, 0]
            );
        });

        it("lanza error WALLET_NOT_FOUND si el usuario no tiene wallet registrada", async () => {
            mockedPoolQuery.mockResolvedValueOnce({
                rows: [],
            } as never);

            await expect(
                getTransactionHistory("usuario-inexistente", {})
            ).rejects.toMatchObject({
                code: "WALLET_NOT_FOUND",
                message: "No se encontró la wallet del usuario",
            });

            expect(mockedPoolQuery).toHaveBeenCalledTimes(1);
        });
    });

    describe("respuesta y campos requeridos", () => {
        it("incluye todos los campos requeridos en cada item del historial", async () => {
            mockedPoolQuery
                .mockResolvedValueOnce({
                    rows: [{ id: "wallet-1" }],
                } as never)
                .mockResolvedValueOnce({
                    rows: [{ total: 1 }],
                } as never)
                .mockResolvedValueOnce({
                    rows: [sampleTransaction2],
                } as never);

            const result = await getTransactionHistory("user-1", {});
            const item = result.items[0];

            expect(item).toHaveProperty("id", "tx-uuid-2");
            expect(item).toHaveProperty("type", "buy");
            expect(item).toHaveProperty("fromCurrency", "USD");
            expect(item).toHaveProperty("toCurrency", "EUR");
            expect(item).toHaveProperty("fromAmount", "11.44083600");
            expect(item).toHaveProperty("toAmount", "10.00000000");
            expect(item).toHaveProperty("rate", "0.87406200");
            expect(item).toHaveProperty("midRate", "0.89190000");
            expect(item).toHaveProperty("fee", "0.22881672");
            expect(item).toHaveProperty("feeCurrency", "USD");
            expect(item).toHaveProperty("contextId", "c56a4180-65aa-42ec-a945-5fd21dec0538");
            expect(item).toHaveProperty("contextName", "Viaje a Europa");
            expect(item).toHaveProperty("createdAt");
        });
    });

    describe("validación de query params con Zod (transactionHistoryQuerySchema)", () => {
        it("asigna valores por defecto para objeto vacío", () => {
            const parsed = transactionHistoryQuerySchema.safeParse({});
            expect(parsed.success).toBe(true);
            if (parsed.success) {
                expect(parsed.data).toEqual({
                    contextId: undefined,
                    limit: 20,
                    offset: 0,
                });
            }
        });

        it("convierte contextId vacío a undefined", () => {
            const parsed = transactionHistoryQuerySchema.safeParse({
                contextId: "",
                limit: "",
                offset: "",
            });
            expect(parsed.success).toBe(true);
            if (parsed.success) {
                expect(parsed.data).toEqual({
                    contextId: undefined,
                    limit: 20,
                    offset: 0,
                });
            }
        });

        it("parsea strings numéricos a números enteros", () => {
            const parsed = transactionHistoryQuerySchema.safeParse({
                limit: "15",
                offset: "30",
            });
            expect(parsed.success).toBe(true);
            if (parsed.success) {
                expect(parsed.data.limit).toBe(15);
                expect(parsed.data.offset).toBe(30);
            }
        });

        it("rechaza limit menor a 1 o mayor a 100", () => {
            const low = transactionHistoryQuerySchema.safeParse({ limit: "0" });
            expect(low.success).toBe(false);

            const high = transactionHistoryQuerySchema.safeParse({ limit: "101" });
            expect(high.success).toBe(false);
        });

        it("rechaza limit o offset no enteros", () => {
            const floatLimit = transactionHistoryQuerySchema.safeParse({ limit: "5.5" });
            expect(floatLimit.success).toBe(false);

            const floatOffset = transactionHistoryQuerySchema.safeParse({ offset: "2.3" });
            expect(floatOffset.success).toBe(false);
        });

        it("rechaza offset negativo", () => {
            const negative = transactionHistoryQuerySchema.safeParse({ offset: "-1" });
            expect(negative.success).toBe(false);
        });

        it("valida contextId como UUID", () => {
            const invalid = transactionHistoryQuerySchema.safeParse({ contextId: "no-es-uuid" });
            expect(invalid.success).toBe(false);

            const valid = transactionHistoryQuerySchema.safeParse({
                contextId: "c56a4180-65aa-42ec-a945-5fd21dec0538",
            });
            expect(valid.success).toBe(true);
        });
    });
});
