import { useEffect, useState } from 'react';
import { Loader, MessageSquare, Trash2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface HelpMessage {
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

const STATUS_COLORS = {
  new: 'bg-red-100 text-red-800',
  read: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-green-100 text-green-800',
};

const STATUS_LABELS = {
  new: { es: 'Nuevo', en: 'New' },
  read: { es: 'Leído', en: 'Read' },
  resolved: { es: 'Resuelto', en: 'Resolved' },
};

export default function AdminHelpMessages() {
  const { language } = useI18n();
  const [messages, setMessages] = useState<HelpMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('help_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error(language === 'es' ? 'Error al cargar mensajes' : 'Error loading messages');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('help_messages')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      
      setMessages(messages.map(m => m.id === id ? { ...m, status } : m));
      toast.success(language === 'es' ? 'Estado actualizado' : 'Status updated');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(language === 'es' ? 'Error al actualizar' : 'Error updating');
    }
  };

  const deleteMessage = async (id: string) => {
    if (!confirm(language === 'es' ? '¿Eliminar mensaje?' : 'Delete message?')) return;

    setDeleting(id);
    try {
      const { error } = await supabase
        .from('help_messages')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setMessages(messages.filter(m => m.id !== id));
      toast.success(language === 'es' ? 'Mensaje eliminado' : 'Message deleted');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error(language === 'es' ? 'Error al eliminar' : 'Error deleting');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
        <MessageSquare className="w-5 h-5 text-[hsl(var(--primary))]" />
        <h2 className="text-xl font-bold">
          {language === 'es' ? 'Mensajes de Ayuda' : 'Help Messages'}
        </h2>
        <span className="ml-auto text-sm text-[hsl(var(--muted-foreground))]">
          {messages.length} {language === 'es' ? 'mensajes' : 'messages'}
        </span>
      </div>

      {messages.length === 0 ? (
        <div className="text-center py-8 text-[hsl(var(--muted-foreground))]">
          {language === 'es' ? 'No hay mensajes' : 'No messages'}
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className="border border-[hsl(var(--border))] rounded-lg p-4 hover:bg-[hsl(var(--muted))] transition"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="font-medium text-[hsl(var(--foreground))]">{msg.subject}</h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    {language === 'es' ? 'De:' : 'From:'} {msg.name} ({msg.email})
                  </p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[msg.status as keyof typeof STATUS_COLORS]}`}>
                  {STATUS_LABELS[msg.status as keyof typeof STATUS_LABELS]?.[language]}
                </span>
              </div>

              <div className="mb-3">
                <p className="text-sm text-[hsl(var(--muted-foreground))] mb-2">
                  {language === 'es' ? 'Categoría:' : 'Category:'} {msg.category}
                </p>
                <p className="text-sm bg-[hsl(var(--muted))] p-3 rounded border border-[hsl(var(--border))] whitespace-pre-wrap">
                  {msg.message}
                </p>
              </div>

              <div className="flex items-center justify-between text-xs text-[hsl(var(--muted-foreground))]">
                <span>{formatDate(msg.created_at)}</span>
                <div className="flex gap-2">
                  <select
                    value={msg.status}
                    onChange={(e) => updateStatus(msg.id, e.target.value)}
                    className="px-2 py-1 border border-[hsl(var(--border))] rounded text-xs bg-[hsl(var(--background))] text-[hsl(var(--foreground))]"
                  >
                    <option value="new">{STATUS_LABELS.new[language]}</option>
                    <option value="read">{STATUS_LABELS.read[language]}</option>
                    <option value="resolved">{STATUS_LABELS.resolved[language]}</option>
                  </select>
                  <Button
                    onClick={() => deleteMessage(msg.id)}
                    disabled={deleting === msg.id}
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                  >
                    {deleting === msg.id ? (
                      <Loader className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
