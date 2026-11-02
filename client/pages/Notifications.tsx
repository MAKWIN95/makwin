import { useEffect, useState, type ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCircle2, Clock, Heart, Loader2, Shield, Sparkles, UserPlus, XCircle } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useI18n } from '@/lib/i18n';
import { useStarsBackground } from '@/hooks/use-stars-background';
import { loadNotifications, markAllRead, type AppNotification } from '@/lib/notifications';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const ICONS: Record<AppNotification['kind'], ComponentType<{ className?: string }>> = {
  work_held: Clock,
  work_approved: CheckCircle2,
  work_rejected: XCircle,
  admin_granted: Shield,
  admin_revoked: Shield,
  new_follower: UserPlus,
  work_liked: Heart,
  work_milestone: Sparkles,
};

const SHOWS_THE_WORK: AppNotification['kind'][] = ['work_liked', 'work_milestone'];

function pictureOf(item: AppNotification): string | null {
  if (!item.work || !SHOWS_THE_WORK.includes(item.kind)) return null;
  if (item.work.cover_url) return item.work.cover_url;
  return item.work.work_type === 'pintura' || item.work.work_type === 'fotografia' ? item.work.file_url : null;
}

function wordsFor(item: AppNotification, es: boolean): { title: string; detail: string } {
  const work = item.work?.title ?? item.title ?? (es ? 'Tu obra' : 'Your work');
  const number = (value: number) => value.toLocaleString(es ? 'es-ES' : 'en-US');
  switch (item.kind) {
    case 'work_held':
      return {
        title: es ? `«${work}» está en revisión` : `"${work}" is in review`,
        detail: es ? 'No ha pasado los filtros automáticos. La revisaremos y te lo contaremos aquí.' : 'It did not pass the automatic filters. We will review it and tell you here.',
      };
    case 'work_approved':
      return {
        title: es ? `«${work}» ya está publicada` : `"${work}" is now published`,
        detail: es ? 'La hemos revisado y ya puede verla todo el mundo.' : 'We have reviewed it and everyone can see it now.',
      };
    case 'work_rejected':
      return {
        title: es ? `«${work}» no se ha publicado` : `"${work}" was not published`,
        detail: es ? 'No cumple las normas de MAKWIN y la hemos eliminado.' : 'It does not follow the MAKWIN rules, so we have removed it.',
      };
    case 'new_follower': {
      const name = item.actor?.display_name || item.actor?.username || (es ? 'Alguien' : 'Someone');
      return {
        title: es ? `${name} ha empezado a seguirte` : `${name} started following you`,
        detail: item.actor ? `@${item.actor.username}` : '',
      };
    }
    case 'work_liked': {
      const people = item.amount ?? 1;
      if (!item.actor) return { title: es ? `A ${number(people)} ${people === 1 ? 'persona le' : 'personas les'} ha gustado «${work}»` : `${number(people)} ${people === 1 ? 'person' : 'people'} liked "${work}"`, detail: '' };
      const name = item.actor.display_name || item.actor.username;
      const others = Math.max(people - 1, 0);
      if (others === 0) return { title: es ? `A ${name} le ha gustado «${work}»` : `${name} liked "${work}"`, detail: '' };
      if (others === 1) return { title: es ? `A ${name} y a otra persona les ha gustado «${work}»` : `${name} and 1 other liked "${work}"`, detail: '' };
      return { title: es ? `A ${name} y a ${number(others)} personas más les ha gustado «${work}»` : `${name} and ${number(others)} others liked "${work}"`, detail: '' };
    }
    case 'work_milestone':
      return {
        title: es ? `¡«${work}» ya tiene ${number(item.amount ?? 0)} me gusta!` : `"${work}" just reached ${number(item.amount ?? 0)} likes!`,
        detail: '',
      };
    case 'admin_granted':
      return {
        title: es ? 'Ya eres administrador' : 'You are now an admin',
        detail: es ? 'Encontrarás el panel en el menú de tu perfil.' : 'You will find the panel in your profile menu.',
      };
    case 'admin_revoked':
      return {
        title: es ? 'Ya no eres administrador' : 'You are no longer an admin',
        detail: es ? 'Tus permisos de administrador se han retirado.' : 'Your admin access has been removed.',
      };
  }
}

function linkFor(item: AppNotification): string | null {
  if (item.kind === 'admin_granted') return '/admin';
  if (item.kind === 'new_follower') return item.actor ? `/u/${item.actor.username}` : null;
  return item.kind !== 'admin_revoked' && item.work_id ? `/work/${item.work_id}` : null;
}

function whenFor(date: string, language: string): string {
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (days < 7) {
    const talk = new Intl.RelativeTimeFormat(language, { numeric: 'auto' });
    if (days > 0) return talk.format(-days, 'day');
    const minutes = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    return minutes < 60 ? talk.format(-minutes, 'minute') : talk.format(-Math.floor(minutes / 60), 'hour');
  }
  return new Date(date).toLocaleDateString(language, { day: 'numeric', month: 'long' });
}

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
                    {picture && <img src={picture} alt="" loading="lazy" decoding="async" draggable={false} className="w-11 h-11 shrink-0 rounded-lg object-cover" />}
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
