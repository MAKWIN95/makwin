import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle2, Loader2, Trash2, Archive, RotateCcw } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

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
  const [password, setPassword] = useState('');
  const { language } = useI18n();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState<{ [key: string]: boolean }>({});
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    if (unlocked) fetchSubmissions();
  }, [unlocked]);

  // Auto-unlock if auth query param matches
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const auth = params.get('auth');
      if (auth === 'makwin95/12') {
        setUnlocked(true);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/get-submissions');
      const data = await response.json();
      if (response.ok) {
        setSubmissions(data.submissions || []);
      } else {
        setError('Error al cargar las obras');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (submissionId: string) => {
    try {
      setProcessing((prev) => ({ ...prev, [submissionId]: true }));
      const response = await fetch('/api/publish-work', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId }),
      });
      if (response.ok) {
        setSubmissions((prev) =>
          prev.map((s) =>
            s.submissionId === submissionId ? { ...s, status: 'published' } : s
          )
        );
      } else {
        setError('Error al publicar');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error(err);
    } finally {
      setProcessing((prev) => ({ ...prev, [submissionId]: false }));
    }
  };

  const handleReject = async (submissionId: string) => {
    try {
      const reason = window.prompt('Motivo de la denegación (opcional)');
      setProcessing((prev) => ({ ...prev, [submissionId]: true }));
      const response = await fetch('/api/reject-work', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId, reason }),
      });
      if (response.ok) {
        setSubmissions((prev) =>
          prev.map((s) =>
            s.submissionId === submissionId ? { ...s, status: 'rejected' } : s
          )
        );
      } else {
        setError('Error al denegar');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error(err);
    } finally {
      setProcessing((prev) => ({ ...prev, [submissionId]: false }));
    }
  };

  const handleArchive = async (submissionId: string) => {
    try {
      setProcessing((prev) => ({ ...prev, [submissionId]: true }));
      const response = await fetch('/api/archive-work', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId }),
      });
      if (response.ok) {
        setSubmissions((prev) =>
          prev.map((s) =>
            s.submissionId === submissionId ? { ...s, status: 'archived' } : s
          )
        );
      } else {
        setError('Error al archivar');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error(err);
    } finally {
      setProcessing((prev) => ({ ...prev, [submissionId]: false }));
    }
  };

  const handleDelete = async (submissionId: string) => {
    if (!window.confirm('¿Eliminar esta obra definitivamente?')) return;
    try {
      setProcessing((prev) => ({ ...prev, [submissionId]: true }));
      const response = await fetch('/api/delete-work', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId }),
      });
      if (response.ok) {
        setSubmissions((prev) => prev.filter((s) => s.submissionId !== submissionId));
      } else {
        setError('Error al eliminar');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error(err);
    } finally {
      setProcessing((prev) => ({ ...prev, [submissionId]: false }));
    }
  };

  const handleRepublish = async (submissionId: string) => {
    try {
      setProcessing((prev) => ({ ...prev, [submissionId]: true }));
      const response = await fetch('/api/republish-work', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId }),
      });
      if (response.ok) {
        setSubmissions((prev) =>
          prev.map((s) =>
            s.submissionId === submissionId ? { ...s, status: 'published' } : s
          )
        );
      } else {
        setError('Error al republicar');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error(err);
    } finally {
      setProcessing((prev) => ({ ...prev, [submissionId]: false }));
    }
  };


  const formatDate = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString('es-ES');
  };

  const pendingWorks = submissions.filter((s) => !s.status || s.status === 'pending');
  const publishedWorks = submissions.filter((s) => s.status === 'published');
  const archivedWorks = submissions.filter((s) => s.status === 'archived');

  if (!unlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))]">
        <input
          type="password"
          autoFocus
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && password === 'makwin95/12') {
              setUnlocked(true);
            }
          }}
          className="border border-[hsl(var(--border))] bg-[hsl(var(--input))] rounded-lg px-4 py-2 text-lg outline-none"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <Header />
      <main className="w-full page-enter">
        <div className="px-4 sm:px-8 py-8 sm:py-12">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-[hsl(var(--foreground))] mb-2">
                Panel de Admin
              </h1>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Gestiona las obras enviadas por artistas
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
                <TabsList className="grid w-full grid-cols-3 mb-8">
                  <TabsTrigger value="pending">
                    Por Revisar ({pendingWorks.length})
                  </TabsTrigger>
                  <TabsTrigger value="published">
                    Publicadas ({publishedWorks.length})
                  </TabsTrigger>
                  <TabsTrigger value="archived">
                    Archivadas ({archivedWorks.length})
                  </TabsTrigger>
                </TabsList>

                {/* Por Revisar */}
                <TabsContent value="pending">
                  {pendingWorks.length === 0 ? (
                    <Card className="p-12 text-center">
                      <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
                      <h2 className="text-xl font-medium text-[hsl(var(--foreground))] mb-2">
                        ¡Todo revisado!
                      </h2>
                      <p className="text-[hsl(var(--muted-foreground))]">
                        No hay obras pendientes de revisión
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
                        Sin obras publicadas
                      </h2>
                      <p className="text-[hsl(var(--muted-foreground))]">
                        Publica obras desde la pestaña "Por Revisar"
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
                                Por {submission.artistName}
                              </p>
                              <p className="text-sm text-[hsl(var(--foreground))]">
                                {submission.description}
                              </p>
                              <span className="inline-block px-2 py-1 text-xs bg-green-500/10 text-green-700 rounded">
                                ✓ Publicado
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
                                Archivar
                              </Button>
                              <Button
                                onClick={() => handleDelete(submission.submissionId)}
                                disabled={processing[submission.submissionId]}
                                variant="outline"
                                className="w-full text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Eliminar
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
                        Sin obras archivadas
                      </h2>
                      <p className="text-[hsl(var(--muted-foreground))]">
                        Las obras publicadas pueden ser archivadas
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
                                Por {submission.artistName}
                              </p>
                              <span className="inline-block px-2 py-1 text-xs bg-gray-500/10 text-gray-700 rounded">
                                📁 Archivado
                              </span>
                            </div>
                            <div className="flex flex-col justify-center gap-2">
                              <Button
                                onClick={() => handleRepublish(submission.submissionId)}
                                disabled={processing[submission.submissionId]}
                                className="w-full bg-blue-600 hover:bg-blue-700"
                              >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Republicar
                              </Button>
                              <Button
                                onClick={() => handleDelete(submission.submissionId)}
                                disabled={processing[submission.submissionId]}
                                variant="outline"
                                className="w-full text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Eliminar
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

interface SubmissionCardProps {
  submission: Submission;
  processing: { [key: string]: boolean };
  formatDate: (timestamp: string) => string;
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
                Artista
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
              Descripción
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
                📎 {submission.fileName || 'Archivo'}
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
                Publicando...
              </>
            ) : (
              '✓ Publicar'
            )}
          </Button>
          <Button
            onClick={actions.onReject}
            disabled={processing[submission.submissionId]}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
          >
            Rechazar
          </Button>
          <Button
            onClick={actions.onArchive}
            disabled={processing[submission.submissionId]}
            variant="outline"
            className="w-full"
          >
            <Archive className="w-4 h-4 mr-2" />
            Archivar
          </Button>
          {submission.hasFile && submission.fileUrl && (
            <a
              href={submission.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full px-4 py-2 text-sm text-center bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              📥 Ver archivo
            </a>
          )}
        </div>
      </div>
    </Card>
  );
}
