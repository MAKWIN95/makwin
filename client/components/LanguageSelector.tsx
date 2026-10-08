import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe, Check } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";

export default function LanguageSelector() {
  const { language, setLanguage, t } = useI18n();
  const { user, profile } = useAuth();

  const handleLanguageChange = async (newLang: 'es' | 'en') => {
    const previousLanguage = language;
    setLanguage(newLang);

    if (user) {
      try {
        // Keep the existing profile preference when that column exists, but do not
        // issue a PostgREST update against deployments whose schema lacks it.
        if (profile && Object.prototype.hasOwnProperty.call(profile, 'language_preference')) {
          const { error: profileError } = await supabase
            .from('profiles')
            .update({ language_preference: newLang })
            .eq('id', user.id);

          if (profileError) throw profileError;
        }

        // Supabase Auth templates receive user_metadata as .Data. Persist the
        // selected locale there so notification templates use the same choice.
        const { error: authError } = await supabase.auth.updateUser({
          data: {
            ...user.user_metadata,
            language_preference: newLang,
          },
        });

        if (authError) throw authError;
      } catch (err) {
        console.error('[LanguageSelector] Error saving language preference:', err);
        setLanguage(previousLanguage);
        return;
      }
    }

    setTimeout(()=> (document.getElementById('lang-selector-btn') as HTMLButtonElement)?.blur(), 50);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button id="lang-selector-btn" aria-label={language === 'es' ? 'Cambiar idioma' : 'Change language'} className="!border-0 !bg-transparent p-1.5 rounded-md !shadow-none transition-opacity hover:!border-0 hover:!bg-transparent hover:opacity-70 focus:outline-none focus:ring-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))]" onMouseDown={(e)=>e.preventDefault()}>
          <Globe className="w-4 h-4 text-[hsl(var(--foreground))]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="border border-[rgba(120,120,120,0.25)] bg-[hsl(var(--popover))] text-[hsl(var(--foreground))] shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
      >
        <DropdownMenuItem
          onClick={() => handleLanguageChange('es')}
          className="focus:bg-[hsl(var(--muted))] focus:text-[hsl(var(--foreground))] data-[highlighted]:bg-[hsl(var(--muted))]"
        >
          {t('languages.es')}
          <span className="ml-auto opacity-80">{language === 'es' ? <Check className="w-4 h-4" /> : null}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleLanguageChange('en')}
          className="focus:bg-[hsl(var(--muted))] focus:text-[hsl(var(--foreground))] data-[highlighted]:bg-[hsl(var(--muted))]"
        >
          {t('languages.en')}
          <span className="ml-auto opacity-80">{language === 'en' ? <Check className="w-4 h-4" /> : null}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
