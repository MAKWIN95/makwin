import { useSyncExternalStore } from 'react';
import { supabase } from '@/lib/supabase';

// Folders inside «Guardados» (v1.1.39), like TikTok's collections. One copy for the whole
// app, so the folder window opened after saving a work and the Guardados page always agree.
// Every change shows at once and is sent behind; if the server says no, it is put back.

export interface SaveFolder {
  id: string;
  name: string;
  created_at: string;
  /** Newest first. */
  work_ids: string[];
}

type State = {
  userId: string | null;
  folders: SaveFolder[];
  loaded: boolean;
  /** False when the database does not have folders yet: the option simply isn't shown. */
  available: boolean;
};

let state: State = { userId: null, folders: [], loaded: false, available: true };
const listeners = new Set<() => void>();
let loading: Promise<void> | null = null;

function set(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

export const FOLDER_NAME_MAX = 40;
export const cleanFolderName = (name: string) => name.replace(/\s+/g, ' ').trim().slice(0, FOLDER_NAME_MAX);

const missingTable = (error: { code?: string; message?: string } | null) =>
  Boolean(error) && (error!.code === '42P01' || error!.code === 'PGRST205' || /save_folder/.test(error!.message ?? '') && /exist|find|schema/i.test(error!.message ?? ''));

/** Loads the folders of `userId` (once; again only with `force`). */
export function loadFolders(userId: string | null | undefined, force = false): Promise<void> {
  const id = userId ?? null;
  if (!id) {
    set({ userId: null, folders: [], loaded: false });
    return Promise.resolve();
  }
  if (!force && state.userId === id && (state.loaded || loading)) return loading ?? Promise.resolve();
  if (state.userId !== id) set({ userId: id, folders: [], loaded: false });
  loading = (async () => {
    try {
      const [{ data: folders, error }, { data: items, error: itemsError }] = await Promise.all([
        supabase.from('save_folders').select('id, name, created_at').eq('user_id', id).order('created_at', { ascending: true }),
        supabase.from('save_folder_works').select('folder_id, work_id, created_at').eq('user_id', id).order('created_at', { ascending: false }),
      ]);
      if (missingTable(error) || missingTable(itemsError)) {
        set({ available: false, loaded: true, folders: [] });
        return;
      }
      if (error) throw error;
      if (itemsError) throw itemsError;
      if (state.userId !== id) return;
      const byFolder = new Map<string, string[]>();
      for (const item of items ?? []) {
        const list = byFolder.get(item.folder_id) ?? [];
        list.push(item.work_id);
        byFolder.set(item.folder_id, list);
      }
      set({
        available: true,
        loaded: true,
        folders: (folders ?? []).map((f) => ({ ...f, work_ids: byFolder.get(f.id) ?? [] })),
      });
    } catch (error) {
      console.error('[SaveFolders] Could not load:', error);
      set({ loaded: true });
    } finally {
      loading = null;
    }
  })();
  return loading;
}

export function useSaveFolders(): State {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    () => state,
    () => state,
  );
}

/** Makes a folder (optionally with a work already in it). Returns it, or null. */
export async function createFolder(userId: string, rawName: string, firstWorkId?: string): Promise<SaveFolder | null> {
  const name = cleanFolderName(rawName);
  if (!name) return null;
  const { data, error } = await supabase.from('save_folders').insert({ user_id: userId, name }).select('id, name, created_at').single();
  if (error || !data) {
    console.error('[SaveFolders] Could not create:', error?.message);
    return null;
  }
  const folder: SaveFolder = { ...data, work_ids: [] };
  set({ folders: [...state.folders, folder] });
  if (firstWorkId) await setWorkInFolder(userId, folder.id, firstWorkId, true);
  return state.folders.find((f) => f.id === folder.id) ?? folder;
}

export async function renameFolder(folderId: string, rawName: string): Promise<boolean> {
  const name = cleanFolderName(rawName);
  const before = state.folders;
  if (!name) return false;
  set({ folders: before.map((f) => (f.id === folderId ? { ...f, name } : f)) });
  const { error } = await supabase.from('save_folders').update({ name }).eq('id', folderId);
  if (error) {
    console.error('[SaveFolders] Could not rename:', error.message);
    set({ folders: before });
    return false;
  }
  return true;
}

/** Deletes the folder only: its works stay in Guardados. */
export async function deleteFolder(folderId: string): Promise<boolean> {
  const before = state.folders;
  set({ folders: before.filter((f) => f.id !== folderId) });
  const { error } = await supabase.from('save_folders').delete().eq('id', folderId);
  if (error) {
    console.error('[SaveFolders] Could not delete:', error.message);
    set({ folders: before });
    return false;
  }
  return true;
}

export async function setWorkInFolder(userId: string, folderId: string, workId: string, inside: boolean): Promise<boolean> {
  const before = state.folders;
  set({
    folders: before.map((f) => {
      if (f.id !== folderId) return f;
      const rest = f.work_ids.filter((id) => id !== workId);
      return { ...f, work_ids: inside ? [workId, ...rest] : rest };
    }),
  });
  const { error } = inside
    ? await supabase.from('save_folder_works').upsert({ user_id: userId, folder_id: folderId, work_id: workId }, { onConflict: 'folder_id,work_id', ignoreDuplicates: true })
    : await supabase.from('save_folder_works').delete().eq('folder_id', folderId).eq('work_id', workId);
  if (error) {
    console.error('[SaveFolders] Could not change folder:', error.message);
    set({ folders: before });
    return false;
  }
  return true;
}

/** A work taken out of Guardados leaves every folder too (the database does the same). */
export function forgetWorkInFolders(workId: string) {
  if (!state.folders.some((f) => f.work_ids.includes(workId))) return;
  set({ folders: state.folders.map((f) => ({ ...f, work_ids: f.work_ids.filter((id) => id !== workId) })) });
}

// ---- The little "Guardado" notice that appears after saving, anywhere in the app ----

type Saved = { workId: string; at: number } | null;
let lastSaved: Saved = null;
const savedListeners = new Set<() => void>();

export function announceSaved(workId: string) {
  lastSaved = { workId, at: Date.now() };
  savedListeners.forEach((listener) => listener());
}

export function useLastSaved(): Saved {
  return useSyncExternalStore(
    (listener) => { savedListeners.add(listener); return () => savedListeners.delete(listener); },
    () => lastSaved,
    () => null,
  );
}
