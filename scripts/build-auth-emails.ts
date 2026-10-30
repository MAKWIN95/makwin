// Regenerates the Supabase Auth email templates from the shared MAKWIN layout:
//   node scripts/build-auth-emails.ts
// Paste each result into Supabase → Authentication → Emails. Every template
// holds both languages and picks one from the user's language_preference.
import fs from 'node:fs';
import path from 'node:path';
import { renderTemplateEmail, type EmailBlock, type EmailLanguage } from '../server/lib/email-layout.ts';

interface Copy {
  subject: string;
  title: string;
  preheader: string;
  blocks: EmailBlock[];
}

const linkIntro = { es: 'Si el botón no funciona, copia este enlace en tu navegador:', en: 'If the button does not work, copy this link into your browser:' };
const notYou = {
  es: 'Si no has sido tú, escríbenos desde Ayuda y contacto en la web de MAKWIN.',
  en: 'If this was not you, write to us from Help & Contact on the MAKWIN website.',
};

function action(language: EmailLanguage, url: string, label: string, text: string, ignore: string): EmailBlock[] {
  return [
    { type: 'text', text },
    { type: 'button', label, url },
    { type: 'link', intro: linkIntro[language], url },
    { type: 'note', text: ignore },
  ];
}

function notice(language: EmailLanguage, text: string): EmailBlock[] {
  return [{ type: 'text', text }, { type: 'note', text: notYou[language] }];
}

