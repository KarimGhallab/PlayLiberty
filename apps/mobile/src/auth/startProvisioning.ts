import { apiBaseUrl } from '../api/apiBaseUrl';
import {
  expoProvisioningDeps,
  provisioningRedirectUris
} from './expoProvisioning';
import { beginProvisioning } from './provisioning/provisioning';

/** Opens the browser with the app's base, callbacks and platform deps. */
export function startProvisioning(): Promise<void> {
  return beginProvisioning({
    baseUrl: apiBaseUrl(),
    redirectUris: provisioningRedirectUris(),
    deps: expoProvisioningDeps
  });
}
