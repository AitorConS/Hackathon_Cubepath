# CubePod Frontend

Aplicación web en Next.js para CubePod. Proporciona la interfaz para gestionar plantillas, pods, terminales y túneles.

## Páginas

| Ruta | Descripción |
|---|---|
| `/login` | Autenticación (Supabase Auth) |
| `/dashboard` | Vista general |
| `/pods` | Listado y gestión del ciclo de vida de pods |
| `/templates` | Gestión de plantillas de contenedores |
| `/tunnels` | Gestión de túneles |

## Desarrollo

```bash
npm install
npm run dev
```

La aplicación arranca en `http://localhost:3000`.

## Variables de entorno

Crea un archivo `.env.local` en la raíz de este directorio:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## Build

```bash
npm run build
npm start
```
