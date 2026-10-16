import { IconCheck, IconWorld } from '@tabler/icons-react';
import { useCallback, useRef, useState } from 'react';

import type { MessageKey, Messages } from '@playliberty/i18n';
import { Language, useI18n } from '@playliberty/i18n';

import { useDismissibleMenu } from '../../../shared/components/useDismissibleMenu/useDismissibleMenu';

import styles from './LanguageMenu.module.scss';

/*
 * On the library only, because there is no account surface and no settings. The
 * trigger is named through `language.label` rather than a visible word.
 */

const OPTIONS: readonly {
  readonly value: Language;
  readonly label: MessageKey<Messages>;
}[] = [
  { value: Language.English, label: 'language.english' },
  { value: Language.French, label: 'language.french' }
];

export default function LanguageMenu() {
  const { language, setLanguage, t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  /* A choice closes the menu and returns the keyboard to the trigger. Escape is
   * the hook's. */
  const close = useCallback((): void => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useDismissibleMenu({
    open,
    containerRef: rootRef,
    triggerRef,
    onOpen: () => setOpen(true),
    onClose: () => setOpen(false)
  });

  return (
    <div className={styles.languageMenu} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.languageMenu__trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('language.label')}
        onClick={() => setOpen(value => !value)}>
        <IconWorld size={18} aria-hidden="true" />
      </button>
      {open ? (
        <div
          className={styles.languageMenu__menu}
          role="menu"
          aria-label={t('language.label')}>
          {OPTIONS.map(option => (
            <button
              key={option.value}
              type="button"
              role="menuitemradio"
              tabIndex={-1}
              aria-checked={language === option.value}
              className={styles.languageMenu__option}
              onClick={() => {
                setLanguage(option.value);
                close();
              }}>
              <IconCheck
                size={14}
                aria-hidden="true"
                className={styles.languageMenu__check}
                data-visible={language === option.value}
              />
              {t(option.label)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
