# 📧 Configuración de Envío de Emails - Makwin

⚠️ **ACTUALIZACIÓN IMPORTANTE (20 Mayo 2026)**

La infraestructura de email profesional de MAKWIN **ya está completamente desplegada y operativa**:

```
✅ Cloudflare Email Routing (recepción)
✅ Resend SMTP (envío verificado con dominio makwin.art)
✅ 5 direcciones activas: help@, contact@, business@, press@, no-reply@
✅ Gmail integrado como cliente manual (via SMTP alias)
```

Este documento es referencia histórica. **La arquitectura actual en SYSTEMS.md es la oficial.**

---

## 🚀 Cómo usar la infraestructura actual

### Para transaccional/automatizado (futuro backend)

Usar `no-reply@makwin.art` con Resend API:

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'no-reply@makwin.art',  // Dominio verificado
  to: user.email,
  subject: 'Asunto aquí',
  html: emailTemplate,
});
```

Variables necesarias en `.env`:
```
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM=no-reply@makwin.art
```

### Para soporte/manual

Usar `help@makwin.art`, `contact@makwin.art`, etc desde Gmail.

---

## ℹ️ Referencia histórica: Opciones que NO se usan

El contenido abajo es histórico. **No aplica - usar infraestructura anterior.**

---

### Opción actual: Usar Resend (RECOMENDADO)

1. **Crea una cuenta en [Resend.com](https://resend.com)**
2. **Obtén tu API Key** desde el dashboard de Resend
3. **Instala la dependencia**:
   ```bash
   npm install resend
   ```
4. **Añade a tu `.env`**:
   ```bash
   RESEND_API_KEY=re_xxxxxxxxxxxxx
   RESEND_FROM=no-reply@makwin.art
   ```
5. **En producción** el backend envía todos los mensajes desde Resend. No se usa SendGrid ni Mailgun.

## 📊 Estructura de datos guardados

Los envíos se guardan en `/submissions/` con el formato:
```
submissions/
├── 2025-obra-0001.json
├── 2025-obra-0002.json
└── ...
```

Cada archivo contiene:
```json
{
  "artistName": "Juan Pérez",
  "email": "juan@example.com",
  "workType": "pintura",
  "title": "Mi primera obra",
  "description": "Una descripción detallada...",
  "language": "es",
  "timestamp": "2025-11-15T10:30:00.000Z"
}
```

## 🔄 Flujo actual (en desarrollo)

1. Usuario envía el formulario en `/enviar-obra`
2. Datos se guardan en `/submissions/*.json`
3. En la consola se muestra un log con el formato del email
4. **En producción**: Se envía un email formateado a `sendtomakwin@gmail.com`

## ✅ Botón flotante

El botón de "Enviar obra" está disponible en la página principal (abajo a la izquierda, similar a la bombilla de tema).

- **Icono**: Upload (Lucide React)
- **Ubicación**: Fixed bottom-8 left-8
- **Tooltip**: "Enviar obra"

## 🧪 Testear localmente

```bash
# 1. Inicia el servidor en desarrollo
pnpm dev

# 2. Abre http://localhost:5173 (o el puerto configurado)

# 3. Haz clic en el botón flotante "Enviar obra"

# 4. Completa y envía el formulario

# 5. Revisa la carpeta `submissions/` - encontrarás un nuevo archivo JSON

# 6. En la consola verás el log del email que se enviaría
```

## 📝 Notas

- Los envíos se guardan **localmente en todos los casos**
- El email es **opcional** - si hay error en el servicio, la obra se guarda igual
- En desarrollo muestra un log, en producción se envía el email real
- El archivo `.env.example` tiene comentarios sobre cada opción

## 🔐 Seguridad

- Las claves de API se guardan en `.env` (nunca en el código)
- El archivo `.env` está en `.gitignore`
- Los datos de usuarios se guardan de forma privada

¿Necesitas ayuda para integrar algún servicio específico de email?
