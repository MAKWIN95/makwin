import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, HelpCircle, Loader, CheckCircle2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import { authHeaders } from '@/lib/adminApi';
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HELP_CATEGORIES = [
  { value: 'question', label: 'Pregunta', labelEn: 'Question' },
  { value: 'bug', label: 'Error en la web', labelEn: 'Something is broken' },
  { value: 'feature', label: 'Sugerencia', labelEn: 'Suggestion' },
  { value: 'account', label: 'Problema con la cuenta', labelEn: 'Account issue' },
  { value: 'other', label: 'Otro', labelEn: 'Other' },
];

const SUBJECT_MIN = 5;
const SUBJECT_MAX = 100;
const MESSAGE_MIN = 10;
const MESSAGE_MAX = 2000;

const inputClass =
  'w-full px-3 py-2 border border-[hsl(var(--border))] rounded-md bg-[hsl(var(--background))] text-[hsl(var(--foreground))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]';

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const { language } = useI18n();
  const es = language === 'es';
  const { user, profile } = useAuth();
  const [category, setCategory] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // The session may arrive after the footer mounts, so fill these when opening.
  useEffect(() => {
    if (!isOpen) return;
    setEmail((current) => current || user?.email || '');
    setName((current) => current || profile?.display_name || user?.user_metadata?.full_name || '');
  }, [isOpen, user, profile]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  const validationError = (): string | null => {
    if (!category || !name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      return es ? 'Rellena todos los campos.' : 'Please fill in all fields.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return es ? 'Revisa la dirección de correo.' : 'Please check the email address.';
    }
    if (subject.trim().length < SUBJECT_MIN) {
      return es ? `El asunto debe tener al menos ${SUBJECT_MIN} caracteres.` : `The subject must be at least ${SUBJECT_MIN} characters long.`;
    }
    if (message.trim().length < MESSAGE_MIN) {
      return es ? `El mensaje debe tener al menos ${MESSAGE_MIN} caracteres.` : `The message must be at least ${MESSAGE_MIN} characters long.`;
    }
    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const invalid = validationError();
    if (invalid) {
      setError(invalid);
      return;
    }

    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/save-help-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
          subject: subject.trim(),
          message: message.trim(),
          category,
          website,
        }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setSubmitted(true);
    } catch (err) {
      console.error('[HelpModal] Could not send the message:', err);
      setError(es ? 'No hemos podido enviar tu mensaje. Inténtalo de nuevo en unos minutos.' : 'We could not send your message. Please try again in a few minutes.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCategory('');
    setEmail('');
    setName('');
    setSubject('');
    setMessage('');
    setWebsite('');
    setError('');
    setSubmitted(false);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={handleClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-modal-title"
        className="bg-[hsl(var(--background))] rounded-lg shadow-lg w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain border border-[hsl(var(--border))] animate-in fade-in zoom-in-95 duration-200"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-[hsl(var(--background))] border-b border-[rgba(120,120,120,0.25)] p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-[hsl(var(--primary))]" />
            <h2 id="help-modal-title" className="font-bold text-lg">
              {es ? 'Ayuda y contacto' : 'Help & Contact'}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label={es ? 'Cerrar' : 'Close'}
            className="tap-area text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {submitted ? (
            <div className="text-center py-6">
              <CheckCircle2 className="w-10 h-10 text-[hsl(var(--foreground))] mx-auto mb-4" />
              <h3 className="font-semibold mb-2">{es ? 'Mensaje enviado' : 'Message sent'}</h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
                {es
                  ? `Gracias. El equipo de MAKWIN lo revisará y te responderá a ${email.trim()}.`
                  : `Thank you. The MAKWIN team will review it and reply to ${email.trim()}.`}
              </p>
              <Button type="button" onClick={handleClose} variant="outline">
                {es ? 'Cerrar' : 'Close'}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label htmlFor="help-category" className="block text-sm font-medium mb-2">
                  {es ? 'Categoría' : 'Category'} *
                </label>
                <select id="help-category" value={category} onChange={(event) => setCategory(event.target.value)} className={inputClass}>
                  <option value="">{es ? 'Selecciona una categoría' : 'Select a category'}</option>
                  {HELP_CATEGORIES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {es ? option.label : option.labelEn}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="help-name" className="block text-sm font-medium mb-2">
                  {es ? 'Tu nombre' : 'Your name'} *
                </label>
                <input
                  id="help-name"
                  type="text"
                  value={name}
                  maxLength={100}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={es ? 'Tu nombre' : 'Your name'}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="help-email" className="block text-sm font-medium mb-2">
                  {es ? 'Tu correo' : 'Your email'} *
                </label>
                <input
                  id="help-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={es ? 'tu@correo.com' : 'you@email.com'}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="help-subject" className="block text-sm font-medium mb-2">
                  {es ? 'Asunto' : 'Subject'} *
                </label>
                <input
                  id="help-subject"
                  type="text"
                  value={subject}
                  maxLength={SUBJECT_MAX}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder={es ? 'Resumen breve de tu consulta' : 'Brief summary'}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="help-message" className="block text-sm font-medium mb-2">
                  {es ? 'Mensaje' : 'Message'} *
                </label>
                <textarea
                  id="help-message"
                  value={message}
                  maxLength={MESSAGE_MAX}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder={es ? 'Cuéntanos con todo el detalle que puedas…' : 'Tell us as much detail as you can…'}
                  rows={4}
                  className={`${inputClass} resize-none`}
                />
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                  {message.length}/{MESSAGE_MAX}
                </p>
              </div>

              {/* Hidden from people; bots tend to fill it in. */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
                className="absolute left-[-9999px] h-0 w-0 opacity-0"
              />

              {error && (
                <p role="alert" className="text-sm text-red-500">
                  {error}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <Button type="button" onClick={handleClose} variant="outline" className="flex-1">
                  {es ? 'Cancelar' : 'Cancel'}
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary))]/90"
                >
                  {loading && <Loader className="w-4 h-4 mr-2 animate-spin" />}
                  {es ? 'Enviar' : 'Send'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
