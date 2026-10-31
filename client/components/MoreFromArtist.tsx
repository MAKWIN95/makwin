import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, FileText, Music, Play } from 'lucide-react';
import { supabase, type Profile, type Work } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n';
import { rememberOpening } from '@/lib/work-opening';

const MOST_SHOWN = 12;

function pictureOf(work: Work) {
  if (work.cover_url) return work.cover_url;
  return work.work_type === 'pintura' || work.work_type === 'fotografia' ? work.file_url : null;
}

const SIGN_OF: Record<string, typeof Play> = { video: Play, cancion: Music, poema: FileText };

// If you liked this work, the artist's others are right there, without leaving it.
export default function MoreFromArtist({ author, artistId, workId, isMine }: { author: Profile; artistId: string; workId: string; isMine: boolean }) {
  const { language } = useI18n();
  const es = language === 'es';
  const [works, setWorks] = useState<Work[]>([]);
  const strip = useRef<HTMLDivElement>(null);
  const [canGo, setCanGo] = useState({ back: false, on: false });

  useEffect(() => {
    let cancelled = false;
    void supabase
      .from('works')
      .select('*')
      .eq('user_id', artistId)
      .eq('status', 'published')
      .neq('id', workId)
      .order('created_at', { ascending: false })
      .limit(MOST_SHOWN)
      .then(({ data }) => {
        if (!cancelled) setWorks((data ?? []) as Work[]);
      });
    return () => { cancelled = true; };
  }, [artistId, workId]);

  const measure = () => {
    const element = strip.current;
    if (!element) return;
    setCanGo({
      back: element.scrollLeft > 4,
      on: element.scrollLeft + element.clientWidth < element.scrollWidth - 4,
    });
  };

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [works]);

  if (works.length === 0) return null;

  const name = author.display_name || author.username;
  const go = (direction: number) => {
    const element = strip.current;
    if (element) element.scrollBy({ left: direction * element.clientWidth * 0.8, behavior: 'smooth' });
  };
  const arrow = 'absolute top-1/2 -translate-y-1/2 z-10 w-8 h-8 glass-surface !rounded-full flex items-center justify-center text-[hsl(var(--foreground))] phone:hidden opacity-0 group-hover/more:opacity-100 focus-visible:opacity-100 transition-opacity duration-200';

  return (
    <section className="border-t border-[hsl(var(--border))] pt-5" aria-label={isMine ? (es ? 'Más obras tuyas' : 'More of your works') : `${es ? 'Más de' : 'More by'} ${name}`}>
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h2 className="text-sm font-medium text-[hsl(var(--foreground))] truncate">
          {isMine ? (es ? 'Más obras tuyas' : 'More of your works') : `${es ? 'Más de' : 'More by'} ${name}`}
        </h2>
        <Link to={`/u/${author.username}`} className="tap-area shrink-0 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors">
          {es ? 'Ver todas' : 'See all'}
        </Link>
      </div>

      <div className="group/more relative phone:-mx-4">
        <div ref={strip} onScroll={measure} className="thumb-strip flex gap-2 overflow-x-auto snap-x snap-proximity phone:px-4 phone:scroll-px-4">
          {works.map((other) => {
            const picture = pictureOf(other);
            const Sign = SIGN_OF[other.work_type];
            return (
              <Link
                key={other.id}
                to={`/work/${other.id}`}
                state={{ work: { ...other, profiles: author } }}
                title={other.title}
                onClick={(event) => rememberOpening(other.id, event.currentTarget.querySelector('img') ?? event.currentTarget)}
                className="ios-press relative shrink-0 snap-start w-24 h-24 rounded-xl overflow-hidden bg-[hsl(var(--muted))] outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
              >
                {picture ? (
                  <img src={picture} alt={other.title} loading="lazy" decoding="async" draggable={false} className="w-full h-full object-cover" />
                ) : (
                  <span className="w-full h-full p-2 flex items-end text-[11px] leading-tight text-[hsl(var(--foreground))]"><span className="line-clamp-3">{other.title}</span></span>
                )}
                {Sign && (
                  <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/55 text-white flex items-center justify-center backdrop-blur-sm">
                    <Sign className="w-3 h-3" />
                  </span>
                )}
              </Link>
            );
          })}
        </div>
        {canGo.back && (
          <button type="button" aria-label={es ? 'Anteriores' : 'Previous'} onClick={() => go(-1)} className={`${arrow} left-1`}>
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
        {canGo.on && (
          <button type="button" aria-label={es ? 'Más' : 'More'} onClick={() => go(1)} className={`${arrow} right-1`}>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </section>
  );
}
