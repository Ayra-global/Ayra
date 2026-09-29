# Sprint 1: Fundamentos (semana 1)

**Meta de la Demo 1:** la app está en producción, un usuario se registra, entra y ve 1.000 USD.

**Idea clave:** cada uno sube su parte de la base con su propio PR. Así todos tienen commits en el historial, que es lo que mira el evaluador. Webster les comparte el zip a Nati y a José.

**Equipo:** Nati (Backend) · Webster (Frontend) · José (Integración y coordinación)

---

## 👩‍💻 Nati: Backend

| # | Tarea | Día | Estado |
|---|---|---|---|
| N1 | Leer `backend/`, `docs/API.md` y `migrations/001_init.sql` (con Webster, 30 min) | Lun | ⬜ |
| N2 | Abrir el PR `feature/backend-base` con la carpeta `backend/` hacia `develop` | Lun | ⬜ |
| N3 | En Railway: crear PostgreSQL y el servicio del backend (Root Directory `backend`), cargar `DATABASE_URL` y `JWT_SECRET` | Mar | ⬜ |
| N4 | Generar el dominio y verificar que `/health` devuelva `{"status":"ok","db":"ok"}` | Mar | ⬜ |
| N5 | Revisar en la base de datos de Railway que existan las 7 tablas | Mar | ⬜ |
| N6 | Probar con Postman o Thunder Client: register, login, me y wallet | Mié | ⬜ |
| N7 | Preguntar al mentor cómo interpretar compra, venta e intercambio, y ajustar si hace falta | Mié | ⬜ |
| N8 | Crear un endpoint `PATCH /api/auth/me` para editar nombre y moneda preferida (su primera feature propia) y deploy del backend en Railway o Supabase | Mié | ⬜ |

## 🎨 Webster: Frontend

| # | Tarea | Día | Estado |
|---|---|---|---|
| W1 | Abrir el PR `feature/frontend-base` con la carpeta `frontend/` hacia `develop` | Lun | ✅ PR #12 |
| W2 | En Vercel: importar el repo (Root Directory `frontend`) y cargar `VITE_API_URL` con la URL de Railway | Lun | ⬜ |
| W3 | Probar registro, login y dashboard en producción | Mar | ⬜ |
| W4 | Aplicar la identidad del flyer: logo AYRA, tipografía, colores | Mar | ⬜ |
| W5 | Revisar en el celular el responsive de login, registro y dashboard | Mié | ⬜ |
| W6 | Agregar una pantalla de carga y el manejo de "backend no disponible" | Mié | ⬜ |

## 🔗 José: Integración y coordinación

| # | Tarea | Día | Estado |
|---|---|---|---|
| J1 | Cargar en el GitHub Project los issues de este sprint, cada uno con su dueño | Lun | ⬜ |
| J2 | Abrir el PR `chore/ci-and-docs` con `.github/`, `docs/`, `README` y `CONTRIBUTING` (**después** de los PR de Nati y Webster) | Lun | ⬜ |
| J3 | Activar en la protección de ramas la exigencia de que el CI pase (los 2 jobs) | Mar | ⬜ |
| J4 | Conectar Railway y Vercel: poner la URL de Vercel en `CORS_ORIGIN` de Railway y verificar que no haya errores de CORS | Mar | ⬜ |
| J5 | Probar punta a punta en producción y abrir un issue por cada bug | Mié | ⬜ |
| J6 | Completar el README con las URLs reales y la tabla del equipo | Mié | ⬜ |
| J7 | Armar el guion de la Demo 1 y facilitar las dailies y la retro | Mié | ⬜ |

## 🤝 Juntos

| Cuándo | Qué |
|---|---|
| Lunes | Sprint Planning (45 min): confirmar estas tareas |
| Todos los días | Daily de 15 min |
| Lunes y martes | Revisar los PRs entre ustedes (cada PR necesita 1 aprobación) |
| Miércoles/Jueves | **Demo 1** con el mentor, y después la retro |

---

## Orden en que se desbloquean las tareas

```
W1 ✅ → N2 → J2 → N3/N4 → W2 → J4 → pruebas
```

Cada tarea depende de la anterior. Si Nati no tiene el backend desplegado, Webster no tiene URL para Vercel, y José no puede conectar el CORS.

## Definición de terminado

- [ ] La app está desplegada: backend en Railway (o Supabase) y frontend en Vercel.
- [ ] Un usuario nuevo puede registrarse en producción.
- [ ] Puede hacer login y ver el dashboard con 1.000 USD.
- [ ] El CI está en verde en `develop`.
- [ ] El README tiene las URLs reales.
