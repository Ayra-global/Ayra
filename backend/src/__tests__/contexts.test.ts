import { beforeEach, describe, expect, it, vi } from "vitest";
import { pool } from "../config/database";
import {
    activateContext,
    archiveContext,
    createContext,
    getContext,
    listContexts,
} from "../services/contexts";

vi.mock("../config/database", () => ({
    pool: {
        query: vi.fn(),
        connect: vi.fn(),
    },
}));

const mockedPoolQuery = pool.query as unknown as {
    mock: {
        calls: unknown[][];
    };
    mockReset(): void;
    mockResolvedValueOnce(value: unknown): void;
};

const mockedPoolConnect = pool.connect as unknown as {
    mockResolvedValue(value: unknown): void;
};
function createMockClient() {
    return {
        query: vi.fn(),
        release: vi.fn(),
    };
}

const baseContextRow = {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Viaje a España",
    type: "travel" as const,
    status: "active" as const,
    start_date: "2026-10-10",
    end_date: "2026-10-20",
    created_at: new Date("2026-10-07T12:00:00Z"),
    budget_currency: "EUR",
    budget_amount: "1000",
    spent: "250",
    transaction_count: "3",
};

describe("contexts service", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockedPoolQuery.mockReset();
    });

    it("calcula el gasto usando el monto destino cuando coincide con la moneda del presupuesto", async () => {
        mockedPoolQuery.mockResolvedValueOnce({
            rows: [{ id: "wallet-1" }],
        });

        mockedPoolQuery.mockResolvedValueOnce({
            rows: [
                {
                    ...baseContextRow,
                    budget_currency: "USD",
                    budget_amount: "300",
                    spent: "10",
                    transaction_count: "1",
                },
            ],
        });

        const result = await listContexts("user-1");

        expect(result[0].budget).toEqual({
            currency: "USD",
            amount: "300",
            spent: "10",
        });

        const contextQuery = mockedPoolQuery.mock.calls[1]?.[0] as string;

        expect(contextQuery).toContain(
            "t.currency_to = cb.currency_code"
        );
        expect(contextQuery).toContain("THEN t.amount_to");
        expect(contextQuery).toContain(
            "t.type = 'buy'"
        );
    });

    it("lista los contextos del usuario", async () => {
        mockedPoolQuery.mockResolvedValueOnce({
            rows: [{ id: "wallet-1" }],
        });

        mockedPoolQuery.mockResolvedValueOnce({
            rows: [baseContextRow],
        });

        const result = await listContexts("user-1");

        expect(result).toEqual([
            {
                id: baseContextRow.id,
                name: "Viaje a España",
                type: "travel",
                status: "active",
                startDate: "2026-10-10",
                endDate: "2026-10-20",
                budget: {
                    currency: "EUR",
                    amount: "1000",
                    spent: "250",
                },
                transactionCount: 3,
                createdAt: baseContextRow.created_at,
            },
        ]);

        expect(mockedPoolQuery).toHaveBeenCalledTimes(2);
    });

    it("crea un contexto con presupuesto", async () => {
        const client = createMockClient();

        client.query
            .mockResolvedValueOnce({})
            .mockResolvedValueOnce({
                rows: [
                    {
                        id: baseContextRow.id,
                    },
                ],
            })
            .mockResolvedValueOnce({})
            .mockResolvedValueOnce({});

        mockedPoolConnect.mockResolvedValue(client);

        mockedPoolQuery.mockResolvedValueOnce({
            rows: [{ id: "wallet-1" }],
        });

        mockedPoolQuery.mockResolvedValueOnce({
            rows: [{ id: "wallet-1" }],
        });

        mockedPoolQuery.mockResolvedValueOnce({
            rows: [baseContextRow],
        });

        const result = await createContext("user-1", {
            name: "Viaje a España",
            type: "travel",
            startDate: "2026-10-10",
            endDate: "2026-10-20",
            budget: {
                currency: "EUR",
                amount: "1000",
            },
        });

        expect(result.id).toBe(baseContextRow.id);
        expect(result.name).toBe("Viaje a España");
        expect(result.budget).toEqual({
            currency: "EUR",
            amount: "1000",
            spent: "250",
        });

        expect(client.query).toHaveBeenCalledTimes(4);
        expect(client.query).toHaveBeenNthCalledWith(
            1,
            "BEGIN"
        );
        expect(client.query).toHaveBeenLastCalledWith(
            "COMMIT"
        );
        expect(client.release).toHaveBeenCalledTimes(1);
    });

    it("devuelve error cuando el contexto no pertenece al usuario", async () => {
        mockedPoolQuery.mockResolvedValueOnce({
            rows: [{ id: "wallet-1" }],
        });

        mockedPoolQuery.mockResolvedValueOnce({
            rows: [],
        });

        await expect(
            getContext(
                "user-1",
                "22222222-2222-4222-8222-222222222222"
            )
        ).rejects.toMatchObject({
            code: "CONTEXT_NOT_FOUND",
        });
    });

    it("archiva y activa un contexto", async () => {
        // archiveContext
        mockedPoolQuery.mockResolvedValueOnce({
            rows: [{ id: "wallet-1" }],
        });

        mockedPoolQuery.mockResolvedValueOnce({
            rows: [{ id: baseContextRow.id }],
        });

        // getContext called from archiveContext
        mockedPoolQuery.mockResolvedValueOnce({
            rows: [{ id: "wallet-1" }],
        });

        mockedPoolQuery.mockResolvedValueOnce({
            rows: [baseContextRow],
        });

        const archived = await archiveContext(
            "user-1",
            baseContextRow.id
        );

        expect(archived.id).toBe(baseContextRow.id);

        // activateContext
        mockedPoolQuery.mockResolvedValueOnce({
            rows: [{ id: "wallet-1" }],
        });

        mockedPoolQuery.mockResolvedValueOnce({
            rows: [{ id: baseContextRow.id }],
        });

        // getContext called from activateContext
        mockedPoolQuery.mockResolvedValueOnce({
            rows: [{ id: "wallet-1" }],
        });

        mockedPoolQuery.mockResolvedValueOnce({
            rows: [
                {
                    ...baseContextRow,
                    status: "active" as const,
                },
            ],
        });

        const activated = await activateContext(
            "user-1",
            baseContextRow.id
        );

        expect(activated.id).toBe(baseContextRow.id);
        expect(activated.status).toBe("active");
    });
});