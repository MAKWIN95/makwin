import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminHeldWorks, { type HeldWork } from '@/components/AdminHeldWorks';
import AdminHelpMessages, { type HelpMessage } from '@/components/AdminHelpMessages';
import AdminReports, { type Report } from '@/components/AdminReports';
import { authHeaders } from '@/lib/adminApi';
import { useI18n } from '@/lib/i18n';

interface PanelData {
  messages: HelpMessage[];
  reports: Report[];
  held: HeldWork[];
}

// Kept while the app is open, so coming back to the panel shows it at once.
let cachedPanel: PanelData | null = null;

export default function Admin() {
  const { language } = useI18n();
  const es = language === 'es';
  const [panel, setPanel] = useState<PanelData | null>(cachedPanel);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<string | null>(null);

  useEffect(() => {
    cachedPanel = panel;
  }, [panel]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/reports?scope=panel', { headers: await authHeaders() });
        if (cancelled) return;
        if (response.status === 401) {
          cachedPanel = null;
          setPanel(null);
          setDenied(true);
          return;
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = (await response.json()) as PanelData;
        if (!cancelled) setPanel(data);
      } catch (err) {
        console.error('[Admin] Could not load the panel:', err);
        if (!cancelled) setError(es ? 'No se pudo cargar el panel. Inténtalo de nuevo.' : 'The panel could not be loaded. Please try again.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Each tab edits its own part of the shared data.
  const setter = <K extends keyof PanelData>(key: K): Dispatch<SetStateAction<PanelData[K]>> => (next) =>
    setPanel((current) =>
      current && {
        ...current,
        [key]: typeof next === 'function' ? (next as (value: PanelData[K]) => PanelData[K])(current[key]) : next,
      },
    );

  if (!panel) {
    return (
      <div className="min-h-screen flex flex-col bg-[hsl(var(--background))]">
        <Header hideSearch />
        <div className="flex-1 flex items-center justify-center px-4 text-center">
          {denied || error ? (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {error || (es ? 'Acceso restringido: inicia sesión con una cuenta de administrador.' : 'Restricted access: sign in with an admin account.')}
            </p>
          ) : (
            <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--muted-foreground))]" />
          )}
        </div>
      </div>
    );
  }

  const newMessages = panel.messages.filter((message) => message.status === 'new').length;
  const openReports = panel.reports.filter((report) => !report.reviewed).length;
  const tab = activeTab ?? (panel.held.length > 0 ? 'held' : 'help-messages');

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
                {es ? 'Obras retenidas, mensajes de ayuda y reportes' : 'Held works, help messages and reports'}
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <Tabs value={tab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="flex h-auto w-full flex-wrap justify-start gap-2 mb-8">
                <TabsTrigger value="held">
                  {es ? 'Obras retenidas' : 'Held works'} ({panel.held.length})
                </TabsTrigger>
                <TabsTrigger value="help-messages">
                  {es ? 'Mensajes de ayuda' : 'Help messages'} ({newMessages})
                </TabsTrigger>
                <TabsTrigger value="reports">
                  {es ? 'Reportes' : 'Reports'} ({openReports})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="held">
                <AdminHeldWorks works={panel.held} setWorks={setter('held')} />
              </TabsContent>
              <TabsContent value="help-messages">
                <AdminHelpMessages messages={panel.messages} setMessages={setter('messages')} />
              </TabsContent>
              <TabsContent value="reports">
                <AdminReports reports={panel.reports} setReports={setter('reports')} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
