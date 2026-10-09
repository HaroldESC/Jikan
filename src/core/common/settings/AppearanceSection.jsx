/**
 * Owns the "Appearance" panel of the Settings modal: the visual style switch
 * (Maru / Sei) and the interface language. Both are app-wide preferences, so
 * this section only writes them through `useTheme` / `LanguageSelector`; every
 * class comes from the shared `s` tokens.
 */

import { useTranslation } from '../../../i18n/useTranslation';
import { useTheme } from '../../../hooks/useTheme';
import LanguageSelector from './LanguageSelector';
import { Section, SubGroup, ActionGrid, OptionButton } from './ui';

export default function AppearanceSection({ s }) {
  const { style, setStyle } = useTheme();
  const { t } = useTranslation();

  return (
    <Section s={s} title={t('settings.appearance')} description={t('settings.appearanceIntro')}>
      <SubGroup s={s} title={t('settings.visualStyle')} divided={false}>
        {/* Group semantics instead of per-button aria-label: the buttons keep
            their own accessible names. */}
        <div role="group" aria-label={t('settings.visualStyle')}>
          <ActionGrid>
            {/* "Maru" and "Sei" are the product style names, not UI copy:
                they are deliberately never translated. */}
            <OptionButton s={s} active={style === 'maru'} onClick={() => setStyle('maru')}>
              Maru
            </OptionButton>
            <OptionButton s={s} active={style === 'sei'} onClick={() => setStyle('sei')}>
              Sei
            </OptionButton>
          </ActionGrid>
        </div>
      </SubGroup>

      <SubGroup s={s} title={t('settings.language')} description={t('settings.languageDescription')}>
        <LanguageSelector s={s} />
      </SubGroup>
    </Section>
  );
}