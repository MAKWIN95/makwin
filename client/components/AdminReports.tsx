import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flag, Loader } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { authHeaders } from '@/lib/adminApi';
import { useI18n } from '@/lib/i18n';

interface Report {
  id: string;
  reason: string;
  details: string | null;
  reviewed: boolean;
  created_at: string;
  work: { id: string; title: string; status: string } | null;
  reporter: { username: string } | null;
}

const REASONS: Record<string, { es: string; en: string }> = {
  porno: { es: 'Contenido +18', en: 'Adult content' },
  gore: { es: 'Violencia gráfica', en: 'Graphic violence' },
  spam: { es: 'Spam', en: 'Spam' },
  acoso: { es: 'Acoso o abuso', en: 'Harassment or abuse' },
  otro: { es: 'Otro', en: 'Other' },
};

export default function AdminReports() {
  const { language } = useI18n();
  const es = language === 'es';
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  const send = async (method: string, body?: object) => {
    const response = await fetch('/api/reports', {
      method,
      headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  };

  const load = async () => {
    try {
      const { reports: data } = await send('GET');
      setReports(data || []);
    } catch (error) {
      console.error('[AdminReports] Could not load reports:', error);
      toast.error(es ? 'No se pudieron cargar los reportes' : 'Could not load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const act = async (body: object) => {
    try {
      await send('PATCH', body);
      await load();
      toast.success(es ? 'Actualizado' : 'Updated');
    } catch (error) {
      console.error('[AdminReports] Could not update:', error);
      toast.error(es ? 'No se pudo actualizar' : 'Could not update');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 animate-spin text-[hsl(var(--primary))]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-6">
        <Flag className="w-5 h-5 text-[hsl(var(--primary))]" />
        <h2 className="text-xl font-bold">{es ? 'Reportes' : 'Reports'}</h2>
        <span className="ml-auto text-sm text-[hsl(var(--muted-foreground))]">{reports.length}</span>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-8 text-[hsl(var(--muted-foreground))]">{es ? 'No hay reportes' : 'No reports'}</div>
      ) : (
        reports.map((report) => {
          const removed = report.work?.status === 'removed_policy';
          return (
            <div key={report.id} className={`border border-[hsl(var(--border))] rounded-lg p-4 ${report.reviewed ? 'opacity-60' : ''}`}>
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <div>
                  {report.work ? (
                    <Link to={`/work/${report.work.id}`} className="font-medium hover:underline">
                      {report.work.title}
                    </Link>
                  ) : (
                    <span className="font-medium">{es ? 'Obra eliminada' : 'Deleted work'}</span>
                  )}
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    {REASONS[report.reason]?.[language] ?? report.reason}
                    {report.reporter?.username ? ` · @${report.reporter.username}` : ''}
                    {' · '}
                    {new Date(report.created_at).toLocaleDateString(es ? 'es-ES' : 'en-US')}
                  </p>
                </div>
                {removed && (
                  <span className="px-2 py-1 rounded text-xs bg-red-500/10 text-red-500">{es ? 'Obra retirada' : 'Work removed'}</span>
                )}
              </div>
              {report.details && <p className="text-sm whitespace-pre-wrap mb-3">{report.details}</p>}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => act({ id: report.id, reviewed: !report.reviewed })}>
                  {report.reviewed ? (es ? 'Marcar como pendiente' : 'Mark as pending') : es ? 'Marcar como revisado' : 'Mark as reviewed'}
                </Button>
                {report.work && (
                  <Button
                    size="sm"
                    variant="outline"
                    className={removed ? '' : 'text-red-500'}
                    onClick={() => act({ workId: report.work!.id, workStatus: removed ? 'published' : 'removed_policy' })}
                  >
                    {removed ? (es ? 'Restaurar obra' : 'Restore work') : es ? 'Retirar obra' : 'Remove work'}
                  </Button>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
