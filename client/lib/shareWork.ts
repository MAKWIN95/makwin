import { toast } from 'sonner';

// The phone's own share sheet where there is one, otherwise the link is copied.
export async function shareWork(work: { id: string; title: string }, es: boolean) {
  const url = `${window.location.origin}/work/${work.id}`;

  if (navigator.share) {
    try {
      await navigator.share({ title: work.title, url });
    } catch (error) {
      // Closing the share sheet is not a failure.
      if ((error as Error)?.name !== 'AbortError') console.error('[shareWork] Could not share:', error);
    }
    return;
  }

  try {
    await navigator.clipboard.writeText(url);
    toast.success(es ? 'Enlace copiado' : 'Link copied');
  } catch {
    toast.error(es ? 'No se pudo copiar el enlace' : 'The link could not be copied');
  }
}
