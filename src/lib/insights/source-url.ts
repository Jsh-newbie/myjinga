export function normalizeInsightSourceUrl(value: string) {
  const normalized = value.trim();
  if (!normalized) return normalized;

  try {
    const url = new URL(normalized);
    const host = url.hostname.toLowerCase();

    if (host === 'news.google.com' && /^\/rss\/(search|topics)(\/|$)/.test(url.pathname)) {
      url.pathname = url.pathname.replace(/^\/rss/, '');
      return url.toString();
    }

    return url.toString();
  } catch {
    return normalized;
  }
}
