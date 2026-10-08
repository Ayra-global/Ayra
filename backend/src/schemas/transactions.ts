import { z } from "zod";

const transactionTypes = z.enum([
    "buy",
    "sell",
    "exchange",
]);

const supportedCurrencies = z.enum([
    "USD",
    "EUR",
    "ARS",
]);

const amountSchema = z.preprocess(
    (value) => {
        if (typeof value === "number" && Number.isFinite(value)) {
            return value.toString();
        }

        return value;
    },
    z
        .string()
        .trim()
        .min(1, "El monto es obligatorio")
        .regex(
            /^\d+(?:\.\d+)?$/,
            "El monto debe ser un número positivo válido"
        )
        .refine(
            (value) =>
                value.replace(".", "").split("").some((digit) => digit !== "0"),
            {
                message: "El monto debe ser mayor a 0",
            }
        )
);

export const transactionSchema = z.object({
    type: transactionTypes,

    fromCurrency: supportedCurrencies,

    toCurrency: supportedCurrencies,

    amount: amountSchema,

    contextId: z
        .string()
        .uuid("El contextId debe ser un UUID válido")
        .optional(),
});

export type TransactionInput = z.infer<typeof transactionSchema>;

export const transactionHistoryQuerySchema = z.object({
    contextId: z.preprocess(
        (value) => (value === "" ? undefined : value),
        z
            .string()
            .uuid("El contextId debe ser un UUID válido")
            .optional()
    ),

    limit: z.preprocess(
        (value) =>
            value === "" || value === undefined ? undefined : value,
        z.coerce
            .number()
            .int("El límite debe ser un número entero")
            .min(1, "El límite mínimo es 1")
            .max(100, "El límite máximo es 100")
            .default(20)
    ),

    offset: z.preprocess(
        (value) =>
            value === "" || value === undefined ? undefined : value,
        z.coerce
            .number()
            .int("El offset debe ser un número entero")
            .min(0, "El offset no puede ser negativo")
            .default(0)
    ),
});

export type TransactionHistoryQuery = z.infer<
    typeof transactionHistoryQuerySchema
>;