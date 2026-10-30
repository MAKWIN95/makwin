# Correos de MAKWIN

Todos los correos comparten el diseño de `server/lib/email-layout.ts`.

- **Correos de la API** (ayuda, obras, reportes, baja de cuenta): `server/lib/email.ts`. Solo Resend y solo el remitente de `RESEND_FROM`.
- **Correos de Supabase Auth** (confirmación, contraseña, avisos de seguridad): `supabase_templates/`, generados con `node scripts/build-auth-emails.ts`. Supabase los envía por el SMTP de Resend.

Las plantillas de Supabase llevan los dos idiomas y eligen según `user_metadata.language_preference` (`es` por defecto). Se pegan en Supabase → Authentication → Emails.
