import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft, Check, ChevronDown, ChevronUp, Eye, EyeOff, Globe, Link2, Loader2, Lock, Palette, Pencil, Plus, Share2, Trash2,
} from 'lucide-react';
import { supabase, type Profile } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import { usePageTitle } from '@/lib/page-title';
import { loadPoemFont } from '@/lib/poem-fonts';
import { cn } from '@/lib/utils';
import {
  DISCIPLINES,
  DISCIPLINE_INFO,
  PortfolioError,
  compactPortfolio,
  expandPortfolio,
  deletePortfolio,
  isEmptySection,
  keepsTogetherOnPaper,
  loadOwnWorks,
  loadPortfolio,
  loadWorks,
  makeDraft,
  mediaToCheck,
  newSection,
  portfolioLink,
  publicView,
  renewShareKey,
  savePortfolio,
  workPicture,
  type Discipline,
  type PortfolioContent,
  type PortfolioInfo,
  type PortfolioVisibility,
  type PortfolioWork,
  type Section,
  type SectionType,
  type SavedPortfolio,
} from '@/lib/portfolio';
import { Field, PortfolioHero, SectionBody } from '@/components/portfolio/PortfolioSections';
import { AddSectionSheet, CoverSheet, DesignSheet, ShareSheet, WorkPickerSheet } from '@/components/portfolio/PortfolioSheets';
import '@/portfolio.css';

type Sheet = null | 'design' | 'share' | 'add' | 'cover' | { pick: string };
type SaveState = 'saved' | 'waiting' | 'saving' | 'error';
type PublicProfile = Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url' | 'bio' | 'website' | 'instagram_url' | 'tiktok_url' | 'is_banned'>;

// Saved half a second after the last change, and at least every 2.5 s while someone keeps typing.
const SAVE_AFTER_MS = 500;
const SAVE_AT_LEAST_EVERY_MS = 2_500;
const draftKey = (userId: string) => `makwin:portfolio-draft:${userId}`;

/** `base` is a short fingerprint of what the server had when the change was made. */
interface Draft { at: number; content: unknown; visibility: PortfolioVisibility; base?: string }

function fingerprint(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) hash = Math.imul(hash ^ value.charCodeAt(i), 0x01000193);
  return `${value.length}:${(hash >>> 0).toString(36)}`;
}

