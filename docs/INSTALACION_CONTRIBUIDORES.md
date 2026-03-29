# Tutorial de instalacion para contribuidores (GitHub Desktop + Node + npm)

Este tutorial esta pensado para personas sin experiencia previa.  
El flujo principal de trabajo usa **GitHub Desktop** (no comandos `git` en terminal).

## 1) Que vas a instalar

- `GitHub Desktop` para clonar, hacer pull, commit y push.
- `Node.js` (version LTS recomendada).
- `npm` (viene incluido con Node.js).

## 2) Instalar GitHub Desktop

- Descarga e instala: `https://desktop.github.com/`
- Inicia sesion con tu cuenta de GitHub.

## 3) Instalar Node.js y npm

- Descarga e instala Node.js LTS desde: `https://nodejs.org/`
- Deja opciones por defecto.

## 4) Verificar Node y npm

Abre una terminal nueva:

- Windows: `PowerShell`
- macOS/Linux: `Terminal`

Ejecuta:

```bash
node -v
npm -v
```

Si ves versiones, ya esta listo.

## 5) Clonar repositorio con GitHub Desktop

1. Abre GitHub Desktop.
2. Ve a `File > Clone repository...`.
3. Pestaña `URL`.
4. Pega esta URL:
   `https://github.com/Thanatozz/stunning-logigate.git`
5. Elige la carpeta local donde guardar el proyecto.
6. Presiona `Clone`.

## 6) Abrir terminal desde GitHub Desktop

Con el repo abierto en GitHub Desktop:

1. Ve a `Repository > Open in Terminal`.
2. Ejecuta:

```bash
cd dashboard
npm install
```

## 7) Ejecutar el frontend

Desde `dashboard/`:

```bash
npm run dev
```

Abre la URL que aparezca en terminal (normalmente `http://localhost:5173`).

## 8) Verificar build de produccion

Desde `dashboard/`:

```bash
npm run build
```

Opcional:

```bash
npm run preview
```

## 9) Flujo diario recomendado (con GitHub Desktop)

1. Abrir GitHub Desktop.
2. Hacer `Fetch origin` y luego `Pull`.
3. `Repository > Open in Terminal`.
4. Ejecutar:

```bash
cd dashboard
npm install
npm run dev
```

5. Cuando termines cambios:
   - Revisar archivos en GitHub Desktop.
   - Escribir mensaje de commit.
   - `Commit to <branch>`.
   - `Push origin`.

## 10) Problemas comunes

### "npm no se reconoce como comando"

- Cierra y abre la terminal.
- Si sigue fallando, reinstala Node.js.

### Error de scripts bloqueados en PowerShell

Ejecuta en PowerShell (usuario normal):

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

### Puerto 5173 ocupado

```bash
npm run dev -- --port 5174
```

## 11) Comandos utiles

```bash
npm install
npm run dev
npm run build
npm run preview
```

## 12) Estructura minima que debes conocer

- `docs/`: documentos y tutoriales.
- `dashboard/`: app Vue 3 + TypeScript.
- `dashboard/src/`: vistas, componentes, stores y router.

Con estos pasos, cualquier contribuidor puede empezar usando GitHub Desktop y Node.js sin experiencia previa.
