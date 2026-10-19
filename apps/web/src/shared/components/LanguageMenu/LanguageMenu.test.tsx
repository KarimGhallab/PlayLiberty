import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, it } from 'vitest';

import { I18nProvider } from '@playliberty/i18n';

import LanguageMenu from './LanguageMenu';

function renderMenu() {
  return render(
    <I18nProvider preferred={['en']}>
      <LanguageMenu />
    </I18nProvider>
  );
}

describe('LanguageMenu', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('opens a menu of the two languages with the active row checked', () => {
    renderMenu();

    fireEvent.click(screen.getByRole('button', { name: 'Language' }));

    expect(
      screen.getByRole('menuitemradio', { name: 'English' })
    ).toHaveAttribute('aria-checked', 'true');
    expect(
      screen.getByRole('menuitemradio', { name: 'Français' })
    ).toHaveAttribute('aria-checked', 'false');
  });

  it('switches the language, remembers it and closes', async () => {
    renderMenu();

    fireEvent.click(screen.getByRole('button', { name: 'Language' }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Français' }));

    expect(window.localStorage.getItem('playliberty.language')).toBe('fr');
    expect(document.documentElement.lang).toBe('fr');
    expect(screen.getByRole('button', { name: 'Langue' })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  it('closes on Escape', async () => {
    renderMenu();

    fireEvent.click(screen.getByRole('button', { name: 'Language' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  it('closes on a press outside it', async () => {
    renderMenu();

    fireEvent.click(screen.getByRole('button', { name: 'Language' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.pointerDown(document.body);

    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  it('lands on the first language and walks with the arrows', () => {
    renderMenu();

    fireEvent.keyDown(screen.getByRole('button', { name: 'Language' }), {
      key: 'ArrowDown'
    });

    const english = screen.getByRole('menuitemradio', { name: 'English' });
    expect(english).toHaveFocus();

    fireEvent.keyDown(english, { key: 'ArrowDown' });

    expect(
      screen.getByRole('menuitemradio', { name: 'Français' })
    ).toHaveFocus();
  });

  it('has no axe violations with the menu open', async () => {
    const { container } = renderMenu();

    fireEvent.click(screen.getByRole('button', { name: 'Language' }));

    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } }
    });
    expect(results.violations).toEqual([]);
  });
});
