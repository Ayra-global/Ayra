import { Router } from "express";
import { z } from "zod";
import {
    AssistantError,
    generateAssistantReply,
} from "../services/assistant";
import {
    AuthenticatedRequest,
    requireAuth,
} from "../middlewares/auth";

const router = Router();

const chatMessageSchema = z.object({
    role: z.enum(["user", "assistant"]),
    text: z.string().min(1).max(1000),
});

const assistantChatSchema = z.object({
    message: z
        .string()
        .trim()
        .min(1, "El mensaje no puede estar vacío")
        .max(1000, "El mensaje no puede superar los 1000 caracteres"),

    history: z
        .array(chatMessageSchema)
        .max(20, "El historial es demasiado largo")
        .optional()
        .default([]),
});

router.post(
    "/chat",
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
        const parsed = assistantChatSchema.safeParse(req.body);

        if (!parsed.success) {
            return res.status(400).json({
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Datos del asistente inválidos",
                    details: parsed.error.flatten().fieldErrors,
                },
            });
        }

        try {
            const reply = await generateAssistantReply(
                req.userId!,
                parsed.data
            );

            return res.status(200).json({
                reply,
            });
        } catch (error) {
            console.error("Assistant chat error:", error);

            if (error instanceof AssistantError) {
                if (error.code === "ASSISTANT_DISABLED") {
                    return res.status(503).json({
                        error: {
                            code: error.code,
                            message:
                                "El asistente AYRA no está disponible en este momento",
                            details: {},
                        },
                    });
                }

                return res.status(503).json({
                    error: {
                        code: error.code,
                        message:
                            "No se pudo generar la respuesta del asistente",
                        details: {},
                    },
                });
            }

            return res.status(500).json({
                error: {
                    code: "INTERNAL_ERROR",
                    message:
                        "No se pudo procesar la consulta del asistente",
                    details: {},
                },
            });
        }
    }
);

export default router;