# CubePod MVP

CubePod es una plataforma mínima para lanzar y gestionar contenedores Docker desde una interfaz web, construida íntegramente para un hackathon.

## Stack tecnológico

* **Frontend:** Next.js, Tailwind CSS, Supabase Auth, xterm.js
* **Backend:** Go, `net/http` estándar, Docker SDK, autenticación JWT de Supabase
* **Base de datos:** PostgreSQL de Supabase

## Estructura

* `/backend`: La API en Go que se comunica con el daemon local de Docker y con el cliente web del frontend.
* `/frontend`: La aplicación web en Next.js para gestionar plantillas, pods y terminales web.

---

## Variables de entorno

### Frontend (`frontend/.env.local`)

| Variable | Descripción | Ejemplo |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | URL del servidor backend (Go API) | `http://localhost:8080` |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto de Supabase | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública (anon) de Supabase | `eyJ...` |

### Backend (`backend/.env`)

| Variable | Descripción | Ejemplo |
|---|---|---|
| `PORT` | Puerto en el que escucha el servidor | `8080` |
| `SUPABASE_JWT_SECRET` | Secreto JWT de Supabase para verificar tokens | `tu-secreto` |
| `DATABASE_URL` | URL de conexión a la base de datos PostgreSQL | `postgres://...` |

---

## Instrucciones de configuración

### 1. Supabase

1. Crea un proyecto en [Supabase](https://supabase.com).
2. Ve al editor SQL y ejecuta los comandos de `schema.sql` (en la raíz del proyecto).
3. Guarda la **URL**, la **clave Anon** y el **secreto JWT** de tu proyecto.

### 2. Backend

> Requiere Docker en ejecución en tu máquina.

```bash
cd backend
cp .env.example .env
# Edita .env con tu secreto JWT de Supabase y la URL de la DB
go mod tidy
go run cmd/server/main.go
```

El servidor arrancará en `http://localhost:8080` (configurable con `PORT`).

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local
# Edita .env.local con las claves de Supabase y la URL del backend
npm install
npm run dev
```

La aplicación arrancará en `http://localhost:3000`.

> **Nota:** Si cambias el puerto del backend, actualiza `NEXT_PUBLIC_API_URL` en `frontend/.env.local`.
