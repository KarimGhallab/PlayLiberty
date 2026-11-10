import { useEffect, useState } from 'react';

import { apiBaseUrl } from '../../api/apiBaseUrl';
import type { AccessToken } from '../../api/credentialed/credentialed';
import { mobileSession } from '../session/session';
import {
  type SessionRecord,
  accessTokenOf
} from '../sessionRecord/sessionRecord';
import { SessionStatus, useSessionStore } from '../sessionStore/sessionStore';

export interface ApiConfig {
  readonly baseUrl: string;
  readonly token: AccessToken;
}

/** The origin and the credential a request needs, or null until both are read.
 * It follows every renewed record, so a rotation needs no relaunch. */
export function useApiConfig(): ApiConfig | null {
  const status = useSessionStore(state => state.status);
  const [config, setConfig] = useState<ApiConfig | null>(null);

  useEffect(() => {
    if (status !== SessionStatus.SignedIn) {
      setConfig(null);
      return;
    }

    const baseUrl = apiBaseUrl();
    let active = true;

    const apply = (record: SessionRecord | null): void => {
      if (!active) {
        return;
      }

      setConfig(
        record === null ? null : { baseUrl, token: accessTokenOf(record) }
      );
    };

    /* The subscription carries a background rotation; the read covers the
     * record the app already holds. */
    const unsubscribe = mobileSession.subscribe(apply);

    void mobileSession
      .accessToken()
      .then(token => {
        if (active && token !== null) {
          setConfig({ baseUrl, token });
        }
      })
      .catch(async () => {
        /* A transient renewal keeps the current pair until it really lapses. */
        const token = await mobileSession.usableAccessToken();

        if (active && token !== null) {
          setConfig({ baseUrl, token });
        }
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [status]);

  return config;
}
