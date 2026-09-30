# Guía de contribución

## Ramas
- `main`: producción. No se hace push directo.
- `develop`: integración. Todos los PR apuntan aquí.
- Ramas de trabajo desde `develop`: `feature/nombre`, `fix/nombre`, `chore/nombre`.

## Commits
Formato: `tipo: descripción corta`. Tipos: `feat`, `fix`, `chore`, `docs`.

## Pull requests
1. Abre el PR hacia `develop` con la plantilla completa.
2. Agrega labels (`sprint-1` y el área) y enlaza el issue con `Closes #N`.
3. Necesita 1 aprobación y que el CI pase.
4. No apruebes tu propio PR.