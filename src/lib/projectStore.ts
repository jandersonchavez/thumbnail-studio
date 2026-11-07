import type { Template } from '../types/editor';
import type { Format, TemplateKind } from '../templates/catalog';

/** Every project and version is self-contained; data URLs persist beyond page reloads. */
export type SavedProject = {
  id: string;
  name: string;
  kind: TemplateKind;
  format: Format;
  brandSrc: string;
  scene: Template;
  /** Both canvases are saved independently; older v0.7 projects may omit this. */
  scenes?: Partial<Record<Format,Template>>;
  createdAt: number;
  savedAt: number;
};
export type ProjectSummary = Pick<SavedProject, 'id' | 'name' | 'kind' | 'format' | 'createdAt' | 'savedAt'>;
export type ProjectVersion = {
  id: string;
  projectId: string;
  name: string;
  savedAt: number;
  scene: Template;
  scenes?: Partial<Record<Format,Template>>;
  kind: TemplateKind;
  format: Format;
  brandSrc: string;
};
export type VersionSummary = Pick<ProjectVersion, 'id' | 'projectId' | 'name' | 'savedAt'>;
const DATABASE = 'zero2-studio-local';
const DB_VERSION = 2;
export const LAST_PROJECT_KEY = 'z2-last-project';

export function openStudioDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      // Important: retain the existing templates object store from v0.5.
      if (!db.objectStoreNames.contains('templates')) db.createObjectStore('templates', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('projects')) db.createObjectStore('projects', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('versions')) {
        const versions = db.createObjectStore('versions', { keyPath: 'id' });
        versions.createIndex('projectId', 'projectId', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Não foi possível abrir o banco local'));
    request.onblocked = () => reject(new Error('Banco bloqueado por outra aba do editor. Feche as outras abas e tente novamente.'));
  });
}

export async function databaseRequest<T>(storeName:'templates'|'projects'|'versions', mode:IDBTransactionMode, action:(store:IDBObjectStore)=>IDBRequest<T>): Promise<T> {
  const db = await openStudioDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const request = action(tx.objectStore(storeName));
    let output:T;
    request.onsuccess = () => { output = request.result; };
    tx.oncomplete = () => { db.close(); resolve(output); };
    tx.onerror = () => { db.close(); reject(tx.error ?? new Error('Falha no IndexedDB')); };
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error('Armazenamento cancelado')); };
  });
}

function blobToDataUrl(blob:Blob):Promise<string> {
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(reader.result as string);
    reader.onerror=()=>reject(reader.error??new Error('Imagem ilegível'));
    reader.readAsDataURL(blob);
  });
}
async function persistentUrl(url:string):Promise<string> {
  if(!url.startsWith('blob:'))return url;
  const response=await fetch(url);
  if(!response.ok)throw new Error('Imagem temporária não pôde ser preservada');
  return blobToDataUrl(await response.blob());
}
export async function persistentScene(scene:Template):Promise<Template> {
  return {
    ...scene,
    background:{...scene.background,src:await persistentUrl(scene.background.src)},
    layers:await Promise.all(scene.layers.map(async layer=>layer.type==='picture'?{
      ...layer,src:await persistentUrl(layer.src),
      originalSrc:layer.originalSrc?await persistentUrl(layer.originalSrc):undefined,
      cutoutSrc:layer.cutoutSrc?await persistentUrl(layer.cutoutSrc):undefined,
    }: {...layer})),
  };
}
export async function persistentFormats(scenes?:Partial<Record<Format,Template>>):Promise<Partial<Record<Format,Template>>|undefined>{
  if(!scenes)return undefined;
  const out:Partial<Record<Format,Template>>={};
  for(const ratio of ['16:9','9:16'] as const)if(scenes[ratio])out[ratio]=await persistentScene(scenes[ratio]);
  return out;
}
export async function saveProject(project:SavedProject):Promise<void> {
  const scene=await persistentScene(project.scene);
  const scenes=await persistentFormats(project.scenes);
  await databaseRequest('projects','readwrite',store=>store.put({...project,scene,scenes}));
}
export function getProject(id:string):Promise<SavedProject|undefined> {
  return databaseRequest('projects','readonly',store=>store.get(id));
}
export async function listProjects():Promise<ProjectSummary[]> {
  const rows=await databaseRequest<SavedProject[]>('projects','readonly',store=>store.getAll());
  return rows.map(({id,name,kind,format,createdAt,savedAt})=>({id,name,kind,format,createdAt,savedAt})).sort((a,b)=>b.savedAt-a.savedAt);
}
export async function removeProject(id:string):Promise<void> {
  const versions=await listVersions(id);
  const db=await openStudioDb();
  await new Promise<void>((resolve,reject)=>{
    const tx=db.transaction(['projects','versions'],'readwrite');
    tx.objectStore('projects').delete(id);
    for(const version of versions)tx.objectStore('versions').delete(version.id);
    tx.oncomplete=()=>{db.close();resolve();};
    tx.onerror=()=>{db.close();reject(tx.error??new Error('Falha ao excluir projeto'));};
    tx.onabort=()=>{db.close();reject(tx.error??new Error('Exclusão cancelada'));};
  });
}
export async function saveProjectVersion(version:ProjectVersion):Promise<void> {
  const scene=await persistentScene(version.scene);
  const scenes=await persistentFormats(version.scenes);
  await databaseRequest('versions','readwrite',store=>store.put({...version,scene,scenes}));
}
export function getProjectVersion(id:string):Promise<ProjectVersion|undefined> {
  return databaseRequest('versions','readonly',store=>store.get(id));
}
export async function listVersions(projectId:string):Promise<VersionSummary[]> {
  const versions=await databaseRequest<ProjectVersion[]>('versions','readonly',store=>store.index('projectId').getAll(projectId));
  return versions.map(({id,projectId,name,savedAt})=>({id,projectId,name,savedAt})).sort((a,b)=>b.savedAt-a.savedAt);
}
export function removeProjectVersion(id:string):Promise<void> {
  return databaseRequest('versions','readwrite',store=>store.delete(id));
}
export async function makeBackup(project:SavedProject, versions:ProjectVersion[]=[]):Promise<string> {
  const scene=await persistentScene(project.scene);
  const scenes=await persistentFormats(project.scenes);
  const preservedVersions=await Promise.all(versions.map(async version=>({...version,scene:await persistentScene(version.scene),scenes:await persistentFormats(version.scenes)})));
  const data={format:'zero-a-2-studio-project',version:1,project:{...project,scene,scenes},versions:preservedVersions};
  return JSON.stringify(data);
}
/** Validate format snapshots in imported backups without trusting arbitrary shape. */
function validScenes(value:unknown):Partial<Record<Format,Template>>|undefined{
  if(value===undefined)return undefined;
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Formatos do backup inválidos');
  const obj=value as Record<string,unknown>;
  const out:Partial<Record<Format,Template>>={};
  for(const format of ['16:9','9:16'] as const){
    const v=obj[format];if(v===undefined)continue;
    if(!v||typeof v!=='object')throw new Error('Composição de formato inválida');
    const scene=v as Partial<Template>;
    if(!Array.isArray(scene.layers)||scene.layers.length>300||!scene.background||typeof scene.background.src!=='string'||
       scene.width!==(format==='16:9'?1280:720)||scene.height!==(format==='16:9'?720:1280))throw new Error('Composição de formato incorreta');
    out[format]=scene as Template;
  }
  return out;
}

