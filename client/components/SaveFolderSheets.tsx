import React, { useEffect, useRef, useState } from 'react';
import { Check, Folder, FolderPlus, Loader2, Music, Feather, Film } from 'lucide-react';
import type { Work } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import { smallImage } from '@/lib/small-photo';
import GlassSheet from '@/components/GlassSheet';
import {
  FOLDER_NAME_MAX,
  cleanFolderName,
  createFolder,
  deleteFolder,
  loadFolders,
  renameFolder,
  setWorkInFolder,
  useSaveFolders,
  type SaveFolder,
} from '@/lib/save-folders';

// The windows for folders inside «Guardados» (v1.1.39): choose folders for a work, name a
// folder, delete one, and pick which saved works go in a folder.

/** The picture a work shows small, if it has one (a song, poem or video only its cover). */
export function workPicture(work: Pick<Work, 'work_type' | 'cover_url' | 'file_url'> | undefined | null): string | null {
  if (!work) return null;
  if (work.cover_url) return work.cover_url;
  return work.work_type === 'pintura' || work.work_type === 'fotografia' ? work.file_url : null;
}

function NoPicture({ work }: { work?: Pick<Work, 'work_type'> | null }) {
  const Icon = work?.work_type === 'cancion' ? Music : work?.work_type === 'poema' ? Feather : work?.work_type === 'video' ? Film : Folder;
  return <span className="folder-cover-none"><Icon /></span>;
}

/** Up to four pictures in a square, like TikTok's collections; an empty folder shows its icon. */
export function FolderCover({ works, empty }: { works: (Work | undefined)[]; empty?: React.ReactNode }) {
  const shown = works.filter(Boolean).slice(0, 4) as Work[];
  if (shown.length === 0) return <span className="folder-cover folder-cover--empty">{empty ?? <Folder />}</span>;
  return (
    <span className={`folder-cover folder-cover--${Math.min(shown.length, 4)}`}>
      {shown.map((work) => {
        const picture = workPicture(work);
        return picture
          ? <img key={work.id} {...smallImage(picture)} alt="" loading="lazy" decoding="async" draggable={false} />
          : <NoPicture key={work.id} work={work} />;
      })}
    </span>
  );
}

