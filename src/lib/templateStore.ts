import type { Template } from '../types/editor';
import type { Format, TemplateKind } from '../templates/catalog';

/** A custom template is kept entirely in the browser's IndexedDB. */
export type SavedTemplate = {
  id: string;
  name: string;
  kind: TemplateKind;
  format: Format;
  savedAt: number;
  scene: Template;
};

import { databaseRequest } from './projectStore';

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function preserveImage(url: string): Promise<string> {
  if (!url.startsWith('blob:')) return url;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Não foi possível ler uma imagem do projeto para salvar');
  return blobToDataUrl(await response.blob());
}

/** Blob object URLs die on reload: convert only those into persistent data URLs. */
export async function persistentScene(scene: Template): Promise<Template> {
  return {
    ...scene,
    background: { ...scene.background, src: await preserveImage(scene.background.src) },
    layers: await Promise.all(scene.layers.map(async layer => layer.type === 'picture'
      ? { ...layer, src: await preserveImage(layer.src), originalSrc: layer.originalSrc ? await preserveImage(layer.originalSrc):undefined, cutoutSrc: layer.cutoutSrc ? await preserveImage(layer.cutoutSrc):undefined }
      : { ...layer })),
  };
}

export async function storeTemplate(value: SavedTemplate): Promise<void> {
  const data = { ...value, scene: await persistentScene(value.scene) };
  await databaseRequest('templates','readwrite', store => store.put(data));
}

export async function listTemplates(): Promise<SavedTemplate[]> {
  const data = await databaseRequest<SavedTemplate[]>('templates','readonly', store => store.getAll());
  return data.sort((a, b) => b.savedAt - a.savedAt);
}

export async function deleteTemplate(id: string): Promise<void> {
  await databaseRequest('templates','readwrite', store => store.delete(id));
}
