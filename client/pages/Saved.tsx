import { useState, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase, Work } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useWorks } from '@/lib/WorksContext';
import { useI18n } from '@/lib/i18n';
import { useStarsBackground } from '@/hooks/use-stars-background';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import WorkCard from '@/components/WorkCard';
import MasonryGrid, { type MasonryColumns } from '@/components/MasonryGrid';
import PageTitle from '@/components/PageTitle';
import { DeleteFolderSheet, FolderCover, FolderNameSheet, FolderWorksSheet } from '@/components/SaveFolderSheets';
import { loadFolders, useSaveFolders, type SaveFolder } from '@/lib/save-folders';
import { Loader2, Bookmark, FolderPlus, MoreHorizontal, Pencil, Plus, Trash2, Folder } from 'lucide-react';

const GRID_COLUMNS: MasonryColumns = { base: 2, sm: 3, lg: 4, xl: 5, '2xl': 6 };

const FIRST_ON_SCREEN = 4;

// Coming back shows at once what was here; it is brought up to date out of sight.
let lastSeen: { userId: string; works: Work[] } | null = null;

// Guardados (v1.1.39): everything you saved, and your own folders, like TikTok's collections.
// The folders run along the top (Todo first, «Nueva carpeta» last); choosing one shows only
// its works, with its own menu to add works, rename it or delete it (its works stay here).

type Sheet =
  | { kind: 'new' }
  | { kind: 'rename'; folder: SaveFolder }
  | { kind: 'delete'; folder: SaveFolder }
  | { kind: 'works'; folder: SaveFolder }
  | null;

