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