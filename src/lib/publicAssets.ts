/** Resolve static public assets on localhost and GitHub Pages.
 * Use a versioned logo filename to avoid a previously cached PNG.
 * Old saved projects that refer to the former default filename
 * automatically render the new logo, without touching user uploads.
 */
export function publicAssetUrl(src: string): string {
  if (!src) return src;
  if (src === '/zero2players-logo.png' || src === 'zero2players-logo.png' ||
      src === '/thumbnail-studio/zero2players-logo.png') {
    src = '/zero2players-logo-v2.png';
  }
  if (!src.startsWith('/') || src.startsWith('//')) return src;
  const base = import.meta.env.BASE_URL || '/';
  if (base === '/') return src;
  const prefix = base.replace(/\/+$/, '');
  if (src === prefix || src.startsWith(`${prefix}/`)) return src;
  return `${prefix}${src}`;
}
