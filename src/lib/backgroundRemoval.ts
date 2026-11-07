export type RemoveResult = { transparent: Blob };
export type CutoutQuality = 'isnet_quint8' | 'isnet_fp16';

/** The photo is passed as an in-memory Blob. There is no upload or fetch of user data. */
export async function removeBackgroundLocally(
  input: Blob,
  progress: (percent: number) => void,
  model: CutoutQuality = 'isnet_quint8',
): Promise<RemoveResult> {
  // Lazy-load ~large runtime only when the user explicitly clicks "Recortar".
  const { removeBackground } = await import('@imgly/background-removal');
  const assetsUrl = new URL(`${import.meta.env.BASE_URL}models/`, window.location.href).href;

  const transparent = await removeBackground(input, {
    publicPath: assetsUrl,
    device: 'cpu',
    model,
    output: { format: 'image/png' },
    progress: (_key: string, current: number, total: number) => {
      if (total > 0) progress(Math.min(100, Math.round(current * 100 / total)));
    },
  });

  return { transparent };
}
