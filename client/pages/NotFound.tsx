import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useI18n } from "@/lib/i18n";

const NotFound = () => {
  const location = useLocation();
  const { t } = useI18n();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))]">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4 text-[hsl(var(--foreground))]">404</h1>
        <p className="text-xl text-[hsl(var(--muted-foreground))] mb-4">{t('songNotFound')}</p>
        <Link to="/" className="text-[hsl(var(--muted-foreground))] underline underline-offset-2 hover:text-[hsl(var(--foreground))] transition-colors">
          {t('returnToHome')}
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
