import { Router } from "express";
import {
    AuthenticatedRequest,
    requireAuth,
} from "../middlewares/auth";
import {
    archiveContext,
    activateContext,
    ContextError,
    createContext,
    getContext,
    listContexts,
} from "../services/contexts";
import {
    contextIdSchema,
    createContextSchema,
} from "../schemas/contexts";

const router = Router();

router.get(
    "/",
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
        const includeArchivedParam = req.query.includeArchived;

        let includeArchived = false;

        if (includeArchivedParam !== undefined) {
            if (
                typeof includeArchivedParam !== "string" ||
                !["true", "false"].includes(includeArchivedParam)
            ) {
                return res.status(400).json({
                    error: {
                        code: "VALIDATION_ERROR",
                        message:
                            "includeArchived debe ser true o false",
                        details: {},
                    },
                });
            }

            includeArchived = includeArchivedParam === "true";
        }

        try {
            const contexts = await listContexts(
                req.userId!,
                includeArchived
            );

            return res.json({
                contexts,
            });
        } catch (error) {
            console.error("List contexts error:", error);

            if (error instanceof ContextError) {
                const status =
                    error.code === "WALLET_NOT_FOUND"
                        ? 404
                        : 400;

                return res.status(status).json({
                    error: {
                        code: error.code,
                        message: error.message,
                        details: {},
                    },
                });
            }

            return res.status(500).json({
                error: {
                    code: "INTERNAL_ERROR",
                    message: "No se pudieron obtener los contextos",
                    details: {},
                },
            });
        }
    }
);

router.post(
    "/",
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
        const parsed = createContextSchema.safeParse(req.body);

        if (!parsed.success) {
            return res.status(400).json({
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Datos del contexto inválidos",
                    details: parsed.error.flatten().fieldErrors,
                },
            });
        }

        try {
            const context = await createContext(
                req.userId!,
                parsed.data
            );

            return res.status(201).json({
                context,
            });
        } catch (error) {
            console.error("Create context error:", error);

            if (error instanceof ContextError) {
                const status =
                    error.code === "WALLET_NOT_FOUND"
                        ? 404
                        : 400;

                return res.status(status).json({
                    error: {
                        code: error.code,
                        message: error.message,
                        details: {},
                    },
                });
            }

            return res.status(500).json({
                error: {
                    code: "INTERNAL_ERROR",
                    message: "No se pudo crear el contexto",
                    details: {},
                },
            });
        }
    }
);

router.get(
    "/:id",
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
        const parsed = contextIdSchema.safeParse({
            id: req.params.id,
        });

        if (!parsed.success) {
            return res.status(400).json({
                error: {
                    code: "VALIDATION_ERROR",
                    message: "El id del contexto no es válido",
                    details: parsed.error.flatten().fieldErrors,
                },
            });
        }

        try {
            const context = await getContext(
                req.userId!,
                parsed.data.id
            );

            return res.json({
                context,
            });
        } catch (error) {
            console.error("Get context error:", error);

            if (error instanceof ContextError) {
                const status =
                    error.code === "CONTEXT_NOT_FOUND"
                        ? 404
                        : 400;

                return res.status(status).json({
                    error: {
                        code: error.code,
                        message: error.message,
                        details: {},
                    },
                });
            }

            return res.status(500).json({
                error: {
                    code: "INTERNAL_ERROR",
                    message: "No se pudo obtener el contexto",
                    details: {},
                },
            });
        }
    }
);

router.patch(
    "/:id/archive",
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
        const parsed = contextIdSchema.safeParse({
            id: req.params.id,
        });

        if (!parsed.success) {
            return res.status(400).json({
                error: {
                    code: "VALIDATION_ERROR",
                    message: "El id del contexto no es válido",
                    details: parsed.error.flatten().fieldErrors,
                },
            });
        }

        try {
            const context = await archiveContext(
                req.userId!,
                parsed.data.id
            );

            return res.json({
                context,
            });
        } catch (error) {
            console.error("Archive context error:", error);

            if (error instanceof ContextError) {
                return res.status(404).json({
                    error: {
                        code: error.code,
                        message: error.message,
                        details: {},
                    },
                });
            }

            return res.status(500).json({
                error: {
                    code: "INTERNAL_ERROR",
                    message: "No se pudo archivar el contexto",
                    details: {},
                },
            });
        }
    }
);

router.patch(
    "/:id/activate",
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
        const parsed = contextIdSchema.safeParse({
            id: req.params.id,
        });

        if (!parsed.success) {
            return res.status(400).json({
                error: {
                    code: "VALIDATION_ERROR",
                    message: "El id del contexto no es válido",
                    details: parsed.error.flatten().fieldErrors,
                },
            });
        }

        try {
            const context = await activateContext(
                req.userId!,
                parsed.data.id
            );

            return res.json({
                context,
            });
        } catch (error) {
            console.error("Activate context error:", error);

            if (error instanceof ContextError) {
                return res.status(404).json({
                    error: {
                        code: error.code,
                        message: error.message,
                        details: {},
                    },
                });
            }

            return res.status(500).json({
                error: {
                    code: "INTERNAL_ERROR",
                    message: "No se pudo activar el contexto",
                    details: {},
                },
            });
        }
    }
);

export default router;