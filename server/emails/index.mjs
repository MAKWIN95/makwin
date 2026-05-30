import fs from 'fs';
import path from 'path';

const BASE_DIR = path.join(process.cwd(), 'server', 'emails');
const TEMPLATES_DIR = path.join(BASE_DIR, 'templates');
const SUPABASE_TEMPLATES_DIR = path.join(BASE_DIR, 'supabase_templates');

export const TEMPLATE_NAMES = [
  'confirm-email',
  'reset-password',
  'magic-link',
  'security-notification',
];

export function readTemplate(name, supabase = false) {
  const dir = supabase ? SUPABASE_TEMPLATES_DIR : TEMPLATES_DIR;
  const file = path.join(dir, `${name}.html`);
  return fs.readFileSync(file, 'utf8');
}

export function listTemplates(supabase = false) {
  const dir = supabase ? SUPABASE_TEMPLATES_DIR : TEMPLATES_DIR;
  return fs.readdirSync(dir).filter((file) => file.endsWith('.html'));
}

export function previewTemplate(name, supabase = false) {
  return readTemplate(name, supabase);
}