const templates: Record<string, Record<EmailLanguage, Copy>> = {
  'confirm-email': {
    es: {
      subject: 'Confirma tu correo en MAKWIN',
      title: 'Confirma tu correo',
      preheader: 'Un último paso para activar tu cuenta de MAKWIN.',
      blocks: action('es', '{{ .ConfirmationURL }}', 'CONFIRMAR CORREO', 'Te damos la bienvenida a MAKWIN. Confirma tu dirección para activar tu cuenta y empezar a descubrir y compartir obras.', 'Si no has creado esta cuenta, puedes ignorar este mensaje.'),
    },
    en: {
      subject: 'Confirm your email on MAKWIN',
      title: 'Confirm your email',
      preheader: 'One last step to activate your MAKWIN account.',
      blocks: action('en', '{{ .ConfirmationURL }}', 'CONFIRM EMAIL', 'Welcome to MAKWIN. Confirm your address to activate your account and start discovering and sharing works.', 'If you did not create this account, you can ignore this message.'),
    },
  },
  'reset-password': {
    es: {
      subject: 'Restablece tu contraseña de MAKWIN',
      title: 'Restablece tu contraseña',
      preheader: 'Crea una contraseña nueva para tu cuenta de MAKWIN.',
      blocks: action('es', '{{ .ConfirmationURL }}', 'CREAR CONTRASEÑA NUEVA', 'Hemos recibido una solicitud para cambiar la contraseña de tu cuenta. El enlace caduca en una hora y solo se puede usar una vez.', 'Si no lo has pedido tú, ignora este mensaje: tu contraseña no cambiará.'),
    },
    en: {
      subject: 'Reset your MAKWIN password',
      title: 'Reset your password',
      preheader: 'Create a new password for your MAKWIN account.',
      blocks: action('en', '{{ .ConfirmationURL }}', 'CREATE NEW PASSWORD', 'We received a request to change your account password. This link expires in one hour and can only be used once.', 'If you did not ask for this, ignore this message: your password will not change.'),
    },
  },
  'magic-link': {
    es: {
      subject: 'Tu enlace para entrar en MAKWIN',
      title: 'Entra en MAKWIN',
      preheader: 'Tu enlace de acceso, válido una sola vez.',
      blocks: action('es', '{{ .ConfirmationURL }}', 'ENTRAR', 'Usa este enlace para iniciar sesión. Caduca en una hora y solo se puede usar una vez.', 'Si no lo has pedido tú, puedes ignorar este mensaje.'),
    },
    en: {
      subject: 'Your link to sign in to MAKWIN',
      title: 'Sign in to MAKWIN',
      preheader: 'Your one-time sign-in link.',
      blocks: action('en', '{{ .ConfirmationURL }}', 'SIGN IN', 'Use this link to sign in. It expires in one hour and can only be used once.', 'If you did not ask for this, you can ignore this message.'),
    },
  },
  invite: {
    es: {
      subject: 'Te han invitado a MAKWIN',
      title: 'Te damos la bienvenida a MAKWIN',
      preheader: 'Acepta la invitación para crear tu cuenta.',
      blocks: action('es', '{{ .ConfirmationURL }}', 'ACEPTAR INVITACIÓN', 'Te han invitado a unirte a MAKWIN. Acepta la invitación para crear tu cuenta.', 'Si no esperabas esta invitación, puedes ignorar este mensaje.'),
    },
    en: {
      subject: 'You have been invited to MAKWIN',
      title: 'Welcome to MAKWIN',
      preheader: 'Accept the invitation to create your account.',
      blocks: action('en', '{{ .ConfirmationURL }}', 'ACCEPT INVITATION', 'You have been invited to join MAKWIN. Accept the invitation to create your account.', 'If you were not expecting this invitation, you can ignore this message.'),
    },
  },
  'change-email': {
    es: {
      subject: 'Confirma tu nuevo correo en MAKWIN',
      title: 'Confirma tu nuevo correo',
      preheader: 'Confirma el cambio de dirección de tu cuenta.',
      blocks: action('es', '{{ .ConfirmationURL }}', 'CONFIRMAR CAMBIO', 'Has pedido cambiar el correo de tu cuenta de {{ .Email }} a {{ .NewEmail }}. Confírmalo para terminar.', 'Si no lo has pedido tú, ignora este mensaje: tu correo no cambiará.'),
    },
    en: {
      subject: 'Confirm your new email on MAKWIN',
      title: 'Confirm your new email',
      preheader: 'Confirm the address change on your account.',
      blocks: action('en', '{{ .ConfirmationURL }}', 'CONFIRM CHANGE', 'You asked to change your account email from {{ .Email }} to {{ .NewEmail }}. Confirm it to finish.', 'If you did not ask for this, ignore this message: your email will not change.'),
    },
  },
  reauthentication: {
    es: {
      subject: 'Tu código de verificación de MAKWIN',
      title: 'Tu código de verificación',
      preheader: 'Usa este código para confirmar que eres tú.',
      blocks: [{ type: 'text', text: 'Introduce este código para confirmar que eres tú:' }, { type: 'quote', text: '{{ .Token }}' }, { type: 'note', text: 'Si no lo has pedido tú, puedes ignorar este mensaje.' }],
    },
    en: {
      subject: 'Your MAKWIN verification code',
      title: 'Your verification code',
      preheader: 'Use this code to confirm it is you.',
      blocks: [{ type: 'text', text: 'Enter this code to confirm it is you:' }, { type: 'quote', text: '{{ .Token }}' }, { type: 'note', text: 'If you did not ask for this, you can ignore this message.' }],
    },
  },
  'password-changed': {
    es: { subject: 'Tu contraseña de MAKWIN ha cambiado', title: 'Tu contraseña ha cambiado', preheader: 'La contraseña de tu cuenta se ha actualizado.', blocks: notice('es', 'La contraseña de tu cuenta de MAKWIN ({{ .Email }}) se acaba de actualizar. Si has sido tú, no tienes que hacer nada.') },
    en: { subject: 'Your MAKWIN password has changed', title: 'Your password has changed', preheader: 'Your account password has been updated.', blocks: notice('en', 'The password of your MAKWIN account ({{ .Email }}) has just been updated. If this was you, there is nothing else to do.') },
  },
  'email-changed': {
    es: { subject: 'El correo de tu cuenta de MAKWIN ha cambiado', title: 'Tu correo ha cambiado', preheader: 'El correo de tu cuenta se ha actualizado.', blocks: notice('es', 'El correo de tu cuenta de MAKWIN ha pasado de {{ .OldEmail }} a {{ .Email }}.') },
    en: { subject: 'Your MAKWIN account email has changed', title: 'Your email has changed', preheader: 'Your account email has been updated.', blocks: notice('en', 'Your MAKWIN account email has changed from {{ .OldEmail }} to {{ .Email }}.') },
  },
  'phone-changed': {
    es: { subject: 'El teléfono de tu cuenta de MAKWIN ha cambiado', title: 'Tu teléfono ha cambiado', preheader: 'El teléfono de tu cuenta se ha actualizado.', blocks: notice('es', 'El teléfono de tu cuenta de MAKWIN ({{ .Email }}) se ha actualizado.') },
    en: { subject: 'Your MAKWIN account phone has changed', title: 'Your phone has changed', preheader: 'Your account phone has been updated.', blocks: notice('en', 'The phone number on your MAKWIN account ({{ .Email }}) has been updated.') },
  },
  'signin-linked': {
    es: { subject: 'Nuevo método de acceso en tu cuenta de MAKWIN', title: 'Nuevo método de acceso', preheader: 'Se ha vinculado un método de acceso a tu cuenta.', blocks: notice('es', 'Se ha vinculado {{ .Provider }} como método de acceso a tu cuenta de MAKWIN ({{ .Email }}).') },
    en: { subject: 'New sign-in method on your MAKWIN account', title: 'New sign-in method', preheader: 'A sign-in method was linked to your account.', blocks: notice('en', '{{ .Provider }} has been linked as a sign-in method for your MAKWIN account ({{ .Email }}).') },
  },
  'signin-removed': {
    es: { subject: 'Método de acceso eliminado de tu cuenta de MAKWIN', title: 'Método de acceso eliminado', preheader: 'Se ha quitado un método de acceso de tu cuenta.', blocks: notice('es', 'Se ha quitado {{ .Provider }} como método de acceso de tu cuenta de MAKWIN ({{ .Email }}).') },
    en: { subject: 'Sign-in method removed from your MAKWIN account', title: 'Sign-in method removed', preheader: 'A sign-in method was removed from your account.', blocks: notice('en', '{{ .Provider }} has been removed as a sign-in method from your MAKWIN account ({{ .Email }}).') },
  },
  'mfa-added': {
    es: { subject: 'Verificación en dos pasos activada en MAKWIN', title: 'Verificación en dos pasos activada', preheader: 'Se ha añadido un método de verificación a tu cuenta.', blocks: notice('es', 'Se ha añadido un método de verificación en dos pasos a tu cuenta de MAKWIN ({{ .Email }}).') },
    en: { subject: 'Two-step verification enabled on MAKWIN', title: 'Two-step verification enabled', preheader: 'A verification method was added to your account.', blocks: notice('en', 'A two-step verification method has been added to your MAKWIN account ({{ .Email }}).') },
  },
  'mfa-removed': {
    es: { subject: 'Verificación en dos pasos eliminada en MAKWIN', title: 'Verificación en dos pasos eliminada', preheader: 'Se ha quitado un método de verificación de tu cuenta.', blocks: notice('es', 'Se ha quitado un método de verificación en dos pasos de tu cuenta de MAKWIN ({{ .Email }}).') },
    en: { subject: 'Two-step verification removed on MAKWIN', title: 'Two-step verification removed', preheader: 'A verification method was removed from your account.', blocks: notice('en', 'A two-step verification method has been removed from your MAKWIN account ({{ .Email }}).') },
  },
};

const byLanguage = (es: string, en: string) => `{{ if eq .Data.language_preference "en" }}${en}{{ else }}${es}{{ end }}`;

const outDir = path.resolve(import.meta.dirname, '../server/emails/supabase_templates');
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

for (const [name, copy] of Object.entries(templates)) {
  const html = byLanguage(
    renderTemplateEmail({ language: 'es', title: copy.es.title, preheader: copy.es.preheader, blocks: copy.es.blocks }),
    renderTemplateEmail({ language: 'en', title: copy.en.title, preheader: copy.en.preheader, blocks: copy.en.blocks }),
  );
  fs.writeFileSync(path.join(outDir, `${name}.html`), `${html}\n`);
  fs.writeFileSync(path.join(outDir, `${name}.subject.txt`), `${byLanguage(copy.es.subject, copy.en.subject)}\n`);
}
console.log(`Wrote ${Object.keys(templates).length} templates to ${outDir}`);
