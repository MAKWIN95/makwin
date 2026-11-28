import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { House, Heart, SquarePlus, Bookmark, Bell, User, Briefcase, Settings, Shield, LogIn, UserPlus, X } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import { useUnreadNotifications } from '@/lib/notifications';
import { setNavDrawer, useNavDrawer } from '@/lib/nav-drawer';

// The computer's side menu (v1.1.36): the three lines next to the back arrow open a panel of
// glass that slides in from the left with everything in one place, grouped. It closes with its
// own animation: Esc, a click beside it, the X, or choosing a page (the page changes behind it).

const ADMIN_HINT_KEY = 'makwin:admin-hint';
const isAdminHint = (id?: string) => {
  try { return Boolean(id) && localStorage.getItem(ADMIN_HINT_KEY) === id; } catch { return false; }
};

type Item = { to: string; label: string; icon: React.ReactNode; active: boolean; badge?: number };

export default function NavDrawer() {
  const open = useNavDrawer();
  const location = useLocation();
  const path = location.pathname;
  const { user, profile } = useAuth();
  const { language } = useI18n();
  const es = language === 'es';
  const unread = useUnreadNotifications(user?.id, path);

  // Stays on screen while it slides out.
  const [shown, setShown] = useState(open);
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    if (open) { setShown(true); setClosing(false); return; }
    if (!shown) return;
    setClosing(true);
    const t = window.setTimeout(() => { setShown(false); setClosing(false); }, 300);
    return () => window.clearTimeout(t);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // A new page, or a phone-sized window, closes it.
  useEffect(() => { setNavDrawer(false); }, [path]);
  useEffect(() => {
    const phone = window.matchMedia('(max-width: 640px), (pointer: coarse)');
    const onChange = () => { if (phone.matches) setNavDrawer(false); };
    phone.addEventListener('change', onChange);
    return () => phone.removeEventListener('change', onChange);
  }, []);

  // Esc closes; the keyboard starts inside the panel and comes back to the three lines after.
  const panelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const before = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setNavDrawer(false); };
    window.addEventListener('keydown', onKey);
    const t = window.setTimeout(() => panelRef.current?.querySelector<HTMLElement>('a, button')?.focus({ preventScroll: true }), 60);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(t);
      before?.focus?.({ preventScroll: true });
    };
  }, [open]);

  if (!shown) return null;

  const mine = profile?.username ?? null;
  const groups: { title: string; items: Item[] }[] = user
    ? [
        {
          title: es ? 'Explorar' : 'Explore',
          items: [
            { to: '/', label: es ? 'Inicio' : 'Home', icon: <House />, active: path === '/' || path === '/galeria' },
            { to: '/siguiendo', label: es ? 'Siguiendo' : 'Following', icon: <Heart />, active: path === '/siguiendo' },
          ],
        },
        {
          title: es ? 'Lo tuyo' : 'Yours',
          items: [
            ...(mine ? [{ to: `/u/${mine}`, label: es ? 'Mi perfil' : 'My profile', icon: <User />, active: path === `/u/${mine}` }] : []),
            ...(mine ? [{ to: `/p/${mine}`, label: es ? 'Mi portfolio' : 'My portfolio', icon: <Briefcase />, active: path === `/p/${mine}` || path === '/portfolio' }] : []),
            { to: '/subir-obra', label: es ? 'Subir obra' : 'Upload work', icon: <SquarePlus />, active: path === '/subir-obra' },
            { to: '/favoritos', label: es ? 'Guardados' : 'Saved', icon: <Bookmark />, active: path === '/favoritos' },
            { to: '/notificaciones', label: es ? 'Notificaciones' : 'Notifications', icon: <Bell />, active: path === '/notificaciones', badge: unread },
          ],
        },
        {
          title: es ? 'Cuenta' : 'Account',
          items: [
            { to: '/configuracion', label: es ? 'Configuración' : 'Settings', icon: <Settings />, active: path === '/configuracion' },
            ...(isAdminHint(user.id) ? [{ to: '/admin', label: es ? 'Administración' : 'Administration', icon: <Shield />, active: path === '/admin' }] : []),
          ],
        },
      ]
    : [
        {
          title: es ? 'Explorar' : 'Explore',
          items: [{ to: '/', label: es ? 'Inicio' : 'Home', icon: <House />, active: path === '/' || path === '/galeria' }],
        },
        {
          title: es ? 'Tu cuenta' : 'Your account',
          items: [
            { to: '/login', label: es ? 'Iniciar sesión' : 'Sign in', icon: <LogIn />, active: path === '/login' },
            { to: '/registro', label: es ? 'Crear cuenta' : 'Create account', icon: <UserPlus />, active: path === '/registro' },
          ],
        },
      ];

  let n = 0;
  return (
    <div className="nav-drawer-overlay" data-closing={closing || undefined}>
      <div className="nav-drawer-backdrop" onClick={() => setNavDrawer(false)} aria-hidden="true" />
      <div ref={panelRef} role="dialog" aria-modal="true" aria-label={es ? 'Menú' : 'Menu'} className="nav-drawer glass-panel">
        <div className="nav-drawer-top">
          <span className="logo-makwin text-xl">makwin</span>
          <button type="button" onClick={() => setNavDrawer(false)} className="ios-press header-button w-9 h-9 inline-flex items-center justify-center" aria-label={es ? 'Cerrar menú' : 'Close menu'}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {user && profile && (
          <Link to={`/u/${profile.username}`} className="nav-drawer-me" style={{ ['--i' as string]: n++ }}>
            <span className="nav-drawer-avatar">
              {profile.avatar_url
                ? <img src={profile.avatar_url} referrerPolicy="no-referrer" alt="" />
                : <span>{(profile.display_name ?? profile.username ?? 'U').charAt(0).toUpperCase()}</span>}
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold truncate">{profile.display_name}</span>
              <span className="block text-[13px] text-[hsl(var(--muted-foreground))] truncate">@{profile.username}</span>
            </span>
          </Link>
        )}

        <nav className="nav-drawer-groups">
          {groups.map((group) => (
            <div key={group.title} className="nav-drawer-group">
              <p className="nav-drawer-title" style={{ ['--i' as string]: n++ }}>{group.title}</p>
              {group.items.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={item.active ? 'page' : undefined}
                  className={`nav-drawer-item ${item.active ? 'nav-drawer-item-on' : ''}`}
                  style={{ ['--i' as string]: n++ }}
                  onClick={() => { if (item.active) setNavDrawer(false); }}
                >
                  <span className="nav-drawer-icon">{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  {Boolean(item.badge) && <span className="nav-drawer-badge">{item.badge! > 99 ? '99+' : item.badge}</span>}
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
}
