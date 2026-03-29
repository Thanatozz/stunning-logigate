# Tutorial de instalacion para contribuidores (Node + npm)

Este tutorial esta pensado para personas sin experiencia previa con estas tecnologias.

## 1) Que vas a instalar

- `Git` para clonar el repositorio.
- `Node.js` (version LTS recomendada).
- `npm` (viene incluido con Node.js).

## 2) Instalar Git

- Descarga e instala Git desde: `https://git-scm.com/downloads`
- Deja la configuracion por defecto durante la instalacion.

## 3) Instalar Node.js y npm

- Descarga e instala Node.js LTS desde: `https://nodejs.org/`
- Durante la instalacion, deja las opciones por defecto.

## 4) Verificar instalacion (muy importante)

Abre una terminal nueva:

- En Windows: `PowerShell`
- En macOS/Linux: `Terminal`

Ejecuta:

```bash
node -v
npm -v
git --version
```

Si ves versiones en pantalla, todo esta correcto.

## 5) Descargar el proyecto

En una carpeta de trabajo, ejecuta:

```bash
git clone https://github.com/Thanatozz/stunning-logigate.git
cd stunning-logigate
```

## 6) Instalar dependencias del frontend

El proyecto web esta dentro de `dashboard/`:

```bash
cd dashboard
npm install
```

Esto puede tardar algunos minutos la primera vez.

## 7) Ejecutar el proyecto en modo desarrollo

Desde `dashboard/`, ejecuta:

```bash
npm run dev
```

Luego abre en el navegador la URL que aparezca en terminal (normalmente `http://localhost:5173`).

## 8) Verificar build de produccion

Para confirmar que todo compila bien:

```bash
npm run build
```

Opcional para previsualizar build:

```bash
npm run preview
```

## 9) Flujo diario recomendado

Cada vez que empieces:

```bash
cd stunning-logigate/dashboard
npm install
npm run dev
```

Nota: `npm install` se puede omitir si no hubo cambios en dependencias, pero para principiantes es una forma segura de evitar errores.

## 10) Problemas comunes y solucion

### Error: "npm no se reconoce como comando"

- Cierra y abre la terminal otra vez.
- Si sigue fallando, reinstala Node.js y marca opcion de PATH durante la instalacion.

### Error en PowerShell por politicas de ejecucion

Si ves un error de scripts bloqueados, ejecuta PowerShell como usuario normal (no admin) y corre:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Luego cierra y abre PowerShell de nuevo.

### Error: puerto ocupado (5173)

- Cierra otras instancias de `npm run dev`.
- O ejecuta:

```bash
npm run dev -- --port 5174
```

## 11) Comandos utiles

```bash
# Instalar dependencias
npm install

# Levantar entorno de desarrollo
npm run dev

# Compilar para produccion
npm run build

# Levantar build compilado
npm run preview
```

## 12) Estructura minima que debes conocer

- `docs/`: documentos del proyecto y este tutorial.
- `dashboard/`: aplicacion Vue 3 + TypeScript.
- `dashboard/src/`: vistas, componentes, stores, router y tipos.

Con estos pasos, cualquier contribuidor deberia poder instalar y correr el proyecto localmente.
