import { z } from "zod";

export const registerSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2, "El nombre debe tener al menos 2 caracteres")
        .max(120, "El nombre no puede superar los 120 caracteres"),

    email: z
        .string()
        .trim()
        .toLowerCase()
        .email("El email no es válido")
        .max(255, "El email no puede superar los 255 caracteres"),

    password: z
        .string()
        .min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export const loginSchema = z.object({
    email: z
        .string()
        .trim()
        .toLowerCase()
        .email("El email no es válido"),

    password: z
        .string()
        .min(1, "La contraseña es obligatoria"),
});

export const updateMeSchema = z
    .object({
        name: z
            .string()
            .trim()
            .min(2, "El nombre debe tener al menos 2 caracteres")
            .max(120, "El nombre no puede superar los 120 caracteres")
            .optional(),

        preferredCurrency: z
            .string()
            .trim()
            .toUpperCase()
            .length(3, "La moneda debe tener 3 caracteres")
            .optional(),
    })
    .refine(
        (data) => data.name !== undefined || data.preferredCurrency !== undefined,
        {
            message: "Debes enviar al menos un campo para actualizar",
        }
    );