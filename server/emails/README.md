# MAKWIN Email Templates

Esta carpeta contiene la implementación mínima para dejar listos los emails oficiales de MAKWIN.

## Estructura

- `server/emails/index.ts` — helper ligero para leer y previsualizar plantillas.
- `server/emails/templates/` — plantillas genéricas reutilizables.
- `server/emails/supabase_templates/` — HTML listo para pegar en Supabase Auth Templates.

## Objetivo

No se crea un servicio de email nuevo. El flujo debe quedar:

Supabase Auth → SMTP Resend → Emails oficiales MAKWIN.

## Uso

### Previsualizar plantilla

```bash
node -e "import { previewTemplate } from './server/emails/index.ts'; console.log(previewTemplate('confirm-email', true));"
```

### Plantillas Supabase

Para la integración real, copia el contenido de los archivos en `server/emails/supabase_templates/` y pégalos en Supabase Console → Authentication → Templates.

La notificación nativa de cambio de contraseña usa `security_templates/password-changed.html` y su asunto localizado está en `security_templates/password-changed.subject.txt`. Ambos usan `user_metadata.language_preference` (`es` por defecto, `en` para inglés); Settings y el flujo de restablecimiento incluyen el idioma efectivo en la misma actualización de usuario que cambia la contraseña.

## Variables compatibles

- Confirmación: `{{ .ConfirmationURL }}`
- Reset password: `{{ .RecoveryURL }}`
- Magic link / Action: `{{ .ActionURL }}`
- Site URL: `{{ .SiteURL }}`

## Notas de uso

- Las plantillas en `server/emails/supabase_templates/` están hechas para pegar en Supabase Authentication → Templates.
- La plantilla `security-notification.html` es una plantilla transaccional adicional; no forma parte del flujo de email auth nativo de Supabase. Puedes usarla en cualquier backend o servicio de notificaciones cuando necesites enviar alertas de seguridad.

## Nota de seguridad

No añadir lógica de autenticación adicional ni hooks de eventos. Esta carpeta es solo para branding y plantillas.
