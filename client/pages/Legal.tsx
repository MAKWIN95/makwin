import { Fragment, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Segmented from '@/components/Segmented';
import { useI18n } from '@/lib/i18n';
import { LEGAL_OWNER } from '@/lib/legal-owner';
import { LEGAL_DOCS, LEGAL_TEXTS, type LegalBlock, type LegalDoc } from '@/lib/legal-texts';

// One of the four legal pages, with a switch to move between them.

function Filled({ text, es }: { text: string; es: boolean }) {
  const parts = text.split(/(\{name\}|\{taxId\}|\{address\}|\{email\})/);
  return (
    <>
      {parts.map((part, i) => {
        const key = part.match(/^\{(name|taxId|address|email)\}$/)?.[1] as keyof typeof LEGAL_OWNER | undefined;
        if (!key) return <Fragment key={i}>{part}</Fragment>;
        const value = LEGAL_OWNER[key];
        if (!value) {
          return (
            <span key={i} className="rounded px-1.5 py-0.5 text-[0.85em] bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
              {es ? 'pendiente' : 'pending'}
            </span>
          );
        }
        if (key === 'email') {
          return (
            <a key={i} href={`mailto:${value}`} className="underline underline-offset-2 hover:text-[hsl(var(--foreground))] transition-colors">
              {value}
            </a>
          );
        }
        return <Fragment key={i}>{value}</Fragment>;
      })}
    </>
  );
}

function Block({ block, es }: { block: LegalBlock; es: boolean }): ReactNode {
  if ('h' in block) {
    return <h2 className="text-lg font-semibold text-[hsl(var(--foreground))] mt-10 mb-3">{block.h}</h2>;
  }
  if ('p' in block) {
    return <p className="mb-4"><Filled text={block.p} es={es} /></p>;
  }
  if ('ul' in block) {
    return (
      <ul className="mb-4 space-y-2 pl-5 list-disc marker:text-[hsl(var(--muted-foreground)/0.6)]">
        {block.ul.map((item) => <li key={item}><Filled text={item} es={es} /></li>)}
      </ul>
    );
  }
  return (
    <div className="mb-4 overflow-x-auto rounded-xl border border-[hsl(var(--border))]">
      <table className="w-full text-sm">
        <thead className="bg-[hsl(var(--muted)/0.5)] text-left text-[hsl(var(--foreground))]">
          <tr>{block.table.head.map((cell) => <th key={cell} className="px-3 py-2 font-medium">{cell}</th>)}</tr>
        </thead>
        <tbody>
          {block.table.rows.map((row) => (
            <tr key={row[0]} className="border-t border-[hsl(var(--border))]">
              {row.map((cell, i) => <td key={i} className={i === 0 ? 'px-3 py-2 font-mono text-xs text-[hsl(var(--foreground))]' : 'px-3 py-2'}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Legal({ doc, bare = false }: { doc: LegalDoc; bare?: boolean }) {
  const { language } = useI18n();
  const es = language === 'es';
  const navigate = useNavigate();
  const texts = LEGAL_TEXTS[es ? 'es' : 'en'];
  const text = texts[doc];
  const updated = new Date(`${LEGAL_OWNER.updated}T12:00:00`).toLocaleDateString(es ? 'es-ES' : 'en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  useEffect(() => {
    document.title = `${text.title} · MAKWIN`;
    return () => { document.title = 'MAKWIN'; };
  }, [text.title]);

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      {bare ? (
        <div className="pt-8 text-center">
          {/* A full load, so makwin.art goes back to its own front page. */}
          <a href="/" className="text-xl font-bold tracking-[0.3em] text-[hsl(var(--foreground))]">MAKWIN</a>
        </div>
      ) : (
        <Header hideSearch />
      )}
      <main className="w-full max-w-2xl mx-auto px-4 pt-10 pb-16 page-enter">
        <Segmented
          label={es ? 'Documentos legales' : 'Legal documents'}
          value={doc}
          onChange={(next) => navigate(`/${next}`, { replace: true })}
          options={LEGAL_DOCS.map((value) => ({ value, label: texts[value].short }))}
          className="segmented--snug mb-8"
        />
        <article key={doc} className="page-enter text-[15px] leading-relaxed text-[hsl(var(--muted-foreground))]">
          <h1 className="text-3xl font-bold text-[hsl(var(--foreground))] mb-2">{text.title}</h1>
          <p className="text-xs mb-6">{es ? `Actualizado el ${updated}` : `Updated ${updated}`}</p>
          <p className="text-base text-[hsl(var(--foreground))] mb-2">{text.intro}</p>
          {text.blocks.map((block, i) => <Block key={i} block={block} es={es} />)}
        </article>
      </main>
      {!bare && <Footer />}
    </div>
  );
}
