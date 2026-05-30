import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface Submission {
  id: string;
  artistName: string;
  title: string;
  workType: string;
  description: string;
  timestamp: string;
}

export default function SubmittedWorks() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [notifLeaving, setNotifLeaving] = useState(false);

  useEffect(() => {
    // Check if we just came from a successful submission
    const urlParams = new URLSearchParams(window.location.search);
    const justSubmitted = urlParams.get('success') === 'true';
    const submissionId = urlParams.get('id');

    if (justSubmitted && submissionId) {
      setSuccessMessage(`¡Obra enviada exitosamente! (ID: ${submissionId})`);
      // Clear message after 5 seconds
      setNotifLeaving(false);
      // start hide sequence after 4s
      const hideTimer = setTimeout(() => setNotifLeaving(true), 4000);
      // remove message after animation (400ms)
      const clearTimer = setTimeout(() => setSuccessMessage(''), 4400);
      setLoading(false);
      return () => {
        clearTimeout(hideTimer);
        clearTimeout(clearTimer);
      };
    }

    // Load submitted works (mock data for now)
    // In a real app, you'd fetch this from /api/submissions
    setLoading(false);
  }, []);

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <Header />
      <main className="w-full page-enter">
        <div className="px-4 sm:px-8 py-8 sm:py-12">
          <div className="max-w-4xl mx-auto">
            {/* Success Message - animated from navbar */}
            {successMessage && (
              <div className={`notify-from-nav ${notifLeaving ? 'leave' : ''} bg-white dark:bg-[hsl(var(--popover))] border border-[hsl(var(--border))] p-4`}> 
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-green-600 font-medium">{successMessage}</p>
                    <p className="text-xs text-green-600/70 mt-1">
                      Te notificaremos cuando el equipo MAKWIN revise tu obra.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-600">{error}</p>
              </div>
            )}

            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-[hsl(var(--foreground))] mb-2">
                Obras enviadas
              </h1>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Aquí puedes ver el historial de tus obras enviadas a MAKWIN
              </p>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="text-center py-12">
                <div className="inline-block w-6 h-6 border-2 border-[hsl(var(--muted-foreground))] border-t-[hsl(var(--foreground))] rounded-full animate-spin"></div>
                <p className="mt-4 text-[hsl(var(--muted-foreground))]">Cargando obras...</p>
              </div>
            )}

            {/* Empty State */}
            {!loading && submissions.length === 0 && !successMessage && (
              <div className="text-center py-12 border border-dashed border-[hsl(var(--border))] rounded-lg">
                <div className="text-4xl mb-3">📮</div>
                <p className="text-[hsl(var(--foreground))] font-medium mb-2">
                  Aún no has enviado ninguna obra
                </p>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  Haz clic en el botón flotante para enviar tu primera obra a MAKWIN
                </p>
              </div>
            )}

            {/* Submissions List */}
            {!loading && submissions.length > 0 && (
              <div className="space-y-4">
                {submissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="p-6 border border-[hsl(var(--border))] rounded-lg hover:border-[hsl(var(--foreground))] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-[hsl(var(--foreground))]">
                          {submission.title}
                        </h3>
                        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                          por {submission.artistName}
                        </p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2">
                          <span className="inline-block bg-[hsl(var(--secondary))] px-2 py-1 rounded">
                            {submission.workType}
                          </span>
                        </p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-3">
                          Enviado: {new Date(submission.timestamp).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                      <div className="text-right text-xs text-[hsl(var(--muted-foreground))]">
                        ID: {submission.id}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
