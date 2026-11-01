/* The edge classifies a request as browser or non-browser by its User-Agent.
 * Every request that reaches it names the app, so a refused session is JSON
 * rather than an SSO page. */
export const USER_AGENT_HEADER = 'User-Agent';

export const USER_AGENT = 'PlayLiberty/1.0 (Android)';
