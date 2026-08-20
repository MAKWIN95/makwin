import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

/**
 * Hook que requiere autenticación completa (no onboarding incompleto).
 * Si el usuario no está autenticado o está en onboarding, redirige a login.
 * 
 * Uso en componentes:
 * export default function ProtectedPage() {
 *   useRequireAuth();
 *   // Rest of component
 * }
 */
export function useRequireAuth() {
  const { user, needsUsernameSetup, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Skip check while loading
    if (loading) return;

    // Redirect to login if not authenticated or in onboarding
    if (!user || needsUsernameSetup) {
      navigate('/login', { replace: true });
    }
  }, [user, needsUsernameSetup, loading, navigate]);
}
