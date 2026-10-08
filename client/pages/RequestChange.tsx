import { useState } from 'react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';

export default function RequestChange() {
  const { language } = useI18n();
  const es = language === 'es';
  const [artistName, setArtistName] = useState('');
  const [email, setEmail] = useState('');
  const [submissionId, setSubmissionId] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!artistName || !email || !submissionId || !message) {
      setError(es ? 'Completa todos los campos.' : 'Please complete all fields.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/request-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artistName, email, submissionId, message }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(es ? 'Solicitud enviada. El equipo responderá por correo.' : 'Request sent. The team will reply by email.');
        setArtistName(''); setEmail(''); setSubmissionId(''); setMessage('');
      } else {
        setError(data.error || (es ? 'Error al enviar la solicitud.' : 'Could not send the request.'));
      }
    } catch (err) {
      setError(es ? 'Error de conexión.' : 'Connection error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <Header />
      <main className="max-w-3xl mx-auto px-6 sm:px-8 py-12">
        <h1 className="text-2xl font-light mb-4">{es ? 'Solicitud de cambio o eliminación de una obra' : 'Request a work change or removal'}</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">{es ? 'Envía esta solicitud si necesitas que el equipo modifique o elimine una obra. La revisaremos y te responderemos.' : 'Send this request if you need the team to edit or remove a work. We will review it and get back to you.'}</p>

        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm block mb-1">{es ? 'Nombre del artista' : 'Artist name'}</label>
            <input value={artistName} onChange={e => setArtistName(e.target.value)} className="w-full px-3 py-2 border rounded bg-[hsl(var(--input))]" />
          </div>

          <div>
            <label className="text-sm block mb-1">{es ? 'Correo electrónico' : 'Email'}</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" className="w-full px-3 py-2 border rounded bg-[hsl(var(--input))]" />
          </div>

          <div>
            <label className="text-sm block mb-1">{es ? 'ID de la obra' : 'Work ID'}</label>
            <input value={submissionId} onChange={e => setSubmissionId(e.target.value)} className="w-full px-3 py-2 border rounded bg-[hsl(var(--input))]" />
          </div>

          <div>
            <label className="text-sm block mb-1">{es ? 'Mensaje / Detalles' : 'Message / Details'}</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={6} className="w-full px-3 py-2 border rounded bg-[hsl(var(--input))]" />
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" className="bg-[hsl(var(--foreground))] text-[hsl(var(--background))]" disabled={loading}>
              {loading ? (es ? 'Enviando...' : 'Sending...') : (es ? 'Enviar solicitud' : 'Submit request')}
            </Button>
            <a href="/admin" className="text-sm text-[hsl(var(--muted-foreground))]">{es ? 'Ir al panel de administración' : 'Go to admin panel'}</a>
          </div>
        </form>
      </main>
    </div>
  );
}
