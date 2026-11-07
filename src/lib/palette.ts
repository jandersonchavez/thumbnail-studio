import { publicAssetUrl } from './publicAssets';

const rgbToHex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map(c => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('');

/** Lightweight color quantization: samples a 56x56 canvas and bins pixels in RGB space. */
export async function extractPalette(src: string): Promise<string[]> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Não foi possível ler a imagem da marca.'));
    img.src = publicAssetUrl(src);
  });
  const canvas = document.createElement('canvas');
  canvas.width = 56; canvas.height = 56;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return ['#ffc727', '#ffffff', '#141414'];
  ctx.drawImage(image, 0, 0, 56, 56);
  const pixels = ctx.getImageData(0, 0, 56, 56).data;
  const bins = new Map<string, { count: number; r: number; g: number; b: number }>();
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 100) continue;
    const r = pixels[i], g = pixels[i+1], b = pixels[i+2];
    const key = `${r >> 5}-${g >> 5}-${b >> 5}`;
    const current = bins.get(key) || {count: 0, r: 0, g: 0, b: 0};
    current.count += 1; current.r += r; current.g += g; current.b += b;
    bins.set(key, current);
  }
  const options = [...bins.values()].sort((a,b)=>b.count-a.count);
  const selected: Array<[number, number, number]> = [];
  for (const b of options) {
    const c: [number,number,number] = [b.r/b.count,b.g/b.count,b.b/b.count];
    if (selected.every(x => Math.hypot(x[0]-c[0],x[1]-c[1],x[2]-c[2]) > 75)) selected.push(c);
    if (selected.length === 5) break;
  }
  return selected.length ? selected.map(c => rgbToHex(...c)) : ['#ffc727', '#ffffff', '#141414'];
}

function linearized(hex: string) {
  const n = hex.replace('#','');
  return [0,2,4].map(p => parseInt(n.substring(p,p+2),16)/255).map(c =>
    c <= 0.04045 ? c/12.92 : ((c+0.055)/1.055)**2.4);
}
export function contrastRatio(foreground: string, background: string) {
  const lum = (h: string) => {
    const [r,g,b] = linearized(h);
    return .2126*r + .7152*g + .0722*b;
  };
  const a = lum(foreground), b = lum(background);
  return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
}
