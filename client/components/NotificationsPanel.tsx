import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bell, Loader2, X } from 'lucide-react';
import { loadNotifications, markAllRead, type AppNotification } from '@/lib/notifications';
import { ICONS, linkFor, pictureOf, whenFor, wordsFor } from '@/lib/notification-words';
import { smallImage } from '@/lib/small-photo';

const SHOWN = 8;
const CLOSE_MS = 200;

interface Props {
  userId: string;
  open: boolean;
  /** Where it sits: just under the bar, as wide as the row of buttons. */
  place: { top: number; width: number } | null;
  es: boolean;
  language: string;
  onClose: () => void;
}

/**
 * The bell's shortcut: a glass column that unfolds under the bar's buttons with the
 * latest news, short. The full list stays on the notifications page.
 */
export default function NotificationsPanel({ userId, open, place, es, language, onClose }: Props) {
  const [mounted, setMounted] = useState(open);
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [failed, setFailed] = useState(false);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  // Stays on screen while it folds back up.
  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    const timer = window.setTimeout(() => setMounted(false), CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  // Fresh every time it opens; what was new keeps its dot for this look, and is read after.
  useEffect(() => {
    if (!open) return;
    let current = true;
    setFailed(false);
    loadNotifications(userId)
      .then((list) => {
        if (!current) return;
        setItems(list.filter((item) => ICONS[item.kind]));
        if (list.some((item) => !item.read_at)) void markAllRead(userId);
      })
      .catch((error) => {
        console.error('[Notifications] Could not load:', error);
        if (current) setFailed(true);
      });
    return () => { current = false; };
  }, [open, userId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!mounted) return null;
  const shown = items?.slice(0, SHOWN) ?? null;

  return (
    <div
      role="dialog"
      aria-label={es ? 'Notificaciones' : 'Notifications'}
      className="notif-panel glass-bar"
      data-state={open ? 'open' : 'closed'}
      style={place ? { top: `calc(100% + ${place.top}px)`, width: place.width } : undefined}
    >
      <div className="flex items-center justify-between gap-2 pl-4 pr-1.5 pt-1.5 pb-1">
        <span className="text-sm font-medium text-[hsl(var(--foreground))]">{es ? 'Notificaciones' : 'Notifications'}</span>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={es ? 'Cerrar' : 'Close'}
          className="ios-press header-button inline-flex items-center justify-center w-9 h-9 shrink-0"
        >
          <X className="w-4 h-4 text-[hsl(var(--foreground))]" />
        </button>
      </div>

      <div className="notif-panel-list">
        {failed ? (
          <p role="alert" className="px-4 py-8 text-center text-xs text-[hsl(var(--muted-foreground))]">
            {es ? 'No se han podido cargar. Prueba otra vez en un momento.' : 'They could not be loaded. Try again in a moment.'}
          </p>
        ) : !shown ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--muted-foreground))]" />
          </div>
        ) : shown.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Bell className="w-6 h-6 mx-auto mb-2 text-[hsl(var(--muted-foreground))]" />
            <p className="text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">
              {es ? 'Aquí verás lo que pase con tus seguidores, tus obras y tu cuenta.' : 'What happens with your followers, your works and your account will show here.'}
            </p>
          </div>
        ) : (
          <ul className="px-1.5 pb-1">
            {shown.map((item, index) => {
              const Icon = ICONS[item.kind];
              const { title } = wordsFor(item, es);
              const to = linkFor(item);
              const picture = pictureOf(item);
              const body = (
                <>
                  <Icon className="w-4 h-4 mt-0.5 shrink-0 text-[hsl(var(--muted-foreground))]" />
                  <span className="min-w-0 flex-1">
                    <span className="notif-panel-title block text-[13px] leading-snug text-[hsl(var(--foreground))]">{title}</span>
                    <span className="block mt-0.5 text-[11px] text-[hsl(var(--muted-foreground))]">{whenFor(item.created_at, language)}</span>
                  </span>
                  {picture && <img {...smallImage(picture)} alt="" loading="lazy" decoding="async" draggable={false} className="w-8 h-8 shrink-0 rounded-md object-cover" />}
                  {!item.read_at && <span aria-label={es ? 'Nueva' : 'New'} className="w-1.5 h-1.5 mt-1.5 shrink-0 rounded-full bg-red-500" />}
                </>
              );
              const look = 'notif-panel-item flex items-start gap-2.5 px-2.5 py-2.5 rounded-xl';
              return (
                <li key={item.id} style={{ animationDelay: `${60 + index * 35}ms` }} className="notif-panel-row">
                  {to ? <Link to={to} onClick={onClose} className={`${look} ios-press hover:bg-[hsl(var(--foreground)/0.06)] transition-colors`}>{body}</Link> : <div className={look}>{body}</div>}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Link
        to="/notificaciones"
        onClick={onClose}
        className="ios-press flex items-center justify-center gap-1.5 mx-1.5 mb-1.5 mt-0.5 py-2.5 rounded-xl text-xs font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--foreground)/0.06)] transition-colors"
      >
        {es ? 'Ver todas' : 'See all'} <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
