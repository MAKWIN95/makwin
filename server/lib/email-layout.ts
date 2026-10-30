// The one visual language of every MAKWIN email: white, editorial, generous
// spacing and the bolt as a text glyph, so nothing depends on remote images.
// Table-based with inline styles because that is all Gmail and Outlook keep.

export type EmailLanguage = 'es' | 'en';

export type EmailBlock =
  | { type: 'text'; text: string }
  | { type: 'button'; label: string; url: string }
  | { type: 'link'; intro: string; url: string }
  | { type: 'details'; rows: Array<[string, string]> }
  | { type: 'quote'; text: string }
  | { type: 'note'; text: string };

export interface EmailContent {
  language: EmailLanguage;
  title: string;
  preheader: string;
  blocks: EmailBlock[];
  // A person wrote this one and answers will be read.
  personal?: boolean;
}

const INK = '#111111';
const BODY = '#3d3d3d';
const MUTED = '#8a8a8a';
const HAIRLINE = '#ececec';
const SANS = "-apple-system,BlinkMacSystemFont,'Helvetica Neue',Helvetica,Arial,sans-serif";
const SERIF = "Georgia,'Times New Roman',Times,serif";

const FOOTER: Record<EmailLanguage, { tagline: string; legal: string; personal: string }> = {
  es: {
    tagline: 'Arte real, experiencias reales, conexiones reales.',
    legal: 'Correo automático de MAKWIN.',
    personal: 'Puedes responder a este correo para seguir la conversación.',
  },
  en: {
    tagline: 'Real art, real experiences, real connections.',
    legal: 'Automated email from MAKWIN.',
    personal: 'You can reply to this email to continue the conversation.',
  },
};

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Auth templates carry Go placeholders such as {{ .ConfirmationURL }}, which must survive untouched.
type Escape = (value: unknown) => string;

function paragraph(html: string, color = BODY, size = 16, margin = 20): string {
  return `<p style="margin:0 0 ${margin}px;font-family:${SANS};font-size:${size}px;line-height:1.65;color:${color};">${html}</p>`;
}

function renderBlock(block: EmailBlock, esc: Escape): string {
  switch (block.type) {
    case 'text':
      return paragraph(esc(block.text).replace(/\n/g, '<br>'));
    case 'button':
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0 32px;"><tr><td bgcolor="${INK}" style="background-color:${INK};border-radius:2px;"><a href="${esc(block.url)}" target="_blank" style="display:inline-block;padding:15px 34px;font-family:${SANS};font-size:13px;font-weight:600;letter-spacing:0.08em;color:#ffffff;text-decoration:none;">${esc(block.label)}</a></td></tr></table>`;
    case 'link':
      return paragraph(
        `${esc(block.intro)}<br><a href="${esc(block.url)}" target="_blank" style="color:${MUTED};text-decoration:underline;word-break:break-all;">${esc(block.url)}</a>`,
        MUTED,
        13,
      );
    case 'details':
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 28px;border-top:1px solid ${HAIRLINE};">${block.rows
        .map(
          ([label, value]) =>
            `<tr><td style="padding:12px 16px 12px 0;border-bottom:1px solid ${HAIRLINE};font-family:${SANS};font-size:12px;letter-spacing:0.06em;color:${MUTED};white-space:nowrap;vertical-align:top;">${esc(label)}</td><td style="padding:12px 0;border-bottom:1px solid ${HAIRLINE};font-family:${SANS};font-size:14px;line-height:1.5;color:${INK};word-break:break-word;">${esc(value)}</td></tr>`,
        )
        .join('')}</table>`;
    case 'quote':
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 28px;"><tr><td style="padding:2px 0 2px 20px;border-left:1px solid ${INK};font-family:${SERIF};font-size:16px;line-height:1.7;color:${INK};word-break:break-word;">${esc(block.text).replace(/\n/g, '<br>')}</td></tr></table>`;
    case 'note':
      return paragraph(esc(block.text).replace(/\n/g, '<br>'), MUTED, 13);
  }
}

function renderBlockText(block: EmailBlock): string {
  switch (block.type) {
    case 'text':
    case 'note':
      return block.text;
    case 'button':
      return `${block.label}: ${block.url}`;
    case 'link':
      return '';
    case 'details':
      return block.rows.map(([label, value]) => `${label}: ${value}`).join('\n');
    case 'quote':
      return block.text
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n');
  }
}

function renderHtml(content: EmailContent, esc: Escape): string {
  const footer = FOOTER[content.language];
  return `<!doctype html>
<html lang="${content.language}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${esc(content.title)}</title>
<style>:root{color-scheme:light only;supported-color-schemes:light only}@media only screen and (max-width:620px){.mk-pad{padding-left:24px!important;padding-right:24px!important}.mk-title{font-size:26px!important}}</style>
</head>
<body style="margin:0;padding:0;background-color:#ffffff;-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#ffffff;">${esc(content.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="background-color:#ffffff;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
<tr><td class="mk-pad" style="padding:56px 48px 40px;">
<span style="font-family:${SERIF};font-size:22px;line-height:1;color:${INK};">&#991;</span><span style="padding-left:10px;font-family:${SANS};font-size:13px;font-weight:700;letter-spacing:0.32em;color:${INK};">MAKWIN</span>
</td></tr>
<tr><td class="mk-pad" style="padding:0 48px 24px;">
<h1 class="mk-title" style="margin:0 0 24px;font-family:${SERIF};font-size:30px;font-weight:400;line-height:1.25;letter-spacing:-0.01em;color:${INK};">${esc(content.title)}</h1>
${content.blocks.map((block) => renderBlock(block, esc)).join('\n')}
</td></tr>
<tr><td class="mk-pad" style="padding:0 48px 56px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:1px solid ${HAIRLINE};padding-top:24px;font-family:${SANS};font-size:12px;line-height:1.7;color:${MUTED};">
${esc(footer.tagline)}<br>${esc(content.personal ? footer.personal : footer.legal)}
</td></tr></table>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export function renderEmail(content: EmailContent): { html: string; text: string } {
  const footer = FOOTER[content.language];
  const text = [
    'MAKWIN',
    content.title,
    ...content.blocks.map(renderBlockText).filter(Boolean),
    `--\n${footer.tagline}\n${content.personal ? footer.personal : footer.legal}`,
  ].join('\n\n');
  return { html: renderHtml(content, escapeHtml), text };
}

// For Supabase Auth templates: values are our own copy plus Go placeholders.
export function renderTemplateEmail(content: EmailContent): string {
  return renderHtml(content, (value) => String(value ?? ''));
}
