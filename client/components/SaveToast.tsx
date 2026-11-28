import { useEffect, useRef, useState } from 'react';
import { Bookmark, ChevronRight } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import { loadFolders, useLastSaved, useSaveFolders } from '@/lib/save-folders';
import { FolderPickerSheet } from '@/components/SaveFolderSheets';

const SHOWN_MS = 4500;
const LEAVE_MS = 260;

// Like TikTok and Instagram (v1.1.39): saving a work anywhere brings up a small pill of
// glass at the bottom, «Guardado · Añadir a carpeta», for a few seconds. Tapping it opens
// the folders for that work. Without folders in the database it simply never appears.
export default function SaveToast() {
  const { user } = useAuth();
  const { language } = useI18n();
  const es = language === 'es';
  const saved = useLastSaved();
  const { available } = useSaveFolders();
  const [shown, setShown] = useState<{ workId: string; at: number } | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [picking, setPicking] = useState<string | null>(null);
  const timers = useRef<number[]>([]);

  const clear = () => { timers.current.forEach((t) => window.clearTimeout(t)); timers.current = []; };
  const hide = () => {
    clear();
    setLeaving(true);
    timers.current.push(window.setTimeout(() => { setShown(null); setLeaving(false); }, LEAVE_MS));
  };

  useEffect(() => {
    if (!saved || !user || Date.now() - saved.at > 2000) return;
    let current = true;
    void loadFolders(user.id).then(() => {
      if (!current) return;
      clear();
      setLeaving(false);
      setShown(saved);
      timers.current.push(window.setTimeout(hide, SHOWN_MS));
    });
    return () => { current = false; };
  }, [saved?.at]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => clear, []);

  return (
    <>
      {shown && available && (
        <div className="save-toast-wrap" data-leaving={leaving || undefined} role="status" key={shown.at}>
          <div className="save-toast glass-panel">
            <span className="save-toast-done"><Bookmark /></span>
            <span className="save-toast-text">{es ? 'Guardado' : 'Saved'}</span>
            <button
              type="button"
              className="save-toast-action ios-press"
              onClick={() => { setPicking(shown.workId); hide(); }}
            >
              {es ? 'Añadir a carpeta' : 'Add to folder'}
              <ChevronRight />
            </button>
          </div>
        </div>
      )}
      {picking && <FolderPickerSheet workId={picking} onClose={() => setPicking(null)} />}
    </>
  );
}
