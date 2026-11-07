/**
 * Runtime public-asset URLs that work at both / (localhost) and the GitHub Pages
 * repository subpath (/thumbnail-studio/). Vite does not rewrite strings stored
 * in the editable template JSON or in IndexedDB.
 *
 * Keep saved scene data portable: only resolve paths when fetching/rendering.
 */
export function publicAssetUrl(src: string): string {
  if (!src || !src.startsWith('/') || src.startsWith('//')) return src;
  const base = import.meta.env.BASE_URL || '/';
  if (base === '/') return src;
  const prefix = base.replace(/\/+$/, '');
  if (src === prefix || src.startsWith(`${prefix}/`)) return src;
  return `${prefix}${src}`;
}
