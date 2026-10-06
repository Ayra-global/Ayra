import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import type { PoolClient } from "pg";

import { pool } from "../config/database";
import { getQuote } from "../services/quote";
import { createTransaction } from "../services/transactions";

vi.mock("../config/database", () => ({
    pool: {
        query: vi.fn(),
        connect: vi.fn(),
    },
}));

vi.mock("../services/quote", () => ({
    getQuote: vi.fn(),
}));

const mockedPoolQuery = vi.mocked(pool.query);

const mockedPoolConnect = pool.connect as unknown as {
    mockResolvedValue(value: PoolClient): void;
};

const mockedGetQuote = vi.mocked(getQuote);

describe("createTransaction", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("crea un exchange y confirma la transacción", async () => {
        const clientQuery = vi.fn();

        const client = {
            query: clientQuery,
            release: vi.fn(),
        } as unknown as PoolClient;

        mockedPoolConnect.mockResolvedValue(client);

        mockedPoolQuery.mockResolvedValueOnce({
            rows: [{ id: "wallet-1" }],
        } as never);

        mockedGetQuote.mockResolvedValue({
            type: "exchange",
            fromCurrency: "USD",
            toCurrency: "EUR",
            fromAmount: "100",
            toAmount: "89.19",
            midRate: "0.8919",
            appliedRate: "0.8919",
            fee: "0",
            feeSide: "none",
            rateFetchedAt: new Date(
                "2026-10-06T20:00:00.000Z"
            ),
            rateStale: false,
        });

        clientQuery
            .mockResolvedValueOnce({
                rows: [],
            })
            .mockResolvedValueOnce({
                rows: [
                    {
                        id: "balance-usd",
                        currency_code: "USD",
                        amount: "1000.00000000",
                    },
                    {
                        id: "balance-eur",
                        currency_code: "EUR",
                        amount: "0.00000000",
                    },
                ],
            })
            .mockResolvedValueOnce({
                rows: [],
            })
            .mockResolvedValueOnce({
                rows: [],
            })
            .mockResolvedValueOnce({
                rows: [{ id: "transaction-1" }],
            })
            .mockResolvedValueOnce({
                rows: [],
            })
            .mockResolvedValueOnce({
                rows: [
                    {
                        id: "transaction-1",
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
                        createdAt: new Date(
                            "2026-10-06T20:00:00.000Z"
                        ),
                    },
                ],
            });

        const result = await createTransaction(
            "user-1",
            {
                type: "exchange",
                fromCurrency: "USD",
                toCurrency: "EUR",
                amount: "100",
            }
        );

        expect(mockedGetQuote).toHaveBeenCalledWith({
            type: "exchange",
            from: "USD",
            to: "EUR",
            amount: "100",
        });

        expect(clientQuery).toHaveBeenCalledWith(
            "BEGIN"
        );

        expect(clientQuery).toHaveBeenCalledWith(
            "COMMIT"
        );

        expect(clientQuery).not.toHaveBeenCalledWith(
            "ROLLBACK"
        );

        expect(clientQuery).toHaveBeenCalledWith(
            expect.stringContaining("UPDATE balances"),
            ["100", "balance-usd"]
        );

        expect(clientQuery).toHaveBeenCalledWith(
            expect.stringContaining("UPDATE balances"),
            ["89.19", "balance-eur"]
        );

        expect(result.id).toBe("transaction-1");
        expect(result.type).toBe("exchange");
        expect(result.fromAmount).toBe(
            "100.00000000"
        );
        expect(result.toAmount).toBe(
            "89.19000000"
        );
        expect(result.feeCurrency).toBeNull();

        expect(client.release).toHaveBeenCalledTimes(
            1
        );
    });

    it("en buy debita el monto de origen y acredita el monto solicitado", async () => {
        const clientQuery = vi.fn();

        const client = {
            query: clientQuery,
            release: vi.fn(),
        } as unknown as PoolClient;

        mockedPoolConnect.mockResolvedValue(client);

        mockedPoolQuery.mockResolvedValueOnce({
            rows: [{ id: "wallet-1" }],
        } as never);

        mockedGetQuote.mockResolvedValue({
            type: "buy",
            fromCurrency: "USD",
            toCurrency: "EUR",
            fromAmount: "11.44083600",
            toAmount: "10",
            midRate: "0.8919",
            appliedRate: "0.874062",
            fee: "0.22881672",
            feeSide: "from",
            rateFetchedAt: new Date(
                "2026-10-06T20:00:00.000Z"
            ),
            rateStale: false,
        });

        clientQuery
            .mockResolvedValueOnce({
                rows: [],
            })
            .mockResolvedValueOnce({
                rows: [
                    {
                        id: "balance-usd",
                        currency_code: "USD",
                        amount: "100.00000000",
                    },
                    {
                        id: "balance-eur",
                        currency_code: "EUR",
                        amount: "20.00000000",
                    },
                ],
            })
            .mockResolvedValueOnce({
                rows: [],
            })
            .mockResolvedValueOnce({
                rows: [],
            })
            .mockResolvedValueOnce({
                rows: [{ id: "transaction-2" }],
            })
            .mockResolvedValueOnce({
                rows: [],
            })
            .mockResolvedValueOnce({
                rows: [
                    {
                        id: "transaction-2",
                        type: "buy",
                        fromCurrency: "USD",
                        toCurrency: "EUR",
                        fromAmount: "11.44083600",
                        toAmount: "10.00000000",
                        rate: "0.87406200",
                        midRate: "0.89190000",
                        fee: "0.22881672",
                        feeCurrency: "USD",
                        contextId: null,
                        contextName: null,
                        createdAt: new Date(
                            "2026-10-06T20:00:00.000Z"
                        ),
                    },
                ],
            });

        const result = await createTransaction(
            "user-1",
            {
                type: "buy",
                fromCurrency: "USD",
                toCurrency: "EUR",
                amount: "10",
            }
        );

        expect(clientQuery).toHaveBeenCalledWith(
            expect.stringContaining("UPDATE balances"),
            ["11.44083600", "balance-usd"]
        );

        expect(clientQuery).toHaveBeenCalledWith(
            expect.stringContaining("UPDATE balances"),
            ["10", "balance-eur"]
        );

        expect(result.feeCurrency).toBe("USD");
        expect(result.toAmount).toBe(
            "10.00000000"
        );

        expect(clientQuery).toHaveBeenCalledWith(
            expect.stringContaining(
                "INSERT INTO transactions"
            ),
            expect.arrayContaining([
                "USD",
                "EUR",
                "11.44083600",
                "10",
                "0.874062",
                "0.8919",
                "0.22881672",
                "USD",
            ])
        );
    });

    it("rechaza una operación sin saldo y hace rollback", async () => {
        const clientQuery = vi.fn();

        const client = {
            query: clientQuery,
            release: vi.fn(),
        } as unknown as PoolClient;

        mockedPoolConnect.mockResolvedValue(client);

        mockedPoolQuery.mockResolvedValueOnce({
            rows: [{ id: "wallet-1" }],
        } as never);

        mockedGetQuote.mockResolvedValue({
            type: "exchange",
            fromCurrency: "USD",
            toCurrency: "EUR",
            fromAmount: "999999",
            toAmount: "892000",
            midRate: "0.8919",
            appliedRate: "0.8919",
            fee: "0",
            feeSide: "none",
            rateFetchedAt: new Date(
                "2026-10-06T20:00:00.000Z"
            ),
            rateStale: false,
        });

        clientQuery
            .mockResolvedValueOnce({
                rows: [],
            })
            .mockResolvedValueOnce({
                rows: [
                    {
                        id: "balance-usd",
                        currency_code: "USD",
                        amount: "838.55916400",
                    },
                    {
                        id: "balance-eur",
                        currency_code: "EUR",
                        amount: "142.89310000",
                    },
                ],
            })
            .mockResolvedValue({
                rows: [],
            });

        await expect(
            createTransaction("user-1", {
                type: "exchange",
                fromCurrency: "USD",
                toCurrency: "EUR",
                amount: "999999",
            })
        ).rejects.toMatchObject({
            code: "INSUFFICIENT_BALANCE",
        });

        expect(clientQuery).toHaveBeenCalledWith(
            "BEGIN"
        );

        expect(clientQuery).toHaveBeenCalledWith(
            "ROLLBACK"
        );

        expect(clientQuery).not.toHaveBeenCalledWith(
            "COMMIT"
        );

        const updateCalls =
            clientQuery.mock.calls.filter(
                ([sql]) =>
                    typeof sql === "string" &&
                    sql.includes("UPDATE balances")
            );

        expect(updateCalls).toHaveLength(0);

        const insertCalls =
            clientQuery.mock.calls.filter(
                ([sql]) =>
                    typeof sql === "string" &&
                    sql.includes(
                        "INSERT INTO transactions"
                    )
            );

        expect(insertCalls).toHaveLength(0);

        expect(client.release).toHaveBeenCalledTimes(
            1
        );
    });
});