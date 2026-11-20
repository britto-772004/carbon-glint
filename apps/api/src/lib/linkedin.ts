/**
 * Normalises whatever a user pastes as a LinkedIn link into `https://www.linkedin.com/<kind>/<slug>`.
 * Accepts company, school, showcase and personal (`/in/`) pages, with or without scheme, `www.`,
 * country subdomains (`in.linkedin.com`), query strings, fragments or trailing slashes.
 * Returns `null` for blank input and `undefined` when the text is not a LinkedIn profile/page URL.
 */
export function normalizeLinkedinUrl(raw: string | null | undefined): string | null | undefined {
  const text = (raw ?? '').trim();
  if (!text) return null;
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return undefined;
  }
  const host = url.hostname.toLowerCase();
  if (host !== 'linkedin.com' && !host.endsWith('.linkedin.com')) return undefined;
  const [kind, slug] = url.pathname
    .split('/')
    .filter(Boolean)
    .map((p) => decodeURIComponent(p));
  if (!kind || !slug || !['company', 'school', 'showcase', 'in'].includes(kind.toLowerCase())) return undefined;
  return `https://www.linkedin.com/${kind.toLowerCase()}/${encodeURIComponent(slug)}/`;
}
