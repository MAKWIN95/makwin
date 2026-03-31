import { useParams, Link } from 'react-router-dom';
import { useState, useMemo, useEffect } from 'react';
import { songs } from '@/lib/songs';
import Header from '@/components/Header';
import { useI18n } from '@/lib/i18n';
import type { TranslationKey } from '@/lib/i18n/translations';

export default function SongDetail() {
  const { id } = useParams<{ id: string }>();
  const [selectedAnnotationIndex, setSelectedAnnotationIndex] = useState<number | null>(null);
  const [viewVersion, setViewVersion] = useState<'original'|'translated'>('original');
  // support both legacy id-based routes and new slug-based routes
  const song = useMemo(() => songs.find(s => s.slug === id || s.id === id), [id]);
  const { t, language: currentLang } = useI18n();

  // Format date based on language (defensive: tolerate missing/invalid dates)
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return '';
    if (currentLang === 'es') {
      return date.toLocaleDateString('es', {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric'
      }).replace(/\//g, '-');
    }
    return date.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric'
    }).replace(/\//g, '-');
  };

  // Añadir manejador de clic global para cerrar anotaciones
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Si hay una anotación seleccionada y el clic no fue dentro de una anotación
      if (selectedAnnotationIndex !== null && 
          !target.closest('.annotation-popup') && 
          !target.closest('.annotation-trigger')) {
        setSelectedAnnotationIndex(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [selectedAnnotationIndex]);

  // A song has a translation if it has translations for the current UI language
  // and that language is different from the song's original language
  const hasTranslation = Boolean(
    song?.originalLanguage !== currentLang && 
    song?.translations?.[currentLang as 'en' | 'es']
  );

  // Get the content to display (either original or translated). Defensive: if song is undefined,
  // return empty values so rendering won't throw while the data resolves.
  const displayedContent = useMemo(() => {
    if (!song) return { title: '', description: '', lyrics: '', annotations: [] as any };

    // Si estamos en versión original o no hay traducciones, mostramos el contenido original
    if (viewVersion === 'original') {
      return {
        title: song.title,
        description: song.description,
        lyrics: song.lyrics,
        annotations: song.annotations
      };
    }

    // Obtenemos la traducción para el idioma actual de la UI
    const translation = song.translations?.[currentLang as 'en' | 'es'];
    if (!translation) {
      // Si no hay traducción para el idioma actual, volvemos al contenido original
      return {
        title: song.title,
        description: song.description,
        lyrics: song.lyrics,
        annotations: song.annotations
      };
    }

    // Si hay traducción, usamos el contenido traducido (incluyendo título traducido cuando esté presente)
    return {
      title: translation.title || song.title,
      description: translation.description,
      lyrics: translation.lyrics,
      annotations: translation.annotations
    };
  }, [song, viewVersion, currentLang]);
  const displayedLyrics = displayedContent.lyrics || '';
  const displayedAnnotations = displayedContent.annotations || [];

  if (!song) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))] flex flex-col items-center justify-center">
        <h1 className="text-2xl font-light text-[hsl(var(--foreground))] mb-4">{t('songNotFound')}</h1>
        <Link to="/" className="text-[hsl(var(--foreground))/0.6] hover:text-[hsl(var(--foreground))/0.95] transition-colors">
          {t('returnToHome')}
        </Link>
      </div>
    );
  }

  // Compute annotation positions based on the currently displayed lyrics (original or translated)
  const annotationPositions = useMemo(() => {
    try {
      const full = displayedLyrics || '';
      if (!full) return [] as any;
    const lines = full.split('\n');
    const lineStarts: number[] = [];
    let acc = 0;
    for (let i = 0; i < lines.length; i++) {
      lineStarts[i] = acc;
      acc += lines[i].length + 1;
    }

    const buildNormalized = (text: string) => {
      const normChars: string[] = [];
      const mapping: number[] = [];
      let i = 0;
      while (i < text.length) {
        const ch = text[i];
        if (/\s/.test(ch)) {
          mapping.push(i);
          normChars.push(' ');
          while (i < text.length && /\s/.test(text[i])) i++;
        } else {
          mapping.push(i);
          normChars.push(text[i]);
          i++;
        }
      }
      return { normalized: normChars.join(''), mapping };
    };

    const lowerFull = full.toLowerCase();
    const results = displayedAnnotations.map((ann, idx) => {
      // Usar la frase anotada que corresponda al idioma actual
      const phrase = (ann.phrase || ann.text || '').trim();
      const lowerPhrase = phrase.toLowerCase();
      
      // Buscar la frase tanto en el texto original como traducido para mayor flexibilidad
      const searchPhrases = [lowerPhrase];

      // Use a whitespace-tolerant regex search so phrases that span
      // line breaks or have different spacing still match reliably.
      const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      let start = -1;
      try {
        const pattern = escapeRegex(lowerPhrase).replace(/\s+/g, '\\s+');
        const re = new RegExp(pattern, 'i');
        const m = re.exec(lowerFull);
        if (m && typeof m.index === 'number') {
          start = m.index;
        }
      } catch (e) {
        // fallback to plain indexOf if regex fails for some reason
        start = lowerFull.indexOf(lowerPhrase);
      }

      if (start === -1) {
        // as a last resort try matching first few words
        const firstWords = lowerPhrase.split(/\s+/).slice(0, 6).join(' ');
        start = lowerFull.indexOf(firstWords);
      }

      if (start === -1) {
        return { idx, found: false };
      }

      const end = start + phrase.length - 1;
      let startLine = 0;
      while (startLine + 1 < lineStarts.length && lineStarts[startLine + 1] <= start) startLine++;
      let endLine = startLine;
      while (endLine + 1 < lineStarts.length && lineStarts[endLine + 1] <= end) endLine++;

      return {
        idx,
        found: true,
        start,
        end,
        startLine,
        endLine,
        startOffset: start - lineStarts[startLine],
        endOffset: end - lineStarts[endLine] + 1,
      } as const;
    });

      return results;
    } catch (e) {
      // If anything goes wrong during annotation parsing, fail gracefully and avoid crashing the page.
      // This prevents a malformed annotation payload from causing a blank page.
      // eslint-disable-next-line no-console
      console.error('annotationPositions parsing error', e);
      return [] as any;
    }
  }, [displayedLyrics, displayedAnnotations, viewVersion]);

  // No scroll animations

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <Header showSearch={false} breadcrumb={song.title} />
      
      <main className="max-w-4xl mx-auto px-6 sm:px-8 py-12 sm:py-16 page-enter">

        {/* Song Header */}
        <div className="mb-12 sm:mb-16">
          <div className="aspect-square max-w-xs mx-auto mb-8 overflow-hidden rounded-2xl glass-effect transition-all duration-700 ease-out hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.2)] relative group hover:border-transparent">
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(255,255,255,0.1),rgba(255,255,255,0.05))]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_50%,rgba(255,255,255,0.15),transparent)]" />
            </div>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-transform duration-1000 ease-out group-hover:translate-y-[60%] pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent blur-sm" />
            </div>
            <img
              src={song.coverUrl}
              alt={song.title}
              className="w-full h-full object-cover transition-all duration-700 ease-out group-hover:scale-[1.02]"
            />
          </div>

          <div className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-light tracking-tight text-[hsl(var(--foreground))] mb-3">
              {displayedContent.title}
            </h1>
            <p className="text-lg font-light text-[hsl(var(--foreground))/0.6] mb-2">
              {song.artist}
            </p>
            <p className="text-xs font-light text-[hsl(var(--foreground))/0.4] uppercase tracking-wider">
              {formatDate(song.releaseDate)}
            </p>

            {/* Version toggle (original / translated) */}
            <div className="flex items-center justify-center gap-3 mt-4">
              <button
                onClick={() => setViewVersion('original')}
                className={`px-3 py-1 rounded-md text-sm border transition flex items-center gap-2
                  ${viewVersion === 'original' 
                    ? 'bg-[hsl(var(--foreground))] text-[hsl(var(--background))] border-[hsl(var(--foreground))]' 
                    : 'border-[hsl(var(--foreground))/0.1] text-[hsl(var(--foreground))] hover:border-[hsl(var(--foreground))/0.2]'
                  }`}
              >
                {t('originalVersion')}
                {viewVersion === 'original' && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                )}
              </button>
              <button
                onClick={() => setViewVersion('translated')}
                disabled={!hasTranslation}
                className={`px-3 py-1 rounded-md text-sm border transition flex items-center gap-2
                  ${viewVersion === 'translated'
                    ? 'bg-[hsl(var(--foreground))] text-[hsl(var(--background))] border-[hsl(var(--foreground))]'
                    : 'border-[hsl(var(--foreground))/0.1] text-[hsl(var(--foreground))] hover:border-[hsl(var(--foreground))/0.2]'
                  }
                  ${!hasTranslation ? 'opacity-50 cursor-not-allowed hover:border-[hsl(var(--foreground))/0.1]' : ''}`}
                title={!hasTranslation ? t('noTranslationAvailable') : t('translatedVersion')}
              >
                {t('translatedVersion')}
                {viewVersion === 'translated' && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <p className="text-center text-base sm:text-lg font-light text-[hsl(var(--foreground))/0.7] leading-relaxed max-w-2xl mx-auto">
            {displayedContent.description}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-12">
          {/* Lyrics */}
          <div className="lg:col-span-2">
            <h2 className="text-xs font-light uppercase tracking-widest text-[hsl(var(--foreground))/0.6] mb-8">
              {t('lyrics')}
            </h2>
            <div className="space-y-6 sm:space-y-8">
              {displayedLyrics.split('\n').map((line, idx) => {
                const annIndexes = annotationPositions
                  .filter((p) => p.found && p.startLine <= idx && p.endLine >= idx)
                  .map((p) => p.idx);

                const renderLineContent = () => {
                  if (annIndexes.length === 0) {
                    return line;
                  }

                  const parts: JSX.Element[] = [];
                  let cursor = 0;

                    annIndexes.forEach((aIdx) => {
                    const pos = annotationPositions.find((p) => p.idx === aIdx)!;
                    // Use displayedAnnotations so translations work correctly
                    const ann = displayedAnnotations[aIdx];
                    const startOff = pos.startLine === idx ? pos.startOffset : 0;
                    const endOff = pos.endLine === idx ? pos.endOffset : line.length;

                    if (startOff > cursor) {
                      parts.push(<span key={`text-${cursor}`}>{line.slice(cursor, startOff)}</span>);
                    }

                    const matched = line.slice(startOff, endOff);
                    parts.push(
                      <button
                        key={`${idx}-${aIdx}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAnnotationIndex(selectedAnnotationIndex === aIdx ? null : aIdx);
                        }}
                        className="group relative inline annotation-trigger"
                      >
                        <span className={`rounded-sm px-1 py-0.5 -mx-1 group-hover:opacity-95 transition-all ${
                          ann.type === 'metaphor' ? 'bg-blue-200/60 text-blue-900' :
                          ann.type === 'reference' ? 'bg-purple-200/60 text-purple-900' :
                          ann.type === 'wordplay' ? 'bg-amber-200/60 text-amber-900' :
                          'bg-rose-200/60 text-rose-900'
                        }`}>{matched}</span>
                        {pos.endLine === idx && (
                          <span className={`ml-2 inline-flex items-center justify-center text-[10px] px-2 py-0.5 rounded-full font-semibold group-hover:opacity-95 transition-opacity ${
                            ann.type === 'metaphor' ? 'bg-blue-100 text-blue-900' :
                            ann.type === 'reference' ? 'bg-purple-100 text-purple-900' :
                            ann.type === 'wordplay' ? 'bg-amber-100 text-amber-900' :
                            'bg-rose-100 text-rose-900'
                          }`}>
                            {ann.type.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </button>
                    );

                    cursor = endOff;
                  });                  if (cursor < line.length) {
                    parts.push(<span key={`text-${cursor}`}>{line.slice(cursor)}</span>);
                  }

                  return parts;
                };

                return (
                  <div key={idx} className="group/line mb-12">
                    <div className="relative mb-16">
                                      <div className="text-lg sm:text-xl font-light leading-relaxed transition-all text-left">
                        {renderLineContent()}
                      </div>

                      {/* Annotation Preview */}
                      {selectedAnnotationIndex !== null && 
                       annotationPositions.find(p => p.idx === selectedAnnotationIndex)?.startLine === idx && (
                        <div className="absolute left-0 right-0 top-full mt-2 z-10">
                          <div className="relative bg-[hsl(var(--background))] rounded-lg shadow-lg border border-[hsl(var(--foreground))/0.1] p-4 animate-in fade-in slide-in-from-top-2 duration-200 annotation-popup">
                            <div className="flex items-center gap-2 mb-3">
                              <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded ${
                                displayedAnnotations[selectedAnnotationIndex].type === 'metaphor' ? 'bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-100' :
                                displayedAnnotations[selectedAnnotationIndex].type === 'reference' ? 'bg-purple-100 dark:bg-purple-950 text-purple-900 dark:text-purple-100' :
                                displayedAnnotations[selectedAnnotationIndex].type === 'wordplay' ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-100' :
                                'bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-100'
                              }`}>
                                {t((displayedAnnotations[selectedAnnotationIndex].type || 'metaphor') as TranslationKey)}
                              </span>
                            </div>
                            <p className="text-sm font-light text-[hsl(var(--foreground))/0.8] italic whitespace-normal break-words mb-2 text-justify">
                              {displayedAnnotations[selectedAnnotationIndex].text}
                            </p>
                            <p className="text-base font-light text-[hsl(var(--foreground))/0.7] leading-relaxed whitespace-normal break-words text-justify">
                              {displayedAnnotations[selectedAnnotationIndex].explanation}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Annotations Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <h2 className="text-xs font-light uppercase tracking-widest text-[hsl(var(--foreground))/0.6] mb-6">
                {t('annotations')}
              </h2>
              
              <div className="space-y-4">
                {displayedAnnotations.map((annotation, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedAnnotationIndex(selectedAnnotationIndex === idx ? null : idx);
                    }}
                    className={`w-full text-left p-4 rounded-lg border transition-all annotation-trigger ${
                      selectedAnnotationIndex === idx
                        ? 'border-[hsl(var(--foreground))/0.9] bg-[hsl(var(--card))/0.05]'
                        : 'border-[hsl(var(--foreground))/0.1] hover:border-[hsl(var(--foreground))/0.3]'
                    }`}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <span className={`text-sm font-semibold uppercase tracking-wider px-3 py-2 rounded flex-shrink-0 ${
                        annotation.type === 'metaphor' ? 'bg-blue-100 text-blue-900' :
                        annotation.type === 'reference' ? 'bg-purple-100 text-purple-900' :
                        annotation.type === 'wordplay' ? 'bg-amber-100 text-amber-900' :
                        'bg-rose-100 text-rose-900'
                      }`}>
                        {annotation.type.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm font-light text-[hsl(var(--foreground))/0.8] line-clamp-2">
                      {annotation.text}
                    </p>
                  </button>
                ))}
              </div>

              {/* Legend */}
              <div className="mt-10 pt-8 border-t border-[hsl(var(--foreground))/0.1] space-y-3">
                <p className="text-xs font-light uppercase tracking-widest text-[hsl(var(--foreground))/0.6]">
                  {t('annotationTypes')}
                </p>
                    <div className="space-y-2 text-sm font-light">
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-100 px-3 py-2 rounded">M</span>
                    <span className="text-[hsl(var(--foreground))/0.7]">{t('metaphor')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-purple-100 dark:bg-purple-950 text-purple-900 dark:text-purple-100 px-3 py-2 rounded">R</span>
                    <span className="text-[hsl(var(--foreground))/0.7]">{t('reference')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-100 px-3 py-2 rounded">W</span>
                    <span className="text-[hsl(var(--foreground))/0.7]">{t('wordplay')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-100 px-3 py-2 rounded">E</span>
                    <span className="text-[hsl(var(--foreground))/0.7]">{t('emotion')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-16 sm:mt-24 pt-12 border-t border-black/5 flex justify-between items-center">
          <Link
            to="/"
            className="text-sm font-light text-[hsl(var(--foreground))/0.6] hover:text-[hsl(var(--foreground))] transition-colors"
          >
            ← {t('allSongs')}
          </Link>
        </div>
      </main>
    </div>
  );
}