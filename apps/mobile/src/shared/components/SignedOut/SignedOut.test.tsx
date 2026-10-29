import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { I18nProvider, Language } from '@playliberty/i18n';

import { touchTarget } from '../../styles/tokens';
import SignedOut from './SignedOut';

const store = { getItem: () => null, setItem: () => {} };

async function renderSignedOut(
  overrides: Partial<Parameters<typeof SignedOut>[0]> = {}
): Promise<{ onSignIn: ReturnType<typeof jest.fn> }> {
  const onSignIn = jest.fn();

  await render(
    <I18nProvider initialLanguage={Language.English} storage={store}>
      <SignedOut
        busy={false}
        failure={null}
        onSignIn={onSignIn}
        {...overrides}
      />
    </I18nProvider>
  );

  return { onSignIn };
}

describe('the signed-out state', () => {
  it('offers one named action that meets the touch target', async () => {
    const { onSignIn } = await renderSignedOut();

    const action = screen.getByRole('button', { name: 'Sign in' });

    expect(action).toBeEnabled();
    expect(action).toHaveStyle({
      minHeight: touchTarget,
      minWidth: touchTarget
    });

    fireEvent.press(action);
    expect(onSignIn).toHaveBeenCalledTimes(1);
  });

  it('announces the action as busy and disabled while signing in', async () => {
    await renderSignedOut({ busy: true });

    const action = screen.getByRole('button', { name: 'Signing in…' });

    expect(action).toBeDisabled();
  });

  it('names its heading', async () => {
    await renderSignedOut();

    expect(
      screen.getByRole('header', { name: 'Sign in to enter the app' })
    ).toBeOnTheScreen();
  });
});
