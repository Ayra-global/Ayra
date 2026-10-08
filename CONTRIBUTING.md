# 🤝 Guía de contribución

## 🌿 Ramas

La rama `main` corresponde a producción e integración final.
No se realizan pushes directos.

Las ramas de trabajo se crean a partir de `main`:

- `feature/nombre` → nuevas funcionalidades
- `fix/nombre` → correcciones y bugs
- `docs/nombre` → documentación
- `chore/nombre` → mantenimiento, configuración o tareas técnicas

## 💬 Commits

Usamos el formato:

`tipo: descripción corta`

Tipos principales:

- `feat` → nueva funcionalidad
- `fix` → corrección
- `docs` → documentación
- `chore` → mantenimiento

La descripción debe ser breve y clara.

## 🔀 Pull Requests

Todos los cambios deben ingresar mediante Pull Request hacia `main`.

Cada PR debe:

1. Tener una descripción clara del cambio realizado.
2. Indicar el issue o tarea relacionada cuando corresponda.
3. Tener los labels correspondientes al sprint y al área.
4. Tener el CI en verde.
5. Contar con al menos 1 aprobación.
6. No ser aprobado por la misma persona que lo creó.

## ✅ Revisión

Antes de solicitar la aprobación se debe verificar que:

- Los tests pasen correctamente.
- No haya errores de TypeScript o build.
- Los cambios respeten el contrato definido en `docs/API.md`.
- La documentación se actualice cuando cambien rutas, requests o responses.

## 🚀 Producción

La rama `main` representa la versión integrada y lista para producción.

Los cambios se consideran terminados una vez aprobados, mergeados y validados en el entorno correspondiente.
