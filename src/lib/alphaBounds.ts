import type { NormalizedCrop } from '../types/editor';

export type AlphaBounds = {
  crop: NormalizedCrop;
  width: number;
  height: number;
  visibleFraction: number;
};

/**
 * Locate the visible foreground in a transparent PNG/WebP (not merely its
 * nominal bitmap rectangle). Sampling stays under 1.5 MP; no AI or network
 * inference is involved. The caller retains the unmodified source asset.
 */
export async function findAlphaBounds(source: Blob, threshold = 18): Promise<AlphaBounds | null> {
  const bitmap = await createImageBitmap(source);
  try {
    const width = bitmap.width;
    const height = bitmap.height;
    if (!width || !height) return null;
    const ratio = Math.min(1, 1200 / Math.max(width, height));
    const w = Math.max(1, Math.round(width * ratio));
    const h = Math.max(1, Math.round(height * ratio));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Canvas 2D indisponível para analisar transparência.');
    context.clearRect(0, 0, w, h);
    context.drawImage(bitmap, 0, 0, w, h);
    const pixels = context.getImageData(0, 0, w, h).data;
    let minX = w, minY = h, maxX = -1, maxY = -1;
    const alphaLimit = Math.min(255, Math.max(0, threshold));
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (pixels[(y * w + x) * 4 + 3] <= alphaLimit) continue;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
    if (maxX < minX || maxY < minY) return null;
    // Add a little breathing room, so neither the hair nor the white outline is clipped.
    const pad = Math.max(2, Math.round(4 * ratio));
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(w - 1, maxX + pad);
    maxY = Math.min(h - 1, maxY + pad);
    const spanX = maxX - minX + 1;
    const spanY = maxY - minY + 1;
    // No significant transparent margin? Keep the original rectangle unchanged.
    if (spanX >= w * 0.98 && spanY >= h * 0.98) return null;
    return {
      crop: { x: minX / w, y: minY / h, width: spanX / w, height: spanY / h },
      width, height,
      visibleFraction: (spanX * spanY) / (w * h),
    };
  } finally {
    bitmap.close();
  }
}
