# 💳 AYRA — Contextual Wallet

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1?logo=postgresql&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-Testing-6E9F18?logo=vitest&logoColor=white)
![Railway](https://img.shields.io/badge/Backend-Railway-0B0D0E?logo=railway&logoColor=white)
![Vercel](https://img.shields.io/badge/Frontend-Vercel-000000?logo=vercel&logoColor=white)
![Gemini](https://img.shields.io/badge/AYRA%20AI-Gemini-4285F4?logo=google&logoColor=white)

> **AYRA** es una billetera digital multidivisa pensada para organizar el dinero según distintos contextos de vida, como viajes, estudios, trabajo o proyectos compartidos.

La aplicación permite gestionar saldos en **USD, EUR y ARS**, consultar tasas de cambio reales, realizar compras, ventas e intercambios, registrar movimientos, organizar gastos mediante contextos con presupuesto y consultar a **AYRA AI** utilizando lenguaje natural.

---

## 📖 Descripción

AYRA nace con una idea simple: que gestionar dinero en distintas monedas no signifique solamente ver saldos, sino también **entender para qué se está usando ese dinero**.

Por eso, además de una wallet multidivisa, AYRA incorpora una capa de organización por **contextos de vida**. Un usuario puede crear, por ejemplo, un contexto llamado `Viaje a España`, asignarle un presupuesto y asociar operaciones para conocer cuánto lleva gastado.

El proyecto también incorpora **AYRA AI**, un asistente que permite consultar de forma conversacional los datos de la propia wallet, como saldos, movimientos recientes y contextos.

---

## ✨ Funcionalidades

- 💱 **Wallet multidivisa** con USD, EUR y ARS.
- 📈 **Tasas de cambio reales** mediante ExchangeRate-API.
- 🧮 **Cotizaciones** para compra, venta e intercambio antes de confirmar una operación.
- 💸 **Compra, venta e intercambio** entre monedas.
- 🔒 **Autenticación y autorización** de usuarios.
- 📜 **Historial de movimientos** con paginación y filtro por contexto.
- 🧳 **Contextos de vida** para organizar gastos.
- 💰 **Presupuestos por contexto** con seguimiento de gasto.
- 📧 **Email de confirmación** después de cada transacción exitosa.
- 🤖 **AYRA AI** para consultar saldos, movimientos y contextos en lenguaje natural.
- 🛡️ **Validación de datos** y manejo controlado de errores.
- 🧪 **Tests automatizados** con Vitest.

---

## 🎯 Flujo principal

```text
Usuario
   │
   ▼
Frontend AYRA
   │
   │  API REST
   ▼
Backend
   │
   ├──────────────► PostgreSQL
   │
   ├──────────────► ExchangeRate-API
   │
   ├──────────────► Vercel Function ──► AWS SES
   │
   └──────────────► Gemini / AYRA AI
```

---

## 🏗️ Arquitectura

AYRA separa la interfaz, la lógica de negocio y la persistencia de datos:

- **Frontend:** interfaz y experiencia de usuario.
- **Backend:** API REST, autenticación, validaciones y lógica de negocio.
- **PostgreSQL:** persistencia de usuarios, wallets, movimientos y contextos.
- **Servicios externos:** cotizaciones, envío de emails y asistente inteligente.

Las operaciones financieras se procesan en el backend dentro de transacciones de base de datos para mantener la consistencia de los balances y movimientos.

---

## 🛠️ Tecnologías utilizadas

| Tecnología | Uso |
|---|---|
| **TypeScript** | Desarrollo tipado del frontend/backend |
| **Node.js** | Runtime del backend |
| **Express** | API REST y routing |
| **PostgreSQL** | Base de datos relacional |
| **Zod** | Validación de datos de entrada |
| **Vitest** | Testing automatizado |
| **ExchangeRate-API** | Tasas de cambio |
| **Google Gemini** | AYRA AI |
| **@google/genai** | Integración con Gemini desde backend |
| **AWS SES** | Envío de emails |
| **Vercel** | Frontend y función interna de email |
| **Railway** | Backend y PostgreSQL |
| **Git & GitHub** | Control de versiones y colaboración |

---

## 🔐 Seguridad y consistencia

AYRA protege las operaciones sensibles desde el backend.

Las rutas privadas requieren autenticación y las consultas de wallet, movimientos y contextos se realizan dentro del alcance del usuario autenticado.

Para las operaciones de compra, venta e intercambio, el backend:

1. Valida la solicitud.
2. Verifica el saldo disponible.
3. Bloquea los registros necesarios durante la operación.
4. Debita y acredita los balances.
5. Registra el movimiento.
6. Confirma la transacción con `COMMIT`.

Ante un error, se utiliza `ROLLBACK` para evitar estados inconsistentes.

El envío del email se realiza **después del commit**, por lo que un fallo del servicio de correo no revierte una operación financiera ya confirmada.

---

## 🤖 AYRA AI

AYRA AI permite realizar consultas en lenguaje natural sobre la información de la propia wallet.

Ejemplos:

```text
¿Cuánto dinero tengo disponible en USD?

¿Cuáles fueron mis últimos movimientos?

¿Cuánto gasté en mi viaje?
```

### 🔎 Información disponible para el asistente

Para una consulta, el backend proporciona únicamente la información necesaria:

- saldos del usuario;
- movimientos recientes;
- contextos del usuario;
- historial reciente de la conversación.

El historial enviado al modelo se limita para controlar el consumo y mantener el contexto acotado.

### 🧠 Modelo utilizado

La especificación inicial del Sprint 2 indicaba `gemini-2.5-flash`.

Durante la implementación, la API disponible para el proyecto utilizado devolvió un error `404` indicando que ese modelo no estaba disponible para nuevos usuarios. Por ese motivo, AYRA AI se adaptó a:

```text
gemini-3.1-flash-lite
```

El modelo fue validado de punta a punta en entorno local.

> AYRA AI funciona como asistente de consulta: **no ejecuta operaciones financieras ni modifica balances**.

---

## 📧 Notificaciones por email

Después de cada transacción exitosa, el backend solicita el envío de un email de confirmación mediante una función interna de Vercel.

El flujo es:

```text
Transacción válida
      │
      ▼
COMMIT en PostgreSQL
      │
      ▼
Backend llama a /api/send-email
      │
      ▼
AWS SES
      │
      ▼
Email al usuario
```

La notificación se ejecuta después de confirmar la operación, de manera que un problema en el servicio de correo no afecta la transacción.

---

## 🚀 Aplicación en producción

### Frontend

https://ayra-woad.vercel.app

### Backend

https://ayra-production.up.railway.app

Health check:

https://ayra-production.up.railway.app/health

### Documentación de API

La documentación completa del contrato entre frontend y backend se encuentra en:

[`docs/API.md`](docs/API.md)

---

## 💻 Instalación y ejecución local

### 1. Clonar el repositorio

```bash
git clone https://github.com/Ayra-global/Ayra.git
cd Ayra
```

### 2. Configurar el backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Completá las variables necesarias en `backend/.env` según `backend/.env.example`.

> ⚠️ **Nunca subas tu archivo `.env` al repositorio ni compartas claves secretas.**

### 3. Ejecutar el frontend

En otra terminal:

```bash
cd frontend
npm install
npm run dev
```

La URL mostrada por Vite será la que debés abrir en el navegador.

---

## 🧪 Testing

Para ejecutar los tests del backend:

```bash
cd backend
npm test
```

Comandos útiles para validar el proyecto:

```bash
npm test
npm run typecheck
npm run build
```

El proyecto incluye tests sobre la lógica crítica, incluyendo operaciones, autorizaciones, cotizaciones, cache, transacciones, emails y AYRA AI.

---

## 📁 Estructura del proyecto

```text
Ayra/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   └── __tests__/
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── docs/
│   └── API.md
│
├── .gitignore
├── CONTRIBUTING.md
└── README.md
```

> La estructura puede evolucionar a medida que el proyecto incorpora nuevas funcionalidades.

---

## 📚 API principal

Entre los endpoints principales de AYRA se encuentran:

| Área | Endpoint | Descripción |
|---|---|---|
| Auth | `POST /api/auth/register` | Registrar usuario |
| Auth | `POST /api/auth/login` | Iniciar sesión |
| Wallet | `GET /api/wallet` | Consultar balances |
| Tasas | `GET /api/rates` | Obtener tasas |
| Cotización | `GET /api/rates/quote` | Calcular cotización |
| Transacciones | `POST /api/transactions` | Comprar, vender o intercambiar |
| Historial | `GET /api/transactions` | Consultar movimientos |
| Contextos | `GET /api/contexts` | Listar contextos |
| Contextos | `POST /api/contexts` | Crear contexto |
| AYRA AI | `POST /api/assistant/chat` | Consultar al asistente |

Para el detalle de requests, responses y errores:

👉 [`docs/API.md`](docs/API.md)

---

## 👥 Equipo

| Integrante | Rol |
|---|---|
| **Natalia Alvarez** | Backend |
| **Webster** | Frontend |

---

## 🤝 Metodología de trabajo

El proyecto se gestionó mediante **GitHub + Trello**, organizando el trabajo por sprints, responsables y pull requests.

El contrato entre frontend y backend se centraliza en `docs/API.md` para mantener alineadas las implementaciones de ambos lados.

---

## 🤖 Uso de Inteligencia Artificial

Durante el desarrollo, la inteligencia artificial se utilizó como herramienta de apoyo para investigación, resolución de problemas, generación y revisión de código, testing y documentación.

La integración de **AYRA AI** forma parte de la funcionalidad final del producto y utiliza Google Gemini desde el backend.

> La IA se utilizó como herramienta de apoyo y productividad. Las decisiones de implementación, revisión y validación del proyecto fueron realizadas por el equipo.

---

## 📌 Estado del proyecto

AYRA cuenta con las funcionalidades principales del Sprint 2 implementadas y preparadas para el cierre final del proyecto:

- ✅ Wallet multidivisa
- ✅ Tasas y cotizaciones
- ✅ Compra, venta e intercambio
- ✅ Historial de movimientos
- ✅ Contextos y presupuestos
- ✅ Notificaciones por email
- ✅ AYRA AI
- ✅ Documentación de API
- ✅ Tests automatizados
- 🚀 Despliegue en Vercel + Railway

---

## 🌐 Proyecto

**Aplicación:**  
https://ayra-woad.vercel.app

**Backend:**  
https://ayra-production.up.railway.app

**Repositorio:**  
https://github.com/Ayra-global/Ayra
