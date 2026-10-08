import { z } from "zod";

const dateSchema = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe tener formato YYYY-MM-DD")
    .refine(
        (value) => {
            const date = new Date(`${value}T00:00:00Z`);

            if (Number.isNaN(date.getTime())) {
                return false;
            }

            const [year, month, day] = value.split("-").map(Number);

            return (
                date.getUTCFullYear() === year &&
                date.getUTCMonth() === month - 1 &&
                date.getUTCDate() === day
            );
        },
        {
            message: "La fecha no es válida",
        }
    );

const amountSchema = z
    .string()
    .trim()
    .regex(
        /^\d+(\.\d{1,8})?$/,
        "El monto debe ser un número positivo con hasta 8 decimales"
    )
    .refine(
        (value) => Number(value) > 0,
        {
            message: "El monto debe ser mayor a 0",
        }
    );

const currencySchema = z.enum(["USD", "EUR", "ARS"]);

export const contextTypeSchema = z.enum([
    "travel",
    "study",
    "work",
    "shared",
]);

export const createContextSchema = z
    .object({
        name: z
            .string()
            .trim()
            .min(2, "El nombre debe tener al menos 2 caracteres")
            .max(120, "El nombre no puede superar los 120 caracteres"),

        type: contextTypeSchema,

        startDate: dateSchema.optional(),

        endDate: dateSchema.optional(),

        budget: z
            .object({
                currency: currencySchema,
                amount: amountSchema,
            })
            .optional(),
    })
    .refine(
        (data) =>
            !data.startDate ||
            !data.endDate ||
            data.endDate >= data.startDate,
        {
            message: "La fecha de fin no puede ser anterior a la fecha de inicio",
            path: ["endDate"],
        }
    );

export const contextIdSchema = z.object({
    id: z.string().uuid("El id del contexto no es válido"),
});