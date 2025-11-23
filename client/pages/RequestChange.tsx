import { useState } from 'react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';

export default function RequestChange() {
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
      setError('Por favor, completa todos los campos');
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
        setSuccess('Solicitud enviada. El admin te responderá por email.');
        setArtistName(''); setEmail(''); setSubmissionId(''); setMessage('');
      } else {
        setError(data.error || 'Error al enviar la solicitud');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <Header />
      <main className="max-w-3xl mx-auto px-6 sm:px-8 py-12">
        <h1 className="text-2xl font-light mb-4">Solicitud de cambio / eliminación de obra</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">Solo envía esta solicitud si quieres que el admin modifique o elimine una obra; el admin revisará y te contestará.</p>

        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm block mb-1">Nombre del artista</label>
            <input value={artistName} onChange={e => setArtistName(e.target.value)} className="w-full px-3 py-2 border rounded bg-[hsl(var(--input))]" />
          </div>

          <div>
            <label className="text-sm block mb-1">Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" className="w-full px-3 py-2 border rounded bg-[hsl(var(--input))]" />
          </div>

          <div>
            <label className="text-sm block mb-1">ID de obra</label>
            <input value={submissionId} onChange={e => setSubmissionId(e.target.value)} className="w-full px-3 py-2 border rounded bg-[hsl(var(--input))]" />
          </div>

          <div>
            <label className="text-sm block mb-1">Mensaje / Detalles</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={6} className="w-full px-3 py-2 border rounded bg-[hsl(var(--input))]" />
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" className="bg-[hsl(var(--foreground))] text-[hsl(var(--background))]" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar solicitud'}
            </Button>
            <a href="/admin" className="text-sm text-[hsl(var(--muted-foreground))]">Ir al panel admin</a>
          </div>
        </form>
      </main>
    </div>
  );
}
