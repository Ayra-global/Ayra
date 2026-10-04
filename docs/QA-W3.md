# W3 · Pruebas en producción: registro, login y dashboard

**Responsable:** Webster · **Cuándo:** apenas estén desplegados el frontend (Vercel) y el backend (Railway)

**URL frontend:** `https://__________.vercel.app`
**URL backend:** `https://__________.up.railway.app`

> Probar en **Chrome en modo incógnito**, así no quedan sesiones viejas guardadas.
> Si algo falla, abrí **F12 → Console** y **F12 → Network**, sacá una captura y creá un issue en GitHub.

---

## 0. Antes de empezar

| # | Prueba | Resultado esperado | ✅/❌ |
|---|---|---|---|
| 0.1 | Abrir `https://<backend>/health` | `{"status":"ok","db":"ok"}` | |
| 0.2 | Abrir la URL de Vercel | Carga la pantalla de login de AYRA | |
| 0.3 | F12 → Console | Sin errores en rojo | |

## 1. Registro

| # | Prueba | Resultado esperado | ✅/❌ |
|---|---|---|---|
| 1.1 | Registrarse con nombre, email nuevo y contraseña `prueba123` | Entra al dashboard | |
| 1.2 | Ver el saldo | **1.000,00 USD**, EUR 0 y ARS 0 | |
| 1.3 | Registrarse otra vez con el **mismo email** | Error: "El email ya está registrado" | |
| 1.4 | Contraseña `abc` (corta) | Error en el campo contraseña | |
| 1.5 | Contraseña `soloLetras` (sin números) | Error: "Debe incluir al menos un número" | |
| 1.6 | Email inválido (`nati@`) | El formulario no deja enviarlo | |

## 2. Login y sesión

| # | Prueba | Resultado esperado | ✅/❌ |
|---|---|---|---|
| 2.1 | Salir → Ingresar con el usuario de 1.1 | Entra al dashboard | |
| 2.2 | Contraseña incorrecta | Error: "Email o contraseña incorrectos" | |
| 2.3 | Estando logueado, recargar la página (F5) | Sigue logueado | |
| 2.4 | Salir y escribir en la barra la URL `/` | Redirige a `/login` | |
| 2.5 | Estando logueado, entrar a `/login` | Redirige al dashboard | |

## 3. Dashboard

| # | Prueba | Resultado esperado | ✅/❌ |
|---|---|---|---|
| 3.1 | Saludo | "Hola, <nombre> 👋" | |
| 3.2 | Botón 👁 del balance | Oculta y muestra los montos (••••••) | |
| 3.3 | Banner **AYRA AI** | Abre el chat. Si no hay key de Gemini, muestra "El asistente no está configurado" (es lo esperado en el Sprint 1) | |
| 3.4 | Menú: Contextos y Movimientos | Cambia de página sin errores | |
| 3.5 | Movimientos | Aparece el "Depósito" de +1.000 USD | |

## 4. Errores de conexión (CORS)

| # | Prueba | Resultado esperado | ✅/❌ |
|---|---|---|---|
| 4.1 | F12 → Console durante el registro | **No** aparece `blocked by CORS policy` | |
| 4.2 | F12 → Network → request `register` | Status **201** | |

Si aparece un error de CORS, es la tarea **J4** de José: `CORS_ORIGIN` en Railway tiene que ser exactamente la URL de Vercel, sin `/` al final.

## 5. Celular (adelanta W5)

| # | Prueba | Resultado esperado | ✅/❌ |
|---|---|---|---|
| 5.1 | Abrir la URL de Vercel en el celular | El login se ve completo sin hacer zoom | |
| 5.2 | Registrarse desde el celular | Funciona | |
| 5.3 | Dashboard | Los saldos se ven en 3 columnas y el menú no se corta | |

---

## Errores comunes y dónde se arreglan

| Síntoma | Causa probable | Quién |
|---|---|---|
| "No se pudo conectar con el servidor" | `VITE_API_URL` mal puesta en Vercel, o falta el **Redeploy** | Webster |
| `blocked by CORS policy` en la consola | `CORS_ORIGIN` en Railway no coincide con la URL de Vercel | José |
| `/health` responde `db: down` | `DATABASE_URL` mal configurada en Railway | Nati |
| 404 al recargar en `/contexts` | Falta `vercel.json` (ya está en el repo) o Root Directory ≠ `frontend` | Webster |
| Error 500 al registrarse | Faltan las migraciones o `JWT_SECRET` en Railway | Nati |

## Resultado

- Fecha de la prueba: ____ · Navegador y dispositivo: ____
- Bugs encontrados (issues creados): #___ #___