function readDraft(userId: string): Draft | null {
  try {
    const raw = localStorage.getItem(draftKey(userId));
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

function forgetDraft(userId: string) {
  try { localStorage.removeItem(draftKey(userId)); } catch { /* private mode: nothing kept anyway */ }
}
const CHECK_EVERY_MS = 4000;
const CHECK_FOR_MS = 3 * 60 * 1000;

/**
 * An artist's portfolio at makwin.art/p/username: one page to send to a gallery, a
 * label or a client. Its owner edits it right there, as it looks, and it saves itself.
 */
export default function Portfolio() {
  const { username = '' } = useParams<{ username: string }>();
  const [search] = useSearchParams();
  const key = search.get('k');
  // The owner can look at it exactly as others see it: what is hidden or still being checked stays out.
  const previewing = search.get('vista') === 'visitante';
  const navigate = useNavigate();
  const { user, profile: myProfile } = useAuth();
  const { language } = useI18n();
  const es = language === 'es';
  const lang = es ? 'es' : 'en';

  const [status, setStatus] = useState<'loading' | 'ready' | 'create' | 'none' | 'error'>('loading');
  const [owner, setOwner] = useState<PublicProfile | null>(null);
  const [content, setContent] = useState<PortfolioContent | null>(null);
  const [visibility, setVisibility] = useState<PortfolioVisibility>('private');
  const [shareKey, setShareKey] = useState<string | null>(null);
  const [checked, setChecked] = useState<string[]>([]);
  const [held, setHeld] = useState<string[]>([]);
  const [mine, setMine] = useState(false);
  const [works, setWorks] = useState<Map<string, PortfolioWork>>(new Map());
  const [ownWorks, setOwnWorks] = useState<PortfolioWork[] | null>(null);
  const [editing, setEditing] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [creating, setCreating] = useState<Discipline | null>(null);
  const [leaving, setLeaving] = useState<Set<string>>(new Set());
  const [fresh, setFresh] = useState<string | null>(null);

  const asVisitor = mine && previewing;
  const ownerUi = mine && !previewing;
  const name = owner?.display_name || owner?.username || username;
  usePageTitle(owner ? `Portfolio · ${name}` : null);

  // ---- Loading -------------------------------------------------------------------

  const takeSaved = (saved: Pick<SavedPortfolio, 'visibility' | 'share_key' | 'checked_media' | 'held_media'>) => {
    setVisibility(saved.visibility);
    setShareKey(saved.share_key);
    setChecked(saved.checked_media ?? []);
    setHeld(saved.held_media ?? []);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatus('loading');
      try {
        const [{ data: profile }, record] = await Promise.all([
          supabase.from('profiles')
            .select('id, username, display_name, avatar_url, bio, website, instagram_url, tiktok_url, is_banned')
            .eq('username', username.toLowerCase())
            .maybeSingle(),
          loadPortfolio(username, key),
        ]);
        if (cancelled) return;
        if (!profile || profile.is_banned) { setStatus('none'); return; }
        setOwner(profile as PublicProfile);
        const isMine = !!user && user.id === profile.id;
        setMine(isMine);
        if (!record) {
          setStatus(isMine ? 'create' : 'none');
          if (isMine) loadOwnWorks(profile.id).then((list) => !cancelled && setOwnWorks(list));
          return;
        }
        setContent(record.content);
        takeSaved({ visibility: record.visibility, share_key: record.share_key ?? '', checked_media: record.checked_media ?? [], held_media: record.held_media ?? [] });
        lastSaved.current = snapshot(record.content, record.visibility);
        // Changes kept on this device that never reached the server come back and are sent now.
        const draft = isMine && user ? readDraft(user.id) : null;
        if (draft && user) {
          const recovered = expandPortfolio(draft.content);
          // Newer when the server still has what it had when the change was made, or saved before it.
          const newer = draft.base === fingerprint(lastSaved.current) || draft.at > Date.parse(record.updated_at ?? '');
          if (newer && snapshot(recovered, draft.visibility) !== lastSaved.current) {
            setContent(recovered);
            setVisibility(draft.visibility);
            latest.current = { content: recovered, visibility: draft.visibility };
            dirty.current = false;
            scheduleSave();
            toast.success(es ? 'Hemos recuperado cambios que no llegaron a guardarse.' : 'We recovered changes that had not been saved.');
          } else {
            forgetDraft(user.id);
          }
        }
        const ids = new Set<string>(record.content.info.heroWork ? [record.content.info.heroWork] : []);
        record.content.sections.forEach((section) => section.type === 'works' && section.items.forEach((item) => ids.add(item.id)));
        setWorks(await loadWorks([...ids]));
        if (!cancelled) setStatus('ready');
      } catch (error) {
        console.error('[Portfolio] Could not load:', error);
        if (!cancelled) setStatus('error');
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, key, user?.id]);

  // The owner chooses among all their works.
  useEffect(() => {
    if (!mine || !owner || ownWorks) return;
    loadOwnWorks(owner.id).then(setOwnWorks);
  }, [mine, owner, ownWorks]);

  useEffect(() => {
    if (!ownWorks) return;
    setWorks((current) => {
      const next = new Map(current);
      ownWorks.forEach((work) => next.set(work.id, work));
      return next;
    });
  }, [ownWorks]);

  // Serif letters (the classic look, work titles, the «MAKWIN portfolio» mark) load once there is a portfolio to show.
  const hasContent = !!content;
  useEffect(() => {
    if (!hasContent) return;
    loadPoemFont('elegante');
    void import('@fontsource/cormorant-garamond/500-italic.css').catch(() => undefined);
  }, [hasContent]);

  // ---- Saving itself -----------------------------------------------------------------

  const latest = useRef<{ content: PortfolioContent | null; visibility: PortfolioVisibility }>({ content: null, visibility: 'private' });
  latest.current = { content, visibility };
  const dirty = useRef(false);
  const dirtySince = useRef(0);
  const inFlight = useRef<Promise<void> | null>(null);
  const timer = useRef<number | undefined>(undefined);
  /** What the server has now, to skip sending the same thing twice. */
  const lastSaved = useRef('');
  const snapshot = (toSave: PortfolioContent, seenBy: PortfolioVisibility) => JSON.stringify([compactPortfolio(toSave), seenBy]);

  // A failed save is tried again calmly (3 s, 6 s, 12 s… up to 30 s) and said once, not on every try.
  const failures = useRef(0);
  const saveNow = useCallback(async ({ leaving = false }: { leaving?: boolean } = {}): Promise<void> => {
    window.clearTimeout(timer.current);
    if (inFlight.current) {
      // Closing while a save is on its way: a second one could arrive first and be overwritten
      // by the older one, so it waits; what is newer is safe on this device until next time.
      if (leaving) return;
      await inFlight.current;
      if (!dirty.current) return;
    }
    const { content: toSave, visibility: seenBy } = latest.current;
    if (!toSave || !dirty.current) return;
    dirty.current = false;
    const sending = snapshot(toSave, seenBy);
    if (sending === lastSaved.current) {
      // Changed and changed back: nothing new to send.
      setSaveState('saved');
      if (user) forgetDraft(user.id);
      return;
    }
    setSaveState('saving');
    let retry = false;
    let saved = false;
    const run = savePortfolio(toSave, seenBy, { leaving })
      .then((result) => {
        saved = true;
        failures.current = 0;
        lastSaved.current = sending;
        takeSaved(result);
        setSaveState(dirty.current ? 'waiting' : 'saved');
        if (!dirty.current && user) forgetDraft(user.id);
      })
      .catch((error) => {
        dirty.current = true;
        setSaveState('error');
        if (error instanceof PortfolioError && error.code === 'blocked_words') {
          // Waits for the artist to change the words; trying again alone would fail the same way.
          toast.error(es
            ? `No se ha guardado: hay palabras que no se permiten (${error.words.join(', ')}).`
            : `Not saved: some words are not allowed (${error.words.join(', ')}).`);
          return;
        }
        failures.current += 1;
        retry = true;
        if (failures.current === 1) {
          toast.error(es ? 'No se ha podido guardar. Lo vuelvo a intentar solo.' : 'Could not save. Trying again by itself.');
        }
      })
      .finally(() => { inFlight.current = null; });
    inFlight.current = run;
    await run;
    if (!dirty.current || !latest.current.content) return;
    if (retry) {
      const wait = Math.min(30_000, 3_000 * 2 ** (failures.current - 1));
      timer.current = window.setTimeout(() => void saveNow(), wait);
    } else if (saved) {
      // Changed while it was being sent: that goes too.
      timer.current = window.setTimeout(() => void saveNow(), SAVE_AFTER_MS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [es, user?.id]);

  // Back online: what is waiting goes at once.
  useEffect(() => {
    const online = () => { if (dirty.current) void saveNow(); };
    window.addEventListener('online', online);
    return () => window.removeEventListener('online', online);
  }, [saveNow]);

  const scheduleSave = useCallback(() => {
    const now = Date.now();
    if (!dirty.current) dirtySince.current = now;
    dirty.current = true;
    setSaveState('waiting');
    window.clearTimeout(timer.current);
    // Someone typing without a pause still gets saved every few seconds.
    const wait = Math.max(0, Math.min(SAVE_AFTER_MS, dirtySince.current + SAVE_AT_LEAST_EVERY_MS - now));
    timer.current = window.setTimeout(() => void saveNow(), wait);
  }, [saveNow]);

  // Every change is also kept on this device at once: if the page closes or the connection
  // drops before it reaches the server, it is recovered the next time the portfolio opens.
  useEffect(() => {
    if (!user || !content || !dirty.current) return;
    try {
      const draft: Draft = { at: Date.now(), content: compactPortfolio(content), visibility, base: fingerprint(lastSaved.current) };
      localStorage.setItem(draftKey(user.id), JSON.stringify(draft));
    } catch { /* full or private storage: the server save still runs */ }
  }, [content, visibility, user]);

  // Leaving: switching app, locking the phone or closing the tab sends what is pending
  // straight away, and the browser asks before closing while something is still on its way.
  useEffect(() => {
    const flush = () => { if (dirty.current) void saveNow({ leaving: true }); };
    const hidden = () => { if (document.visibilityState === 'hidden') flush(); };
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty.current && !inFlight.current) return;
      flush();
      event.preventDefault();
      event.returnValue = '';
    };
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', warn);
    return () => {
      document.removeEventListener('visibilitychange', hidden);
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', warn);
      if (dirty.current) void saveNow();
    };
  }, [saveNow]);

  const change = (next: (current: PortfolioContent) => PortfolioContent) => {
    setContent((current) => (current ? next(current) : current));
    scheduleSave();
  };

  const updateSection = (id: string, next: (section: Section) => Section) =>
    change((current) => ({ ...current, sections: current.sections.map((section) => (section.id === id ? next(section) : section)) }));

  const updateInfo = (patch: Partial<PortfolioInfo>) => change((current) => ({ ...current, info: { ...current.info, ...patch } }));

  const chooseVisibility = (next: PortfolioVisibility) => {
    setVisibility(next);
    latest.current.visibility = next;
    scheduleSave();
    void saveNow();
  };

  // ---- Pictures waiting for the automatic check --------------------------------------

  const mediaStatus = useCallback((url: string): 'ok' | 'checking' | 'held' => {
    if (held.includes(url)) return 'held';
    return checked.includes(url) ? 'ok' : 'checking';
  }, [checked, held]);

  const waitingForCheck = useMemo(() => (mine && content ? mediaToCheck(content).some(({ url }) => !checked.includes(url) && !held.includes(url)) : false), [mine, content, checked, held]);

  useEffect(() => {
    if (!waitingForCheck || saveState !== 'saved') return;
    const started = Date.now();
    const poll = window.setInterval(async () => {
      if (Date.now() - started > CHECK_FOR_MS) { window.clearInterval(poll); return; }
      try {
        const record = await loadPortfolio(username);
        if (record?.mine) {
          setChecked(record.checked_media ?? []);
          setHeld(record.held_media ?? []);
        }
      } catch { /* the next round will tell */ }
    }, CHECK_EVERY_MS);
    return () => window.clearInterval(poll);
  }, [waitingForCheck, saveState, username]);

  // ---- Moving parts around ---------------------------------------------------------

  const sectionEls = useRef(new Map<string, HTMLElement>());
  const before = useRef<Map<string, number> | null>(null);
  const remember = () => {
    before.current = new Map([...sectionEls.current].map(([id, element]) => [id, element.getBoundingClientRect().top]));
  };
  // Each part glides from where it was to where it goes.
  useLayoutEffect(() => {
    const from = before.current;
    if (!from) return;
    before.current = null;
    sectionEls.current.forEach((element, id) => {
      const top = from.get(id);
      if (top === undefined) return;
      const shift = top - element.getBoundingClientRect().top;
      if (Math.abs(shift) < 1) return;
      element.animate([{ transform: `translateY(${shift}px)` }, { transform: 'translateY(0)' }], { duration: 420, easing: 'cubic-bezier(0.32, 0.72, 0, 1)' });
    });
  }, [content?.sections]);

  const moveSection = (id: string, step: -1 | 1) => {
    remember();
    change((current) => {
      const index = current.sections.findIndex((section) => section.id === id);
      const target = index + step;
      if (index < 0 || target < 0 || target >= current.sections.length) return current;
      const sections = current.sections.slice();
      [sections[index], sections[target]] = [sections[target], sections[index]];
      return { ...current, sections };
    });
  };

  const removeSection = (id: string) => {
    const index = content?.sections.findIndex((section) => section.id === id) ?? -1;
    const removed = content?.sections[index];
    if (!removed) return;
    setLeaving((current) => new Set(current).add(id));
    window.setTimeout(() => {
      remember();
      change((current) => ({ ...current, sections: current.sections.filter((section) => section.id !== id) }));
      setLeaving((current) => { const next = new Set(current); next.delete(id); return next; });
      toast(es ? `«${removed.title || 'Parte'}» quitada` : `“${removed.title || 'Part'}” removed`, {
        action: {
          label: es ? 'Deshacer' : 'Undo',
          onClick: () => {
            remember();
            change((current) => {
              const sections = current.sections.slice();
              sections.splice(Math.min(index, sections.length), 0, removed);
              return { ...current, sections };
            });
          },
        },
      });
    }, 260);
  };

  const addSection = (type: SectionType) => {
    const section = newSection(type, lang);
    setFresh(section.id);
    change((current) => ({ ...current, sections: [...current.sections, section] }));
    window.setTimeout(() => sectionEls.current.get(section.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
    if (type === 'works') window.setTimeout(() => setSheet({ pick: section.id }), 420);
  };

  // ---- Starting one ------------------------------------------------------------------

  const create = async (discipline: Discipline) => {
    if (!owner || creating) return;
    setCreating(discipline);
    try {
      const list = ownWorks ?? await loadOwnWorks(owner.id);
      const draft = makeDraft(discipline, owner as Profile, list, lang);
      const saved = await savePortfolio(draft, 'private');
      takeSaved(saved);
      setContent(saved.content);
      lastSaved.current = snapshot(saved.content, saved.visibility);
      setOwnWorks(list);
      setEditing(true);
      setStatus('ready');
      window.scrollTo({ top: 0 });
    } catch (error) {
      console.error('[Portfolio] Could not create:', error);
      toast.error(es ? 'No se ha podido crear. Inténtalo otra vez.' : 'Could not create it. Please try again.');
    } finally {
      setCreating(null);
    }
  };

  /** Switching modes keeps the part being read where it is on screen; the fields appear around it. */
  const mainRef = useRef<HTMLElement>(null);
  const modeAnchor = useRef<{ id: string; top: number } | null>(null);
  const toggleEditing = async () => {
    if (editing) await saveNow();
    const found = [...sectionEls.current.entries()]
      .map(([id, el]) => ({ id, rect: el.getBoundingClientRect() }))
      .sort((a, b) => a.rect.top - b.rect.top)
      .find(({ rect }) => rect.bottom > 80);
    modeAnchor.current = found && window.scrollY > 0 ? { id: found.id, top: found.rect.top } : null;
    const next = !editing;
    const apply = () => flushSync(() => setEditing(next));
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // The two modes cross-fade where the browser can; otherwise the page settles in softly.
    const doc = document as Document & { startViewTransition?: (update: () => void) => unknown };
    if (!still && typeof doc.startViewTransition === 'function') {
      doc.startViewTransition(apply);
      return;
    }
    apply();
    if (!still) {
      mainRef.current?.animate(
        [{ opacity: 0.35, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }],
        { duration: 420, easing: 'cubic-bezier(0.32, 0.72, 0, 1)' },
      );
    }
  };
  useLayoutEffect(() => {
    const anchor = modeAnchor.current;
    modeAnchor.current = null;
    const element = anchor ? sectionEls.current.get(anchor.id) : undefined;
    if (anchor && element) window.scrollBy({ top: element.getBoundingClientRect().top - anchor.top });
  }, [editing]);

  const openPreview = () => {
    void saveNow();
    setEditing(false);
    const next = new URLSearchParams(search);
    next.set('vista', 'visitante');
    navigate({ search: `?${next}` }, { replace: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const leavePreview = () => {
    const next = new URLSearchParams(search);
    next.delete('vista');
    const query = next.toString();
    navigate({ search: query ? `?${query}` : '' }, { replace: true });
  };

  const print = () => {
    const go = () => window.print();
    if (editing) {
      setEditing(false);
      window.setTimeout(go, 450);
    } else go();
  };

  // ---- What shows ------------------------------------------------------------------------

  const view = asVisitor && content ? publicView(content, checked) : content;
  const heroWork = view?.info.heroWork ? works.get(view.info.heroWork) : undefined;
  const heroPicture = view?.info.heroImage ?? (heroWork ? workPicture(heroWork) : null);
  const heroStatus = view?.info.heroImage ? mediaStatus(view.info.heroImage) : 'ok';
  // A visitor who came with the private link keeps it, so a printed copy still opens.
  const link = owner ? portfolioLink(owner.username, mine ? visibility : key ? 'link' : 'public', mine ? shareKey : key) : '';

  const shownSections = (view?.sections ?? []).filter((section) => editing || (!section.hidden && !isEmptySection(section) && !(section.type === 'works' && !section.items.some((item) => works.has(item.id)))));

  if (status === 'loading') {
    return (
      <div className="pf-shell pf-shell--plain">
        <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-7 w-7 animate-spin opacity-50" /></div>
      </div>
    );
  }

  if (status === 'none' || status === 'error' || !owner) {
    return (
      <div className="pf-shell pf-shell--plain">
        <TopBar es={es} owner={owner} />
        <main className="page-enter mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 text-center">
          <p className="text-lg font-light">
            {status === 'error'
              ? (es ? 'No se ha podido abrir el portfolio.' : 'The portfolio could not be opened.')
              : key
                ? (es ? 'Este enlace ya no funciona. Pide uno nuevo a quien te lo mandó.' : 'This link no longer works. Ask whoever sent it for a new one.')
                : (es ? 'Este portfolio no es público.' : 'This portfolio is not public.')}
          </p>
          {owner && (
            <Link to={`/u/${owner.username}`} className="mt-4 text-sm underline underline-offset-4 opacity-70">
              {es ? `Ver el perfil de ${owner.display_name || owner.username}` : `See ${owner.display_name || owner.username}'s profile`}
            </Link>
          )}
        </main>
      </div>
    );
  }

  if (status === 'create') {
    return (
      <div className="pf-shell pf-shell--plain">
        <TopBar es={es} owner={owner} />
        <main className="page-enter mx-auto max-w-2xl px-5 pb-24 pt-10 sm:pt-16">
          <p className="text-xs uppercase tracking-[0.25em] opacity-60">Portfolio</p>
          <h1 className="mt-3 text-3xl font-light tracking-tight sm:text-4xl">{es ? 'Tu portfolio, listo en un minuto' : 'Your portfolio, ready in a minute'}</h1>
          <p className="mt-3 max-w-lg text-[15px] leading-relaxed opacity-70">
            {es
              ? 'Elige qué haces y te lo dejamos montado con lo que ya tienes en MAKWIN: tus obras, tu bio y tus enlaces. Luego lo cambias a tu gusto. Hasta que no lo compartas, solo lo ves tú.'
              : 'Choose what you do and we set it up with what you already have on MAKWIN: your works, bio and links. Then make it yours. Until you share it, only you can see it.'}
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {DISCIPLINES.map((discipline) => {
              const info = DISCIPLINE_INFO[discipline];
              return (
                <button
                  key={discipline}
                  type="button"
                  disabled={!!creating}
                  onClick={() => create(discipline)}
                  className="pf-discipline ios-press"
                  data-busy={creating === discipline || undefined}
                >
                  <span className="pf-discipline-name">{es ? info.es : info.en}</span>
                  <span className="pf-discipline-parts">{disciplineHint(discipline, es)}</span>
                  {creating === discipline && <Loader2 className="pf-discipline-wait h-4 w-4 animate-spin" />}
                </button>
              );
            })}
          </div>
        </main>
      </div>
    );
  }

  if (!content) return null;
  const design = content.design;

  return (
    <div className="pf-shell" data-style={design.style} data-tone={design.tone} data-accent={design.accent}>
      <TopBar
        es={es}
        owner={owner}
        visibility={ownerUi ? visibility : undefined}
        onVisibility={ownerUi ? () => setSheet('share') : undefined}
      />

      <main ref={mainRef} className="pf-page pf-mode" data-editing={editing || undefined}>
        <PortfolioHero
          es={es}
          editing={editing}
          name={name}
          avatar={owner.avatar_url}
          info={(view ?? content).info}
          picture={heroPicture}
          pictureStatus={heroStatus}
          onInfo={updateInfo}
          onChoosePicture={() => setSheet('cover')}
        />

        {shownSections.map((section, index) => (
          <section
            key={section.id}
            ref={(element) => { if (element) sectionEls.current.set(section.id, element); else sectionEls.current.delete(section.id); }}
            className="pf-section"
            data-type={section.type}
            data-print={keepsTogetherOnPaper(section, design.style) ? 'whole' : 'flow'}
            data-cover={(!editing && index === 0 && section.type === 'about' && section.text.length <= 650) || undefined}
            data-hidden={(editing && section.hidden) || undefined}
            data-leaving={leaving.has(section.id) || undefined}
            data-fresh={fresh === section.id || undefined}
            aria-label={section.title}
          >
            {editing ? (
              <div className="pf-section-head pf-section-head--edit">
                <Field
                  value={section.title}
                  maxLength={80}
                  autoFocus={fresh === section.id}
                  label={es ? 'Título de la parte' : 'Part title'}
                  placeholder={es ? 'Título' : 'Title'}
                  className="pf-section-title"
                  onChange={(title) => updateSection(section.id, (current) => ({ ...current, title }))}
                />
                <div className="pf-section-tools">
                  <button type="button" className="pf-tool ios-press tap-area" disabled={index === 0} aria-label={es ? 'Subir' : 'Move up'} onClick={() => moveSection(section.id, -1)}><ChevronUp className="h-4 w-4" /></button>
                  <button type="button" className="pf-tool ios-press tap-area" disabled={index === shownSections.length - 1} aria-label={es ? 'Bajar' : 'Move down'} onClick={() => moveSection(section.id, 1)}><ChevronDown className="h-4 w-4" /></button>
                  <button
                    type="button"
                    className="pf-tool ios-press tap-area"
                    aria-pressed={!!section.hidden}
                    aria-label={section.hidden ? (es ? 'Mostrar' : 'Show') : (es ? 'Ocultar' : 'Hide')}
                    title={section.hidden ? (es ? 'Oculta: los demás no la ven' : 'Hidden: others cannot see it') : (es ? 'Ocultar sin borrar' : 'Hide without deleting')}
                    onClick={() => updateSection(section.id, (current) => ({ ...current, hidden: !current.hidden || undefined }))}
                  >
                    {section.hidden ? <EyeOff key="off" className="icon-pop h-4 w-4" /> : <Eye key="on" className="icon-pop h-4 w-4" />}
                  </button>
                  <button type="button" className="pf-tool ios-press tap-area" aria-label={es ? 'Quitar esta parte' : 'Remove this part'} onClick={() => removeSection(section.id)}><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ) : (
              section.title && <h2 className="pf-section-title">{section.title}</h2>
            )}
            {editing && section.hidden && <p className="pf-hidden-note">{es ? 'Oculta: solo la ves tú.' : 'Hidden: only you can see it.'}</p>}
            <SectionBody
              es={es}
              editing={editing}
              section={section}
              update={(next) => updateSection(section.id, next)}
              works={works}
              onPickWorks={() => setSheet({ pick: section.id })}
              mediaStatus={mediaStatus}
              userId={user?.id ?? null}
            />
          </section>
        ))}

        {editing && (
          <button type="button" onClick={() => setSheet('add')} className="pf-add-section ios-press">
            <Plus className="h-4 w-4" />{es ? 'Añadir una parte' : 'Add a part'}
          </button>
        )}

        <footer className="pf-footer">
          <p className="pf-print-only">{link.replace(/^https?:\/\//, '')}</p>
          <div className="pf-footer-row">
            <Link to={`/u/${owner.username}`} className="pf-footer-link">{es ? 'Perfil en MAKWIN' : 'Profile on MAKWIN'}</Link>
            {!ownerUi && (
              <Link to={myProfile ? `/p/${myProfile.username}` : '/registro'} className="pf-footer-link pf-footer-make">
                {es ? 'Crea tu portfolio gratis' : 'Make your portfolio for free'}
              </Link>
            )}
          </div>
          <a href="https://www.makwin.art" className="pf-brand" aria-label="MAKWIN portfolio">
            <span className="pf-brand-word">makwin</span>
            <span className="pf-brand-rule" aria-hidden="true" />
            <span className="pf-brand-sub">portfolio</span>
          </a>
        </footer>
      </main>

      {asVisitor && (
        <div className="pf-dock">
          <div className="pf-dock-bar glass-bar pf-visitor-bar">
            <span className="pf-visitor-text"><Eye className="h-4 w-4 shrink-0" />{es ? 'Así lo ven los demás' : 'This is what others see'}</span>
            <DockButton icon={<ArrowLeft className="h-4 w-4" />} label={es ? 'Volver' : 'Back'} onClick={leavePreview} strong />
          </div>
        </div>
      )}

      {ownerUi && (
        <div className="pf-dock">
          <div className="pf-dock-bar glass-bar">
            <SaveDot es={es} state={saveState} />
            <div key={editing ? 'edit' : 'view'} className="pf-dock-buttons">
              {editing ? (
                <>
                  <DockButton icon={<Plus className="h-4 w-4" />} label={es ? 'Añadir' : 'Add'} onClick={() => setSheet('add')} />
                  <DockButton icon={<Palette className="h-4 w-4" />} label={es ? 'Diseño' : 'Design'} onClick={() => setSheet('design')} />
                  <DockButton icon={<Share2 className="h-4 w-4" />} label={es ? 'Compartir' : 'Share'} onClick={() => setSheet('share')} />
                  <DockButton icon={<Check className="h-4 w-4" />} label={es ? 'Listo' : 'Done'} onClick={toggleEditing} strong />
                </>
              ) : (
                <>
                  <DockButton icon={<Pencil className="h-4 w-4" />} label={es ? 'Editar' : 'Edit'} onClick={toggleEditing} strong />
                  <DockButton icon={<Palette className="h-4 w-4" />} label={es ? 'Diseño' : 'Design'} onClick={() => setSheet('design')} />
                  <DockButton icon={<Share2 className="h-4 w-4" />} label={es ? 'Compartir' : 'Share'} onClick={() => setSheet('share')} />
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {sheet === 'design' && (
        <DesignSheet es={es} design={design} onClose={() => setSheet(null)} onChange={(next) => change((current) => ({ ...current, design: next }))} />
      )}
      {sheet === 'share' && (
        <ShareSheet
          es={es}
          visibility={visibility}
          link={link}
          onVisibility={chooseVisibility}
          onPrint={print}
          onPreview={openPreview}
          onClose={() => setSheet(null)}
          onRenewKey={async () => { takeSaved(await renewShareKey()); }}
          onDelete={async () => {
            window.clearTimeout(timer.current);
            dirty.current = false;
            await deletePortfolio();
            if (user) forgetDraft(user.id);
            lastSaved.current = '';
            setSheet(null);
            setEditing(false);
            setContent(null);
            setStatus('create');
            toast.success(es ? 'Portfolio borrado' : 'Portfolio deleted');
          }}
        />
      )}
      {sheet === 'add' && <AddSectionSheet es={es} onAdd={addSection} onClose={() => setSheet(null)} />}
      {sheet === 'cover' && user && (
        <CoverSheet
          es={es}
          works={ownWorks ?? []}
          userId={user.id}
          current={{ work: content.info.heroWork, image: content.info.heroImage }}
          onChoose={({ work, image }) => updateInfo({ heroWork: work, heroImage: image })}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet && typeof sheet === 'object' && (
        <WorkPickerSheet
          es={es}
          works={ownWorks ?? []}
          chosen={(() => {
            const section = content.sections.find((it) => it.id === sheet.pick);
            return section?.type === 'works' ? section.items.map((item) => item.id) : [];
          })()}
          onClose={() => setSheet(null)}
          onDone={(ids) => updateSection(sheet.pick, (current) => {
            if (current.type !== 'works') return current;
            const notes = new Map(current.items.map((item) => [item.id, item.note]));
            return { ...current, items: ids.map((id) => ({ id, note: notes.get(id) ?? '' })) };
          })}
        />
      )}
    </div>
  );
}

function disciplineHint(discipline: Discipline, es: boolean): string {
  const hints: Record<Discipline, [string, string]> = {
    musica: ['Temas, créditos, directos, prensa', 'Tracks, credits, live shows, press'],
    visual: ['Statement, obras, exposiciones, premios', 'Statement, works, exhibitions, awards'],
    fotografia: ['Proyectos, clientes, exposiciones', 'Projects, clients, exhibitions'],
    escritura: ['Textos, publicaciones, lecturas', 'Writing, publications, readings'],
    audiovisual: ['Reel, trabajos, créditos, festivales', 'Reel, work, credits, festivals'],
    otro: ['Sobre ti, obras, trayectoria', 'About you, works, track record'],
  };
  return hints[discipline][es ? 0 : 1];
}

function TopBar({ es, owner, visibility, onVisibility }: { es: boolean; owner: PublicProfile | null; visibility?: PortfolioVisibility; onVisibility?: () => void }) {
  const Icon = visibility === 'public' ? Globe : visibility === 'link' ? Link2 : Lock;
  return (
    <div className="pf-top">
      <Link to={owner ? `/u/${owner.username}` : '/galeria'} className="pf-top-back ios-press" aria-label={es ? 'Volver al perfil' : 'Back to the profile'}>
        <ArrowLeft className="h-4 w-4" />
        <span className="pf-top-mark">makwin</span>
      </Link>
      {visibility && onVisibility && (
        <button type="button" onClick={onVisibility} className="pf-top-chip ios-press" data-visibility={visibility}>
          <Icon key={visibility} className="icon-pop h-3.5 w-3.5" />
          {visibility === 'public' ? (es ? 'Público' : 'Public') : visibility === 'link' ? (es ? 'Con enlace' : 'With link') : (es ? 'Solo tú lo ves' : 'Only you')}
        </button>
      )}
    </div>
  );
}

function DockButton({ icon, label, onClick, strong = false }: { icon: React.ReactNode; label: string; onClick: () => void; strong?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={cn('pf-dock-button ios-press', strong && 'pf-dock-button--strong')}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function SaveDot({ es, state }: { es: boolean; state: SaveState }) {
  const text = state === 'saved' ? (es ? 'Guardado' : 'Saved') : state === 'error' ? (es ? 'Sin guardar' : 'Not saved') : (es ? 'Guardando' : 'Saving');
  return (
    <span className="pf-save" data-state={state} role="status" aria-live="polite" title={text}>
      <span className="pf-save-dot" aria-hidden="true" />
      <span key={text} className="pf-save-text pf-fade-in">{text}</span>
    </span>
  );
}
