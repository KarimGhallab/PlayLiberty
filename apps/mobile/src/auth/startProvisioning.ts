import { apiBaseUrl } from '../api/apiBaseUrl';
import {
  expoProvisioningDeps,
  provisioningRedirectUris
} from './expoProvisioning';
import { beginProvisioning } from './provisioning/provisioning';

/** Opens the browser sheet. */
export function startProvisioning(): Promise<void> {
  return beginProvisioning({
    baseUrl: apiBaseUrl(),
    redirectUris: provisioningRedirectUris(),
    deps: expoProvisioningDeps
  });
}
