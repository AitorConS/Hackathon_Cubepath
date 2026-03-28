# CubePod

CubePod es una plataforma web para lanzar y gestionar contenedores Docker desde el navegador. Permite crear plantillas de contenedores, gestionar el ciclo de vida de los pods, acceder a terminales web y configurar túneles.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js, Tailwind CSS, xterm.js | 
| Backend | Go, `net/http` estándar, Docker SDK |
| Autenticación | Supabase Auth (JWT) |
| Base de datos | PostgreSQL (Supabase) |

Pd: Tuve un poco de asistencia de Claude, sobretodo en el front 😅

## Estructura del proyecto

```
/               — Backend en Go (servidor API)
/frontend       — Aplicación web en Next.js
/SQL            — Esquema de la base de datos
```

---

## Configuración

### 1. Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Ejecuta el contenido de `SQL/schema.sql` y `SQL/add_tunnels.sql` en el editor SQL de Supabase.
3. Copia la **URL del proyecto**, la **clave Anon** y el **secreto JWT** desde los ajustes del proyecto.

### 2. Backend

> Requiere Docker en ejecución en la máquina host.

```bash
cp .env.example .env
# Rellena SUPABASE_JWT_SECRET y DATABASE_URL
go mod tidy
go run cmd/server/main.go
```

El servidor arranca en `http://localhost:8080` (configurable con `PORT`).

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local
# Rellena las claves de Supabase y la URL del backend
npm install
npm run dev
```

La aplicación arranca en `http://localhost:3000`.

---

## Variables de entorno

### Frontend (`frontend/.env.local`)

| Variable | Descripción | Ejemplo |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | URL del backend | `http://localhost:8080` |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto de Supabase | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anon de Supabase | `eyJ...` |

### Backend (`.env`)

| Variable | Descripción | Ejemplo |
|---|---|---|
| `PORT` | Puerto en el que escucha el servidor | `8080` |
| `SUPABASE_JWT_SECRET` | Secreto JWT para verificar tokens | `tu-secreto` |
| `DATABASE_URL` | Cadena de conexión a PostgreSQL | `postgres://...` |
