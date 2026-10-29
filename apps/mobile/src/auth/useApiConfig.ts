import { useEffect, useState } from 'react';

import { apiBaseUrl } from '../api/apiBaseUrl';
import type { AccessToken } from '../api/apiClient/ApiClient';
import { SessionStatus, useSessionStore } from './sessionStore/sessionStore';
import { tokenStore } from './tokenStore';

export interface ApiConfig {
  readonly baseUrl: string;
  readonly token: AccessToken;
}

/** The origin and the credential a request needs, or null until both are read.
 * It follows the session, so a sign-in or a sign-out is seen without a relaunch. */
export function useApiConfig(): ApiConfig | null {
  const status = useSessionStore(state => state.status);
  const [config, setConfig] = useState<ApiConfig | null>(null);

  useEffect(() => {
    if (status !== SessionStatus.SignedIn) {
      setConfig(null);
      return;
    }

    let active = true;

    void tokenStore.read().then(token => {
      if (active && token !== null) {
        setConfig({ baseUrl: apiBaseUrl(), token });
      }
    });

    return () => {
      active = false;
    };
  }, [status]);

  return config;
}
