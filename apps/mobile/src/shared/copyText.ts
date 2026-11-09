/* The clipboard is a native module, so the import is lazy. */
export async function copyText(text: string): Promise<boolean> {
  const Clipboard = await import('expo-clipboard');

  return Clipboard.setStringAsync(text);
}
