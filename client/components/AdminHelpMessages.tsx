import { useState, type Dispatch, type SetStateAction } from 'react';
import { Loader, MessageSquare, Reply, Trash2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { authHeaders } from '@/lib/adminApi';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

export interface HelpMessage {
  id: string;
  email: string;
  name: string;
  category: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  user_id?: string | null;
}

const CATEGORY_LABELS: Record<string, { es: string; en: string }> = {
  question: { es: 'Pregunta', en: 'Question' },
  bug: { es: 'Error en la web', en: 'Something is broken' },
  feature: { es: 'Sugerencia', en: 'Suggestion' },
  account: { es: 'Problema con la cuenta', en: 'Account issue' },
  other: { es: 'Otro', en: 'Other' },
};

const MAX_REPLY_LENGTH = 5000;

interface Props {
  messages: HelpMessage[];
  setMessages: Dispatch<SetStateAction<HelpMessage[]>>;
}

export default function AdminHelpMessages({ messages, setMessages }: Props) {
  const { language } = useI18n();
  const es = language === 'es';
  const [deleting, setDeleting] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const request = async (method: 'POST' | 'PATCH' | 'DELETE', body: Record<string, string>) => {
    const response = await fetch('/api/help-messages', {
      method,
      headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  };

  const setLocalStatus = (id: string, status: string) =>
    setMessages((current) => current.map((m) => (m.id === id ? { ...m, status } : m)));

  // The box changes at once; the save happens behind it and undoes itself on failure.
  const updateStatus = async (msg: HelpMessage, status: string) => {
    const previous = msg.status;
    setLocalStatus(msg.id, status);
    try {
      await request('PATCH', { id: msg.id, status });
    } catch (error) {
      console.error('Error updating status:', error);
      setLocalStatus(msg.id, previous);
      toast.error(es ? 'No se pudo guardar el cambio' : 'The change could not be saved');
    }
  };

  const deleteMessage = async (id: string) => {
    if (!confirm(es ? '¿Eliminar mensaje?' : 'Delete message?')) return;
    setDeleting(id);
    try {
      await request('DELETE', { id });
      setMessages((current) => current.filter((m) => m.id !== id));
      toast.success(es ? 'Mensaje eliminado' : 'Message deleted');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error(es ? 'Error al eliminar' : 'Error deleting');
    } finally {
      setDeleting(null);
    }
  };

  const openReply = (id: string) => {
    setReplyingTo(replyingTo === id ? null : id);
    setReplyText('');
  };

  const sendReply = async (msg: HelpMessage) => {
    const reply = replyText.trim();
    if (!reply) return;
    setSending(true);
    try {
      await request('POST', { id: msg.id, reply });
      setLocalStatus(msg.id, 'resolved');
      setReplyingTo(null);
      setReplyText('');
      toast.success(es ? `Respuesta enviada a ${msg.email}` : `Reply sent to ${msg.email}`);
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error(es ? 'No se pudo enviar. Tu texto sigue aquí.' : 'It could not be sent. Your text is still here.');
    } finally {
      setSending(false);
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString(es ? 'es-ES' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="w-5 h-5 text-[hsl(var(--primary))]" />
        <h2 className="text-xl font-bold">{es ? 'Mensajes de Ayuda' : 'Help Messages'}</h2>
        <span className="ml-auto text-sm text-[hsl(var(--muted-foreground))]">
          {messages.length} {es ? 'mensajes' : 'messages'}
        </span>
      </div>

      {messages.length === 0 ? (
        <div className="text-center py-8 text-[hsl(var(--muted-foreground))]">{es ? 'No hay mensajes' : 'No messages'}</div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <div key={msg.id} className="border border-[hsl(var(--border))] rounded-lg p-4">
              {msg.status === 'new' && (
                <span className="inline-block mb-2 px-2 py-0.5 rounded text-xs font-medium bg-[hsl(var(--foreground))] text-[hsl(var(--background))]">
                  {es ? 'Nuevo' : 'New'}
                </span>
              )}
              <h3 className="font-medium text-[hsl(var(--foreground))]">{msg.subject}</h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mb-2">
                {es ? 'De:' : 'From:'} {msg.name} ({msg.email})
              </p>

              <div className="mb-3">
                <p className="text-sm text-[hsl(var(--muted-foreground))] mb-2">
                  {es ? 'Categoría:' : 'Category:'} {CATEGORY_LABELS[msg.category]?.[language] ?? msg.category}
                </p>
                <p className="text-sm p-3 rounded border border-[hsl(var(--border))] whitespace-pre-wrap">
                  {msg.message}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                <label className="flex items-center gap-2 phone:gap-3 phone:min-h-11 cursor-pointer">
                  <Checkbox
                    checked={msg.status !== 'new'}
                    onCheckedChange={(checked) => updateStatus(msg, checked ? 'read' : 'new')}
                  />
                  {es ? 'Leído' : 'Read'}
                </label>
                <label className="flex items-center gap-2 phone:gap-3 phone:min-h-11 cursor-pointer">
                  <Checkbox
                    checked={msg.status === 'resolved'}
                    onCheckedChange={(checked) => updateStatus(msg, checked ? 'resolved' : 'read')}
                  />
                  {es ? 'Resuelto' : 'Resolved'}
                </label>
                <Button variant="outline" size="sm" className="h-8 phone:h-11" onClick={() => openReply(msg.id)}>
                  <Reply className="w-3.5 h-3.5 mr-1.5" />
                  {es ? 'Responder' : 'Reply'}
                </Button>
                <div className="ml-auto flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                  <span>{formatDate(msg.created_at)}</span>
                  <Button
                    onClick={() => deleteMessage(msg.id)}
                    disabled={deleting === msg.id}
                    variant="ghost"
                    size="sm"
                    className="h-7 phone:h-11 px-2 phone:w-11"
                    aria-label={es ? 'Eliminar mensaje' : 'Delete message'}
                  >
                    {deleting === msg.id ? <Loader className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  </Button>
                </div>
              </div>

              {replyingTo === msg.id && (
                <div className="mt-4 pt-4 border-t border-[hsl(var(--border))]">
                  <label htmlFor={`reply-${msg.id}`} className="block text-sm text-[hsl(var(--muted-foreground))] mb-2">
                    {es ? `Tu respuesta a ${msg.email}. Se enviará desde help@makwin.art y el saludo se añade solo.` : `Your reply to ${msg.email}. It will be sent from help@makwin.art with a greeting added.`}
                  </label>
                  <textarea
                    id={`reply-${msg.id}`}
                    value={replyText}
                    onChange={(event) => setReplyText(event.target.value)}
                    maxLength={MAX_REPLY_LENGTH}
                    rows={5}
                    autoFocus
                    className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--input))] text-sm resize-y focus:outline-none"
                  />
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" disabled={sending || !replyText.trim()} onClick={() => sendReply(msg)}>
                      {sending ? <Loader className="w-4 h-4 animate-spin" /> : es ? 'Enviar respuesta' : 'Send reply'}
                    </Button>
                    <Button size="sm" variant="ghost" disabled={sending} onClick={() => openReply(msg.id)}>
                      {es ? 'Cancelar' : 'Cancel'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