export function parseBackup(source:string):SavedProject {
  const obj:unknown=JSON.parse(source);
  if(!obj||typeof obj!=='object')throw new Error('JSON inválido');
  const envelope=obj as {format?:unknown;version?:unknown;project?:unknown};
  if(envelope.format!=='zero-a-2-studio-project'||envelope.version!==1||!envelope.project||typeof envelope.project!=='object')throw new Error('Arquivo não é um backup do ZERO A 2 STUDIO');
  const project=envelope.project as Partial<SavedProject>;
  const scene=project.scene;
  if(!scene||typeof scene!=='object'||!Array.isArray(scene.layers)||scene.layers.length>300||!scene.background||
    typeof scene.width!=='number'||typeof scene.height!=='number'||scene.width<100||scene.width>4096||scene.height<100||scene.height>4096||
    typeof scene.background.src!=='string'|| !scene.layers.every(l=>typeof l.id==='string'&&typeof l.type==='string') ||
    !['oficial','coop','react'].includes(project.kind??'')||!['16:9','9:16'].includes(project.format??''))throw new Error('Estrutura do projeto inválida');
  return {id:crypto.randomUUID(),name:String(project.name??'Projeto importado').slice(0,80),kind:project.kind as TemplateKind,
    format:project.format as Format,brandSrc:typeof project.brandSrc==='string'?project.brandSrc:'/zero2players-logo.png',
    scene:scene as Template,scenes:validScenes(project.scenes),createdAt:Date.now(),savedAt:Date.now()};
}

/** Import an archive as an entirely new local project; do not overwrite an existing project. */
export function parseArchive(source:string):{project:SavedProject;versions:ProjectVersion[]}{
  const project=parseBackup(source);
  const envelope=JSON.parse(source) as {versions?:unknown};
  if(envelope.versions!==undefined&&!Array.isArray(envelope.versions))throw new Error('Histórico de versões inválido');
  const rows=(envelope.versions??[]) as unknown[];
  if(rows.length>150)throw new Error('Histórico grande demais');
  const versions:ProjectVersion[]=rows.map((raw):ProjectVersion=>{
    if(!raw||typeof raw!=='object')throw new Error('Versão de projeto inválida');
    const v=raw as Partial<ProjectVersion>;
    if(!v.scene||!Array.isArray(v.scene.layers)||v.scene.layers.length>300||
       !v.scene.background||typeof v.scene.background.src!=='string'||
       !['oficial','coop','react'].includes(v.kind??'')||!['16:9','9:16'].includes(v.format??''))throw new Error('Versão incompatível');
    return {id:crypto.randomUUID(),projectId:project.id,name:String(v.name??'Versão importada').slice(0,80),
      savedAt:Number.isFinite(v.savedAt)?v.savedAt!:Date.now(),
      scene:v.scene,scenes:validScenes(v.scenes),kind:v.kind!,format:v.format!,brandSrc:typeof v.brandSrc==='string'?v.brandSrc:project.brandSrc};
  });
  return {project,versions};
}
