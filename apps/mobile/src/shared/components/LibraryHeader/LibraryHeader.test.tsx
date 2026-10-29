import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { I18nProvider, Language } from '@playliberty/i18n';

import { touchTarget } from '../../styles/tokens';
import LibraryHeader from './LibraryHeader';

const store = { getItem: () => null, setItem: () => {} };

async function renderHeader(): Promise<{
  onOpenAccount: ReturnType<typeof jest.fn>;
}> {
  const onOpenAccount = jest.fn();

  await render(
    <I18nProvider initialLanguage={Language.English} storage={store}>
      <LibraryHeader onOpenAccount={onOpenAccount} />
    </I18nProvider>
  );

  return { onOpenAccount };
}

describe('the library header', () => {
  it('offers one named door to the account that meets the touch target', async () => {
    const { onOpenAccount } = await renderHeader();

    const door = screen.getByRole('button', { name: 'Account' });

    expect(door).toHaveStyle({
      minHeight: touchTarget,
      minWidth: touchTarget
    });

    fireEvent.press(door);
    expect(onOpenAccount).toHaveBeenCalledTimes(1);
  });
});
