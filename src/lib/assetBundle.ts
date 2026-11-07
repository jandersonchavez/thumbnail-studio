import type { Template } from '../types/editor';
import type { SavedProject, ProjectVersion } from './projectStore';
import { parseArchive } from './projectStore';
import { publicAssetUrl } from './publicAssets';

// Self-contained, uncompressed ZIP package (standard ZIP store method). No new npm deps.
const enc=new TextEncoder(),dec=new TextDecoder();
const crcTable=Array.from({length:256},(_,i)=>{let n=i;for(let j=0;j<8;j++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc32(bytes:Uint8Array){let n=0xffffffff;for(let i=0;i<bytes.length;i++)n=crcTable[(n^bytes[i])&255]^(n>>>8);return(n^0xffffffff)>>>0;}
function zipStore(files:{name:string;data:Uint8Array}[]):Blob{
  const locals:Uint8Array[]=[],central:Uint8Array[]=[];let offset=0;
  for(const file of files){
    const name=enc.encode(file.name),crc=crc32(file.data),count=file.data.length;
    if(name.length>65535)throw new Error('Nome de asset extenso demais');
    const head=new Uint8Array(30+name.length),h=new DataView(head.buffer);
    h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0,true);h.setUint16(8,0,true);
    h.setUint32(14,crc,true);h.setUint32(18,count,true);h.setUint32(22,count,true);h.setUint16(26,name.length,true);
    head.set(name,30);locals.push(head,file.data);
    const dir=new Uint8Array(46+name.length),d=new DataView(dir.buffer);
    d.setUint32(0,0x02014b50,true);d.setUint16(4,20,true);d.setUint16(6,20,true);d.setUint32(16,crc,true);
    d.setUint32(20,count,true);d.setUint32(24,count,true);d.setUint16(28,name.length,true);d.setUint32(42,offset,true);
    dir.set(name,46);central.push(dir);offset+=head.length+count;
  }
  const centerLength=central.reduce((a,x)=>a+x.length,0),end=new Uint8Array(22),e=new DataView(end.buffer);
  e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);
  e.setUint32(12,centerLength,true);e.setUint32(16,offset,true);
  return new Blob([...locals,...central,end] as BlobPart[],{type:'application/zip'});
}
function unzipStore(buffer:ArrayBuffer):Map<string,Uint8Array>{
  const data=new Uint8Array(buffer),view=new DataView(buffer),files=new Map<string,Uint8Array>();let pos=0;
  if(data.length>130*1024*1024)throw new Error('Pacote acima do limite de 130 MB');
  while(pos+30<=data.length&&view.getUint32(pos,true)===0x04034b50){
    const flags=view.getUint16(pos+6,true),method=view.getUint16(pos+8,true);
    if(flags!==0||method!==0)throw new Error('Pacote ZIP incompatível: use a exportação do ZERO A 2 STUDIO');
    const count=view.getUint32(pos+18,true),nameLen=view.getUint16(pos+26,true),extra=view.getUint16(pos+28,true);
    const start=pos+30+nameLen+extra,end=start+count;
    if(end>data.length||files.size>2000)throw new Error('Pacote incompleto ou inválido');
    const name=dec.decode(data.slice(pos+30,pos+30+nameLen));
    if(name.includes('..')||name.startsWith('/')||files.has(name))throw new Error('Nome de asset inválido');
    const bytes=data.slice(start,end);
    if(crc32(bytes)!==view.getUint32(pos+14,true))throw new Error(`Asset corrompido: ${name}`);
    files.set(name,bytes);pos=end;
  }
  if(!files.has('projeto.json'))throw new Error('Arquivo projeto.json não encontrado no pacote');
  return files;
}
function blobDataUrl(blob:Blob):Promise<string>{return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(reader.error??new Error('Não foi possível converter asset'));reader.readAsDataURL(blob);});}
function mimeExt(mime:string){if(mime.includes('svg'))return 'svg';if(mime.includes('png'))return 'png';if(mime.includes('jpeg'))return 'jpg';if(mime.includes('webp'))return 'webp';if(mime.includes('gif'))return 'gif';return 'bin';}
async function encodeScenes(project:SavedProject,versions:ProjectVersion[]){
  const base=structuredClone({project,versions});
  const bySource=new Map<string,string>(),assets:{name:string;data:Uint8Array}[]=[];
  async function toAsset(src:string|undefined):Promise<string|undefined>{
    if(!src)return src;
    if(bySource.has(src))return bySource.get(src);
    const response=await fetch(publicAssetUrl(src));
    if(!response.ok)throw new Error(`Falha ao incluir imagem no backup: ${src.slice(0,80)}`);
    const blob=await response.blob();
    if(blob.size>40*1024*1024)throw new Error('Uma imagem excede 40 MB; reduza seu tamanho antes de exportar.');
    const type=blob.type||'application/octet-stream';
    if(!type.startsWith('image/'))throw new Error('Asset não é uma imagem válida');
    const name=`assets/imagem-${String(assets.length+1).padStart(4,'0')}.${mimeExt(type)}`;
    const data=new Uint8Array(await blob.arrayBuffer());
    assets.push({name,data});bySource.set(src,name);
    return name;
  }
  async function sceneAssets(scene:Template){
    scene.background.src=(await toAsset(scene.background.src))??scene.background.src;
    for(const layer of scene.layers)if(layer.type==='picture'){
      layer.src=(await toAsset(layer.src))??layer.src;
      layer.originalSrc=await toAsset(layer.originalSrc);
      layer.cutoutSrc=await toAsset(layer.cutoutSrc);
    }
  }
  async function recordAssets(record:SavedProject|ProjectVersion){
    record.brandSrc=(await toAsset(record.brandSrc))??record.brandSrc;
    await sceneAssets(record.scene);
    if(record.scenes)for(const format of ['16:9','9:16'] as const)if(record.scenes[format])await sceneAssets(record.scenes[format]);
  }
  await recordAssets(base.project);
  for(const version of base.versions)await recordAssets(version);
  return {base,assets};
}
/** All images, alternate formats, per-layer crop and history are embedded as real files in a ZIP. */
export async function makeAssetBundle(project:SavedProject,versions:ProjectVersion[]):Promise<Blob>{
  const {base,assets}=await encodeScenes(project,versions);
  const manifest={format:'zero-a-2-studio-assets',version:1,...base};
  const index={name:'projeto.json',data:enc.encode(JSON.stringify(manifest,null,2))};
  return zipStore([index,...assets]);
}
export async function parseAssetBundle(file:File):Promise<{project:SavedProject;versions:ProjectVersion[]}>{
  const files=unzipStore(await file.arrayBuffer());
  const manifest=JSON.parse(dec.decode(files.get('projeto.json')!)) as {format?:string;version?:number;project?:SavedProject;versions?:ProjectVersion[]};
  if(manifest.format!=='zero-a-2-studio-assets'||manifest.version!==1||!manifest.project||!Array.isArray(manifest.versions))throw new Error('Formato do pacote não reconhecido');
  const copied=structuredClone(manifest);
  const cache=new Map<string,string>();
  async function restore(src:string|undefined):Promise<string|undefined>{
    if(!src||!src.startsWith('assets/'))return src;
    if(cache.has(src))return cache.get(src);
    const bytes=files.get(src);if(!bytes)throw new Error(`Imagem ausente: ${src}`);
    const ext=src.split('.').at(-1)?.toLowerCase()??'png';
    const mime=ext==='jpg'?'image/jpeg':ext==='svg'?'image/svg+xml':`image/${ext}`;
    const dataUrl=await blobDataUrl(new Blob([bytes as BlobPart],{type:mime}));cache.set(src,dataUrl);return dataUrl;
  }
  async function sceneRestore(scene:Template){
    scene.background.src=(await restore(scene.background.src))??scene.background.src;
    for(const layer of scene.layers)if(layer.type==='picture'){
      layer.src=(await restore(layer.src))??layer.src;layer.originalSrc=await restore(layer.originalSrc);layer.cutoutSrc=await restore(layer.cutoutSrc);
    }
  }
  async function recordRestore(record:SavedProject|ProjectVersion){
    record.brandSrc=(await restore(record.brandSrc))??record.brandSrc;
    await sceneRestore(record.scene);
    if(record.scenes)for(const format of ['16:9','9:16'] as const)if(record.scenes[format])await sceneRestore(record.scenes[format]);
  }
  await recordRestore(copied.project!);
  for(const version of copied.versions??[])await recordRestore(version);
  // Reuse the same validation and fresh ID allocation as the old JSON importer.
  return parseArchive(JSON.stringify({format:'zero-a-2-studio-project',version:1,project:copied.project,versions:copied.versions}));
}
