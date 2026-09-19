import { useEffect } from 'react';
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
    setLanguage(newLang);
    
    // Save to Supabase if logged in
    if (user && profile) {
      try {
        await supabase
          .from('profiles')
          .update({ language_preference: newLang })
          .eq('id', user.id);
      } catch (err) {
        console.error('[LanguageSelector] Error saving language preference:', err);
      }
    }

    setTimeout(()=> (document.getElementById('lang-selector-btn') as HTMLButtonElement)?.blur(), 50);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button id="lang-selector-btn" className="p-1.5 rounded-lg border border-[rgba(120,120,120,0.25)] bg-[hsl(var(--popover))]/80 transition-colors hover:bg-[hsl(var(--muted))] focus:outline-none focus:ring-0" onMouseDown={(e)=>e.preventDefault()}>
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