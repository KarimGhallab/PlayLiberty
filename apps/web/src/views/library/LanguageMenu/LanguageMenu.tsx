import { IconCheck, IconWorld } from '@tabler/icons-react';
import { useRef, useState } from 'react';

import type { MessageKey, Messages } from '@playliberty/i18n';
import { Language, useI18n } from '@playliberty/i18n';

import Menu, { MenuVariant } from '../../../shared/components/Menu/Menu';
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
        <Menu
          items={OPTIONS.map(option => ({
            key: option.value,
            label: t(option.label),
            icon: (
              <IconCheck
                size={14}
                aria-hidden="true"
                className={styles.languageMenu__check}
                data-visible={language === option.value}
              />
            ),
            checked: language === option.value,
            onSelect: () => setLanguage(option.value)
          }))}
          variant={MenuVariant.Radio}
          triggerRef={triggerRef}
          onClose={() => setOpen(false)}
          className={styles.languageMenu__menu}
          itemClassName={styles.languageMenu__option}
          ariaLabel={t('language.label')}
        />
      ) : null}
    </div>
  );
}
