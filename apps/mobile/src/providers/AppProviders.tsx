import { QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { I18nProvider } from '@playliberty/i18n';

import { createAppQueryClient } from '../api/queryClient/queryClient';
import { endRefusedSession } from '../auth/endRefusedSession';
import { deviceLanguages } from '../i18n/deviceLanguages';
import { secureLanguageStore } from '../i18n/languageStorage';
import { PlayerBarSizeProvider } from '../player/playerBarSize/PlayerBarSizeContext';
import SessionCache from './SessionCache/SessionCache';

export interface AppProvidersProps {
  readonly children: ReactNode;
}

export default function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(() => createAppQueryClient(endRefusedSession));

  return (
    <SafeAreaProvider>
      <PlayerBarSizeProvider>
        <QueryClientProvider client={queryClient}>
          <SessionCache />
          <I18nProvider
            preferred={deviceLanguages()}
            storage={secureLanguageStore}>
            {children}
          </I18nProvider>
        </QueryClientProvider>
      </PlayerBarSizeProvider>
    </SafeAreaProvider>
  );
}
