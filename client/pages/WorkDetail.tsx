import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Mail, ArrowLeft, Loader2, Copy, Check } from 'lucide-react';

interface WorkDetail {
  submissionId: string;
  artistName: string;
  email: string;
  workType: string;
  title: string;
  description: string;
  fileUrl: string | null;
  coverImageUrl?: string | null;
  timestamp: string;
  status: string;
}

export default function WorkDetail() {
  const { id } = useParams<{ id: string }>();
  const [work, setWork] = useState<WorkDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showContactDrawer, setShowContactDrawer] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchWork = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/get-submissions');
        const data = await response.json();
        if (data.submissions) {
          const found = data.submissions.find(
            (w: WorkDetail) => w.submissionId === id && w.status === 'published'
          );
          if (found) {
            setWork(found);
          } else {
            setError('Obra no encontrada');
          }
        }
      } catch (err) {
        setError('Error al cargar la obra');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchWork();
  }, [id]);

  const formatDate = (timestamp: string): string => {
    return new Date(timestamp).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const isPoem = work?.workType.toLowerCase().includes('poesia') || 
                work?.workType.toLowerCase().includes('poema') || 
                work?.workType.toLowerCase().includes('texto');

  const isPhoto = work?.workType.toLowerCase().includes('fotografia') || 
                 work?.workType.toLowerCase().includes('fotografía');

  const copyEmail = () => {
    if (work?.email) {
      navigator.clipboard.writeText(work.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--foreground))]" />
      </div>
    );
  }

  if (!work || error) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))]">
        <Header showSearch={false} />
        <main className="max-w-4xl mx-auto px-6 sm:px-8 py-12 sm:py-16 flex flex-col items-center justify-center">
          <h1 className="text-2xl font-light text-[hsl(var(--foreground))] mb-4">
            {error || 'Obra no encontrada'}
          </h1>
          <Link
            to="/"
            className="text-[hsl(var(--foreground))/0.6] hover:text-[hsl(var(--foreground))] transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <Header showSearch={false} />

      <main className="page-enter">
        {/* Navigation Back */}
        <div className="px-6 sm:px-8 pt-8">
          <Link
            to="/"
            className="text-sm font-light text-[hsl(var(--foreground))/0.6] hover:text-[hsl(var(--foreground))] transition-colors inline-flex items-center gap-2 mb-12"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Link>
        </div>

        {/* Content - Different layouts for photos vs poems */}
        {isPhoto ? (
          // PHOTO LAYOUT: Image left, info right
          <div className="px-6 sm:px-8 pb-12">
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Image - Left Side */}
                <div className="flex items-start">
                  <div className="w-full rounded-lg overflow-hidden border border-[hsl(var(--border))]">
                    <img
                      src={work.fileUrl}
                      alt={work.title}
                      className="w-full h-auto object-cover"
                    />
                  </div>
                </div>

                {/* Info - Right Side */}
                <div className="flex flex-col justify-start">
                  <h1 className="text-4xl sm:text-5xl font-light tracking-tight text-[hsl(var(--foreground))] mb-4">
                    {work.title}
                  </h1>
                  <p className="text-2xl font-light text-[hsl(var(--foreground))/0.6] mb-6">
                    {work.artistName}
                  </p>
                  <p className="text-base leading-relaxed text-[hsl(var(--foreground))] mb-8 whitespace-pre-wrap">
                    "{work.description}"
                  </p>
                  <p className="text-xs text-[hsl(var(--foreground))/0.4] uppercase tracking-widest mb-8">
                    {formatDate(work.timestamp)} • {work.workType}
                  </p>

                  {/* Contact Button */}
                  <Button
                    onClick={() => setShowContactDrawer(true)}
                    className="bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))/0.9] w-full sm:w-auto"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Contactar Artista
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // POEM/TEXT LAYOUT: Centered content
          <div className="px-6 sm:px-8 pb-12">
            <div className="max-w-2xl mx-auto">
              {/* Cover Image - If exists */}
              {work.coverImageUrl && (
                <div className="mb-12 rounded-lg overflow-hidden border border-[hsl(var(--border))] max-w-sm mx-auto">
                  <img
                    src={work.coverImageUrl}
                    alt="Portada"
                    className="w-full aspect-square object-cover"
                  />
                </div>
              )}

              {/* Title and Author */}
              <div className="text-center mb-12">
                <h1 className="text-4xl sm:text-5xl font-light tracking-tight text-[hsl(var(--foreground))] mb-4">
                  {work.title}
                </h1>
                <p className="text-lg font-light text-[hsl(var(--foreground))/0.6]">
                  {work.artistName}
                </p>
              </div>

              {/* Content - Centered */}
              <div className="prose prose-invert max-w-none mb-12">
                <p className="text-center text-base sm:text-lg leading-relaxed text-[hsl(var(--foreground))] whitespace-pre-wrap font-light">
                  {work.description}
                </p>
              </div>

              {/* Metadata */}
              <div className="text-center mb-12">
                <p className="text-xs text-[hsl(var(--foreground))/0.4] uppercase tracking-widest">
                  {formatDate(work.timestamp)} • {work.workType}
                </p>
              </div>

              {/* Contact Button */}
              <div className="flex justify-center">
                <Button
                  onClick={() => setShowContactDrawer(true)}
                  className="bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))/0.9]"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Contactar Artista
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Contact Drawer - Animated from bottom */}
        {showContactDrawer && (
          <div className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300">
            <div className="absolute bottom-0 left-0 right-0 bg-[hsl(var(--background))] border-t border-[hsl(var(--border))] p-6 sm:p-8 rounded-t-2xl animate-in slide-in-from-bottom duration-300 max-w-2xl mx-auto w-full">
              <button
                onClick={() => setShowContactDrawer(false)}
                className="absolute top-4 right-4 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
              >
                ✕
              </button>

              <h2 className="text-2xl font-light text-[hsl(var(--foreground))] mb-4">
                Contactar a {work.artistName}
              </h2>

              {/* Email Box */}
              <div className="flex items-center gap-3 mb-6 p-4 bg-[hsl(var(--muted))/0.5] rounded-lg border border-[hsl(var(--border))]">
                <input
                  type="text"
                  value={work.email}
                  readOnly
                  className="flex-1 bg-transparent text-[hsl(var(--foreground))] outline-none text-sm"
                />
                <button
                  onClick={copyEmail}
                  className="p-2 hover:bg-[hsl(var(--muted))] rounded transition-colors"
                  title="Copiar email"
                >
                  {copied ? (
                    <Check className="w-5 h-5 text-green-600" />
                  ) : (
                    <Copy className="w-5 h-5 text-[hsl(var(--foreground))/0.6]" />
                  )}
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    window.location.href = `mailto:${work.email}`;
                  }}
                  className="flex-1 bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))/0.9]"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Enviar Email
                </Button>
                <Button
                  onClick={() => setShowContactDrawer(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cerrar
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
