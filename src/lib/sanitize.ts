/**
 * Strips HTML tags and trims whitespace from user-supplied text before rendering.
 * React JSX already escapes text content, so this is defense-in-depth to prevent
 * stored HTML tags from appearing as raw markup characters in the UI.
 */
export function sanitizeText(input: string | null | undefined): string {
  if (input == null || input === '') return ''
  return input
    .replace(/<[^>]*>/g, '') // strip HTML tags
    .replace(/[<>]/g, '')    // remove any stray angle brackets
    .trim()
}
