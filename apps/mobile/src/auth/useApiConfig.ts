import { useEffect, useState } from 'react';

import { apiBaseUrl } from '../api/apiBaseUrl';
import type { AccessToken } from '../api/apiClient/ApiClient';
import { tokenStore } from './tokenStore';

export interface ApiConfig {
  readonly baseUrl: string;
  readonly token: AccessToken;
}

/** The origin and the credential a request needs, or null until both are read. */
export function useApiConfig(): ApiConfig | null {
  const [config, setConfig] = useState<ApiConfig | null>(null);

  useEffect(() => {
    let active = true;

    void tokenStore.read().then(token => {
      if (active && token !== null) {
        setConfig({ baseUrl: apiBaseUrl(), token });
      }
    });

    return () => {
      active = false;
    };
  }, []);

  return config;
}
