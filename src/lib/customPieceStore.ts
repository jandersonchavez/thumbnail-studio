/** Biblioteca privada de peças adicionadas pelo usuário, mantida em IndexedDB.
 * Cada cena salva uma cópia incorporada do desenho (data URL); portanto excluir
 * uma peça da biblioteca não apaga objetos já inseridos em projetos ou backups.
 */
export type CustomPiece = {
  id: string;
  name: string;
  fileName: string;
  src: string;
  width: number;
  height: number;
  createdAt: number;
};

const DB_NAME = 'zero2-studio-custom-pieces';
const STORE = 'pieces';
const MAX_FILE_BYTES = 12 * 1024 * 1024;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Erro ao abrir IndexedDB'));
  });
}

async function inTransaction<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const request = operation(transaction.objectStore(STORE));
    let result: T;
    request.onsuccess = () => { result = request.result; };
    transaction.oncomplete = () => { db.close(); resolve(result); };
    transaction.onerror = () => { db.close(); reject(transaction.error ?? request.error ?? new Error('Falha ao salvar peça')); };
    transaction.onabort = () => { db.close(); reject(transaction.error ?? new Error('Operação cancelada')); };
  });
}

export async function listCustomPieces(): Promise<CustomPiece[]> {
  const pieces = await inTransaction<CustomPiece[]>('readonly', store => store.getAll());
  return pieces.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteCustomPiece(id: string): Promise<void> {
  await inTransaction('readwrite', store => store.delete(id));
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Não foi possível ler imagem'));
    reader.readAsDataURL(file);
  });
}

function decodeImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Imagem inválida ou formato não suportado'));
    img.src = src;
  });
}

/** Remove scripts, objetos embutidos, links externos e atributos de execução.
 * SVG é sempre renderizado como imagem, nunca inserido no DOM como HTML.
 */
function sanitizeSvg(source: string): string {
  const documentSvg = new DOMParser().parseFromString(source, 'image/svg+xml');
  const root = documentSvg.documentElement;
  if (root.localName !== 'svg' || documentSvg.querySelector('parsererror')) {
    throw new Error('Arquivo SVG inválido');
  }
  const bannedTags = new Set(['script','foreignobject','iframe','object','embed','video','audio','animate','animatemotion','animatetransform','set']);
  for (const element of [...documentSvg.getElementsByTagName('*')]) {
    const tag = element.localName.toLowerCase();
    if (bannedTags.has(tag)) { element.remove(); continue; }
    if (tag === 'style' && /(?:@import|javascript:|expression\s*\(|url\s*\(\s*['"]?(?:https?:|\/\/|data:))/i.test(element.textContent ?? '')) {
      element.remove(); continue;
    }
    let invalidReference = false;
    for (const attribute of [...element.attributes]) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim();
      if (name === 'href' || name === 'xlink:href') {
        const safeInternal = value.startsWith('#');
        const safeEmbeddedImage = tag === 'image' && /^data:image\/(?:png|jpeg|webp);base64,/i.test(value);
        if (!safeInternal && !safeEmbeddedImage) { invalidReference=true; element.removeAttribute(attribute.name); }
        continue;
      }
      const urls = [...value.matchAll(/url\(\s*['"]?([^)'"]+)['"]?\s*\)/gi)];
      if (name.startsWith('on') || name === 'src' || name === 'xml:base' ||
          /(?:javascript:|vbscript:|@import|expression\s*\()/i.test(value) ||
          urls.some(match => !match[1].trim().startsWith('#'))) {
        element.removeAttribute(attribute.name);
      }
    }
    if (invalidReference && (tag === 'use' || tag === 'image')) element.remove();
  }
  root.setAttribute('xmlns','http://www.w3.org/2000/svg');
  return new XMLSerializer().serializeToString(root);
}

function dimensions(width: number, height: number): {width: number;height: number} {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('A imagem não contém dimensões válidas');
  }
  const scale = Math.min(320 / width, 230 / height);
  return { width: Math.max(8, Math.round(width * scale)), height: Math.max(8, Math.round(height * scale)) };
}

export async function importCustomPiece(file: File): Promise<CustomPiece> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const isSvg = file.type === 'image/svg+xml' || ext === 'svg';
  const isRaster = ['image/png','image/jpeg','image/webp'].includes(file.type) || ['png','jpg','jpeg','webp'].includes(ext);
  if (!isSvg && !isRaster) throw new Error('Use SVG, PNG, JPG ou WebP');
  if (file.size === 0 || file.size > MAX_FILE_BYTES) throw new Error('A imagem deve ter até 12 MB');

  let src: string;
  if (isSvg) {
    const safeSvg = sanitizeSvg(await file.text());
    src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(safeSvg)}`;
  } else {
    src = await readFile(file);
  }
  const image = await decodeImage(src);
  const w = image.naturalWidth, h = image.naturalHeight;
  if (!w || !h || w*h > 60000000) throw new Error('Imagem grande demais ou sem dimensões');

  // Somente imagens raster muito grandes são reduzidas (até 3072 px), sem esticar.
  if (!isSvg && (Math.max(w,h)>3072 || file.size>5*1024*1024)) {
    const scale=Math.min(1,3072/Math.max(w,h));
    const canvas=document.createElement('canvas');
    canvas.width=Math.round(w*scale); canvas.height=Math.round(h*scale);
    const ctx=canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D indisponível');
    ctx.drawImage(image,0,0,canvas.width,canvas.height);
    src=canvas.toDataURL('image/webp',0.94);
  }

  const size=dimensions(w,h);
  const result: CustomPiece = {
    id:`custom-${crypto.randomUUID()}`,
    name:file.name.replace(/\.[^.]+$/, '').slice(0,80) || 'Minha peça',
    fileName:file.name,
    src, ...size,
    createdAt:Date.now()
  };
  await inTransaction('readwrite',store=>store.put(result));
  return result;
}
