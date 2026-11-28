import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { House, Heart, SquarePlus, Bookmark, Bell, User } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import { useUnreadNotifications } from '@/lib/notifications';

// The phone's tab bar (v1.1.36): a floating pill of liquid glass at the bottom, like the
// iPhone apps. A drop of glass sits under the page you are on and slides, stretching a little,
// to the one you tap. It shrinks a touch while you scroll down and grows back when you scroll up.
// Shown only on phones and touch screens (the same rule as Tailwind's `phone:`), and it
// slides away on pages that need the whole screen or have their own bar at the bottom.

/** Pages without the bar: their own bottom bar, sign-in steps, or pages made to be sent to others. */
const AWAY = ['/subir-obra', '/login', '/registro', '/reset-password', '/completar-perfil', '/p/', '/beats', '/home'];

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
    { key: 'saved', to: gated('/favoritos'), label: es ? 'Guardados' : 'Saved', icon: <Bookmark />, active: path === '/favoritos' },
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

  // The drop of glass: measured under the tab you are on, never fixed, so it follows any width.
  const barRef = useRef<HTMLElement | null>(null);
  const itemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [drop, setDrop] = useState<{ x: number; w: number } | null>(null);
  const [moving, setMoving] = useState(false);
  const lastKey = useRef<string | null>(activeKey);

  useLayoutEffect(() => {
    const place = () => {
      const item = activeKey ? itemRefs.current[activeKey] : null;
      const bar = barRef.current;
      if (!item || !bar || !bar.offsetWidth) return;
      const next = { x: item.offsetLeft, w: item.offsetWidth };
      setDrop((cur) => (cur && cur.x === next.x && cur.w === next.w ? cur : next));
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [activeKey]);

  // Sliding to another tab, the drop stretches like liquid and settles.
  useEffect(() => {
    if (lastKey.current && activeKey && lastKey.current !== activeKey) {
      setMoving(true);
      const t = window.setTimeout(() => setMoving(false), 320);
      lastKey.current = activeKey;
      return () => window.clearTimeout(t);
    }
    lastKey.current = activeKey;
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
      <span
        aria-hidden="true"
        className={`tabbar-drop ${activeKey ? '' : 'tabbar-drop-off'} ${moving ? 'tabbar-drop-moving' : ''} ${pressed && pressed === activeKey ? 'tabbar-drop-pressed' : ''}`}
        style={drop ? { width: drop.w, transform: `translateX(${drop.x}px)` } : { opacity: 0 }}
      />
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
