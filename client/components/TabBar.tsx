import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { House, Heart, SquarePlus, Bell, User } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import { useUnreadNotifications } from '@/lib/notifications';

// The phone's tab bar (v1.1.36, v1.1.37): a floating pill of liquid glass at the bottom, like the
// iPhone apps, with "Subir obra" in the middle. A drop of glass sits under the page you are on and
// slides to the one you tap the moment your finger lifts, before the new page has even drawn: it
// only moves (transform), which the phone animates on its own, so a busy page can't make it stutter.
// It shrinks a touch while you scroll down and grows back when you scroll up.
// Shown only on phones and touch screens (the same rule as Tailwind's `phone:`), and it
// slides away on pages that need the whole screen or have their own bar at the bottom.

/** Pages without the bar: their own bottom bar, sign-in steps, or pages made to be sent to others. */
const AWAY = ['/login', '/registro', '/reset-password', '/completar-perfil', '/p/', '/beats', '/home'];

type Tab = {
  key: string;
  to: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  badge?: number;
};

export default function TabBar() {
  const location = useLocation();
  const path = location.pathname;
  const { user, profile, loading } = useAuth();
  const { language } = useI18n();
  const es = language === 'es';
  const unread = useUnreadNotifications(user?.id, path);
  const signedIn = Boolean(user) || loading;
  const mine = profile?.username ? `/u/${profile.username}` : null;

  const away = AWAY.some((p) => path === p || path.startsWith(p.endsWith('/') ? p : `${p}/`)) || path.startsWith('/p/');

  const gated = (to: string) => (signedIn ? to : '/login');
  const tabs: Tab[] = [
    { key: 'home', to: '/', label: es ? 'Inicio' : 'Home', icon: <House />, active: path === '/' || path === '/galeria' },
    { key: 'following', to: gated('/siguiendo'), label: es ? 'Siguiendo' : 'Following', icon: <Heart />, active: path === '/siguiendo' },
    { key: 'upload', to: gated('/subir-obra'), label: es ? 'Subir obra' : 'Upload work', icon: <SquarePlus />, active: path === '/subir-obra' },
    {
      key: 'news',
      to: gated('/notificaciones'),
      label: es ? `Notificaciones${unread ? `: ${unread} nuevas` : ''}` : `Notifications${unread ? `: ${unread} new` : ''}`,
      icon: <Bell />,
      active: path === '/notificaciones',
      badge: user ? unread : 0,
    },
    {
      key: 'me',
      to: mine ?? (signedIn ? '/configuracion' : '/login'),
      label: es ? 'Mi perfil' : 'My profile',
      icon: profile?.avatar_url ? (
        <span className="tabbar-avatar"><img src={profile.avatar_url} referrerPolicy="no-referrer" alt="" /></span>
      ) : profile ? (
        <span className="tabbar-avatar tabbar-avatar-letter">{(profile.display_name ?? profile.username ?? 'U').charAt(0).toUpperCase()}</span>
      ) : (
        <User />
      ),
      active: Boolean(mine) && (path === mine || path.startsWith(`${mine}/`)),
    },
  ];
  const activeKey = tabs.find((t) => t.active)?.key ?? null;

  // The drop of glass. Every tab is the same width, so the drop only ever slides (transform);
  // its width changes only when the screen does, never while it moves.
  const barRef = useRef<HTMLElement | null>(null);
  const dropRef = useRef<HTMLSpanElement | null>(null);
  const itemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const shownKey = useRef<string | null>(null);

  /** Slides the drop under `key` straight away (no waiting for React or the next page). */
  const slideTo = (key: string | null, animate = true) => {
    const drop = dropRef.current;
    const bar = barRef.current;
    const item = key ? itemRefs.current[key] : null;
    if (!drop || !bar || !bar.offsetWidth) return;
    if (!item) {
      drop.classList.add('tabbar-drop-off');
      shownKey.current = null;
      return;
    }
    const from = shownKey.current;
    drop.style.width = `${item.offsetWidth}px`;
    if (!animate || !from) {
      // first time, or coming back from no tab: appear in place, no slide across the bar
      drop.style.transition = 'none';
      drop.style.transform = `translateX(${item.offsetLeft}px)`;
      void drop.offsetWidth;
      drop.style.transition = '';
    } else if (from !== key) {
      drop.style.transform = `translateX(${item.offsetLeft}px)`;
      // the inner glass stretches a little in the direction it travels, then settles
      const glass = drop.firstElementChild as HTMLElement | null;
      if (glass) {
        glass.classList.remove('tabbar-drop-stretch');
        void glass.offsetWidth;
        glass.classList.add('tabbar-drop-stretch');
      }
    }
    drop.classList.remove('tabbar-drop-off');
    shownKey.current = key;
  };

  useLayoutEffect(() => {
    slideTo(activeKey);
    const onResize = () => slideTo(shownKey.current, false);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey]);

  // Scrolling down tucks the bar in a little; scrolling up brings it back.
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y < 80) setCompact(false);
        else if (y - last > 10) setCompact(true);
        else if (last - y > 10) setCompact(false);
        if (Math.abs(y - last) > 10 || y < 80) last = y;
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => { setCompact(false); }, [path]);

  // The page leaves room at the bottom only while the bar is there.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('has-tabbar', !away);
    return () => root.classList.remove('has-tabbar');
  }, [away]);

  const [pressed, setPressed] = useState<string | null>(null);
  // The red count shrinks away with its last number instead of blinking out.
  const lastBadge = useRef(0);
  if (user && unread) lastBadge.current = unread;

  return (
    <nav
      ref={barRef}
      aria-label={es ? 'Navegación principal' : 'Main navigation'}
      aria-hidden={away || undefined}
      className={`tabbar ${away ? 'tabbar-away' : ''} ${compact ? 'tabbar-compact' : ''}`}
    >
      <span aria-hidden="true" className="tabbar-sheen" />
      <span ref={dropRef} aria-hidden="true" className="tabbar-drop tabbar-drop-off">
        <span className={`tabbar-drop-glass ${pressed && pressed === shownKey.current ? 'tabbar-drop-pressed' : ''}`} />
      </span>
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          ref={(el) => { itemRefs.current[tab.key] = el; }}
          to={tab.to}
          tabIndex={away ? -1 : undefined}
          aria-label={tab.label}
          aria-current={tab.active ? 'page' : undefined}
          className={`tabbar-item ${tab.active ? 'tabbar-item-on' : ''} ${pressed === tab.key ? 'tabbar-item-pressed' : ''}`}
          onPointerDown={() => setPressed(tab.key)}
          onPointerUp={() => setPressed(null)}
          onPointerLeave={() => setPressed(null)}
          onPointerCancel={() => setPressed(null)}
          onClick={() => {
            // Tapping the page you are already on takes you back to its top.
            if (tab.active) window.scrollTo({ top: 0, behavior: 'smooth' });
            else if (signedIn || tab.key === 'home') slideTo(tab.key);
          }}
        >
          <span className="tabbar-icon">{tab.icon}</span>
          {tab.key === 'news' && (
            <span aria-hidden="true" className={`tabbar-badge ${tab.badge ? '' : 'tabbar-badge-off'}`}>
              {(tab.badge || lastBadge.current) > 9 ? '9+' : tab.badge || lastBadge.current}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}
