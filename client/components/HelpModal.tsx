import { useState } from 'react';
import { X, HelpCircle, Loader } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HELP_CATEGORIES = [
  { value: 'question', label: 'Pregunta', labelEn: 'Question' },
  { value: 'bug', label: 'Reportar Bug', labelEn: 'Report Bug' },
  { value: 'feature', label: 'Sugerencia de Mejora', labelEn: 'Feature Request' },
  { value: 'account', label: 'Problema con la Cuenta', labelEn: 'Account Issue' },
  { value: 'other', label: 'Otro', labelEn: 'Other' },
];

export default function HelpModal({ 
  isOpen, 
  onClose
}: HelpModalProps) {
  const { language: currentLang } = useI18n();
  const { user } = useAuth();
  const [category, setCategory] = useState<string>('');
  const [email, setEmail] = useState(user?.email || '');
  const [name, setName] = useState(user?.user_metadata?.display_name || '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!category || !email || !name || !subject || !message.trim()) {
      toast.error(currentLang === 'es' ? 'Por favor completa todos los campos' : 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/save-help-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name,
          subject,
          message,
          category,
          user_id: user?.id || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || (currentLang === 'es' ? 'Error al enviar el mensaje' : 'Error sending message'));
        setLoading(false);
        return;
      }

      setSubmitted(true);
      toast.success(currentLang === 'es' ? '✓ Mensaje enviado' : '✓ Message sent');
      
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error) {
      console.error('Error:', error);
      toast.error(currentLang === 'es' ? 'Error de conexión' : 'Connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCategory('');
    setEmail(user?.email || '');
    setName(user?.user_metadata?.display_name || '');
    setSubject('');
    setMessage('');
    setSubmitted(false);
    onClose();
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={handleClose} />
      )}
      <div className={`fixed inset-0 z-50 flex items-center justify-center pointer-events-none ${isOpen ? 'pointer-events-auto' : ''}`}>
        <div className="bg-[hsl(var(--background))] rounded-lg shadow-lg w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto border border-[hsl(var(--border))]">
          {/* Header */}
          <div className="sticky top-0 bg-[hsl(var(--background))] border-b border-[hsl(var(--border))] p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-[hsl(var(--primary))]" />
              <h2 className="font-bold text-lg">
                {currentLang === 'es' ? 'Centro de Ayuda' : 'Help Center'}
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {submitted ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">✓</div>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  {currentLang === 'es' 
                    ? 'Gracias por tu mensaje. El equipo de MAKWIN lo revisará pronto'
                    : 'Thank you for your message. The MAKWIN team will review it soon'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Category */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {currentLang === 'es' ? 'Categoría' : 'Category'} *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-md bg-[hsl(var(--background))] text-[hsl(var(--foreground))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                  >
                    <option value="">
                      {currentLang === 'es' ? 'Selecciona una categoría' : 'Select a category'}
                    </option>
                    {HELP_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {currentLang === 'es' ? cat.label : cat.labelEn}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {currentLang === 'es' ? 'Tu nombre' : 'Your name'} *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={currentLang === 'es' ? 'Tu nombre completo' : 'Your full name'}
                    className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-md bg-[hsl(var(--background))] text-[hsl(var(--foreground))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {currentLang === 'es' ? 'Tu correo' : 'Your email'} *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-md bg-[hsl(var(--background))] text-[hsl(var(--foreground))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                  />
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {currentLang === 'es' ? 'Asunto' : 'Subject'} *
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={currentLang === 'es' ? 'Resumen breve de tu consulta' : 'Brief summary'}
                    className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-md bg-[hsl(var(--background))] text-[hsl(var(--foreground))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {currentLang === 'es' ? 'Mensaje' : 'Message'} *
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={currentLang === 'es' 
                      ? 'Cuéntanos de qué se trata. Sé lo más detallado posible...'
                      : 'Tell us what this is about. Be as detailed as possible...'}
                    rows={4}
                    className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-md bg-[hsl(var(--background))] text-[hsl(var(--foreground))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] resize-none"
                  />
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                    {message.length}/2000
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleClose}
                    variant="outline"
                    className="flex-1"
                  >
                    {currentLang === 'es' ? 'Cancelar' : 'Cancel'}
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary))]/90"
                  >
                    {loading && <Loader className="w-4 h-4 mr-2 animate-spin" />}
                    {currentLang === 'es' ? 'Enviar' : 'Send'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
