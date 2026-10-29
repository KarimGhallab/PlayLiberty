import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { I18nProvider } from '@playliberty/i18n';

import { deviceLanguages } from '../i18n/deviceLanguages';
import { secureLanguageStore } from '../i18n/languageStorage';

export interface AppProvidersProps {
  readonly children: ReactNode;
}

export default function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(() => new QueryClient());

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
