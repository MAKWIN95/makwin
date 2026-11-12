import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

// The one line that says what creating an account means: minimum age, terms and privacy.
export default function LegalConsent({ es, className }: { es: boolean; className?: string }) {
  const link = 'underline underline-offset-2 hover:text-[hsl(var(--foreground))] transition-colors';
  return (
    <p className={cn('text-center text-xs leading-relaxed text-[hsl(var(--muted-foreground))]', className)}>
      {es ? 'Al crear tu cuenta confirmas que tienes al menos 14 años y aceptas las ' : 'By creating an account you confirm you are at least 14 and accept the '}
      <Link to="/condiciones" className={link}>{es ? 'Condiciones de uso' : 'Terms of use'}</Link>
      {es ? ' y la ' : ' and the '}
      <Link to="/privacidad" className={link}>{es ? 'Política de privacidad' : 'Privacy policy'}</Link>
      .
    </p>
  );
}
