# Contrato de la API

Base URL: `http://localhost:3000` (local) · `https://<api>.up.railway.app` (prod)

Las rutas marcadas con 🔒 requieren el header `Authorization: Bearer <token>`.

Todos los errores tienen el mismo formato:
```json
{ "error": { "code": "INSUFFICIENT_FUNDS", "message": "Saldo insuficiente en USD", "details": { } } }
```

| Status | Códigos |
|---|---|
| 400 | `VALIDATION_ERROR` (details = errores por campo), `UNSUPPORTED_CURRENCY`, `INVALID_JSON` |
| 401 | `UNAUTHORIZED`, `INVALID_CREDENTIALS` |
| 404 | `NOT_FOUND`, `ROUTE_NOT_FOUND` |
| 409 | `EMAIL_TAKEN`, `CONFLICT` |
| 422 | `INSUFFICIENT_FUNDS`, `INVALID_AMOUNT`, `CONTEXT_ARCHIVED` |
| 502/503 | `RATES_UNAVAILABLE`, `ASSISTANT_DISABLED`, `ASSISTANT_ERROR` |

Los **montos siempre viajan como string** (por ejemplo `"100.50000000"`) para no perder precisión.

---

## Health
`GET /health` → `{ "status": "ok", "db": "ok" }`

## Auth
| Método | Ruta | Body | Respuesta |
|---|---|---|---|
| POST | `/api/auth/register` | `{ name, email, password }` | `201 { token, user }` |
| POST | `/api/auth/login` | `{ email, password }` | `{ token, user }` |
| GET 🔒 | `/api/auth/me` | | `{ user }` |
| PATCH 🔒 | `/api/auth/me` | `{ name?, preferredCurrency? }` | `{ user }` |

`user = { id, name, email, preferredCurrency, createdAt }`. Al registrarse, el usuario recibe 1000 USD ficticios.

## Wallet
| Método | Ruta | Respuesta |
|---|---|---|
| GET 🔒 | `/api/wallet` | `{ balances: [{ currency, amount }], total: { currency: "USD", amount } }` |
| GET 🔒 | `/api/wallet/balances` | `{ balances }` |

## Tasas
| Método | Ruta | Respuesta |
|---|---|---|
| GET | `/api/rates/currencies` | `{ currencies: ["USD","EUR","ARS"] }` |
| GET 🔒 | `/api/rates?base=USD` | `{ base, rates: [{ target, rate, fetchedAt, source, stale }] }` |
| GET 🔒 | `/api/rates/quote?type=buy&from=USD&to=EUR&amount=100` | `{ quote }` (no modifica saldos) |

`quote = { type, fromCurrency, toCurrency, fromAmount, toAmount, midRate, appliedRate, fee, feeSide, rateFetchedAt, rateStale }`

## Transacciones
| Método | Ruta | Body / Query | Respuesta |
|---|---|---|---|
| POST 🔒 | `/api/transactions` | `{ type, fromCurrency, toCurrency, amount, contextId? }` | `201 { transaction }` |
| GET 🔒 | `/api/transactions` | `?contextId=&limit=20&offset=0` | `{ items, total, limit, offset }` |

Semántica de `type` y de `amount`:
| type | `amount` es… | Spread |
|---|---|---|
| `exchange` | lo que **sale** de `fromCurrency` | No, se usa la tasa media |
| `sell` | lo que **vendés** de `fromCurrency` | Sí, recibís menos |
| `buy` | lo que **querés recibir** de `toCurrency` | Sí, pagás más |

`transaction = { id, type, fromCurrency, toCurrency, fromAmount, toAmount, rate, midRate, fee, feeCurrency, contextId, contextName, createdAt }`

## Contextos
| Método | Ruta | Body | Respuesta |
|---|---|---|---|
| GET 🔒 | `/api/contexts?includeArchived=true` | | `{ contexts }` |
| POST 🔒 | `/api/contexts` | `{ name, type, startDate?, endDate?, budget?: { currency, amount } }` | `201 { context }` |
| GET 🔒 | `/api/contexts/:id` | | `{ context }` |
| PATCH 🔒 | `/api/contexts/:id/archive` | | `{ context }` |
| PATCH 🔒 | `/api/contexts/:id/activate` | | `{ context }` |

`type` puede ser `travel`, `study`, `work` o `shared`.
`context = { id, name, type, status, startDate, endDate, budget: { currency, amount, spent } | null, transactionCount, createdAt }`

## Asistente
| Método | Ruta | Body | Respuesta |
|---|---|---|---|
| POST 🔒 | `/api/assistant/chat` | `{ message, history?: [{ role: "user"\|"assistant", text }] }` | `{ reply }` |

El asistente utiliza Gemini mediante `@google/genai`.

**Modelo:** `gemini-3.1-flash-lite`.

La especificación del Sprint 2 indicaba `gemini-2.5-flash`. Durante la implementación, la API devolvió un error `404` indicando que ese modelo no estaba disponible para nuevos usuarios del proyecto utilizado. Por este motivo se adaptó la implementación a `gemini-3.1-flash-lite`, que fue validado correctamente en pruebas end-to-end locales.

El asistente recibe únicamente los saldos, los movimientos recientes y los contextos del usuario autenticado. El historial del chat se limita para controlar el consumo de tokens.

## Vercel Function (interna)
`POST https://<app>.vercel.app/api/send-email`. Requiere el header `x-internal-secret`. Solo la llama el backend.
