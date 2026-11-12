// Regenerates the Supabase Auth email templates from the shared MAKWIN layout:
//   node scripts/build-auth-emails.ts
// Paste each result into Supabase → Authentication → Emails. Every template
// holds both languages and picks one from the user's language_preference.
import fs from 'node:fs';
import path from 'node:path';
import { renderTemplateEmail } from '../server/lib/email-layout.ts';
import { AUTH_EMAILS as templates } from '../server/lib/auth-email-copy.ts';

// printf keeps the comparison safe for accounts without a saved language.
const byLanguage = (es: string, en: string) => `{{ if eq (printf "%v" .Data.language_preference) "en" }}${en}{{ else }}${es}{{ end }}`;

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
