import type { Dispatch, SetStateAction } from 'react';
import { Link } from 'react-router-dom';
import { Flag } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { authHeaders } from '@/lib/adminApi';
import { useI18n } from '@/lib/i18n';

export interface Report {
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

interface Props {
  reports: Report[];
  setReports: Dispatch<SetStateAction<Report[]>>;
}

export default function AdminReports({ reports, setReports }: Props) {
  const { language } = useI18n();
  const es = language === 'es';

  const patch = async (body: object) => {
    const response = await fetch('/api/reports', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  };

  // Changes show at once and undo themselves if the save fails.
  const act = async (body: object, change: (report: Report) => Report) => {
    const previous = reports;
    setReports((current) => current.map(change));
    try {
      await patch(body);
    } catch (error) {
      console.error('[AdminReports] Could not update:', error);
      setReports(previous);
      toast.error(es ? 'No se pudo actualizar' : 'Could not update');
    }
  };

  const setReviewed = (report: Report) =>
    act({ id: report.id, reviewed: !report.reviewed }, (item) =>
      item.id === report.id ? { ...item, reviewed: !report.reviewed } : item,
    );

  const toggleWork = (report: Report, status: 'published' | 'removed_policy') =>
    act({ workId: report.work!.id, workStatus: status }, (item) =>
      item.work?.id === report.work!.id ? { ...item, work: { ...item.work!, status } } : item,
    );

  // A second reason travels at the start of the details as "[spam] ...".
  const readReport = (report: Report) => {
    const match = report.details?.match(/^\[(\w+)\]\s?/);
    const label = (reason: string) => REASONS[reason]?.[language] ?? reason;
    return {
      reasons: [report.reason, ...(match ? [match[1]] : [])].map(label).join(' + '),
      details: (match ? report.details!.slice(match[0].length) : report.details) || null,
    };
  };

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
          const { reasons, details } = readReport(report);
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
                    {reasons}
                    {report.reporter?.username ? ` · @${report.reporter.username}` : ''}
                    {' · '}
                    {new Date(report.created_at).toLocaleDateString(es ? 'es-ES' : 'en-US')}
                  </p>
                </div>
                {removed && (
                  <span className="px-2 py-1 rounded text-xs bg-red-500/10 text-red-500">{es ? 'Obra retirada' : 'Work removed'}</span>
                )}
              </div>
              {details && <p className="text-sm whitespace-pre-wrap mb-3">{details}</p>}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setReviewed(report)}>
                  {report.reviewed ? (es ? 'Marcar como pendiente' : 'Mark as pending') : es ? 'Marcar como revisado' : 'Mark as reviewed'}
                </Button>
                {report.work && (
                  <Button
                    size="sm"
                    variant="outline"
                    className={removed ? '' : 'text-red-500'}
                    onClick={() => toggleWork(report, removed ? 'published' : 'removed_policy')}
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
