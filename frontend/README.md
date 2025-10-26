This is a [Next.js](https://nextjs.org) project using the App Router, Tailwind CSS v4, Framer Motion, and Lucide icons.

## Requisitos

- Node.js >= 18.18 (recomendado 20.x)
- npm >= 9 (o yarn/pnpm/bun, si prefieres)

## Instalación y ejecución

1) Instalar dependencias

```bash
npm install
```

2) Ambiente de desarrollo (puerto 3001)

```bash
npm run dev
```

Abrir http://localhost:3001 en el navegador.

3) Build de producción y arranque

```bash
npm run build
npm start
```

## Dependencias del proyecto (frontend)

Si alguien clona el repositorio, estas son las dependencias que se instalan automáticamente con `npm install` (incluye versiones actuales del `package.json`):

Runtime dependencies

- @hookform/resolvers ^5.2.2
- @radix-ui/react-avatar ^1.1.10
- @radix-ui/react-dialog ^1.1.15
- @radix-ui/react-dropdown-menu ^2.1.16
- @radix-ui/react-slider ^1.3.6
- @radix-ui/react-tabs ^1.1.13
- @radix-ui/react-tooltip ^1.2.8
- @supabase/supabase-js ^2.75.0
- @tanstack/react-query ^5.90.5
- autoprefixer ^10.4.21
- axios ^1.12.2
- class-variance-authority ^0.7.1
- clsx ^2.1.1
- date-fns ^4.1.0
- dayjs ^1.11.18
- framer-motion ^12.23.24
- howler ^2.2.4
- intersection-observer ^0.12.2
- lucide-react ^0.546.0
- next 15.5.6
- pdfjs-dist ^5.4.296
- postcss ^8.5.6
- react 19.1.0
- react-day-picker ^9.11.1
- react-dom 19.1.0
- react-hook-form ^7.65.0
- react-hot-toast ^2.6.0
- react-howler ^5.2.0
- react-icons ^5.5.0
- react-pdf ^10.2.0
- react-toastify ^11.0.5
- react-use-measure ^2.1.7
- swr ^2.3.6
- tailwind-variants ^3.1.1
- zod ^4.1.12
- zustand ^5.0.8

Dev dependencies

- @tailwindcss/postcss ^4
- tailwindcss ^4.1.14

No es necesario instalarlas manualmente una por una: `npm install` leerá `package.json`/`package-lock.json` e instalará todo.

## Scripts

- `dev`: inicia Next.js en modo desarrollo con Turbopack en el puerto 3001
- `build`: compila la app con Turbopack
- `start`: sirve la build en el puerto 3001

## Notas de UI

- Modo de color conmutables (Oscuro/Claro/Papel) vía `ThemeSwitcher` usando `data-theme` en `<html>` y variables CSS.
- Paleta y componentes se adaptan al tema (texto, iconos, superficies, bordes) para buen contraste.

## Estructura básica

- `src/app/(main)/*`: páginas principales (Home, Search, Profile, Upload, Book Detail)
- `src/components/*`: componentes (Header, NavBar, Sidebar, BookCard, VoiceSelector, etc.)
- `src/data/mockData.js`: datos simulados alineados al esquema SQL proporcionado

## Login simplificado

- La pantalla `src/app/login/page.js` ahora permite ingresar únicamente el correo electrónico y presionar "Entrar".
- Se realiza una validación básica del formato del correo y se guarda de forma opcional en `localStorage` bajo la clave `loom:user_email` para simular sesión y luego redirigir al inicio.
