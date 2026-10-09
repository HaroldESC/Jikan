/**
 * Language picker for the Settings › Appearance section.
 *
 * Purely presentational: it reads the active locale from the i18n provider and
 * writes it back through `setLanguage`. The label and the description live in
 * the enclosing `SubGroup`, so this component only renders the three options.
 *
 * The ISO code is shown instead of a flag emoji: emoji flags render as real
 * flags on macOS/iOS but degrade to bare letter pairs everywhere else, which
 * makes the picker look different per platform. A code chip is deterministic.
 */

import { useTranslation } from '../../../i18n/useTranslation';
import { ActionGrid, OptionButton } from './ui';

const LANGUAGES = [
  { code: 'es', short: 'ES', label: 'Español' },
  { code: 'en', short: 'EN', label: 'English' },
  { code: 'ja', short: 'JA', label: '日本語' },
];

export default function LanguageSelector({ s }) {
  const { language, setLanguage } = useTranslation();

  return (
    <ActionGrid cols={3}>
      {LANGUAGES.map((lang) => (
        <OptionButton
          key={lang.code}
          s={s}
          active={language === lang.code}
          onClick={() => setLanguage(lang.code)}
          className="flex-col gap-1 py-3"
        >
          <span className="text-xs font-bold uppercase tracking-wider opacity-70">{lang.short}</span>
          <span className="truncate max-w-full">{lang.label}</span>
        </OptionButton>
      ))}
    </ActionGrid>
  );
}
