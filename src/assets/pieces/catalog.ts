import type { PictureLayer, Template } from '../../types/editor';
import arrowRed from './arrow-red.svg?raw';
import focusRing from './focus-ring.svg?raw';
import grungeStripe from './grunge-stripe.svg?raw';
import vsBadge from './vs-badge.svg?raw';
import explosion from './explosion.svg?raw';
import speedlines from './speedlines.svg?raw';

/** The canvas and the catalog cards use the SAME asset URL. SVGs are bundled
 * into the JS build; the editor does not depend on a separate public/pieces path. */
const embeddedSvg = (svg: string): string =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.trim())}`;

export const nativePieces = [
  { id: 'arrow-red', name: 'Seta vermelha', width: 290, height: 170, svg: arrowRed },
  { id: 'focus-ring', name: 'Círculo foco', width: 210, height: 210, svg: focusRing },
  { id: 'grunge-stripe', name: 'Faixa grunge', width: 370, height: 140, svg: grungeStripe },
  { id: 'vs-badge', name: 'Selo VS', width: 210, height: 210, svg: vsBadge },
  { id: 'explosion', name: 'Explosão', width: 255, height: 220, svg: explosion },
  { id: 'speedlines', name: 'Speedlines', width: 330, height: 195, svg: speedlines },
].map(piece => ({...piece, src: embeddedSvg(piece.svg), legacyPath: `/pieces/${piece.id}.svg` }));

export type NativePiece = typeof nativePieces[number];

/** Only repairs known built-in paths/IDs, never a user's custom uploaded image. */
export function findNativePiece(layer: PictureLayer): NativePiece | undefined {
  if (layer.nativePieceId) return nativePieces.find(p => p.id === layer.nativePieceId);
  return nativePieces.find(piece => {
    if (layer.src === piece.legacyPath) return true;
    try {
      const url = new URL(layer.src, 'http://localhost:5173');
      const hostname = url.hostname;
      return (hostname === 'localhost' || hostname === '127.0.0.1')
        && url.pathname.endsWith(piece.legacyPath);
    } catch { return false; }
  });
}

export function repairNativePieces(template: Template): Template {
  let changed = false;
  const layers = template.layers.map(layer => {
    if (layer.type !== 'picture') return layer;
    const piece = findNativePiece(layer);
    if (!piece || (layer.src === piece.src && layer.nativePieceId === piece.id)) return layer;
    changed = true;
    return { ...layer, src: piece.src, nativePieceId: piece.id, fit: 'contain' as const };
  });
  return changed ? {...template, layers} : template;
}
