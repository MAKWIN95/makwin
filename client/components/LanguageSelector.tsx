import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe, Check } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function LanguageSelector() {
  const { language, setLanguage, t } = useI18n();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button id="lang-selector-btn" className="p-1 transition-colors bg-transparent hover:bg-transparent focus:outline-none focus:ring-0" onMouseDown={(e)=>e.preventDefault()}>
          <Globe className="w-5 h-5 text-[hsl(var(--foreground))]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => { setLanguage('es'); setTimeout(()=> (document.getElementById('lang-selector-btn') as HTMLButtonElement)?.blur(), 50); }}>
          {t('languages.es')}
          <span className="ml-auto opacity-80">{language === 'es' ? <Check className="w-4 h-4" /> : null}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { setLanguage('en'); setTimeout(()=> (document.getElementById('lang-selector-btn') as HTMLButtonElement)?.blur(), 50); }}>
          {t('languages.en')}
          <span className="ml-auto opacity-80">{language === 'en' ? <Check className="w-4 h-4" /> : null}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}