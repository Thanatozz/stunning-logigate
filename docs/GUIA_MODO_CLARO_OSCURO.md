# Guia de modo claro/oscuro (Dashboard)

Esta guia define como mantener soporte de ambos temas cuando se agregan o modifican componentes.

## 1) Regla principal

Para nuevos componentes, usar clases semanticas del proyecto:

- `bg-surface`
- `bg-panel`
- `text-ink`
- `text-muted`
- `border-line`
- `card-panel`

Evitar depender solo de utilidades fijas como `bg-white` o `bg-slate-50`.

## 2) Sistema de tema actual

- El tema se maneja con la store:
  - `dashboard/src/stores/theme.store.ts`
- Se persiste en `localStorage` con clave `logigate_theme`.
- El modo oscuro se activa agregando clase `dark` al `html`.

## 3) Donde estan los tokens visuales

- `dashboard/tailwind.config.js` (colores semanticos con variables CSS)
- `dashboard/src/assets/styles/tailwind.css`:
  - variables `:root` y `.dark`
  - puente de compatibilidad para clases legacy

## 4) Checklist antes de cerrar cambios UI

1. Probar vista en modo claro.
2. Probar vista en modo oscuro.
3. Revisar contraste de textos y bordes.
4. Ejecutar `npm run build`.

## 5) Nota de compatibilidad

Existe una capa de compatibilidad en CSS para componentes antiguos que usan clases genericas.
De todos modos, los componentes nuevos deben escribirse con tokens semanticos para que el soporte claro/oscuro sea consistente.
