// Who runs MAKWIN, as Spanish law requires it to be shown (LSSI art. 10 and GDPR art. 13).
// The owner types name, tax id and address straight into Vercel (VITE_LEGAL_NAME,
// VITE_LEGAL_TAX_ID, VITE_LEGAL_ADDRESS), so they never pass through a chat or the code.
// A missing name shows as "pending"; a missing tax id or address is simply left out.

export const LEGAL_OWNER = {
  /** Full legal name of the person (or company) behind MAKWIN. */
  name: (import.meta.env.VITE_LEGAL_NAME as string | undefined)?.trim() ?? '',
  /** NIF / DNI (or CIF for a company). */
  taxId: (import.meta.env.VITE_LEGAL_TAX_ID as string | undefined)?.trim() ?? '',
  /** Postal address for legal notices. */
  address: (import.meta.env.VITE_LEGAL_ADDRESS as string | undefined)?.trim() ?? '',
  /** Address people write to for privacy, legal and content matters. */
  email: 'help@makwin.art',
  /** Day the texts were last changed, shown at the top of each page. */
  updated: '2026-11-12',
};
