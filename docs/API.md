# API de AYRA

Contrato entre el frontend (`frontend/src/lib/api.ts`) y el backend (`backend/`).
Este documento es un borrador deducido del cliente del frontend. Los campos de las
respuestas marcados como **por confirmar** dependen de `frontend/src/lib/types.ts`.

## Convenciones

- **Base URL:** variable `VITE_API_URL` en el frontend (en local: `http://localhost:3000`). Sin `/` al final.
- **Formato:** todo es JSON. Cabecera `Content-Type: application/json`.
- **Autenticación:** cabecera `Authorization: Bearer <token>` en todo, excepto `register`, `login` y `/health`.
- **Montos:** siempre como **string** decimal (ejemplo `"100.50"`) para no perder precisión.
- **Monedas:** código de 3 letras (`USD`, `COP`, `EUR`).
- **204:** respuesta sin cuerpo.

### Formato de error

Toda respuesta con error (status 4xx o 5xx) debe venir así:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Datos inválidos",
    "details": { "email": ["Correo inválido"] }
  }
}
```

- `code` y `message` son obligatorios. `details` es opcional y sirve para errores por campo.
- Un **401** hace que el frontend cierre la sesión automáticamente. Devolver 401 solo cuando el token falte, sea inválido o haya vencido.

## Prioridad para la Demo 1

La meta del Sprint 1 es que un usuario se registre, entre y vea 1.000 USD. Para eso bastan
los endpoints marcados como **Sprint 1**. El resto puede venir después.

| Endpoint | Prioridad |
|---|---|
| `GET /health` | Sprint 1 |
| `POST /api/auth/register` | Sprint 1 |
| `POST /api/auth/login` | Sprint 1 |
| `GET /api/auth/me` | Sprint 1 |
| `GET /api/wallet` | Sprint 1 |
| `GET /api/wallet/balances` | Sprint 1 |
| `PATCH /api/auth/me` | Sprint 1 (N8) |
| Tasas, transacciones, contextos, asistente | Después |

Al registrarse, el backend debe crear la billetera del usuario con un saldo inicial de 1.000 USD.

## Salud

### `GET /health`

Sin autenticación. Respuesta `200`:

```json
{ "status": "ok", "db": "ok" }
```

## Autenticación

### `POST /api/auth/register`

Body:

```json
{ "name": "Ana Pérez", "email": "ana@correo.com", "password": "mínimo 8 caracteres" }
```

Respuesta `201`: `{ "token": "<jwt>", "user": User }`

Errores: `400` validación, `409` correo ya registrado.

### `POST /api/auth/login`

Body: `{ "email": "...", "password": "..." }`

Respuesta `200`: `{ "token": "<jwt>", "user": User }`

Errores: `401` credenciales incorrectas.

### `GET /api/auth/me`

Respuesta `200`: `{ "user": User }`

### `PATCH /api/auth/me`

Todavía no lo usa el frontend (tarea N8 de Nati). Edita nombre y moneda preferida.

Body (todos opcionales): `{ "name": "...", "preferredCurrency": "COP" }`

Respuesta `200`: `{ "user": User }`

El nombre exacto del campo de moneda hay que acordarlo con Webster (**por confirmar**).

## Billetera

### `GET /api/wallet`

Resumen de la billetera. Respuesta `200`: `WalletSummary` (**por confirmar** la forma exacta en `types.ts`).

### `GET /api/wallet/balances`

Respuesta `200`: `{ "balances": Balance[] }`

### `GET /api/rates/currencies`

Monedas disponibles. Respuesta `200`: `{ "currencies": ["USD", "COP", "EUR"] }`

## Tasas y operaciones (después del Sprint 1)

`type` es un `OperationType` (compra, venta o intercambio). Los valores exactos están en
`types.ts` y la interpretación de cada uno es la duda N7 para el mentor.

### `GET /api/rates/quote`

Query: `type`, `from`, `to`, `amount`. Respuesta `200`: `{ "quote": Quote }`

### `POST /api/transactions`

Ejecuta una operación. Body:

```json
{
  "type": "OperationType",
  "fromCurrency": "USD",
  "toCurrency": "COP",
  "amount": "100.00",
  "contextId": null
}
```

Respuesta `201`: `{ "transaction": Transaction }`

Errores: `400` validación, `422` saldo insuficiente (**por confirmar** el código).

### `GET /api/transactions`

Query opcional: `contextId`, `limit`, `offset`. Respuesta `200`: `{ "items": Transaction[], "total": number }`

## Contextos (después del Sprint 1)

Un contexto agrupa movimientos por viaje o período, con presupuesto opcional.

### `GET /api/contexts`

Query opcional: `includeArchived=true`. Respuesta `200`: `{ "contexts": WalletContext[] }`

### `POST /api/contexts`

Body:

```json
{
  "name": "Viaje a Madrid",
  "type": "WalletContext['type']",
  "startDate": "2026-10-01",
  "endDate": "2026-10-15",
  "budget": { "currency": "EUR", "amount": "500.00" }
}
```

`startDate`, `endDate` y `budget` son opcionales (pueden ser `null`). Respuesta `201`: `{ "context": WalletContext }`

### `PATCH /api/contexts/:id/archive`

Sin body. Respuesta `200`: `{ "context": WalletContext }`

## Asistente (después del Sprint 1)

### `POST /api/assistant/chat`

Body: `{ "message": "...", "history": ChatMessage[] }`

Respuesta `200`: `{ "reply": "..." }`

Requiere un proveedor de IA. Fuera del alcance del Sprint 1.

## Pendientes de este documento

- Completar `User`, `Balance`, `WalletSummary`, `Quote`, `Transaction` y `WalletContext` con `frontend/src/lib/types.ts`.
- Confirmar los valores de `OperationType` y los códigos de error de negocio.
- Acordar con Webster el nombre del campo de moneda preferida.
