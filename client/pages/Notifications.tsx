import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, ChevronDown, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useI18n } from '@/lib/i18n';
import { useStarsBackground } from '@/hooks/use-stars-background';
import { loadNotifications, markAllRead, type AppNotification } from '@/lib/notifications';
import { ICONS, linkFor, pictureOf, whenFor, wordsFor } from '@/lib/notification-words';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PageTitle from '@/components/PageTitle';
import { smallImage } from '@/lib/small-photo';

// The notifications (v1.1.38): clear glass over the stars and a short row each, like the
// rest of the site. What is new comes first, then this week; everything older folds into
// one row («Anteriores») that opens when you want it, like TikTok, so it never gets in the way.

const WEEK_MS = 7 * 86400000;

export default function Notifications() {
  useRequireAuth();
  useStarsBackground('notifications-stars-background');
  const { user } = useAuth();
  const { language } = useI18n();
  const es = language === 'es';
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [olderOpen, setOlderOpen] = useState(false);

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

  const now = Date.now();
  const fresh = items?.filter((item) => !item.read_at) ?? [];
  const week = items?.filter((item) => item.read_at && now - new Date(item.created_at).getTime() < WEEK_MS) ?? [];
  const older = items?.filter((item) => item.read_at && now - new Date(item.created_at).getTime() >= WEEK_MS) ?? [];
  // With nothing newer, the old ones are all there is: shown open.
  const showOlder = olderOpen || (fresh.length === 0 && week.length === 0);

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] relative">
      <div id="notifications-stars-background" className="absolute inset-0 z-0 stars-background" />
      <div className="relative z-10">
        <Header showSearchCentered hideSearch breadcrumb={es ? 'Notificaciones' : 'Notifications'} />
        <main className="max-w-2xl mx-auto px-4 sm:px-8 pt-5 pb-10 phone:pt-3 page-enter">
          <PageTitle
            icon={<Bell />}
            title={es ? 'Notificaciones' : 'Notifications'}
            subtitle={es ? 'Lo que pasa con tus obras, tus seguidores y tu cuenta' : 'What happens with your works, your followers and your account'}
          />

          {failed ? (
            <p role="alert" className="py-16 text-center text-sm text-[hsl(var(--muted-foreground))]">
              {es ? 'No se han podido cargar. Vuelve a intentarlo en un momento.' : 'They could not be loaded. Try again in a moment.'}
            </p>
          ) : !items ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--muted-foreground))]" />
            </div>
          ) : items.length === 0 ? (
            <div className="page-empty">
              <Bell className="w-10 h-10 text-[hsl(var(--muted-foreground))] mx-auto mb-3" />
              <p className="text-[hsl(var(--muted-foreground))] text-sm">
                {es ? 'No tienes notificaciones. Aquí verás lo que pase con tus seguidores, tus obras y tu cuenta.' : 'No notifications. What happens with your followers, your works and your account will appear here.'}
              </p>
            </div>
          ) : (
            <div className="notif-sections">
              {fresh.length > 0 && <Section title={es ? 'Nuevas' : 'New'} items={fresh} es={es} language={language} />}
              {week.length > 0 && <Section title={es ? 'Esta semana' : 'This week'} items={week} es={es} language={language} delay={fresh.length} />}
              {older.length > 0 && (
                fresh.length === 0 && week.length === 0 ? (
                  <Section title={es ? 'Anteriores' : 'Earlier'} items={older} es={es} language={language} />
                ) : (
                  <section className="notif-section" style={{ ['--i' as string]: Math.min(fresh.length + week.length, 10) }}>
                    <button
                      type="button"
                      className="notif-list notif-older"
                      aria-expanded={showOlder}
                      onClick={() => setOlderOpen((open) => !open)}
                    >
                      <span className="notif-stack" aria-hidden="true">
                        {older.slice(0, 3).map((item) => {
                          const Icon = ICONS[item.kind];
                          return <span key={item.id} className="notif-icon"><Icon /></span>;
                        })}
                      </span>
                      <span className="min-w-0 flex-1 text-left">
                        <span className="notif-title">{es ? 'Anteriores' : 'Earlier'}</span>
                        <span className="notif-meta">
                          {es
                            ? `${older.length} ${older.length === 1 ? 'notificación antigua' : 'notificaciones antiguas'}`
                            : `${older.length} older ${older.length === 1 ? 'notification' : 'notifications'}`}
                        </span>
                      </span>
                      <ChevronDown className="notif-chevron" aria-hidden="true" />
                    </button>
                    <div className="notif-more" data-open={showOlder || undefined}>
                      <div className="notif-more-inner">
                        <ul className="notif-list notif-more-list">{older.map((item, i) => <Row key={item.id} item={item} index={i} es={es} language={language} />)}</ul>
                      </div>
                    </div>
                  </section>
                )
              )}
            </div>
          )}
        </main>
        <Footer />
      </div>
    </div>
  );
}

function Section({ title, items, es, language, delay = 0 }: { title: string; items: AppNotification[]; es: boolean; language: string; delay?: number }) {
  return (
    <section className="notif-section" style={{ ['--i' as string]: Math.min(delay, 10) }}>
      <h2 className="notif-section-title">{title}</h2>
      <ul className="notif-list">
        {items.map((item, i) => <Row key={item.id} item={item} index={delay + i} es={es} language={language} />)}
      </ul>
    </section>
  );
}

function Row({ item, index, es, language }: { item: AppNotification; index: number; es: boolean; language: string }) {
  const Icon = ICONS[item.kind];
  const { title, detail } = wordsFor(item, es);
  const to = linkFor(item);
  const picture = pictureOf(item);
  const when = whenFor(item.created_at, language);
  const warm = item.kind === 'work_liked' || item.kind === 'work_milestone';

  const body = (
    <>
      <span className={`notif-icon ${warm ? 'notif-icon-warm' : ''}`}><Icon /></span>
      <span className="min-w-0 flex-1">
        <span className="notif-title">{title}</span>
        <span className="notif-meta">{detail ? `${detail} · ${when}` : when}</span>
      </span>
      {picture && <img {...smallImage(picture)} alt="" loading="lazy" decoding="async" draggable={false} className="notif-picture" />}
      {!item.read_at && <span aria-label={es ? 'Nueva' : 'New'} className="notif-dot" />}
    </>
  );
  const look = `notif-body ${item.read_at ? '' : 'notif-body-new'}`;
  return (
    <li className="notif-row" style={{ ['--i' as string]: Math.min(index, 12) }}>
      {to ? <Link to={to} className={look}>{body}</Link> : <div className={look}>{body}</div>}
    </li>
  );
}
