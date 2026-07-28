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
      <div className="grid grid-cols-3 gap-2">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl text-xs font-medium border transition ${
              language === lang.code
                ? 'bg-blue-500/20 border-blue-500 text-blue-500 dark:text-blue-400'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
          >
            <span>{lang.flag}</span>
            <span className="truncate">{lang.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