export default function Saved() {
  useRequireAuth();
  useStarsBackground('saved-stars-background');
  const { user } = useAuth();
  const worksContext = useWorks();
  const { language } = useI18n();
  const es = language === 'es';

  const known = lastSeen?.userId === user?.id ? lastSeen : null;
  const [works, setWorks] = useState<Work[]>(known?.works ?? []);
  const [loading, setLoading] = useState(!known);

  const { folders, available, loaded: foldersLoaded } = useSaveFolders();
  const [search, setSearch] = useSearchParams();
  const chosenId = search.get('carpeta');
  const chosen = chosenId ? folders.find((f) => f.id === chosenId) ?? null : null;
  const [sheet, setSheet] = useState<Sheet>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { if (user) void loadFolders(user.id); }, [user?.id]);

  // A folder that no longer exists (deleted elsewhere) quietly goes back to «Todo».
  useEffect(() => {
    if (chosenId && foldersLoaded && !chosen) choose(null, true);
  }, [chosenId, foldersLoaded, chosen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user) return;
    let current = true;
    const load = async () => {
      try {
        // All in one request. A work no longer visible to you simply does not come back.
        const { data, error } = await supabase
          .from('saves')
          .select('created_at, works!inner(*, profiles!user_id(id, username, display_name, avatar_url, is_verified, is_banned))')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        if (!current) return;

        const saved = (data ?? []).map((save: any) => ({
          ...save.works,
          hashtags: save.works.hashtags || [],
          liked_by_me: false,
          saved_by_me: true,
        })) as Work[];
        lastSeen = { userId: user.id, works: saved };
        setWorks(saved);
        setLoading(false);

        // The works are already on screen: hearts and counts catch up behind them.
        if (saved.length > 0) {
          void worksContext.loadUserInteractions(
            saved.map(w => w.id),
            user.id,
            Object.fromEntries(saved.map(work => [work.id, Number(work.like_count) || 0]))
          );
        }
      } catch (err) {
        console.error('[Saved] Error loading saved works:', err);
        if (current && !lastSeen) setWorks([]);
        if (current) setLoading(false);
      }
    };

    load();
    return () => { current = false; };
  }, [user?.id]);

  const handleSaveToggle = (workId: string, saved: boolean) => {
    // Optimistic update: remove from local state when unsaved
    if (!saved) {
      setWorks(prev => prev.filter(w => w.id !== workId));
      if (lastSeen) lastSeen = { ...lastSeen, works: lastSeen.works.filter(w => w.id !== workId) };
    }
  };

  const byId = useMemo(() => new Map(works.map((w) => [w.id, w])), [works]);
  const shown = chosen ? chosen.work_ids.map((id) => byId.get(id)).filter(Boolean) as Work[] : works;
  const countOf = (folder: SaveFolder) => folder.work_ids.filter((id) => byId.has(id)).length;

  function choose(folderId: string | null, replace = false) {
    setMenuOpen(false);
    const next = new URLSearchParams(search);
    if (folderId) next.set('carpeta', folderId); else next.delete('carpeta');
    setSearch(next, { replace });
  }

  const noun = (n: number) => (es ? (n === 1 ? 'obra' : 'obras') : (n === 1 ? 'work' : 'works'));

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] relative">
      <div id="saved-stars-background" className="absolute inset-0 z-0 stars-background" />
      <div className="relative z-10">
      <Header showSearchCentered breadcrumb={es ? 'Guardados' : 'Saved'} />
      <main className="max-w-6xl mx-auto px-4 sm:px-8 pt-5 pb-10 phone:pt-3 page-enter">
        <PageTitle icon={<Bookmark />} title={es ? 'Guardados' : 'Saved'} subtitle={es ? 'Las obras que has guardado' : 'The works you have saved'} />

        {available && !loading && works.length > 0 && (
          <div className="folder-strip" role="tablist" aria-label={es ? 'Carpetas' : 'Folders'}>
            <FolderCard
              label={es ? 'Todo' : 'All'}
              count={works.length}
              noun={noun}
              active={!chosen}
              onClick={() => choose(null)}
              cover={<FolderCover works={works.slice(0, 4)} empty={<Bookmark />} />}
              index={0}
            />
            {folders.map((folder, i) => (
              <FolderCard
                key={folder.id}
                label={folder.name}
                count={countOf(folder)}
                noun={noun}
                active={chosen?.id === folder.id}
                onClick={() => choose(folder.id)}
                cover={<FolderCover works={folder.work_ids.slice(0, 4).map((id) => byId.get(id))} />}
                index={i + 1}
              />
            ))}
            <button
              type="button"
              className="folder-card folder-card--new ios-press"
              style={{ ['--i' as string]: Math.min(folders.length + 1, 12) }}
              onClick={() => setSheet({ kind: 'new' })}
            >
              <span className="folder-cover folder-cover--new"><FolderPlus /></span>
              <span className="folder-card-name">{es ? 'Nueva carpeta' : 'New folder'}</span>
              <span className="folder-card-count">&nbsp;</span>
            </button>
          </div>
        )}

        {chosen && (
          <div className="folder-bar" key={chosen.id}>
            <span className="folder-bar-icon" aria-hidden="true"><Folder /></span>
            <div className="min-w-0 flex-1">
              <h2 className="folder-bar-name">{chosen.name}</h2>
              <p className="folder-bar-count">{countOf(chosen)} {noun(countOf(chosen))}</p>
            </div>
            <button type="button" className="folder-bar-add ios-press" onClick={() => setSheet({ kind: 'works', folder: chosen })}>
              <Plus /> <span>{es ? 'Añadir obras' : 'Add works'}</span>
            </button>
            <FolderMenu
              open={menuOpen}
              setOpen={setMenuOpen}
              es={es}
              onRename={() => setSheet({ kind: 'rename', folder: chosen })}
              onDelete={() => setSheet({ kind: 'delete', folder: chosen })}
            />
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--muted-foreground))]" />
          </div>
        ) : works.length === 0 ? (
          <div className="page-empty">
            <Bookmark className="w-10 h-10 text-[hsl(var(--muted-foreground))] mx-auto mb-3" />
            <p className="text-[hsl(var(--muted-foreground))] text-sm mb-4">
              {es ? 'Aún no has guardado ninguna obra.' : "You haven't saved any works yet."}
            </p>
            <Link to="/" className="tap-area text-sm text-[hsl(var(--foreground))] underline underline-offset-2">
              {es ? 'Explorar galería →' : 'Explore gallery →'}
            </Link>
          </div>
        ) : chosen && shown.length === 0 ? (
          <div className="page-empty" key={`empty-${chosen.id}`}>
            <Folder className="w-10 h-10 text-[hsl(var(--muted-foreground))] mx-auto mb-3" />
            <p className="text-[hsl(var(--muted-foreground))] text-sm mb-4">
              {es ? 'Esta carpeta está vacía.' : 'This folder is empty.'}
            </p>
            <button type="button" className="glass-button glass-button--primary mx-auto" onClick={() => setSheet({ kind: 'works', folder: chosen })}>
              {es ? 'Añadir obras' : 'Add works'}
            </button>
          </div>
        ) : (
          <div className="folder-grid-in" key={chosen?.id ?? 'todo'}>
            <MasonryGrid
              items={shown}
              columns={GRID_COLUMNS}
              getKey={work => work.id}
              renderItem={(work, index) => (
                <div className="mb-4 phone:mb-3 w-full">
                  <WorkCard work={work} onSaveToggle={handleSaveToggle} priorityImage={index < FIRST_ON_SCREEN} />
                </div>
              )}
            />
          </div>
        )}

      </main>
      <Footer />
      </div>

      {sheet?.kind === 'new' && <FolderNameSheet onClose={() => setSheet(null)} onDone={(made) => made && choose(made.id)} />}
      {sheet?.kind === 'rename' && <FolderNameSheet folder={sheet.folder} onClose={() => setSheet(null)} />}
      {sheet?.kind === 'delete' && <DeleteFolderSheet folder={sheet.folder} onClose={() => setSheet(null)} onDeleted={() => choose(null, true)} />}
      {sheet?.kind === 'works' && <FolderWorksSheet folder={sheet.folder} works={works} onClose={() => setSheet(null)} />}
    </div>
  );
}