/** After saving a work (or from its menu): tick the folders it belongs in, or make a new one. */
export function FolderPickerSheet({ workId, onClose }: { workId: string; onClose: () => void }) {
  const { user } = useAuth();
  const { language } = useI18n();
  const es = language === 'es';
  const { folders, loaded } = useSaveFolders();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { void loadFolders(user?.id); }, [user?.id]);

  // A new folder is named right here, and the work goes straight into it.
  const make = async () => {
    if (!user || busy || !cleanFolderName(name)) return;
    setBusy(true);
    const made = await createFolder(user.id, name, workId);
    setBusy(false);
    if (made) { setName(''); setNaming(false); }
  };

  return (
    <GlassSheet title={es ? 'Guardar en carpeta' : 'Save to folder'} onClose={onClose}>
      {(close) => (
        <>
          {naming ? (
            <form className="folder-inline" onSubmit={(e) => { e.preventDefault(); void make(); }}>
              <label className="folder-name-field">
                <FolderPlus aria-hidden="true" />
                <input
                  autoFocus
                  value={name}
                  maxLength={FOLDER_NAME_MAX}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={es ? 'Nombre de la carpeta' : 'Folder name'}
                  aria-label={es ? 'Nombre de la carpeta' : 'Folder name'}
                  enterKeyHint="done"
                  autoComplete="off"
                />
              </label>
              <button type="submit" disabled={busy || !cleanFolderName(name)} className="glass-button glass-button--primary folder-inline-go">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : (es ? 'Crear' : 'Create')}
              </button>
            </form>
          ) : (
            <button type="button" className="folder-pick-row folder-pick-new ios-press" onClick={() => setNaming(true)}>
              <span className="folder-pick-icon"><FolderPlus /></span>
              <span className="flex-1 text-left">{es ? 'Nueva carpeta' : 'New folder'}</span>
            </button>
          )}
          {!loaded ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--muted-foreground))]" /></div>
          ) : folders.length === 0 ? (
            <p className="folder-pick-empty">{es ? 'Aún no tienes carpetas. Crea una y ordena tus guardados como quieras.' : 'No folders yet. Make one and sort your saved works your way.'}</p>
          ) : (
            <ul className="folder-pick-list">
              {folders.map((folder, i) => {
                const inside = folder.work_ids.includes(workId);
                return (
                  <li key={folder.id} style={{ ['--i' as string]: Math.min(i, 10) }}>
                    <button
                      type="button"
                      className="folder-pick-row ios-press"
                      aria-pressed={inside}
                      onClick={() => user && void setWorkInFolder(user.id, folder.id, workId, !inside)}
                    >
                      <span className="folder-pick-icon"><Folder /></span>
                      <span className="flex-1 min-w-0 text-left">
                        <span className="block truncate">{folder.name}</span>
                        <span className="block text-xs text-[hsl(var(--muted-foreground))]">
                          {folder.work_ids.length} {es ? (folder.work_ids.length === 1 ? 'obra' : 'obras') : (folder.work_ids.length === 1 ? 'work' : 'works')}
                        </span>
                      </span>
                      <span className={`folder-check ${inside ? 'folder-check-on' : ''}`} aria-hidden="true"><Check /></span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <button type="button" onClick={close} className="mt-4 w-full glass-button glass-button--primary">{es ? 'Listo' : 'Done'}</button>
        </>
      )}
    </GlassSheet>
  );
}

/** A name for a new folder (optionally with a work already inside), or a new name for one. */
export function FolderNameSheet({ folder, firstWorkId, onClose, onDone }: {
  folder?: SaveFolder;
  firstWorkId?: string;
  onClose: () => void;
  onDone?: (folder: SaveFolder | null) => void;
}) {
  const { user } = useAuth();
  const { language } = useI18n();
  const es = language === 'es';
  const [name, setName] = useState(folder?.name ?? '');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const input = useRef<HTMLInputElement | null>(null);
  const ready = cleanFolderName(name).length > 0 && cleanFolderName(name) !== folder?.name;

  const submit = async (close: () => void) => {
    if (!user || !ready || busy) return;
    setBusy(true);
    setFailed(false);
    if (folder) {
      const ok = await renameFolder(folder.id, name);
      setBusy(false);
      if (!ok) return setFailed(true);
      onDone?.(folder);
    } else {
      const made = await createFolder(user.id, name, firstWorkId);
      setBusy(false);
      if (!made) return setFailed(true);
      onDone?.(made);
    }
    close();
  };

  return (
    <GlassSheet title={folder ? (es ? 'Cambiar nombre' : 'Rename folder') : (es ? 'Nueva carpeta' : 'New folder')} onClose={onClose}>
      {(close) => (
        <form onSubmit={(e) => { e.preventDefault(); void submit(close); }}>
          <label className="folder-name-field">
            <Folder aria-hidden="true" />
            <input
              ref={input}
              data-autofocus
              value={name}
              maxLength={FOLDER_NAME_MAX}
              onChange={(e) => setName(e.target.value)}
              onFocus={(e) => { if (folder) e.currentTarget.select(); }}
              placeholder={es ? 'Ponle nombre: «Inspiración», «Retratos»…' : 'Name it: “Inspiration”, “Portraits”…'}
              aria-label={es ? 'Nombre de la carpeta' : 'Folder name'}
              enterKeyHint="done"
              autoComplete="off"
            />
            <span className="folder-name-count" aria-hidden="true">{FOLDER_NAME_MAX - name.length}</span>
          </label>
          {failed && (
            <p role="alert" className="mt-2 text-xs text-red-400">
              {es ? 'No se ha podido guardar. Inténtalo otra vez en un momento.' : 'It could not be saved. Try again in a moment.'}
            </p>
          )}
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={close} className="flex-1 glass-button">{es ? 'Cancelar' : 'Cancel'}</button>
            <button type="submit" disabled={!ready || busy} className="flex-1 glass-button glass-button--primary">
              {busy ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : folder ? (es ? 'Guardar' : 'Save') : (es ? 'Crear' : 'Create')}
            </button>
          </div>
        </form>
      )}
    </GlassSheet>
  );
}

/** Deleting a folder never deletes the works in it: they stay in Guardados. */
export function DeleteFolderSheet({ folder, onClose, onDeleted }: { folder: SaveFolder; onClose: () => void; onDeleted: () => void }) {
  const { language } = useI18n();
  const es = language === 'es';
  const [busy, setBusy] = useState(false);
  return (
    <GlassSheet title={es ? '¿Borrar la carpeta?' : 'Delete folder?'} onClose={onClose}>
      {(close) => (
        <>
          <p className="text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
            {es
              ? <>Se borrará «<span className="text-[hsl(var(--foreground))]">{folder.name}</span>». Las obras que tiene seguirán en Guardados.</>
              : <>“<span className="text-[hsl(var(--foreground))]">{folder.name}</span>” will be deleted. Its works stay in Saved.</>}
          </p>
          <div className="mt-5 flex gap-2">
            <button type="button" onClick={close} className="flex-1 glass-button">{es ? 'Cancelar' : 'Cancel'}</button>
            <button
              type="button"
              disabled={busy}
              className="flex-1 glass-button glass-button--danger"
              onClick={async () => {
                setBusy(true);
                const ok = await deleteFolder(folder.id);
                setBusy(false);
                if (ok) { onDeleted(); close(); }
              }}
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (es ? 'Borrar' : 'Delete')}
            </button>
          </div>
        </>
      )}
    </GlassSheet>
  );
}

