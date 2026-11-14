import { useEffect } from 'react';

// Each page names itself in the browser tab, in search results and in shared links.

const SITE = 'MAKWIN';

export function pageTitle(name?: string | null): string {
  return name ? `${name} · ${SITE}` : `${SITE} · La red social para artistas`;
}

type Language = 'es' | 'en';

const FIXED: Record<string, { es: string; en: string } | null> = {
  '/': null,
  '/galeria': null,
  '/home': null,
  '/login': { es: 'Iniciar sesión', en: 'Sign in' },
  '/registro': { es: 'Crear cuenta', en: 'Create account' },
  '/reset-password': { es: 'Nueva contraseña', en: 'New password' },
  '/subir-obra': { es: 'Subir obra', en: 'Upload work' },
  '/favoritos': { es: 'Guardados', en: 'Saved' },
  '/notificaciones': { es: 'Notificaciones', en: 'Notifications' },
  '/siguiendo': { es: 'Siguiendo', en: 'Following' },
  '/configuracion': { es: 'Configuración', en: 'Settings' },
  '/completar-perfil': { es: 'Completa tu perfil', en: 'Complete your profile' },
  '/merch': { es: 'Merch', en: 'Merch' },
  '/marketplace': { es: 'Marketplace', en: 'Marketplace' },
  '/admin': { es: 'Panel', en: 'Admin' },
};

/** Pages that name themselves once their content arrives (a work, a profile, a legal text, the beats). */
const NAMED_BY_PAGE = [/^\/work\//, /^\/u\//, /^\/beats/];

/** The tab title for a fixed page, or undefined when the page sets its own. */
export function titleForPath(pathname: string, language: Language, legalPaths: string[] = []): string | undefined {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (legalPaths.includes(path) || NAMED_BY_PAGE.some((re) => re.test(path))) return undefined;
  if (path in FIXED) {
    const name = FIXED[path];
    return pageTitle(name ? (language === 'en' ? name.en : name.es) : null);
  }
  return pageTitle(language === 'en' ? 'Page not found' : 'Página no encontrada');
}

/** Names the page in the tab while it is open; nothing changes until `name` is known. */
export function usePageTitle(name: string | null | undefined) {
  useEffect(() => {
    if (name) document.title = pageTitle(name);
  }, [name]);
}
