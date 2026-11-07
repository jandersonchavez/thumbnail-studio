/**
 * Draw an alpha-based contour, not a rectangular Konva.Image stroke.
 * We build a white silhouette and stamp it around the foreground in an
 * offscreen Canvas, then composite the untouched RGBA foreground on top.
 * No model/API is involved here, only the browser's 2D Canvas API.
 */
export async function addWhiteOutline(cutout: Blob, width = 590, height = 640, thickness = 12, color = '#ffffff'): Promise<Blob> {
  const bitmap = await createImageBitmap(cutout);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) { bitmap.close(); throw new Error('Canvas 2D indisponível.'); }

  const padding = thickness + 3;
  const contentWidth = width - padding * 2;
  const contentHeight = height - padding * 2;
  const ratio = Math.min(contentWidth / bitmap.width, contentHeight / bitmap.height);
  const dw = bitmap.width * ratio;
  const dh = bitmap.height * ratio;
  const dx = (width - dw) / 2;
  const dy = (height - dh) / 2;

  const silhouette = document.createElement('canvas');
  silhouette.width = width;
  silhouette.height = height;
  const sctx = silhouette.getContext('2d');
  if (!sctx) { bitmap.close(); throw new Error('Canvas 2D indisponível.'); }
  sctx.drawImage(bitmap, dx, dy, dw, dh);
  sctx.globalCompositeOperation = 'source-in';
  sctx.fillStyle = color;
  sctx.fillRect(0, 0, width, height);
  sctx.globalCompositeOperation = 'source-over';

  // 32 samples around the silhouette produce a smooth, round white contour.
  for (let i = 0; i < 32; i++) {
    const theta = i * 2 * Math.PI / 32;
    ctx.drawImage(silhouette, Math.cos(theta) * thickness, Math.sin(theta) * thickness);
  }
  ctx.drawImage(bitmap, dx, dy, dw, dh);
  bitmap.close();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Erro ao criar PNG do contorno.')), 'image/png');
  });
}