/** Which of your saved works are in this folder: tap to put in or take out. */
export function FolderWorksSheet({ folder, works, onClose }: { folder: SaveFolder; works: Work[]; onClose: () => void }) {
  const { user } = useAuth();
  const { language } = useI18n();
  const es = language === 'es';
  const { folders } = useSaveFolders();
  const live = folders.find((f) => f.id === folder.id) ?? folder;
  const count = live.work_ids.length;

  return (
    <GlassSheet
      wide
      title={es ? `Obras en «${live.name}»` : `Works in “${live.name}”`}
      onClose={onClose}
      footer={(close) => (
        <button type="button" onClick={close} className="w-full glass-button glass-button--primary">
          {es ? `Listo · ${count} ${count === 1 ? 'obra' : 'obras'}` : `Done · ${count} ${count === 1 ? 'work' : 'works'}`}
        </button>
      )}
    >
      {() => works.length === 0 ? (
        <p className="folder-pick-empty">{es ? 'Primero guarda alguna obra.' : 'Save a work first.'}</p>
      ) : (
        <ul className="folder-works-grid">
          {works.map((work, i) => {
            const inside = live.work_ids.includes(work.id);
            const picture = workPicture(work);
            return (
              <li key={work.id} style={{ ['--i' as string]: Math.min(i, 18) }}>
                <button
                  type="button"
                  className={`folder-works-item ${inside ? 'folder-works-item-on' : ''}`}
                  aria-pressed={inside}
                  aria-label={work.title}
                  onClick={() => user && void setWorkInFolder(user.id, live.id, work.id, !inside)}
                >
                  {picture
                    ? <img {...smallImage(picture)} alt="" loading="lazy" decoding="async" draggable={false} />
                    : <span className="folder-works-text"><NoPicture work={work} /><span>{work.title}</span></span>}
                  <span className={`folder-check ${inside ? 'folder-check-on' : ''}`} aria-hidden="true"><Check /></span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </GlassSheet>
  );
}
