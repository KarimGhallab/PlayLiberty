import { QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { I18nProvider } from '@playliberty/i18n';

import { createAppQueryClient } from '../api/queryClient/queryClient';
import { useSessionStore } from '../auth/sessionStore/sessionStore';
import { deviceLanguages } from '../i18n/deviceLanguages';
import { secureLanguageStore } from '../i18n/languageStorage';

export interface AppProvidersProps {
  readonly children: ReactNode;
}

export default function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(() =>
    createAppQueryClient(() => {
      void useSessionStore.getState().expire();
    })
  );

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <I18nProvider
          preferred={deviceLanguages()}
          storage={secureLanguageStore}>
          {children}
        </I18nProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
