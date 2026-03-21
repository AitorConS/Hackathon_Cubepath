# CubePod MVP

CubePod es una plataforma mínima para lanzar y gestionar contenedores Docker desde una interfaz web, construida íntegramente para un hackathon.

## Stack tecnológico

* **Frontend:** Next.js, Tailwind CSS, Supabase Auth, xterm.js
* **Backend:** Go, `net/http` estándar, Docker SDK, autenticación JWT de Supabase
* **Base de datos:** PostgreSQL de Supabase

## Estructura

* `/backend`: La API en Go que se comunica con el daemon local de Docker y con el cliente web del frontend.
* `/frontend`: La aplicación web en Next.js para gestionar plantillas, pods y terminales web.

## Instrucciones de configuración

### 1. Configuración de Supabase

1. Crea un proyecto en [Supabase](https://supabase.com).
2. Ve al editor SQL y ejecuta los comandos que se encuentran en `schema.sql` en la raíz de este proyecto.
3. Guarda tu URL de Supabase, la clave Anon y el secreto JWT.

### 2. Configuración del backend

El backend requiere que Docker esté ejecutándose en tu máquina.

```bash
cd backend
cp .env.example .env
# Edita .env y añade tu secreto JWT de Supabase
go mod tidy
go run cmd/server/main.go
```

El servidor se iniciará en `http://localhost:8080`.

### 3. Configuración del frontend

```bash
cd frontend
cp .env.example .env.local
# Edita .env.local con tu URL de Supabase y tu clave Anon
npm install
npm run dev
```

La aplicación se iniciará en `http://localhost:3000`.
