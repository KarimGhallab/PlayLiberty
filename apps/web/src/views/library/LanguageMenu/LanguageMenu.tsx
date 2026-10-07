import { IconCheck, IconWorld } from '@tabler/icons-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { MessageKey, Messages } from '@playliberty/i18n';
import { Language, useI18n } from '@playliberty/i18n';

import styles from './LanguageMenu.module.scss';

/*
 * The library header's language control: a globe opening a two-row menu, the
 * active language checked. It is on the library only, because there is no
 * account surface and no settings. The menu is a radio group: choosing a row
 * switches the interface at once and remembers the choice.
 *
 * The trigger carries the label rather than a visible word, so it is named for a
 * screen reader by `language.label`. The language names are endonyms and read
 * the same in both catalogs.
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

  /* A close that returns the keyboard to the trigger, for Escape and a choice. */
  const close = useCallback((): void => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: PointerEvent): void => {
      const target = event.target;

      if (
        rootRef.current !== null &&
        target instanceof Node &&
        !rootRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        close();
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, close]);

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
