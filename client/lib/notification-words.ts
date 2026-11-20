// How each notification reads, which icon and picture it shows, and where it leads:
// shared by the notifications page and the bell's window.
import type { ComponentType } from 'react';
import { CheckCircle2, Clock, Heart, Shield, Sparkles, UserPlus, XCircle } from 'lucide-react';
import type { AppNotification } from '@/lib/notifications';

export const ICONS: Record<AppNotification['kind'], ComponentType<{ className?: string }>> = {
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

export function pictureOf(item: AppNotification): string | null {
  if (!item.work || !SHOWS_THE_WORK.includes(item.kind)) return null;
  if (item.work.cover_url) return item.work.cover_url;
  return item.work.work_type === 'pintura' || item.work.work_type === 'fotografia' ? item.work.file_url : null;
}

export function wordsFor(item: AppNotification, es: boolean): { title: string; detail: string } {
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

export function linkFor(item: AppNotification): string | null {
  if (item.kind === 'admin_granted') return '/admin';
  if (item.kind === 'new_follower') return item.actor ? `/u/${item.actor.username}` : null;
  return item.kind !== 'admin_revoked' && item.work_id ? `/work/${item.work_id}` : null;
}

export function whenFor(date: string, language: string): string {
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (days < 7) {
    const talk = new Intl.RelativeTimeFormat(language, { numeric: 'auto' });
    if (days > 0) return talk.format(-days, 'day');
    const minutes = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    return minutes < 60 ? talk.format(-minutes, 'minute') : talk.format(-Math.floor(minutes / 60), 'hour');
  }
  return new Date(date).toLocaleDateString(language, { day: 'numeric', month: 'long' });
}
