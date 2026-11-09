import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { I18nProvider, Language } from '@playliberty/i18n';

import { touchTarget } from '../../styles/tokens/tokens';
import NotFound from './NotFound';

const store = { getItem: () => null, setItem: () => {} };

async function renderNotFound(): Promise<{
  onBack: ReturnType<typeof jest.fn>;
}> {
  const onBack = jest.fn();

  await render(
    <I18nProvider initialLanguage={Language.English} storage={store}>
      <NotFound onBack={onBack} />
    </I18nProvider>
  );

  return { onBack };
}

describe('the not-found body', () => {
  it('names its heading', async () => {
    await renderNotFound();

    expect(
      screen.getByRole('header', { name: 'Page not found' })
    ).toBeOnTheScreen();
  });

  it('offers one named way home that meets the touch target', async () => {
    const { onBack } = await renderNotFound();

    const home = screen.getByRole('button', { name: 'Back to home' });

    expect(home).toHaveStyle({
      minHeight: touchTarget,
      minWidth: touchTarget
    });

    await fireEvent.press(home);
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
