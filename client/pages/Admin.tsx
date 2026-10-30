import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle2, Loader2, Trash2, Archive, RotateCcw } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import AdminHelpMessages from '@/components/AdminHelpMessages';
import AdminReports from '@/components/AdminReports';
import Footer from '@/components/Footer';
import { authHeaders } from '@/lib/adminApi';

interface Submission {
  submissionId: string;
  artistName: string;
  email: string;
  workType: string;
  title: string;
  description: string;
  language: string;
  timestamp: string;
  fileName?: string;
  fileSize?: number;
  hasFile: boolean;
  fileUrl?: string | null;
  status?: string;
  publishedAt?: string;
  archivedAt?: string;
}

export default function Admin() {
  const [unlocked, setUnlocked] = useState(false);
  const { language } = useI18n();
  const es = language === 'es';
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState<{ [key: string]: boolean }>({});
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const headers = await authHeaders();
      // Access comes from the messages API so that a problem with the works
      // listing never locks an admin out of messages and reports.
      const access = await fetch('/api/help-messages', { headers });
      if (!access.ok) {
        setUnlocked(false);
        return;
      }
      setUnlocked(true);

      const response = await fetch('/api/get-submissions', { headers });
      const data = await response.json();
      if (response.ok) {
        setSubmissions(data.scope === 'admin' ? data.submissions || [] : []);
      } else {
        setError(es ? 'No se pudieron cargar las obras.' : 'Works could not be loaded.');
      }
    } catch (err) {
      setError(es ? 'Problema de conexión. Inténtalo de nuevo.' : 'Connection problem. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleWorkAction = async (
    action: 'publish' | 'reject' | 'archive' | 'delete' | 'republish',
    submissionId: string,
    reason?: string
  ) => {
    try {
      setProcessing((prev) => ({ ...prev, [submissionId]: true }));
      const response = await fetch('/api/work-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ action, submissionId, reason }),
      });

      if (!response.ok) {
        const messages = {
          publish: es ? 'No se pudo publicar.' : 'Could not publish.',
          reject: es ? 'No se pudo rechazar.' : 'Could not reject.',
          archive: es ? 'No se pudo archivar.' : 'Could not archive.',
          delete: es ? 'No se pudo eliminar.' : 'Could not delete.',
          republish: es ? 'No se pudo republicar.' : 'Could not republish.',
        };
        setError(messages[action]);
        return;
      }

      if (action === 'publish') {
        setSubmissions((prev) =>
          prev.map((s) =>
            s.submissionId === submissionId ? { ...s, status: 'published' } : s
          )
        );
      }

      if (action === 'reject') {
        setSubmissions((prev) =>
          prev.map((s) =>
            s.submissionId === submissionId ? { ...s, status: 'rejected' } : s
          )
        );
      }

      if (action === 'archive') {
        setSubmissions((prev) =>
          prev.map((s) =>
            s.submissionId === submissionId ? { ...s, status: 'archived' } : s
          )
        );
      }

      if (action === 'delete') {
        setSubmissions((prev) => prev.filter((s) => s.submissionId !== submissionId));
      }

      if (action === 'republish') {
        setSubmissions((prev) =>
          prev.map((s) =>
            s.submissionId === submissionId ? { ...s, status: 'published' } : s
          )
        );
      }
    } catch (err) {
      setError(es ? 'Problema de conexión. Inténtalo de nuevo.' : 'Connection problem. Please try again.');
      console.error(err);
    } finally {
      setProcessing((prev) => ({ ...prev, [submissionId]: false }));
    }
  };

  const handlePublish = async (submissionId: string) => {
    await handleWorkAction('publish', submissionId);
  };

  const handleReject = async (submissionId: string) => {
    const reason = window.prompt(es ? 'Motivo del rechazo (opcional)' : 'Reason for rejection (optional)');
    await handleWorkAction('reject', submissionId, reason || undefined);
  };

  const handleArchive = async (submissionId: string) => {
    await handleWorkAction('archive', submissionId);
  };

  const handleDelete = async (submissionId: string) => {
    if (!window.confirm(es ? '¿Eliminar esta obra definitivamente?' : 'Delete this work permanently?')) return;
    await handleWorkAction('delete', submissionId);
  };

  const handleRepublish = async (submissionId: string) => {
    await handleWorkAction('republish', submissionId);
  };


  const formatDate = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString(es ? 'es-ES' : 'en-US');
  };

  const pendingWorks = submissions.filter((s) => !s.status || s.status === 'pending');
  const publishedWorks = submissions.filter((s) => s.status === 'published');
  const archivedWorks = submissions.filter((s) => s.status === 'archived');

  if (!unlocked) {
    return (
      <div className="min-h-screen flex flex-col bg-[hsl(var(--background))]">
        <Header hideSearch />
        <div className="flex-1 flex items-center justify-center px-4 text-center">
          {loading ? (
            <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--muted-foreground))]" />
          ) : (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {error || (language === 'en'
                ? 'Restricted access: sign in with an admin account.'
                : 'Acceso restringido: inicia sesión con una cuenta de administrador.')}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <Header hideSearch />
      <main className="w-full page-enter">
        <div className="px-4 sm:px-8 py-8 sm:py-12">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-[hsl(var(--foreground))] mb-2">
                {es ? 'Administración' : 'Administration'}
              </h1>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                {es ? 'Obras, mensajes de ayuda y reportes' : 'Works, help messages and reports'}
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--foreground))]" />
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 mb-8">
                  <TabsTrigger value="pending">
                    {es ? 'Por revisar' : 'To review'} ({pendingWorks.length})
                  </TabsTrigger>
                  <TabsTrigger value="published">
                    {es ? 'Publicadas' : 'Published'} ({publishedWorks.length})
                  </TabsTrigger>
                  <TabsTrigger value="archived">
                    {es ? 'Archivadas' : 'Archived'} ({archivedWorks.length})
                  </TabsTrigger>
                  <TabsTrigger value="help-messages">
                    {es ? 'Mensajes de ayuda' : 'Help messages'}
                  </TabsTrigger>
                  <TabsTrigger value="reports">
                    {es ? 'Reportes' : 'Reports'}
                  </TabsTrigger>
                </TabsList>

                {/* Por Revisar */}
                <TabsContent value="pending">
                  {pendingWorks.length === 0 ? (
                    <Card className="p-12 text-center">
                      <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
                      <h2 className="text-xl font-medium text-[hsl(var(--foreground))] mb-2">
                        {es ? 'Todo revisado' : 'All reviewed'}
                      </h2>
                      <p className="text-[hsl(var(--muted-foreground))]">
                        {es ? 'No hay obras pendientes de revisión' : 'There are no works waiting for review'}
                      </p>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {pendingWorks.map((submission) => (
                        <SubmissionCard
                          key={submission.submissionId}
                          submission={submission}
                          processing={processing}
                          formatDate={formatDate}
                          es={es}
                          actions={{
                            onPublish: () => handlePublish(submission.submissionId),
                            onReject: () => handleReject(submission.submissionId),
                            onArchive: () => handleArchive(submission.submissionId),
                          }}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Publicadas */}
                <TabsContent value="published">
                  {publishedWorks.length === 0 ? (
                    <Card className="p-12 text-center">
                      <h2 className="text-xl font-medium text-[hsl(var(--foreground))] mb-2">
                        {es ? 'Sin obras publicadas' : 'No published works'}
                      </h2>
                      <p className="text-[hsl(var(--muted-foreground))]">
                        {es ? 'Publica obras desde la pestaña «Por revisar»' : 'Publish works from the “To review” tab'}
                      </p>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {publishedWorks.map((submission) => (
                        <Card key={submission.submissionId} className="p-6">
                          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                            <div className="lg:col-span-3 space-y-3">
                              <h3 className="text-xl font-semibold text-[hsl(var(--foreground))]">
                                {submission.title}
                              </h3>
                              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                                {es ? 'Por' : 'By'} {submission.artistName}
                              </p>
                              <p className="text-sm text-[hsl(var(--foreground))]">
                                {submission.description}
                              </p>
                              <span className="inline-block px-2 py-1 text-xs bg-green-500/10 text-green-700 rounded">
                                ✓ {es ? 'Publicado' : 'Published'}
                              </span>
                            </div>
                            <div className="flex flex-col justify-center gap-2">
                              <Button
                                onClick={() => handleArchive(submission.submissionId)}
                                disabled={processing[submission.submissionId]}
                                variant="outline"
                                className="w-full"
                              >
                                <Archive className="w-4 h-4 mr-2" />
                                {es ? 'Archivar' : 'Archive'}
                              </Button>
                              <Button
                                onClick={() => handleDelete(submission.submissionId)}
                                disabled={processing[submission.submissionId]}
                                variant="outline"
                                className="w-full text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                {es ? 'Eliminar' : 'Delete'}
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Archivadas */}
                <TabsContent value="archived">
                  {archivedWorks.length === 0 ? (
                    <Card className="p-12 text-center">
                      <h2 className="text-xl font-medium text-[hsl(var(--foreground))] mb-2">
                        {es ? 'Sin obras archivadas' : 'No archived works'}
                      </h2>
                      <p className="text-[hsl(var(--muted-foreground))]">
                        {es ? 'Las obras publicadas pueden archivarse' : 'Published works can be archived'}
                      </p>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {archivedWorks.map((submission) => (
                        <Card key={submission.submissionId} className="p-6 opacity-75">
                          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                            <div className="lg:col-span-3 space-y-3">
                              <h3 className="text-xl font-semibold text-[hsl(var(--foreground))]">
                                {submission.title}
                              </h3>
                              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                                {es ? 'Por' : 'By'} {submission.artistName}
                              </p>
                              <span className="inline-block px-2 py-1 text-xs bg-gray-500/10 text-gray-700 rounded">
                                📁 {es ? 'Archivado' : 'Archived'}
                              </span>
                            </div>
                            <div className="flex flex-col justify-center gap-2">
                              <Button
                                onClick={() => handleRepublish(submission.submissionId)}
                                disabled={processing[submission.submissionId]}
                                className="w-full bg-blue-600 hover:bg-blue-700"
                              >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                {es ? 'Republicar' : 'Republish'}
                              </Button>
                              <Button
                                onClick={() => handleDelete(submission.submissionId)}
                                disabled={processing[submission.submissionId]}
                                variant="outline"
                                className="w-full text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                {es ? 'Eliminar' : 'Delete'}
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Help Messages */}
                <TabsContent value="help-messages">
                  <AdminHelpMessages />
                </TabsContent>

                {/* Reports */}
                <TabsContent value="reports">
                  <AdminReports />
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

interface SubmissionCardProps {
  submission: Submission;
  processing: { [key: string]: boolean };
  formatDate: (timestamp: string) => string;
  es: boolean;
  actions: {
    onPublish: () => void;
    onReject: () => void;
    onArchive: () => void;
  };
}

function SubmissionCard({
  submission,
  processing,
  formatDate,
  es,
  actions,
}: SubmissionCardProps) {
  return (
    <Card className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <div>
            <h3 className="text-xl font-semibold text-[hsl(var(--foreground))]">
              {submission.title}
            </h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {submission.workType}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-[hsl(var(--muted-foreground))] font-medium">
                {es ? 'Artista' : 'Artist'}
              </p>
              <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                {submission.artistName}
              </p>
            </div>
            <div>
              <p className="text-xs text-[hsl(var(--muted-foreground))] font-medium">
                Email
              </p>
              <a
                href={`mailto:${submission.email}`}
                className="text-sm text-blue-600 hover:underline"
              >
                {submission.email}
              </a>
            </div>
          </div>

          <div>
            <p className="text-xs text-[hsl(var(--muted-foreground))] font-medium mb-1">
              {es ? 'Descripción' : 'Description'}
            </p>
            <p className="text-sm text-[hsl(var(--foreground))] line-clamp-3">
              {submission.description}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <span className="px-2 py-1 text-xs bg-black/5 rounded">
              ID: {submission.submissionId}
            </span>
            <span className="px-2 py-1 text-xs bg-black/5 rounded">
              {formatDate(submission.timestamp)}
            </span>
            {submission.hasFile && (
              <span className="px-2 py-1 text-xs bg-blue-500/10 text-blue-700 rounded">
                📎 {submission.fileName || (es ? 'Archivo' : 'File')}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col justify-center gap-2">
          <Button
            onClick={actions.onPublish}
            disabled={processing[submission.submissionId]}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            {processing[submission.submissionId] ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {es ? 'Publicando...' : 'Publishing...'}
              </>
            ) : (
              `✓ ${es ? 'Publicar' : 'Publish'}`
            )}
          </Button>
          <Button
            onClick={actions.onReject}
            disabled={processing[submission.submissionId]}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
          >
            {es ? 'Rechazar' : 'Reject'}
          </Button>
          <Button
            onClick={actions.onArchive}
            disabled={processing[submission.submissionId]}
            variant="outline"
            className="w-full"
          >
            <Archive className="w-4 h-4 mr-2" />
            {es ? 'Archivar' : 'Archive'}
          </Button>
          {submission.hasFile && submission.fileUrl && (
            <a
              href={submission.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full px-4 py-2 text-sm text-center bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              📥 {es ? 'Ver archivo' : 'View file'}
            </a>
          )}
        </div>
      </div>
    </Card>
  );
}
