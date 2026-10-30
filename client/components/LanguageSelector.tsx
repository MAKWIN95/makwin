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
    // Not modal: a modal menu locks the page and spends the next tap on closing itself.
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button id="lang-selector-btn" aria-label={language === 'es' ? 'Cambiar idioma' : 'Change language'} className="header-button inline-flex items-center justify-center shrink-0 p-2 phone:p-0 phone:w-11 phone:h-11 max-[429px]:!w-9 max-[374px]:!w-8" onMouseDown={(e)=>e.preventDefault()}>
          <Globe className="w-4 h-4 phone:w-5 phone:h-5 text-[hsl(var(--foreground))]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="glass-menu text-[hsl(var(--foreground))]"
      >
        <DropdownMenuItem
          onClick={() => handleLanguageChange('es')}
          className="phone:min-h-11 focus:bg-[hsl(var(--muted))] focus:text-[hsl(var(--foreground))] data-[highlighted]:bg-[hsl(var(--muted))]"
        >
          {t('languages.es')}
          <span className="ml-auto opacity-80">{language === 'es' ? <Check className="w-4 h-4" /> : null}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleLanguageChange('en')}
          className="phone:min-h-11 focus:bg-[hsl(var(--muted))] focus:text-[hsl(var(--foreground))] data-[highlighted]:bg-[hsl(var(--muted))]"
        >
          {t('languages.en')}
          <span className="ml-auto opacity-80">{language === 'en' ? <Check className="w-4 h-4" /> : null}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