function FolderCard({ label, count, noun, active, onClick, cover, index }: {
  label: string;
  count: number;
  noun: (n: number) => string;
  active: boolean;
  onClick: () => void;
  cover: ReactNode;
  index: number;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={`folder-card ios-press ${active ? 'folder-card-on' : ''}`}
      style={{ ['--i' as string]: Math.min(index, 12) }}
      onClick={onClick}
    >
      {cover}
      <span className="folder-card-name">{label}</span>
      <span className="folder-card-count">{count} {noun(count)}</span>
    </button>
  );
}

/** The folder's ⋯: a little glass menu that unfolds from the button. */
function FolderMenu({ open, setOpen, es, onRename, onDelete }: {
  open: boolean;
  setOpen: (open: boolean) => void;
  es: boolean;
  onRename: () => void;
  onDelete: () => void;
}) {
  const wrap = useRef<HTMLDivElement | null>(null);
  const [closing, setClosing] = useState(false);
  const [shown, setShown] = useState(open);

  useEffect(() => {
    if (open) { setShown(true); setClosing(false); return; }
    if (!shown) return;
    setClosing(true);
    const t = window.setTimeout(() => { setShown(false); setClosing(false); }, 160);
    return () => window.clearTimeout(t);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('pointerdown', onDown); window.removeEventListener('keydown', onKey); };
  }, [open, setOpen]);

  const pick = (action: () => void) => { setOpen(false); action(); };

  return (
    <div className="relative" ref={wrap}>
      <button
        type="button"
        className="folder-bar-more ios-press"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={es ? 'Opciones de la carpeta' : 'Folder options'}
        onClick={() => setOpen(!open)}
      >
        <MoreHorizontal />
      </button>
      {shown && (
        <div role="menu" className="folder-menu glass-panel" data-closing={closing || undefined}>
          <button type="button" role="menuitem" className="folder-menu-item" onClick={() => pick(onRename)}>
            <Pencil /> {es ? 'Cambiar nombre' : 'Rename'}
          </button>
          <button type="button" role="menuitem" className="folder-menu-item folder-menu-item--danger" onClick={() => pick(onDelete)}>
            <Trash2 /> {es ? 'Borrar carpeta' : 'Delete folder'}
          </button>
        </div>
      )}
    </div>
  );
}
