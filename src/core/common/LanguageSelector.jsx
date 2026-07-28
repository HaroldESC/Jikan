import { useTranslation } from '../../i18n/useTranslation';

const LANGUAGES = [
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
];

export default function LanguageSelector() {
  const { language, setLanguage, t } = useTranslation();

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium opacity-80">
        {t('settings.language')}
      </label>
      <p className="text-xs opacity-60 -mt-2">
        {t('settings.languageDescription')}
      </p>
      <div className="flex gap-2">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition whitespace-nowrap ${
              language === lang.code
                ? 'bg-blue-500/20 border-blue-500 text-blue-500 dark:text-blue-400'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
          >
            <span className="text-base">{lang.flag}</span>
            {lang.label}
          </button>
        ))}
      </div>
    </div>
  );
}
