import { useEffect, useState } from 'react';
import { supabase, type Work } from '@/lib/supabase';

// What a card needs beyond what the gallery's feed brings. Every card of a page
// asks at once, and they all share one small request.
export interface WorkExtras {
  extra_images: string[];
  poem_font: string | null;
}

const BATCH_SIZE = 100;
const known = new Map<string, WorkExtras>();
const listeners = new Map<string, Set<() => void>>();
const pending = new Set<string>();
let timer: ReturnType<typeof setTimeout> | undefined;

function announce(id: string) {
  listeners.get(id)?.forEach((listener) => listener());
}

async function loadPending() {
  timer = undefined;
  const ids = [...pending];
  pending.clear();
  for (let start = 0; start < ids.length; start += BATCH_SIZE) {
    const { data, error } = await supabase
      .from('works')
      .select('id, extra_images, poem_font')
      .in('id', ids.slice(start, start + BATCH_SIZE));
    if (error) {
      console.warn('[work-extras] Could not load:', error.message);
      continue;
    }
    for (const row of data ?? []) {
      known.set(row.id, { extra_images: row.extra_images ?? [], poem_font: row.poem_font ?? null });
      announce(row.id);
    }
  }
}

export function rememberWorkExtras(id: string, extras: Partial<WorkExtras>) {
  known.set(id, { extra_images: [], poem_font: null, ...known.get(id), ...extras });
  announce(id);
}

export function useWorkExtras(work: Work): WorkExtras | null {
  const needed = ['pintura', 'fotografia', 'poema'].includes(work.work_type);
  const [, refresh] = useState(0);

  useEffect(() => {
    if (!needed) return;
    const listener = () => refresh((count) => count + 1);
    const forWork = listeners.get(work.id) ?? new Set();
    listeners.set(work.id, forWork);
    forWork.add(listener);
    if (!known.has(work.id)) {
      pending.add(work.id);
      timer ??= setTimeout(loadPending, 30);
    }
    return () => {
      forWork.delete(listener);
    };
  }, [needed, work.id]);

  return needed ? known.get(work.id) ?? null : null;
}
