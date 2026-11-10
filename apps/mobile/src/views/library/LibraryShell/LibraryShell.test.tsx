import { describe, expect, it, jest } from '@jest/globals';
import { act, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type * as ApiClientModule from '@playliberty/api-client';
import { I18nProvider, Language } from '@playliberty/i18n';

import LibraryShell from './LibraryShell';

jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  const focus = { cleanup: null as (() => void) | null };

  return {
    router: { push: jest.fn() },
    focusProbe: focus,
    useFocusEffect: (callback: () => void | (() => void)): void => {
      useEffect(() => {
        const cleanup = callback();

        focus.cleanup = typeof cleanup === 'function' ? cleanup : null;

        return () => {
          focus.cleanup = null;
        };
      }, [callback]);
    }
  };
});

const { focusProbe } = jest.requireMock('expo-router') as {
  focusProbe: { cleanup: (() => void) | null };
};

jest.mock('../../../auth/useSession', () => ({
  SessionStatus: {
    Loading: 'loading',
    SignedOut: 'signed-out',
    SignedIn: 'signed-in'
  },
  useSession: () => ({ status: 'signed-in', signOut: jest.fn() })
}));

jest.mock('../../../auth/useApiConfig/useApiConfig', () => ({
  useApiConfig: () => null
}));

jest.mock('@playliberty/api-client', () => ({
  ...jest.requireActual<typeof ApiClientModule>('@playliberty/api-client'),
  useCurrentAccount: () => ({ data: null, error: null, isPending: false })
}));

jest.mock('../LibraryScreen', () => {
  const { View } =
    jest.requireActual<typeof import('react-native')>('react-native');

  return {
    __esModule: true,
    default: () => <View testID="library-body" />
  };
});

jest.mock('../../../shared/components/AccountSheet/AccountSheet', () => ({
  __esModule: true,
  default: () => null
}));

const store = { getItem: () => null, setItem: () => {} };
const hidden = { includeHiddenElements: true };

async function renderShell() {
  await render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 }
      }}>
      <I18nProvider initialLanguage={Language.English} storage={store}>
        <LibraryShell />
      </I18nProvider>
    </SafeAreaProvider>
  );
}

describe('the library shell', () => {
  it('leaves the accessibility tree while another route covers it', async () => {
    await renderShell();

    const frame = () => screen.getByTestId('library-screen', hidden);
    expect(frame().props.importantForAccessibility).toBe('auto');
    expect(frame().props.accessibilityElementsHidden).toBe(false);

    await act(async () => {
      focusProbe.cleanup?.();
    });

    expect(frame().props.importantForAccessibility).toBe('no-hide-descendants');
    expect(frame().props.accessibilityElementsHidden).toBe(true);
    // The screen is hidden from the tree, not unmounted.
    expect(screen.getByTestId('library-body', hidden)).toBeOnTheScreen();
  });
});
