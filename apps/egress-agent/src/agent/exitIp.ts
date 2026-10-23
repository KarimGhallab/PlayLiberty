import { isIP } from 'node:net';

/* The exit's own address, asked of a third party. Bounded and validated: a
 * page, a redirect or a proxy notice is not an address. */
export async function readExitIp(
  url: string,
  timeoutMs: number
): Promise<string | null> {
  try {
    const response = await fetch(url, {
      redirect: 'error',
      signal: AbortSignal.timeout(timeoutMs)
    });

    if (!response.ok) {
      return null;
    }

    const text = (await response.text()).trim().slice(0, 100);

    return isIP(text) === 0 ? null : text;
  } catch {
    return null;
  }
}
