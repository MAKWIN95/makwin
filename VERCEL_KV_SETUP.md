# Configuración de Vercel/Upstash Redis

## ¿Qué es Upstash Redis?
Upstash es un proveedor de Redis serverless que Vercel integra directamente. Es gratuito y proporciona persistencia confiable para datos.

## Variables utilizadas por la aplicación

MAKWIN usa Redis como almacenamiento persistente de submissions y estados de moderación.

El cliente compartido en [server/lib/redis.ts](./server/lib/redis.ts) requiere únicamente:

- `STORAGE_KV_REST_API_URL`
- `STORAGE_KV_REST_API_TOKEN`

La variable `STORAGE_KV_REST_API_READ_ONLY_TOKEN` no se utiliza porque la aplicación necesita ejecutar `SET` y `DEL` además de lecturas.

No se utilizan `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `KV_REST_API_*`, `KV_URL` ni `STORAGE_REDIS_URL` como fallback.

## Datos y operaciones

- Las submissions se guardan con keys `YYYY-obra-N`.
- No se aplica TTL.
- El listado acepta cualquier año de cuatro dígitos y filtra con el formato `^\d{4}-obra-\d+$`.
- `work-action` mantiene las operaciones de publicación, rechazo, archivado, eliminación y republicación.

## Verificación en Vercel

Las dos variables anteriores deben estar disponibles para el entorno Production del proyecto Vercel. Sus valores no deben registrarse ni incluirse en el repositorio.

No es necesario crear otra base de datos ni generar tokens manuales.
