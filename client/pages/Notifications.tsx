import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useI18n } from '@/lib/i18n';
import { useStarsBackground } from '@/hooks/use-stars-background';
import { loadNotifications, markAllRead, type AppNotification } from '@/lib/notifications';
import { ICONS, linkFor, pictureOf, whenFor, wordsFor } from '@/lib/notification-words';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { smallImage } from '@/lib/small-photo';

export default function Notifications() {
  useRequireAuth();
  useStarsBackground('notifications-stars-background');
  const { user } = useAuth();
  const { language } = useI18n();
  const es = language === 'es';
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [failed, setFailed] = useState(false);

  // What was new stays marked for this visit, and is already read the next one.
  useEffect(() => {
    if (!user) return;
    let current = true;
    loadNotifications(user.id)
      .then((list) => {
        if (!current) return;
        // A kind this version does not know yet is skipped, not a broken page.
        setItems(list.filter((item) => ICONS[item.kind]));
        if (list.some((item) => !item.read_at)) void markAllRead(user.id);
      })
      .catch((error) => {
        console.error('[Notifications] Could not load:', error);
        if (current) setFailed(true);
      });
    return () => { current = false; };
  }, [user?.id]);

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] relative">
      <div id="notifications-stars-background" className="absolute inset-0 z-0 stars-background" />
      <div className="relative z-10">
        <Header showSearchCentered hideSearch />
        <main className="max-w-2xl mx-auto px-4 sm:px-8 py-10 phone:py-6 page-enter">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
            <h1 className="text-2xl font-light text-[hsl(var(--foreground))]">{es ? 'Notificaciones' : 'Notifications'}</h1>
          </div>

          {failed ? (
            <p role="alert" className="py-16 text-center text-sm text-[hsl(var(--muted-foreground))]">
              {es ? 'No se han podido cargar. Vuelve a intentarlo en un momento.' : 'They could not be loaded. Try again in a moment.'}
            </p>
          ) : !items ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--muted-foreground))]" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-[hsl(var(--border))] rounded-2xl">
              <Bell className="w-10 h-10 text-[hsl(var(--muted-foreground))] mx-auto mb-3" />
              <p className="text-[hsl(var(--muted-foreground))] text-sm">
                {es ? 'Aquí verás lo que pase con tus seguidores, tus obras y tu cuenta.' : 'What happens with your followers, your works and your account will appear here.'}
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => {
                const Icon = ICONS[item.kind];
                const { title, detail } = wordsFor(item, es);
                const to = linkFor(item);
                const picture = pictureOf(item);
                const body = (
                  <>
                    <Icon className="w-5 h-5 mt-0.5 shrink-0 text-[hsl(var(--muted-foreground))]" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-[hsl(var(--foreground))] break-words">{title}</span>
                      {detail && <span className="block mt-0.5 text-sm text-[hsl(var(--muted-foreground))]">{detail}</span>}
                      <span className="block mt-1 text-xs text-[hsl(var(--muted-foreground))]">{whenFor(item.created_at, language)}</span>
                    </span>
                    {picture && <img {...smallImage(picture)} alt="" loading="lazy" decoding="async" draggable={false} className="w-11 h-11 shrink-0 rounded-lg object-cover" />}
                    {!item.read_at && <span aria-label={es ? 'Nueva' : 'New'} className="w-2 h-2 mt-1.5 shrink-0 rounded-full bg-red-500" />}
                  </>
                );
                const look = `flex items-start gap-3 p-4 rounded-2xl border border-[hsl(var(--foreground)/0.12)] bg-[hsl(var(--card))]`;
                return (
                  <li key={item.id}>
                    {to ? <Link to={to} className={`${look} ios-press`}>{body}</Link> : <div className={look}>{body}</div>}
                  </li>
                );
              })}
            </ul>
          )}
        </main>
        <Footer />
      </div>
    </div>
  );
}
