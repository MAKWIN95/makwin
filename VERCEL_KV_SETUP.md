# Configuración de Vercel KV

# Configuración de Upstash Redis (para Vercel KV)

## ¿Qué es Upstash Redis?
Upstash es un proveedor de Redis serverless que Vercel integra directamente. Es gratuito y proporciona persistencia confiable para datos.

1. **Accede a tu proyecto en Vercel**

### Opción 1: Directamente desde Vercel (Recomendado)

1. **Accede a tu proyecto en Vercel**
   - Ve a https://vercel.com/dashboard
   - Selecciona tu proyecto "makwin"
   - Ve a la pestaña **"Storage"**

2. **Crear base de datos Redis**
   - Busca **"Upstash"** en el Marketplace
   - O ve a: **Storage** → **Browse Marketplace** → busca **"Upstash"** → **Redis**
   - Haz clic en **"Create"** o **"Connect"**

3. **Autentica con Upstash**
   - Si no tienes cuenta, crea una (es gratis)
   - Autoriza que Vercel acceda a tu cuenta de Upstash

4. **Crea la base de datos**
   - Nombre: "makwin-submissions" (o similar)
   - Región: la más cercana a ti
   - Haz clic en **Create**

5. **Variables de entorno automáticas**
   - Vercel automáticamente añadirá a tu proyecto:
     - `UPSTASH_REDIS_REST_URL`
     - `UPSTASH_REDIS_REST_TOKEN`
   - (Nota: en nuestro código usamos `@vercel/kv` que automáticamente detecta estas variables)

### Opción 2: Desde Upstash directamente (alternativa)

1. Ve a https://console.upstash.com
2. Crea una nueva base de datos Redis
3. Copia las credenciales y añádelas manualmente a Vercel:
   - **Settings** → **Environment Variables**
   - Añade:
     - `UPSTASH_REDIS_REST_URL=<tu-url>`
     - `UPSTASH_REDIS_REST_TOKEN=<tu-token>`

## Pasos finales:

4. **Re-deploy tu aplicación**
   ```bash
   vercel --prod
   ```

5. **Prueba**
   - Envía una obra desde el formulario
   - Accede a admin y verifica que aparezca en la lista
   - Publica/deniega una obra
   - El artista debe recibir un email


- Las variables de entorno se inyectarán automáticamente
- El código usa `@vercel/kv` que funciona con Upstash Redis
- No necesitas cambiar nada en el código

## Verificación manual (después de setup)

- Accede al panel de admin (con la contraseña)
- Deberías ver la obra nueva en la lista (sin necesidad de refrescar manualmente)
- Prueba publicar/denegar una obra
- El artista debería recibir un email de confirmación

## Troubleshooting

**"Error: Cannot connect to KV"**
- Verifica que las variables `UPSTASH_REDIS_*` estén en Vercel
- Espera unos minutos después de crear la DB
- Re-deploy: `vercel --prod`

**"Submissions no aparecen en admin"**
- Revisa los logs: **Vercel** → **Functions** → logs de `/api/get-submissions`
- Verifica que Redis esté conectada
**"No recibo emails"**
Si los emails no se envían:
- Revisa spam/promotions en tu email
- Revisa los logs de `/api/publish-work` y `/api/reject-work`
