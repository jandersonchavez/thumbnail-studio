import { publicAssetUrl } from './lib/publicAssets';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type Konva from 'konva';
import {
  ArrowDownToLine, ArrowUp, ArrowDown, ArrowUpRight, Check, Circle, Eye,
  ImagePlus, LayoutTemplate, LockKeyhole,
  Palette, ShieldCheck, Sparkles, Type, Upload, WandSparkles,
  Trash2, RotateCcw, Smartphone, Monitor, ZoomIn, ZoomOut, Maximize2, Plus, Minus, Link2, Unlink2, Save, AlertTriangle, FolderOpen,
  FolderPlus, History, FileDown, FileUp, FlipHorizontal2, FlipVertical2, ChevronsUp, ChevronsDown, Copy, Crop, MousePointer2, ListChecks, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Expand, Shrink
} from 'lucide-react';
import ThumbnailCanvas from './components/ThumbnailCanvas';
import { catalog, createTemplate } from './templates/catalog';
import type { Format, TemplateKind } from './templates/catalog';
import { extractPalette } from './lib/palette';
import { evaluateComposition } from './lib/composition';
import { removeBackgroundLocally } from './lib/backgroundRemoval';
import type { CutoutQuality } from './lib/backgroundRemoval';
import { addWhiteOutline } from './lib/outline';
import { listTemplates, storeTemplate, deleteTemplate } from './lib/templateStore';
import { applyFrame, frameCatalog } from './templates/frames';
import type { FrameId } from './templates/frames';
import CutoutEditor from './components/CutoutEditor';
import CropEditor from './components/CropEditor';
import type { SavedTemplate } from './lib/templateStore';
import type { SceneLayer, Template, TextLayer, PictureLayer, TemplateSlot, NormalizedCrop } from './types/editor';
import { LAST_PROJECT_KEY, getProject, listProjects, saveProject, removeProject, saveProjectVersion,
  listVersions, getProjectVersion, removeProjectVersion, makeBackup, parseArchive } from './lib/projectStore';
import type { SavedProject, ProjectSummary, VersionSummary } from './lib/projectStore';
import { adaptSceneFormat } from './lib/formatScenes';
import { makeAssetBundle, parseAssetBundle } from './lib/assetBundle';
import { nativePieces, findNativePiece, repairNativePieces } from './assets/pieces/catalog';
import { listCustomPieces, importCustomPiece, deleteCustomPiece } from './lib/customPieceStore';
import type { CustomPiece } from './lib/customPieceStore';
import { PASTEBOARD, boundedImageSize, calculateCropPatch, findFreePosition } from './lib/workspaceLayout';
import { findAlphaBounds } from './lib/alphaBounds';

type Tab='templates'|'frames'|'elements'|'brand'|'director'|'projects';
const DEFAULT_LOGO='/zero2players-logo.png';
const txt=(l?:SceneLayer):l is TextLayer=>l?.type==='text';
const pic=(l?:SceneLayer):l is PictureLayer=>l?.type==='picture';
function savedBrand(){try{return localStorage.getItem('z2-logo')||DEFAULT_LOGO;}catch{return DEFAULT_LOGO;}}
function SizeNumber({label,value,onCommit}:{label:string;value:number;onCommit:(value:number)=>void}){
  const [draft,setDraft]=useState(String(Math.round(value)));
  useEffect(()=>setDraft(String(Math.round(value))),[value]);
  const commit=()=>{const parsed=Number(draft);if(Number.isFinite(parsed)&&parsed>0)onCommit(parsed);else setDraft(String(Math.round(value)));};
  return <label>{label}<input type="number" min="24" max="3200" value={draft} onChange={e=>setDraft(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}}/></label>;
}

export default function App(){
  const [brandSrc,setBrandSrc]=useState(savedBrand);
  const [kind,setKind]=useState<TemplateKind>('oficial');
  const [format,setFormat]=useState<Format>('16:9');
  const [project,setProject]=useState<Template>(()=>createTemplate('oficial','16:9',savedBrand()));
  const [formatScenes,setFormatScenes]=useState<Partial<Record<Format,Template>>>({});
  // Migrate old public/pieces references on project load and after restoring backups.
  // Preserves placement, rotation, resize and all other user adjustments.
  useEffect(() => {
    const repaired = repairNativePieces(project);
    if (repaired !== project) setProject(repaired);
  }, [project]);
  const [tab,setTab]=useState<Tab>('projects');
  const [selectedIds,setSelectedIds]=useState<string[]>(['logo']);
  const selected=selectedIds[selectedIds.length-1]??null;
  // Keeping single-select calls compatible with the earlier editor while enabling additive selections.
  function setSelected(id:string|null){setSelectedIds(id?[id]:[]);}
  function selectLayer(id:string|null,additive=false){
    if(!id){setSelectedIds([]);return;}
    if(!additive){setSelectedIds([id]);return;}
    setSelectedIds(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);
  }
  const [croppingId,setCroppingId]=useState<string|null>(null);
  const [faceFile,setFaceFile]=useState<{id:string;file:File}|null>(null);
  const [busy,setBusy]=useState(false);
  const [progress,setProgress]=useState(0);
  const [cutoutQuality,setCutoutQuality]=useState<CutoutQuality>('isnet_quint8');
  const [notice,setNotice]=useState('Clique em uma peça ou use Shift+clique para selecionar várias. Ctrl+D duplica.');
  const [palette,setPalette]=useState<string[]>(['#ffcc00','#f59e0b','#ffffff','#09090b']);
  const [guides,setGuides]=useState(false);
  // Layout-only preferences: never stored in project data or included in exported PNGs.
  const [leftPanelOpen,setLeftPanelOpen]=useState(true);
  const [rightPanelOpen,setRightPanelOpen]=useState(true);
  const [focusMode,setFocusMode]=useState(false);
  const leftVisible=!focusMode&&leftPanelOpen;
  const rightVisible=!focusMode&&rightPanelOpen;
  function toggleSidePanel(side:'left'|'right'){
    // Opening one panel from focus mode keeps the other panel collapsed.
    if(focusMode){
      setFocusMode(false);
      if(side==='left'){setLeftPanelOpen(true);setRightPanelOpen(false);}
      else{setRightPanelOpen(true);setLeftPanelOpen(false);}
    }else if(side==='left')setLeftPanelOpen(v=>!v);
    else setRightPanelOpen(v=>!v);
    // Refit artboard into the available workspace; do not change export resolution.
    setManualZoom(null);
  }
  function toggleFocusMode(){setFocusMode(v=>!v);setManualZoom(null);}

  const [showSlots,setShowSlots]=useState(true);
  const [maskSession,setMaskSession]=useState<{id:string;original:Blob|null;cutout:Blob}|null>(null);
  const [containerSize,setContainerSize]=useState({w:950,h:650});
  const [filename,setFilename]=useState('Thumbnail Zero a 2');
  // Projects are different from reusable templates: drafts auto-save and snapshots are manual.
  const [projectId,setProjectId]=useState<string>(()=>crypto.randomUUID());
  const [projectName,setProjectName]=useState('Thumbnail Zero a 2');
  const [projectCreatedAt,setProjectCreatedAt]=useState(()=>Date.now());
  const [storageReady,setStorageReady]=useState(false);
  const [saveStatus,setSaveStatus]=useState<'loading'|'unsaved'|'saving'|'saved'|'error'>('loading');
  const [savedProjects,setSavedProjects]=useState<ProjectSummary[]>([]);
  const [versionHistory,setVersionHistory]=useState<VersionSummary[]>([]);
  const [versionName,setVersionName]=useState('');
  const [projectActionBusy,setProjectActionBusy]=useState(false);
  const importInputRef=useRef<HTMLInputElement>(null);
  const saveQueue=useRef<Promise<void>>(Promise.resolve());
  const latest=useRef<SavedProject | null>(null);

  const [manualZoom,setManualZoom]=useState<number|null>(null);
  const canvasResizeRef=useRef<{x:number;y:number;scale:number;proposed:number}|null>(null);
  const zoomPreviewRef=useRef<HTMLDivElement>(null);
  const outlineRequestRef=useRef(0);
  const outlineDraftRef=useRef(12);
  const [outlineDraft,setOutlineDraft]=useState(12);
  const [templateName,setTemplateName]=useState('Meu template Zero a 2');
  const [myTemplates,setMyTemplates]=useState<SavedTemplate[]>([]);
  const [activeCustomId,setActiveCustomId]=useState<string|null>(null);
  const [saving,setSaving]=useState(false);
  const [draggingFile,setDraggingFile]=useState(false);
  const [customPieces,setCustomPieces]=useState<CustomPiece[]>([]);
  const [customPiecesLoading,setCustomPiecesLoading]=useState(true);
  const [customPiecesBusy,setCustomPiecesBusy]=useState(false);
  const [customPiecesError,setCustomPiecesError]=useState('');
  const customPieceInputRef=useRef<HTMLInputElement>(null);
  const [imageSize,setImageSize]=useState({src:'',width:0,height:0});
  const [backgroundSize,setBackgroundSize]=useState({src:'',width:0,height:0});
  const layoutRef=useRef<HTMLDivElement>(null);
  const faceInputRef=useRef<HTMLInputElement>(null);
  const logoInputRef=useRef<HTMLInputElement>(null);
  const backdropInputRef=useRef<HTMLInputElement>(null);
  const photoTargetRef=useRef<string|null>(null);
  const photosRef=useRef<Map<string,File>>(new Map());
  const dropOverRef=useRef(0);
  const stageRef=useRef<Konva.Stage>(null);
  const objectUrls=useRef<string[]>([]);
  const cutouts=useRef<Map<string,Blob>>(new Map());
  const makeUrl=(blob:Blob)=>{const url=URL.createObjectURL(blob);objectUrls.current.push(url);return url;};

  // Biblioteca de assets independente: continua disponível ao abrir outro projeto.
  useEffect(()=>{
    let active=true;
    listCustomPieces().then(items=>{if(active)setCustomPieces(items);})
      .catch(error=>{if(active)setCustomPiecesError(`Não foi possível carregar suas peças: ${String(error)}`);})
      .finally(()=>{if(active)setCustomPiecesLoading(false);});
    return()=>{active=false;};
  },[]);
  async function addCustomPieces(files:FileList|null){
    if(!files?.length||customPiecesBusy)return;
    setCustomPiecesBusy(true);setCustomPiecesError('');
    let imported=0;const errors:string[]=[];
    const chosen=Array.from(files).slice(0,12);
    for(const file of chosen){
      try{await importCustomPiece(file);imported++;}
      catch(error){errors.push(`${file.name}: ${error instanceof Error?error.message:String(error)}`);}
    }
    try{setCustomPieces(await listCustomPieces());}
    catch(error){errors.push(`Erro ao ler biblioteca: ${String(error)}`);}
    if(files.length>12)errors.push('Importe até 12 peças por vez.');
    setCustomPiecesError(errors.join(' | '));
    setCustomPiecesBusy(false);
    setNotice(`${imported} peça(s) adicionada(s) à biblioteca local.${errors.length?' Algumas falharam; confira o painel.':''}`);
  }
  async function removeCustomPieceFromLibrary(piece:CustomPiece){
    if(!window.confirm(`Remover “${piece.name}” da biblioteca? As peças já inseridas nos projetos serão mantidas.`))return;
    try{await deleteCustomPiece(piece.id);setCustomPieces(await listCustomPieces());setNotice('Peça removida da biblioteca. Os projetos existentes não foram alterados.');}
    catch(error){setCustomPiecesError(`Não foi possível excluir: ${String(error)}`);}
  }

  latest.current={id:projectId,name:projectName.trim()||'Sem título',kind,format,brandSrc,
    scene:project,scenes:{...formatScenes,[format]:project},createdAt:projectCreatedAt,savedAt:Date.now()};
  // All writes go through a queue; switching between projects cannot overtake a pending save.
  function queueSave(data:SavedProject,showStatus=true):Promise<void>{
    if(showStatus)setSaveStatus('saving');
    const task=saveQueue.current.catch(()=>undefined).then(()=>saveProject(data));
    saveQueue.current=task.catch(()=>undefined);
    return task.then(async()=>{
      try{window.localStorage.setItem(LAST_PROJECT_KEY,latest.current?.id??data.id);}catch{}
      if(latest.current?.id===data.id && latest.current.scene===data.scene){
        setSaveStatus('saved');
        setSavedProjects(await listProjects());
      }
    }).catch(e=>{
      if(showStatus){setSaveStatus('error');setNotice(`Erro ao salvar projeto: ${e instanceof Error?e.message:String(e)}. Exporte uma cópia JSON.`);}
      throw e;
    });
  }
  async function flushCurrent():Promise<void>{if(storageReady&&latest.current)await queueSave({...latest.current});}
  function activateProject(data:SavedProject){
    setProjectId(data.id);setProjectName(data.name);setProjectCreatedAt(data.createdAt);
    setProject(structuredClone(data.scene));setFormatScenes(data.scenes?structuredClone(data.scenes):{[data.format]:structuredClone(data.scene)});setKind(data.kind);setFormat(data.format);setBrandSrc(data.brandSrc);
    setFilename(data.name);setSelected(null);setManualZoom(null);setActiveCustomId(null);
    setFaceFile(null);cutouts.current.clear();photosRef.current.clear();
    try{localStorage.setItem(LAST_PROJECT_KEY,data.id);}catch{}
    void listVersions(data.id).then(setVersionHistory).catch(()=>setVersionHistory([]));
  }
  useEffect(()=>{
    let active=true;
    (async()=>{
      try{
        const summaries=await listProjects();
        if(!active)return;
        setSavedProjects(summaries);
        let id:string|null=null;
        try{id=localStorage.getItem(LAST_PROJECT_KEY);}catch{}
        let saved=id?await getProject(id):undefined;
        if(!saved&&summaries.length)saved=await getProject(summaries[0].id);
        if(!active)return;
        if(saved){activateProject(saved);setNotice(`Projeto “${saved.name}” recuperado automaticamente.`);setSaveStatus('saved');}
        else setSaveStatus('unsaved');
      }catch(e){if(active){setSaveStatus('error');setNotice(`Armazenamento local indisponível: ${e instanceof Error?e.message:String(e)}. Use Exportar backup JSON.`);}}
      finally{if(active)setStorageReady(true);}
    })();
    return()=>{active=false;};
    // Initialize once; auto-save starts only after the current session is restored.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);
  useEffect(()=>{
    if(!storageReady)return;
    setSaveStatus('unsaved');
    const timer=window.setTimeout(()=>{if(latest.current)void queueSave({...latest.current}).catch(()=>{});},850);
    return()=>window.clearTimeout(timer);
    // Re-save after every scene/name/brand/layout change, but not after UI selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[storageReady,project,formatScenes,kind,format,brandSrc,projectName,projectId]);
  useEffect(()=>{
    const onShortcuts=(e:KeyboardEvent)=>{
      const node=e.target as HTMLElement|null;
      if(node?.closest('input, textarea, select, [contenteditable="true"]'))return;
      if(croppingId||maskSession)return;
      const cmd=e.ctrlKey||e.metaKey;
      if(cmd&&e.key.toLowerCase()==='a'){
        e.preventDefault();setSelectedIds(project.layers.filter(l=>!l.locked).map(l=>l.id));
      }else if(cmd&&e.key.toLowerCase()==='d'){
        e.preventDefault();duplicateSelected();
      }else if(e.key==='Delete'||e.key==='Backspace'){
        if(selectedIds.length){e.preventDefault();deleteSelected();}
      }else if(e.key.toLowerCase()==='f'&&!cmd&&!e.altKey){
        e.preventDefault();toggleFocusMode();
      }else if(e.key==='Escape'){
        if(focusMode)toggleFocusMode();else setSelectedIds([]);
      }
    };
    window.addEventListener('keydown',onShortcuts);
    return()=>window.removeEventListener('keydown',onShortcuts);
  });
  useEffect(()=>{
    const handleSaveShortcut=(e:KeyboardEvent)=>{
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){
        e.preventDefault();
        if(storageReady&&latest.current)void queueSave({...latest.current}).then(()=>setNotice('Projeto salvo (Ctrl+S).')).catch(()=>{});
      }
    };
    window.addEventListener('keydown',handleSaveShortcut);
    return()=>window.removeEventListener('keydown',handleSaveShortcut);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[storageReady]);
  useEffect(()=>{
    const onHidden=()=>{if(document.visibilityState==='hidden'&&latest.current&&storageReady){void queueSave({...latest.current},false).catch(()=>{});}};
    document.addEventListener('visibilitychange',onHidden);
    return()=>document.removeEventListener('visibilitychange',onHidden);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[storageReady]);

  async function createNewProject(){
    if(projectActionBusy)return;
    setProjectActionBusy(true);
    try{
      await flushCurrent();
      const id=crypto.randomUUID(),title='Nova thumbnail';
      const next=createTemplate('oficial','16:9',brandSrc);
      setProjectId(id);setProjectName(title);setProjectCreatedAt(Date.now());setProject(next);setFormatScenes({'16:9':next});
      setKind('oficial');setFormat('16:9');setFilename(title);setSelected('logo');setVersionHistory([]);
      setFaceFile(null);cutouts.current.clear();photosRef.current.clear();setManualZoom(null);
      try{localStorage.setItem(LAST_PROJECT_KEY,id);}catch{}
      setTab('projects');setNotice('Novo projeto criado. Suas alterações serão salvas automaticamente neste navegador.');
    }catch(e){setNotice(`Não foi possível criar projeto: ${String(e)}`);}
    finally{setProjectActionBusy(false);}
  }
  async function openSavedProject(id:string){
    if(projectActionBusy||id===projectId)return;
    setProjectActionBusy(true);
    try{
      await flushCurrent();
      const data=await getProject(id);
      if(!data)throw new Error('Projeto não encontrado');
      activateProject(data);setNotice(`Projeto “${data.name}” aberto.`);
    }catch(e){setNotice(`Falha ao abrir: ${e instanceof Error?e.message:String(e)}`);}
    finally{setProjectActionBusy(false);}
  }
  async function cloneProject(){
    if(projectActionBusy)return;
    setProjectActionBusy(true);
    try{
      await flushCurrent();
      const copy:SavedProject={...latest.current!,id:crypto.randomUUID(),name:`${projectName} (cópia)`,createdAt:Date.now(),savedAt:Date.now(),scene:structuredClone(project),scenes:structuredClone(latest.current!.scenes)};
      await saveProject(copy);activateProject(copy);setSavedProjects(await listProjects());
      setNotice('Projeto duplicado com fotos, efeitos e camadas.');
    }catch(e){setNotice(`Falha ao duplicar: ${String(e)}`);}finally{setProjectActionBusy(false);}
  }
  async function deleteSavedProject(id:string){
    if(!window.confirm('Excluir este projeto e TODAS as versões salvas dele? Esta ação não pode ser desfeita.'))return;
    setProjectActionBusy(true);
    try{
      if(id===projectId){
        // Move to a new blank project before deleting; otherwise an auto-save could recreate the deleted one.
        const nextId=crypto.randomUUID(),next=createTemplate('oficial','16:9',brandSrc);
        setProjectId(nextId);setProjectName('Nova thumbnail');setProjectCreatedAt(Date.now());
        setProject(next);setFormatScenes({'16:9':next});setKind('oficial');setFormat('16:9');setVersionHistory([]);setSelected(null);
        try{localStorage.setItem(LAST_PROJECT_KEY,nextId);}catch{}
      }else await flushCurrent();
      // Ensure no older IndexedDB write can resurrect the just-deleted project.
      await saveQueue.current.catch(()=>undefined);
      await removeProject(id);setSavedProjects(await listProjects());setNotice('Projeto e versões excluídos.');
    }catch(e){setNotice(`Não foi possível excluir: ${String(e)}`);}finally{setProjectActionBusy(false);}
  }
  async function saveVersion(){
    if(projectActionBusy||!storageReady)return;
    setProjectActionBusy(true);
    try{
      await flushCurrent();
      const name=versionName.trim()||`Versão ${new Date().toLocaleString('pt-BR')}`;
      await saveProjectVersion({id:crypto.randomUUID(),projectId,name,savedAt:Date.now(),scene:project,scenes:{...formatScenes,[format]:project},kind,format,brandSrc});
      setVersionHistory(await listVersions(projectId));setVersionName('');
      setNotice(`Versão “${name}” preservada. Você pode restaurá-la quando quiser.`);
    }catch(e){setNotice(`Falha ao salvar versão: ${String(e)}`);}finally{setProjectActionBusy(false);}
  }
  async function restoreVersion(id:string){
    if(!window.confirm('Restaurar esta versão? O estado atual será guardado automaticamente como uma versão de segurança.'))return;
    setProjectActionBusy(true);
    try{
      await flushCurrent();
      const old=latest.current!;
      await saveProjectVersion({id:crypto.randomUUID(),projectId,name:`Antes de restaurar (${new Date().toLocaleString('pt-BR')})`,savedAt:Date.now(),scene:old.scene,scenes:old.scenes,kind:old.kind,format:old.format,brandSrc:old.brandSrc});
      const version=await getProjectVersion(id);
      if(!version)throw new Error('Versão não encontrada');
      setProject(structuredClone(version.scene));setFormatScenes(version.scenes?structuredClone(version.scenes):{[version.format]:structuredClone(version.scene)});setKind(version.kind);setFormat(version.format);setBrandSrc(version.brandSrc);
      setSelected(null);setVersionHistory(await listVersions(projectId));
      setNotice(`Versão “${version.name}” restaurada. Seu estado anterior também ficou guardado.`);
    }catch(e){setNotice(`Falha ao restaurar: ${String(e)}`);}finally{setProjectActionBusy(false);}
  }
  async function deleteVersion(id:string){
    if(!window.confirm('Excluir esta versão salva?'))return;
    try{await removeProjectVersion(id);setVersionHistory(await listVersions(projectId));}catch(e){setNotice(`Erro ao excluir versão: ${String(e)}`);}
  }
  async function exportBackup(){
    try{
      if(!latest.current)return;
      const allVersions=(await Promise.all(versionHistory.map(v=>getProjectVersion(v.id)))).filter((v):v is NonNullable<typeof v>=>v!==undefined);
      const content=await makeBackup({...latest.current},allVersions);
      const url=URL.createObjectURL(new Blob([content],{type:'application/json'}));
      const a=document.createElement('a');a.href=url;
      a.download=`zero-a-2-${projectName.replace(/[^a-z0-9á-ú _-]/gi,'').trim().replace(/\s+/g,'-')||'projeto'}.json`;
      document.body.appendChild(a);a.click();a.remove();
      window.setTimeout(()=>URL.revokeObjectURL(url),5000);
      setNotice('Backup JSON exportado. Guarde-o fora do navegador para maior segurança.');
    }catch(e){setNotice(`Falha no backup: ${String(e)}`);}
  }
  async function exportAssetPackage(){
    try{
      if(!latest.current)return;
      setProjectActionBusy(true);
      const versions=(await Promise.all((await listVersions(projectId)).map(v=>getProjectVersion(v.id)))).filter((v):v is NonNullable<typeof v>=>v!==undefined);
      const blob=await makeAssetBundle({...latest.current},versions);
      const url=URL.createObjectURL(blob),link=document.createElement('a');
      link.href=url;link.download=`zero-a-2-${projectName.replace(/[^a-z0-9á-ú _-]/gi,'').trim().replace(/\s+/g,'-')||'projeto'}-assets.zip`;
      document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),8000);
      setNotice(`Backup completo exportado: imagens originais, recortes, camadas, formatos e ${versions.length} versões.`);
    }catch(e){setNotice(`Backup ZIP falhou: ${e instanceof Error?e.message:String(e)}. Tente o JSON como alternativa.`);}
    finally{setProjectActionBusy(false);}
  }
  async function importBackup(file?:File){
    if(!file)return;
    if(file.size>130*1024*1024){setNotice('Backup acima do limite de 130 MB.');return;}
    setProjectActionBusy(true);
    try{
      await flushCurrent();
      const {project:restored,versions}=file.name.toLowerCase().endsWith('.zip')?await parseAssetBundle(file):parseArchive(await file.text());
      await saveProject(restored);
      for(const version of versions)await saveProjectVersion(version);
      activateProject(restored);setSavedProjects(await listProjects());setTab('projects');
      setNotice(`Projeto “${restored.name}” importado com imagens, camadas, formatos e ${versions.length} versões.`);
    }catch(e){setNotice(`Não foi possível importar: ${e instanceof Error?e.message:String(e)}`);}
    finally{setProjectActionBusy(false);}
  }
  async function requestPersistentStorage(){
    try{
      if(!navigator.storage?.persist)throw new Error('Seu navegador não oferece essa opção');
      const allowed=await navigator.storage.persist();
      setNotice(allowed?'O navegador concedeu armazenamento persistente. Mantenha backups externos.':'O navegador não concedeu armazenamento persistente. Exporte backups JSON regularmente.');
    }catch(e){setNotice(`Armazenamento persistente indisponível: ${String(e)}`);}
  }


  useEffect(()=>{
    const el=layoutRef.current;if(!el)return;
    const obs=new ResizeObserver(([entry])=>setContainerSize({w:entry.contentRect.width,h:entry.contentRect.height}));
    obs.observe(el);return()=>obs.disconnect();
  },[]);
  useEffect(()=>{void extractPalette(brandSrc).then(setPalette).catch(()=>{});},[brandSrc]);
  useEffect(()=>()=>objectUrls.current.forEach(url=>URL.revokeObjectURL(url)),[]);
  useEffect(()=>{listTemplates().then(setMyTemplates).catch(()=>setNotice('O navegador bloqueou o armazenamento local de templates.'));},[]);

  // Leave room for the scrollable viewport's padding; manual zoom can exceed the viewport and scroll.
  const fitScale=Math.min(.95,Math.max(.1,Math.min((containerSize.w-80)/project.width,(containerSize.h-80)/project.height)));
  const scale=manualZoom??fitScale;
  // Redimensiona apenas a visualização; a capa/exportação mantém seus pixels originais.
  const clampCanvasZoom=(value:number)=>Math.round(Math.min(2.5,Math.max(.1,value))*100)/100;
  function startCanvasResize(e:ReactPointerEvent<HTMLButtonElement>){
    if(e.button!==0)return;
    e.preventDefault();e.stopPropagation();
    canvasResizeRef.current={x:e.clientX,y:e.clientY,scale,proposed:scale};
    if(zoomPreviewRef.current){
      zoomPreviewRef.current.hidden=false;
      zoomPreviewRef.current.style.width=`${project.width*scale}px`;
      zoomPreviewRef.current.style.height=`${project.height*scale}px`;
      zoomPreviewRef.current.textContent=`${Math.round(scale*100)}%`;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function moveCanvasResize(e:ReactPointerEvent<HTMLButtonElement>){
    const anchor=canvasResizeRef.current;
    if(!anchor)return;
    e.preventDefault();e.stopPropagation();
    // Preview just a lightweight outline. Rerendering the Konva Stage on every
    // pixel of the drag caused large image canvases to stutter and jump.
    const dx=(e.clientX-anchor.x)/project.width;
    const dy=(e.clientY-anchor.y)/project.height;
    const next=clampCanvasZoom(anchor.scale+(Math.abs(dx)>=Math.abs(dy)?dx:dy));
    anchor.proposed=next;
    if(zoomPreviewRef.current){
      zoomPreviewRef.current.style.width=`${project.width*next}px`;
      zoomPreviewRef.current.style.height=`${project.height*next}px`;
      zoomPreviewRef.current.textContent=`${Math.round(next*100)}%`;
    }
  }
  function stopCanvasResize(e:ReactPointerEvent<HTMLButtonElement>){
    const anchor=canvasResizeRef.current;
    canvasResizeRef.current=null;
    e.stopPropagation();
    if(zoomPreviewRef.current)zoomPreviewRef.current.hidden=true;
    if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
    if(anchor&&e.type==='pointerup')setManualZoom(anchor.proposed);
  }
  const current=project.layers.find(l=>l.id===selected);
  const currentNativePiece = pic(current) ? findNativePiece(current) : undefined;
  useEffect(()=>{
    const value=pic(current)?current.outlineWidth??12:12;
    outlineDraftRef.current=value;
    setOutlineDraft(value);
  },[current?.id, pic(current)?current.outlineWidth:undefined]);
  const currentPictureSrc=pic(current)?current.src:null;
  useEffect(()=>{
    if(!currentPictureSrc){setImageSize({src:'',width:0,height:0});return;}
    let active=true;
    const img=new Image();
    img.onload=()=>{if(active)setImageSize({src:currentPictureSrc,width:img.naturalWidth,height:img.naturalHeight});};
    img.onerror=()=>{if(active)setImageSize({src:currentPictureSrc,width:0,height:0});};
    img.src=publicAssetUrl(currentPictureSrc);
    return ()=>{active=false;};
  },[currentPictureSrc]);
  useEffect(()=>{
    let active=true;const src=project.background.src;const img=new Image();
    img.onload=()=>{if(active)setBackgroundSize({src,width:img.naturalWidth,height:img.naturalHeight});};
    img.onerror=()=>{if(active)setBackgroundSize({src,width:0,height:0});};
    img.src=publicAssetUrl(src);return()=>{active=false;};
  },[project.background.src]);
  const backgroundRatio=backgroundSize.width/Math.max(1,backgroundSize.height);
  const backgroundRatioError=Math.max(backgroundRatio/(project.width/project.height),(project.width/project.height)/backgroundRatio)-1;
  const backgroundDistorted=(project.background.mode??'image')==='image'&&(project.background.fit==='stretch')&&backgroundSize.src===project.background.src&&backgroundSize.width>0&&backgroundRatioError>.03;
  const hasNativeSize=pic(current)&&imageSize.src===current.src&&imageSize.width>0&&imageSize.height>0;
  const originalRatio=hasNativeSize?(imageSize.width*(pic(current)?current.crop?.width??1:1))/(imageSize.height*(pic(current)?current.crop?.height??1:1)):1;
  const slotRatio=pic(current)?current.width/current.height:1;
  const aspectError=Math.max(originalRatio/slotRatio,slotRatio/originalRatio)-1;
  const isStretched=pic(current)&&(current.fit??'contain')==='stretch'&&hasNativeSize&&aspectError>.03;
  const aspectPercent=Math.round(aspectError*100);
  const activeFaceId=pic(current)&&current.role==='face'?current.id:'face';
  const composition=useMemo(()=>evaluateComposition(project),[project]);
  const selectedMeta=catalog.find(x=>x.id===kind);

  function updateLayer(id:string,patch:Partial<SceneLayer>){
    setProject(prev=>({...prev,layers:prev.layers.map(l=>l.id===id?{...l,...patch} as SceneLayer:l)}));
  }
  function updateLayers(patches:{id:string;patch:Partial<SceneLayer>}[]){
    if(!patches.length)return;
    const changes=new Map(patches.map(x=>[x.id,x.patch]));
    setProject(prev=>({...prev,layers:prev.layers.map(l=>changes.has(l.id)?{...l,...changes.get(l.id)} as SceneLayer:l)}));
  }
  /** Restore objects dragged off the canvas. Keeps their relative spacing and scale. */
  function centerSelection(){
    const layers=project.layers.filter(l=>selectedIds.includes(l.id)&&!l.locked);
    if(!layers.length){setNotice('Selecione uma ou mais peças na lista de camadas.');return;}
    const minX=Math.min(...layers.map(l=>l.x));
    const minY=Math.min(...layers.map(l=>l.y));
    const maxX=Math.max(...layers.map(l=>l.x+layerDimensions(l).width));
    const maxY=Math.max(...layers.map(l=>l.y+layerDimensions(l).height));
    const dx=(project.width-(maxX-minX))/2-minX;
    const dy=(project.height-(maxY-minY))/2-minY;
    updateLayers(layers.map(l=>({id:l.id,patch:{x:Math.round(l.x+dx),y:Math.round(l.y+dy)}})));
    setManualZoom(null);
    setNotice(`${layers.length} peça(s) centralizada(s). O zoom foi ajustado à tela.`);
  }
  function duplicateSelected(){
    const copies=project.layers.filter(l=>selectedIds.includes(l.id)&&!l.locked)
      .map(layer=>({...structuredClone(layer),id:crypto.randomUUID(),name:`${layer.name} (cópia)`,x:layer.x+28,y:layer.y+28,slotId:undefined} as SceneLayer));
    if(!copies.length){setNotice('Selecione uma ou mais peças para duplicar.');return;}
    setProject(prev=>({...prev,layers:[...prev.layers,...copies]}));
    setSelectedIds(copies.map(l=>l.id));
    setNotice(`${copies.length} peça(s) duplicada(s) com fotos, efeitos e recortes preservados.`);
  }
  function deleteSelected(){
    const ids=new Set(selectedIds);
    setProject(prev=>({...prev,layers:prev.layers.filter(l=>!ids.has(l.id)||l.locked)}));
    setSelectedIds([]);
    setNotice('Peças selecionadas removidas.');
  }
  function applyCrop(crop:NormalizedCrop|undefined){
    if(!croppingId)return;
    const layer=project.layers.find(l=>l.id===croppingId);
    if(!pic(layer)){setCroppingId(null);return;}
    // The crop editor selects source pixels. Shrink the on-canvas frame as well,
    // otherwise the transparent/empty old box keeps covering the canvas.
    if(!crop){updateLayer(layer.id,calculateCropPatch(layer,undefined,1,1,project));}
    else {
      const sameSrc=imageSize.src===layer.src;
      const w=sameSrc?imageSize.width:0,h=sameSrc?imageSize.height:0;
      if(w>0&&h>0)updateLayer(layer.id,calculateCropPatch(layer,crop,w,h,project));
      else {
        const image=new Image();image.onload=()=>updateLayer(layer.id,calculateCropPatch(layer,crop,image.naturalWidth,image.naturalHeight,project));
        image.src=publicAssetUrl(layer.src);
      }
    }
    setCroppingId(null);
    setNotice(crop?'Recorte aplicado e quadro ajustado ao tamanho da região selecionada. A imagem original foi preservada.':'Recorte removido e dimensões anteriores restauradas.');
  }
  function updateBackdrop(patch:Partial<Template['background']>){
    setProject(prev=>({...prev,background:{...prev.background,...patch}}));
  }
  function switchFormat(nextFormat:Format){
    if(nextFormat===format)return;
    const saved={...formatScenes,[format]:project};
    const nextScene=saved[nextFormat]?structuredClone(saved[nextFormat]):adaptSceneFormat(project,nextFormat);
    setFormatScenes({...saved,[nextFormat]:nextScene});
    setFormat(nextFormat);setProject(nextScene);setManualZoom(null);setSelected(null);
    setNotice(saved[nextFormat]?`Composição ${nextFormat} recuperada. Suas edições de ${format} foram preservadas.`:`Composição ${nextFormat} criada a partir da atual, mantendo fotos e textos. Ajuste a posição das peças se necessário.`);
  }
  function applyTemplate(next:TemplateKind,nextFormat:Format=format){
    const replacement=createTemplate(next,nextFormat,brandSrc);
    setManualZoom(null);setKind(next);setFormat(nextFormat);setProject(replacement);setFormatScenes({[nextFormat]:replacement});setActiveCustomId(null);
    setFaceFile(null);cutouts.current.clear();photosRef.current.clear();setSelected('logo');
    setNotice(`Template “${catalog.find(x=>x.id===next)?.name}” aplicado. As peças podem ser substituídas.`);
  }
  async function addNewPhoto(file?:File){
    if(!file)return;
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)){setNotice('Envie uma foto PNG, JPG ou WebP.');return;}
    try{
      const bitmap=await createImageBitmap(file);
      const size=boundedImageSize(project,bitmap.width,bitmap.height);
      bitmap.close();
      const id=crypto.randomUUID();
      const src=makeUrl(file);
      const pos=findFreePosition(project,size.width,size.height,selectedIds);
      const layer:PictureLayer={id,type:'picture',name:file.name.replace(/\.[^/.]+$/,'')||'Nova fotografia',role:'face',src,originalSrc:src,fileName:file.name,fit:'contain',x:pos.x,y:pos.y,width:size.width,height:size.height,lockAspect:true};
      photosRef.current.set(id,file);setFaceFile({id,file});
      setProject(prev=>({...prev,layers:[...prev.layers,layer]}));setSelected(id);
      setNotice('Fotografia adicionada como NOVA camada, sem substituir a peça anterior. Use “Trocar foto” para substituir uma imagem selecionada.');
    }catch(e){setNotice(`Não foi possível adicionar a fotografia: ${e instanceof Error?e.message:String(e)}`);}
  }
  function uploadFace(file?:File,idOverride?:string|null){
    if(idOverride==='__new__'){void addNewPhoto(file);return;}
    if(!file)return;
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)){setNotice('Envie uma foto PNG, JPG ou WebP.');return;}
    const id=idOverride||(pic(current)&&current.role!=='logo'?current.id:activeFaceId);
    photosRef.current.set(id,file);setFaceFile({id,file});cutouts.current.delete(id);
    const source=makeUrl(file);
    updateLayer(id,{src:source,originalSrc:source,cutoutSrc:undefined,isCutout:false,fileName:file.name,fit:'contain',crop:undefined});
    setSelected(id);setNotice('Imagem carregada preservando o slot. Para fotos de pessoas, clique em “Recortar fundo local”.');
  }
  /** Fit the draggable selection frame to non-transparent pixels, not the
   * bitmap's unused transparent margins. The full source PNG is retained. */
  async function alphaFitPatch(layer:PictureLayer, outlined:Blob){
    const bounds=await findAlphaBounds(outlined);
    if(!bounds)return {crop:undefined,uncroppedFrame:undefined,fit:'contain' as const};
    const base:PictureLayer={...layer,crop:undefined,uncroppedFrame:layer.uncroppedFrame};
    return calculateCropPatch(base,bounds.crop,bounds.width,bounds.height,project);
  }
  async function fitSelectedToContent(){
    if(!pic(current))return;
    const id=current.id;
    try{
      const blob=await (await fetch(current.src)).blob();
      const bounds=await findAlphaBounds(blob);
      if(!bounds){setNotice('Não foram encontradas margens transparentes significativas nessa imagem.');return;}
      const patch=calculateCropPatch(current,bounds.crop,bounds.width,bounds.height,project);
      updateLayer(id,patch);
      setNotice('Quadro ajustado à silhueta visível; margens transparentes ocultadas sem apagar o PNG original.');
    }catch(e){setNotice(`Erro ao enquadrar imagem: ${e instanceof Error?e.message:String(e)}`);}
  }
  async function removeBackground(){
    const selectedPhoto=pic(current)&&current.role!=='logo'?current:null;
    const id=selectedPhoto?.id??faceFile?.id??activeFaceId;
    let input:Blob|undefined=photosRef.current.get(id);
    if(!input&&selectedPhoto?.originalSrc){try{input=await(await fetch(selectedPhoto.originalSrc)).blob();}catch{}}
    if(!input){setNotice('Selecione um rosto e carregue uma foto antes do recorte.');return;}
    if(busy)return;
    setBusy(true);setProgress(0);setNotice('Recorte em CPU/WASM, totalmente local. Depois você poderá corrigir a máscara.');
    try{
      const result=await removeBackgroundLocally(input,setProgress,cutoutQuality);
      cutouts.current.set(id,result.transparent);
      const old=project.layers.find(l=>l.id===id);
      const color=pic(old)?old.outlineColor??'#ffffff':'#ffffff';
      const thickness=pic(old)?old.outlineWidth??12:12;
      const outlined=await addWhiteOutline(result.transparent,590,640,thickness,color);
      const fit=pic(old)?await alphaFitPatch(old,outlined):{};
      updateLayer(id,{...fit,src:makeUrl(outlined),cutoutSrc:makeUrl(result.transparent),isCutout:true,outlineWidth:thickness,outlineColor:color,fit:'contain'});
      setSelected(id);setMaskSession({id,original:input,cutout:result.transparent});
      setNotice('Recorte automático concluído. Refine a máscara se houver sobras ou partes apagadas.');
    }catch(e){setNotice(`Recorte indisponível: ${e instanceof Error?e.message:String(e)}. Verifique public/models/.`);}
    finally{setBusy(false);}
  }
  async function openMaskEditor(){
    if(!pic(current)||!current.isCutout){setNotice('Recorte a foto primeiro para editar a máscara.');return;}
    try{
      const cutout=cutouts.current.get(current.id)??(current.cutoutSrc?await(await fetch(current.cutoutSrc)).blob():null);
      if(!cutout)throw new Error('Máscara original indisponível. Refaça o recorte.');
      const original=photosRef.current.get(current.id)??(current.originalSrc?await(await fetch(current.originalSrc)).blob():null);
      setMaskSession({id:current.id,original,cutout});
    }catch(e){setNotice(`Falha ao abrir máscara: ${e instanceof Error?e.message:String(e)}`);}
  }
  async function applyEditedMask(blob:Blob){
    if(!maskSession)return;
    const id=maskSession.id,layer=project.layers.find(l=>l.id===id);
    const width=pic(layer)?layer.outlineWidth??12:12,color=pic(layer)?layer.outlineColor??'#ffffff':'#ffffff';
    const outlined=await addWhiteOutline(blob,590,640,width,color);
    const fit=pic(layer)?await alphaFitPatch(layer,outlined):{};
    cutouts.current.set(id,blob);updateLayer(id,{...fit,src:makeUrl(outlined),cutoutSrc:makeUrl(blob),isCutout:true});
    setMaskSession(null);setNotice('Máscara manual aplicada; contorno branco refeito sobre a silhueta.');
  }
  async function changeOutline(width:number,color:string){
    if(!pic(current)||current.role!=='face')return;
    const selectedLayer=current;
    const id=selectedLayer.id;
    const request=++outlineRequestRef.current;
    try{
      const blob=cutouts.current.get(id)??(selectedLayer.cutoutSrc?await(await fetch(selectedLayer.cutoutSrc)).blob():null);
      if(!blob){setNotice('Recorte a foto primeiro para ajustar a silhueta.');return;}
      const outlined=await addWhiteOutline(blob,590,640,width,color);
      const fit=await alphaFitPatch(selectedLayer,outlined);
      // A slow render must never overwrite a more recent contour/color choice.
      if(request!==outlineRequestRef.current)return;
      updateLayer(id,{...fit,src:makeUrl(outlined),outlineWidth:width,outlineColor:color,isCutout:true});
    }catch(e){setNotice(`Não foi possível ajustar o contorno: ${e instanceof Error?e.message:String(e)}`);}
  }
  function chooseSlot(slot:TemplateSlot){
    setSelected(slot.layerId);
    if(slot.role==='logo'){logoInputRef.current?.click();return;}
    if(slot.role==='title'){setNotice('Título selecionado: edite o conteúdo e fonte no painel direito.');return;}
    photoTargetRef.current=slot.layerId;faceInputRef.current?.click();
  }
  function applyFrameChoice(id:FrameId){
    // Shorts needs a portrait canvas. Preserve the uploaded photos and edited text
    // when converting from a 16:9 composition to the 9:16 scene.
    if(id==='shorts'&&format!=='9:16'){
      const previous={...formatScenes,[format]:project};
      const vertical=previous['9:16']?structuredClone(previous['9:16']):adaptSceneFormat(project,'9:16');
      const framed=applyFrame(vertical,id,brandSrc);
      setFormatScenes({...previous,'9:16':framed});
      setFormat('9:16');setManualZoom(null);
      setProject(framed);
    }else setProject(prev=>applyFrame(prev,id,brandSrc));
    setShowSlots(true);setSelected(null);
    setNotice('Moldura aplicada. Clique em um slot para trocar sua peça ou solte uma imagem sobre ele.');
  }
  function acceptDroppedFile(file:File,x:number,y:number){
    if(!file.type.startsWith('image/')){setNotice('Solte uma imagem JPG, PNG ou WebP.');return;}
    const slot=project.slots?.find(slot=>x>=slot.x&&x<=slot.x+slot.width&&y>=slot.y&&y<=slot.y+slot.height);
    if(slot?.role==='logo'){void uploadLogo(file);return;}
    if(slot?.role==='title'){setSelected(slot.layerId);setNotice('Slot de título: edite o texto no painel direito.');return;}
    if(slot){uploadFace(file,slot.layerId);return;}
    void addNewPhoto(file);
  }
  async function uploadLogo(file?:File){
    if(!file)return;
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)){setNotice('Escolha um logo PNG/JPG/WebP.');return;}
    try{
      const bitmap=await createImageBitmap(file);
      const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;
      const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas 2D indisponível');
      const ratio=Math.min(490/bitmap.width,490/bitmap.height);
      ctx.drawImage(bitmap,(512-bitmap.width*ratio)/2,(512-bitmap.height*ratio)/2,bitmap.width*ratio,bitmap.height*ratio);
      bitmap.close();
      const src=canvas.toDataURL('image/png');
      setBrandSrc(src);
      try{localStorage.setItem('z2-logo',src);}catch{setNotice('O navegador não permitiu salvar o logo permanentemente.');}
      setProject(prev=>({...prev,layers:prev.layers.map(l=>pic(l)&&l.role==='logo'?{...l,src}:l)}));
      setSelected('logo');setNotice('Logo aplicado nos templates; paleta extraída localmente.');
    }catch(e){setNotice(`Falha ao ler logo: ${e instanceof Error?e.message:String(e)}`);}
  }
  function addArrow(){
    const id=crypto.randomUUID(),width=250,height=155;
    const pos=findFreePosition(project,width,height,selectedIds);
    setProject(prev=>({...prev,layers:[...prev.layers,{id,name:'Seta viral',type:'arrow',...pos,points:[0,50,140,0,205,20],width,height,color:'#ef4444',strokeWidth:25,pointerLength:45,pointerWidth:50}]}));
    setSelected(id);
  }
  function addPicturePiece(name:string,src:string,width:number,height:number){
    const id=crypto.randomUUID();
    const size=boundedImageSize(project,width,height);
    const pos=findFreePosition(project,size.width,size.height,selectedIds);
    const layer:PictureLayer={type:'picture',id,name,role:'decoration',...pos,...size,src,fit:'contain',lockAspect:true,nativePieceId:nativePieces.find(p=>p.src===src)?.id};
    setProject(prev=>({...prev,layers:[...prev.layers,layer]}));
    setSelected(id);setNotice(`Peça “${name}” adicionada como uma nova camada em uma posição livre.`);
  }
  function restoreNativePiece(){
    if (!pic(current) || !currentNativePiece) return;
    updateLayer(current.id, {
      src:currentNativePiece.src, nativePieceId:currentNativePiece.id,
      width:currentNativePiece.width, height:currentNativePiece.height,
      fit:'contain', crop:undefined, lockAspect:true, flipX:false, flipY:false,
    });
    setNotice(`“${currentNativePiece.name}” voltou à arte e proporções originais.`);
  }
  function addCircle(){
    const id=crypto.randomUUID(),radius=110,pos=findFreePosition(project,radius*2,radius*2,selectedIds);
    setProject(prev=>({...prev,layers:[...prev.layers,{id,name:'Círculo destaque',type:'circle',x:pos.x+radius,y:pos.y+radius,radius,color:'#ffcc00',strokeWidth:18}]}));setSelected(id);
  }
  function addText(){
    const id=crypto.randomUUID(),width=Math.min(520,project.width*.7),fontSize=72,pos=findFreePosition(project,width,fontSize*1.25,selectedIds);
    setProject(prev=>({...prev,layers:[...prev.layers,{id,name:'Novo texto',type:'text',...pos,width,text:'NOVO TEXTO',fontFamily:'Impact, Arial Black, sans-serif',fontSize,lineHeight:1.02,color:'#ffcc00',stroke:'#080808',strokeWidth:10,shadowColor:'#000000',shadowBlur:10,shadowOffsetY:8}]}));setSelected(id);
  }
  /** Size controls work for pictures, arrows, text and circles; never rely exclusively on Konva handles. */
  function layerDimensions(layer:SceneLayer):{width:number;height:number}{
    if(layer.type==='picture')return {width:layer.width,height:layer.height};
    if(layer.type==='arrow')return {width:layer.width??250,height:layer.height??155};
    if(layer.type==='circle')return {width:layer.radius*2,height:layer.radius*2};
    return {width:layer.width,height:layer.fontSize};
  }
  function resizeSelected(nextWidth:number,nextHeight:number){
    if(!current)return;
    const width=Math.max(24,Math.min(3200,Math.round(nextWidth)));
    const height=Math.max(24,Math.min(3200,Math.round(nextHeight)));
    if(current.type==='circle')updateLayer(current.id,{radius:Math.round(width/2)});
    else if(current.type==='text')updateLayer(current.id,{width,fontSize:height});
    else updateLayer(current.id,{width,height});
  }
  function changeSize(axis:'width'|'height',raw:number){
    if(!current)return;
    const original=layerDimensions(current);
    const value=Math.max(24,Math.min(3200,Math.round(raw)));
    const locked=current.lockAspect??true;
    if(axis==='width')resizeSelected(value,locked?value*original.height/Math.max(1,original.width):original.height);
    else resizeSelected(locked?value*original.width/Math.max(1,original.height):original.width,value);
  }
  function bumpSize(factor:number){
    if(!current)return;
    const {width,height}=layerDimensions(current);
    resizeSelected(width*factor,height*factor);
  }
  function uploadBackdrop(file?:File){
    if(!file)return;
    if(!['image/png','image/jpeg','image/webp','image/svg+xml'].includes(file.type)){setNotice('Escolha PNG, JPG, WebP ou SVG para o fundo.');return;}
    updateBackdrop({mode:'image',src:makeUrl(file),fit:'contain'});
    setNotice('Fundo substituído no modo “Mostrar tudo”. Use “Preencher” para ocupar o canvas com recorte, sem deformar.');
  }
  function restoreBackdrop(){
    updateBackdrop({...createTemplate(kind,format,brandSrc).background});
    setNotice('Fundo original do template restaurado, sem transformar o logo em fundo.');
  }
  function reorder(id:string,dir:number){setProject(prev=>{const layers=[...prev.layers],i=layers.findIndex(x=>x.id===id),j=i+dir;if(i>=0&&j>=0&&j<layers.length){[layers[i],layers[j]]=[layers[j],layers[i]];}return{...prev,layers};});}
  function sendToEdge(id:string,toFront:boolean){setProject(prev=>{const layers=[...prev.layers];const index=layers.findIndex(x=>x.id===id);if(index<0)return prev;const [layer]=layers.splice(index,1);if(toFront)layers.push(layer);else layers.unshift(layer);return {...prev,layers};});}
  function removeLayer(id:string){setProject(prev=>({...prev,layers:prev.layers.filter(l=>l.id!==id)}));setSelected(null);}
  async function saveMyTemplate(updateCurrent=false){
    if(saving)return;
    const name=templateName.trim();
    if(!name){setNotice('Digite um nome para o seu template.');return;}
    setSaving(true);
    try{
      const id=updateCurrent&&activeCustomId?activeCustomId:`custom-${Date.now()}`;
      await storeTemplate({id,name,kind,format,savedAt:Date.now(),scene:{...project,id,name}});
      setActiveCustomId(id);
      setMyTemplates(await listTemplates());
      setNotice(`Template “${name}” salvo neste navegador com todas as camadas.`);
    }catch(e){setNotice(`Não foi possível salvar: ${e instanceof Error?e.message:String(e)}.`);}
    finally{setSaving(false);}
  }
  function openMyTemplate(value:SavedTemplate){
    setManualZoom(null);setProject(structuredClone(value.scene));setFormatScenes({[value.format]:structuredClone(value.scene)});setKind(value.kind);setFormat(value.format);
    setActiveCustomId(value.id);setTemplateName(value.name);setSelected(null);
    setFaceFile(null);cutouts.current.clear();photosRef.current.clear();
    setNotice(`Template “${value.name}” aberto. Edite as camadas e salve as alterações.`);
  }
  async function removeMyTemplate(id:string){
    try{
      await deleteTemplate(id);setMyTemplates(await listTemplates());
      if(activeCustomId===id)setActiveCustomId(null);
      setNotice('Template personalizado excluído. Os modelos originais permanecem intactos.');
    }catch(e){setNotice(`Erro ao excluir: ${e instanceof Error?e.message:String(e)}`);}
  }
  function exportPng(){
    const stage=stageRef.current;if(!stage)return;
    const tr=stage.findOne('Transformer');const slotLayer=stage.findOne('.slot-guides');tr?.hide();slotLayer?.hide();stage.draw();
    try{
      const png=stage.toDataURL({x:PASTEBOARD*scale,y:PASTEBOARD*scale,width:project.width*scale,height:project.height*scale,pixelRatio:1/scale,mimeType:'image/png'});
      const a=document.createElement('a');a.href=png;
      a.download=`${filename.replace(/[^a-z0-9á-ú _-]/gi,'').trim().replace(/\s+/g,'-')||'thumbnail'}-${format.replace(':','x')}.png`;
      document.body.appendChild(a);a.click();a.remove();
      setNotice(`Capa exportada com todas as camadas em ${project.width} × ${project.height}.`);
    }catch(e){setNotice(`Falha na exportação: ${e instanceof Error?e.message:String(e)}`);}
    finally{tr?.show();slotLayer?.show();stage.draw();}
  }

  return <div className="studio-shell">
    <header className="studio-top">
      <div className="studio-brand"><img src={publicAssetUrl(brandSrc)} alt="Logo Zero a 2"/><div><strong>ZERO A 2 STUDIO</strong><small>Editor modular de thumbnails · {project.width} × {project.height}px</small></div><button className="quiet-btn" onClick={()=>logoInputRef.current?.click()}>Trocar / Editar Logo</button></div>
      <div className="top-controls">
        <div className="project-save-indicator" title="Os projetos são salvos localmente no navegador; exporte backups para protegê-los">
          <span className={`save-dot ${saveStatus}`}/>{saveStatus==='saved'?'Salvo':saveStatus==='saving'?'Salvando…':saveStatus==='error'?'Erro ao salvar':saveStatus==='loading'?'Carregando…':'Alterações pendentes'}
        </div>
        <button className="outline-top" disabled={!storageReady||projectActionBusy} onClick={()=>void flushCurrent().then(()=>setNotice('Projeto salvo neste navegador.')).catch(()=>{})}><Save size={15}/> Salvar agora</button>
        <button className="outline-top" onClick={()=>setTab('projects')}><FolderOpen size={15}/> Projetos</button>
        <div className="layout-controls" role="group" aria-label="Visualização dos painéis">
          <button type="button" aria-label={leftVisible?'Esconder biblioteca':'Mostrar biblioteca'} aria-pressed={!leftVisible} title={leftVisible?'Esconder painel esquerdo':'Mostrar painel esquerdo'} onClick={()=>toggleSidePanel('left')}>
            {leftVisible?<PanelLeftClose size={17}/>:<PanelLeftOpen size={17}/>}<span>Biblioteca</span>
          </button>
          <button type="button" aria-label={rightVisible?'Esconder propriedades':'Mostrar propriedades'} aria-pressed={!rightVisible} title={rightVisible?'Esconder painel direito':'Mostrar painel direito'} onClick={()=>toggleSidePanel('right')}>
            {rightVisible?<PanelRightClose size={17}/>:<PanelRightOpen size={17}/>}<span>Propriedades</span>
          </button>
          <button type="button" className={focusMode?'active':''} aria-label={focusMode?'Sair do modo foco':'Entrar no modo foco'} aria-pressed={focusMode} title="Modo foco (tecla F). Esc retorna aos painéis" onClick={toggleFocusMode}>
            {focusMode?<Shrink size={17}/>:<Expand size={17}/>}<span>{focusMode?'Sair do foco':'Modo foco'}</span>
          </button>
        </div>
        <div className="format-switch"><button className={format==='16:9'?'on':''} onClick={()=>switchFormat('16:9')}><Monitor size={14}/> YouTube 16:9</button><button className={format==='9:16'?'on':''} onClick={()=>switchFormat('9:16')}><Smartphone size={14}/> TikTok 9:16</button></div>
        <div className="zoom-control" aria-label="Zoom do canvas" title="Muda só o tamanho na tela. O arquivo PNG mantém a resolução original.">
          <button title="Diminuir zoom do canvas" aria-label="Diminuir zoom" onClick={()=>setManualZoom(clampCanvasZoom(scale-.1))}><ZoomOut size={15}/></button>
          <span>{Math.round(scale*100)}%</span>
          <input className="canvas-zoom-slider" aria-label="Tamanho da visualização da thumbnail" type="range" min="10" max="250" step="5" value={Math.round(scale*100)} onChange={e=>setManualZoom(clampCanvasZoom(Number(e.target.value)/100))}/>
          <button title="Aumentar zoom do canvas" aria-label="Aumentar zoom" onClick={()=>setManualZoom(clampCanvasZoom(scale+.1))}><ZoomIn size={15}/></button>
          <button title="Ajustar thumbnail à janela" aria-label="Ajustar zoom à tela" onClick={()=>setManualZoom(null)}><Maximize2 size={15}/></button>
        </div>
        <button className={`outline-top ${guides?'on':''}`} onClick={()=>setGuides(!guides)}><Eye size={16}/> Safe Zones</button>
        <button className="studio-export" onClick={exportPng}><ArrowDownToLine size={17}/> Exportar HD</button>
      </div>
    </header>
    <div className={`studio-grid ${leftVisible?'':'panel-left-hidden'} ${rightVisible?'':'panel-right-hidden'}`}>
      <aside className="studio-left">
        <nav className="sidebar-tabs">
          {([['projects',FolderOpen,'Projetos'],['templates',LayoutTemplate,'Templates'],['frames',LayoutTemplate,'Molduras'],['brand',Palette,'Meu Logo'],['elements',Sparkles,'Peças'],['director',ShieldCheck,'Diretor IA']] as const).map(([id,Icon,label])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}><Icon size={20}/>{label}</button>)}
        </nav>
        <div className="sidebar-content">
          {tab==='projects'&&<>
            <h3>Meus projetos</h3>
            <p>Continuar depois de fechar o navegador. Salva fotos, máscaras, molduras e a ordem das peças.</p>
            <section className="template-editor project-panel">
              <h4>Projeto em andamento</h4>
              <label htmlFor="project-name">Nome do projeto</label>
              <input id="project-name" maxLength={80} value={projectName} onChange={e=>setProjectName(e.target.value)}/>
              <span className={`project-state ${saveStatus}`}>{saveStatus==='saved'?'✓ Salvo neste navegador':saveStatus==='saving'?'Salvando…':saveStatus==='error'?'Erro de armazenamento — faça backup':saveStatus==='loading'?'Recuperando projeto…':'● Alterações serão salvas automaticamente'}</span>
              <button className="template-save" disabled={!storageReady||projectActionBusy} onClick={()=>void flushCurrent().then(()=>setNotice('Projeto salvo com fotos e camadas.')).catch(()=>{})}><Save size={15}/> Salvar agora</button>
              <div className="project-two-buttons"><button disabled={projectActionBusy} onClick={()=>void createNewProject()}><FolderPlus size={15}/> Novo projeto</button><button disabled={projectActionBusy} onClick={()=>void cloneProject()}><Copy size={15}/> Duplicar</button></div>
              <h4>Versões deste projeto</h4>
              <input maxLength={80} placeholder="Ex.: Antes de mudar a fonte" value={versionName} onChange={e=>setVersionName(e.target.value)}/>
              <button className="outline-button" disabled={projectActionBusy} onClick={()=>void saveVersion()}><History size={15}/> Salvar versão / ponto de retorno</button>
              <div className="project-list">
                {versionHistory.length===0&&<small>Nenhuma versão criada ainda.</small>}
                {versionHistory.map(v=><div className="project-entry" key={v.id}><span><strong>{v.name}</strong><small>{new Date(v.savedAt).toLocaleString('pt-BR')}</small></span><button disabled={projectActionBusy} onClick={()=>void restoreVersion(v.id)} title="Restaurar esta versão"><RotateCcw size={15}/></button><button onClick={()=>void deleteVersion(v.id)} title="Excluir versão"><Trash2 size={15}/></button></div>)}
              </div>
              <h4>Backup fora do navegador</h4>
              <button className="template-save" disabled={projectActionBusy} onClick={()=>void exportAssetPackage()}><FileDown size={15}/> Backup completo ZIP (todos os assets)</button>
              <div className="project-two-buttons"><button disabled={projectActionBusy} onClick={()=>void exportBackup()}><FileDown size={15}/> JSON clássico</button><button disabled={projectActionBusy} onClick={()=>importInputRef.current?.click()}><FileUp size={15}/> Importar ZIP / JSON</button></div>
              <p>O ZIP contém projeto.json, fotos, logos, recortes, versões e os layouts YouTube e TikTok.</p>
              <button className="outline-button" onClick={()=>void requestPersistentStorage()}><LockKeyhole size={15}/> Solicitar armazenamento persistente</button>
              <p>Os dados ficam neste navegador e neste endereço local. Limpar dados do site, trocar de computador ou usar outra origem pode apagá-los. Guarde backups JSON externos.</p>
            </section>
            <h3>Projetos salvos ({savedProjects.length})</h3>
            <div className="project-list">
              {savedProjects.map(item=><div className={`project-entry ${item.id===projectId?'active':''}`} key={item.id}>
                <button className="project-open" disabled={projectActionBusy} onClick={()=>void openSavedProject(item.id)}><FolderOpen size={16}/><span><strong>{item.name}</strong><small>{item.format} · {new Date(item.savedAt).toLocaleString('pt-BR')}{item.id===projectId?' · Atual':''}</small></span></button>
                <button title="Excluir projeto" disabled={projectActionBusy} onClick={()=>void deleteSavedProject(item.id)}><Trash2 size={15}/></button>
              </div>)}
            </div>
          </>}
          {tab==='templates'&&<>
            <h3>Escolha um Template “Quebra-Cabeças”</h3><p>Modelos completos, com todas as peças editáveis e sincronizados com sua marca.</p>
            <div className="template-options">{catalog.map(item=><button key={item.id} className={`template-choice ${kind===item.id?'active':''}`} onClick={()=>applyTemplate(item.id)}><span><strong>{item.name}</strong><em>{item.tag}</em></span><small>{item.description}</small></button>)}</div>
            <section className="template-editor">
              <h4>Editor de templates personalizados</h4>
              <p>Modifique as peças do canvas, dê um nome e salve uma cópia. Fotos incluídas também são preservadas no armazenamento local.</p>
              <label htmlFor="template-name">Nome do modelo</label>
              <input id="template-name" value={templateName} maxLength={60} onChange={e=>setTemplateName(e.target.value)} placeholder="Ex.: Minha capa gamer"/>
              <button className="template-save" disabled={saving} onClick={()=>void saveMyTemplate(false)}><Save size={15}/>{saving?'Salvando…':'Salvar como novo template'}</button>
              {activeCustomId&&<button className="outline-button" disabled={saving} onClick={()=>void saveMyTemplate(true)}>Atualizar template aberto</button>}
              {myTemplates.length>0&&<><h4>Meus templates ({myTemplates.length})</h4>
                <div className="template-saved-list">{myTemplates.map(item=><div className="template-saved" key={item.id}><button onClick={()=>openMyTemplate(item)}><FolderOpen size={15}/><span>{item.name}<small>{item.format} · {new Date(item.savedAt).toLocaleDateString('pt-BR')}</small></span></button><button aria-label={`Excluir ${item.name}`} title="Excluir template" onClick={()=>void removeMyTemplate(item.id)}><Trash2 size={14}/></button></div>)}</div>
              </>}
            </section>
            <div className="sidebar-tip"><Sparkles size={17}/> Edite qualquer modelo oficial; só sua cópia é salva.</div>
          </>}
          {tab==='frames'&&<>
            <h3>Templates-moldura</h3><p>Escolha a distribuição dos slots. Fotos, logos e textos continuam em camadas individuais, com seus efeitos.</p>
            <div className="frame-grid">{frameCatalog.map(item=><button key={item.id} className={project.frameId===item.id?'active':''} onClick={()=>applyFrameChoice(item.id)}><span className="frame-emoji">{item.icon}</span><strong>{item.title}</strong><small>{item.description}</small></button>)}</div>
            <button className="outline-button" onClick={()=>setShowSlots(v=>!v)}><Eye size={15}/> {showSlots?'Ocultar guias de slots':'Mostrar guias de slots'}</button>
            {project.slots&&project.slots.length>0&&<section className="frame-slots"><h4>Substituir peças da moldura</h4>{project.slots.map(slot=><button key={slot.id} onClick={()=>chooseSlot(slot)}><span>{slot.role==='face'?'📷':slot.role==='title'?'✏️':slot.role==='logo'?'🟡':'🖼️'} {slot.label}</span><strong>{slot.role==='title'?'Editar':'Trocar'}</strong></button>)}<p>Também é possível arrastar um arquivo de imagem do computador sobre o slot no canvas. Soltar fora dos slots troca o fundo.</p></section>}
            <div className="sidebar-tip"><Sparkles size={16}/> Os retângulos pontilhados são guias de edição: não aparecem no PNG exportado.</div>
          </>}
          {tab==='brand'&&<><h3>Minha Marca</h3><p>O logo é compartilhado por todos os templates e fica salvo neste navegador.</p><div className="brand-panel"><img src={publicAssetUrl(brandSrc)} alt="Marca ativa"/><strong>Identidade do Canal</strong><button onClick={()=>logoInputRef.current?.click()}><Upload size={16}/> Carregar novo logo</button><button className="small-reset" onClick={()=>{setBrandSrc(DEFAULT_LOGO);localStorage.removeItem('z2-logo');setProject(prev=>({...prev,layers:prev.layers.map(l=>pic(l)&&l.role==='logo'?{...l,src:DEFAULT_LOGO}:l)}));}}>Restaurar logo original</button></div><h4>Paleta extraída automaticamente</h4><div className="brand-swatches">{palette.map(c=><button key={c} style={{background:c}} title={`Aplicar ${c} ao texto`} onClick={()=>{if(txt(current))updateLayer(current.id,{color:c});else setNotice('Selecione um texto no canvas para aplicar a cor.');}}/>)}</div></>}
          {tab==='elements'&&<>
            <div className="asset-library-heading"><div><h3>Biblioteca de peças</h3><p>Peças prontas e personalizadas para arrastar, redimensionar e reutilizar.</p></div>
              <button className="asset-import-button" disabled={customPiecesBusy} onClick={()=>customPieceInputRef.current?.click()}><ImagePlus size={16}/>{customPiecesBusy?'Importando…':'Adicionar peça'}</button>
            </div>
            <small className="asset-import-hint">Importe SVG, PNG, JPG ou WebP (até 12 MB cada). A arte é armazenada localmente e pode ser usada em outros projetos.</small>
            <div className="asset-grid" aria-label="Peças do estúdio">
              {nativePieces.map(piece => <button key={piece.id} title={`Inserir ${piece.name}`} onClick={()=>addPicturePiece(piece.name,piece.src,piece.width,piece.height)}>
                <img src={publicAssetUrl(piece.src)} alt={piece.name} draggable={false}/><span>{piece.name}</span>
              </button>)}
              <button onClick={addArrow}><ArrowUpRight size={31}/><span>Seta editável</span></button>
              <button onClick={addCircle}><Circle size={31}/><span>Círculo editável</span></button>
              <button onClick={addText}><Type size={31}/><span>Texto 3D</span></button>
              <button onClick={()=>{photoTargetRef.current='__new__';faceInputRef.current?.click();}}><ImagePlus size={31}/><span>Nova fotografia</span></button>
            </div>
            <div className="asset-custom-heading"><h4>Minhas peças ({customPieces.length})</h4><button disabled={customPiecesBusy} onClick={()=>customPieceInputRef.current?.click()}><Plus size={14}/> Adicionar</button></div>
            {customPiecesLoading?<p className="asset-muted">Carregando biblioteca…</p>:
              customPieces.length===0?<p className="asset-muted">Você ainda não importou peças. Use “Adicionar peça” para incluir suas próprias artes.</p>:
              <div className="asset-grid asset-custom-grid" aria-label="Peças importadas pelo usuário">
                {customPieces.map(piece=><div key={piece.id} className="asset-custom-card">
                  <button className="asset-custom-insert" title={`Inserir ${piece.name}`} onClick={()=>addPicturePiece(piece.name,piece.src,piece.width,piece.height)}>
                    <img src={publicAssetUrl(piece.src)} alt={piece.name} draggable={false}/><span>{piece.name}</span>
                  </button>
                  <button className="asset-custom-remove" title={`Remover ${piece.name} da biblioteca`} aria-label={`Remover ${piece.name}`} onClick={()=>void removeCustomPieceFromLibrary(piece)}><Trash2 size={14}/></button>
                </div>)}
              </div>}
            {customPiecesError&&<p className="asset-error" role="alert">{customPiecesError}</p>}
          </>}
          {tab==='director'&&<><h3>Diretor de Arte</h3><p>Assistente heurístico: posicionamento, contraste e áreas de sobreposição. Nenhuma LLM é utilizada.</p><div className="review-lines">{composition.map((m,i)=><div key={i} className={m.kind}>{m.kind==='ok'?<Check size={16}/>:<ShieldCheck size={16}/>} {m.text}</div>)}</div><button className="outline-button" onClick={()=>setGuides(true)}>Exibir zonas seguras</button></>}
        </div>
      </aside>
      <main className="studio-workspace">
        <div className="dotted-stage" ref={layoutRef} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();void addNewPhoto(e.dataTransfer.files[0]);}}>
          <div className="stage-scroll-content">
          <div className={`scene-holder ${draggingFile?'dragging-image':''}`} style={{width:(project.width+PASTEBOARD*2)*scale,height:(project.height+PASTEBOARD*2)*scale}}
            onDragEnter={e=>{if(e.dataTransfer.types.includes('Files')){e.preventDefault();dropOverRef.current++;setDraggingFile(true);}}}
            onDragLeave={e=>{e.preventDefault();dropOverRef.current=Math.max(0,dropOverRef.current-1);if(dropOverRef.current===0)setDraggingFile(false);}}
            onDragOver={e=>{if(e.dataTransfer.types.includes('Files'))e.preventDefault();}}
            onDrop={e=>{e.preventDefault();e.stopPropagation();dropOverRef.current=0;setDraggingFile(false);const file=e.dataTransfer.files[0];if(!file)return;
              const bounds=e.currentTarget.getBoundingClientRect();acceptDroppedFile(file,(e.clientX-bounds.left)/scale-PASTEBOARD,(e.clientY-bounds.top)/scale-PASTEBOARD);}}
          >
            <ThumbnailCanvas project={project} scale={scale} showSlots={showSlots} selectedIds={selectedIds} stageRef={stageRef} select={selectLayer} updateMany={updateLayers}/>
            <div ref={zoomPreviewRef} className="zoom-outline-preview" hidden style={{left:PASTEBOARD*scale,top:PASTEBOARD*scale}} aria-hidden="true"/>
            <div className="artboard-overlay" style={{left:PASTEBOARD*scale,top:PASTEBOARD*scale,width:project.width*scale,height:project.height*scale}}>
              {draggingFile&&<div className="file-drop-hint">Solte na moldura para substituir ou no restante do canvas para adicionar uma foto</div>}
              {backgroundDistorted&&<div className="distortion-overlay background-warning"><AlertTriangle size={13}/> Fundo deformado · {Math.round(backgroundRatioError*100)}%</div>}
              {isStretched&&pic(current)&&<div className="distortion-overlay" style={{left:Math.max(3,current.x*scale),top:Math.max(3,current.y*scale-30)}}><AlertTriangle size={13}/> Imagem deformada · {aspectPercent}%</div>}
              {guides&&<div className={`safe-guide ${format==='9:16'?'portrait':''}`}><div className="guide-border"/><div className="timer-zone">TEMPO / INTERFACE</div><div className="guide-note">Área aproximada · confirme na plataforma</div></div>}
              <button type="button" className="artboard-zoom-grip"
                title="Arraste para redimensionar a thumbnail na tela. Dê dois cliques para ajustar à janela. A exportação não muda."
                aria-label="Arrastar para aumentar ou diminuir visualização da thumbnail"
                onPointerDown={startCanvasResize} onPointerMove={moveCanvasResize}
                onPointerUp={stopCanvasResize} onPointerCancel={stopCanvasResize}
                onDoubleClick={e=>{e.preventDefault();e.stopPropagation();setManualZoom(null);}}
                onClick={e=>e.stopPropagation()}>
                <Maximize2 size={15}/>
              </button>
            </div>
          </div>
          </div>
        </div>
        <div className="bottom-actions">
          <span><span className="online-dot"/> {activeCustomId?'Template personalizado':selectedMeta?.name} · {project.width} × {project.height}px · visualização {Math.round(scale*100)}% (arraste o canto da capa)</span>
          <div><button onClick={()=>{photoTargetRef.current='__new__';faceInputRef.current?.click();}} disabled={busy}><ImagePlus size={15}/> Adicionar foto</button><button onClick={()=>{photoTargetRef.current=null;faceInputRef.current?.click();}} disabled={busy}><RotateCcw size={15}/> Trocar foto</button><button className="cut-btn" onClick={()=>void removeBackground()} disabled={busy||!(pic(current)&&current.originalSrc)&&!faceFile}><WandSparkles size={15}/> {busy?`Recortando ${progress||'…'}%`:'Recortar fundo local'}</button></div>
        </div>
        <div className="status-note"><LockKeyhole size={13}/> {notice}</div>
      </main>
      <aside className="studio-right">
        <span className="property-eyebrow">{selectedIds.length>1?'MÚLTIPLA SELEÇÃO':'PEÇA SELECIONADA'}</span><h2>{selectedIds.length>1?`${selectedIds.length} peças selecionadas`:current?.name||'Selecione uma peça'}</h2>
        <div className="layers-header"><strong>Camadas</strong><span>{project.layers.length}</span></div>
        <div className="studio-layers">{[...project.layers].reverse().map(l=><button className={selectedIds.includes(l.id)?'selected':''} key={l.id} onClick={e=>selectLayer(l.id,e.shiftKey||e.ctrlKey||e.metaKey)}>{l.type==='text'?<Type size={15}/>:l.type==='picture'?<ImagePlus size={15}/>:l.type==='arrow'?<ArrowUpRight size={15}/>:<Circle size={15}/>}<span>{l.name}</span></button>)}</div>
        <section className="props-box multi-selection-tools">
          <h3>Selecionar e duplicar peças</h3>
          <p>Shift/Ctrl + clique adiciona peças. Arraste no espaço vazio para selecionar por área.</p>
          <div className="layer-action-grid">
            <button onClick={()=>setSelectedIds(project.layers.filter(l=>!l.locked).map(l=>l.id))}><ListChecks size={16}/> Selecionar tudo</button>
            <button onClick={()=>setSelectedIds([])}><MousePointer2 size={16}/> Desmarcar</button>
            <button disabled={!selectedIds.length} onClick={centerSelection} title="Recuperar peças que ficaram fora da área visível"><Maximize2 size={16}/> Centralizar seleção</button>
            <button disabled={!selectedIds.length} onClick={duplicateSelected}><Copy size={16}/> Duplicar · Ctrl+D</button>
            <button disabled={!selectedIds.length} onClick={deleteSelected}><Trash2 size={16}/> Excluir selecionadas</button>
          </div>
          {selectedIds.length>1&&<small>Arraste uma peça da seleção para mover o conjunto. Use as alças amarelas para redimensionar em grupo.</small>}
        </section>
        {current&&selectedIds.length===1&&<>
          <section className="props-box layer-order">
            <h3>Organização de camadas</h3>
            <div className="layer-action-grid">
              <button title="Trazer para frente de todas" onClick={()=>sendToEdge(current.id,true)}><ChevronsUp size={16}/> Trazer à frente</button>
              <button title="Avançar uma camada" onClick={()=>reorder(current.id,1)}><ArrowUp size={16}/> Avançar uma</button>
              <button title="Recuar uma camada" onClick={()=>reorder(current.id,-1)}><ArrowDown size={16}/> Recuar uma</button>
              <button title="Enviar para trás de todas" onClick={()=>sendToEdge(current.id,false)}><ChevronsDown size={16}/> Enviar para trás</button>
            </div>
            {current.type!=='text'&&<><h3>Espelhar objeto</h3><div className="layer-action-grid">
              <button className={current.flipX?'selected':''} onClick={()=>updateLayer(current.id,{flipX:!current.flipX})}><FlipHorizontal2 size={16}/> Horizontal</button>
              <button className={current.flipY?'selected':''} onClick={()=>updateLayer(current.id,{flipY:!current.flipY})}><FlipVertical2 size={16}/> Vertical</button>
            </div></>}
            <button className="delete-layer" onClick={()=>removeLayer(current.id)}><Trash2 size={15}/> Excluir peça selecionada</button>
          </section>
          {txt(current)&&<section className="props-box"><h3>Texto e efeitos</h3><label>Conteúdo</label><textarea value={current.text} rows={3} onChange={e=>updateLayer(current.id,{text:e.target.value})}/><label>Fonte</label><select value={current.fontFamily} onChange={e=>updateLayer(current.id,{fontFamily:e.target.value})}><option value="Road Rage">Road Rage · grunge</option><option value="Permanent Marker">Permanent Marker · pincel</option><option value="Knewave">Knewave · pintura</option><option value="Bangers">Bangers · impacto</option><option value="Impact, Arial Black, sans-serif">Impact · clássico</option></select><label>Tamanho <b>{current.fontSize}px</b></label><input type="range" min="20" max="160" value={current.fontSize} onChange={e=>updateLayer(current.id,{fontSize:+e.target.value})}/><label>Cor</label><input type="color" value={current.color} onChange={e=>updateLayer(current.id,{color:e.target.value})}/><label>Borda <b>{current.strokeWidth}px</b></label><input type="range" min="0" max="25" value={current.strokeWidth} onChange={e=>updateLayer(current.id,{strokeWidth:+e.target.value})}/></section>}
          {pic(current)&&<section className="props-box"><h3>{current.role==='face'?'Recorte inteligente':current.role==='logo'?'Imagem do canal':'Peça gráfica'}</h3><label>Como encaixar a imagem</label><select value={current.fit??'contain'} onChange={e=>updateLayer(current.id,{fit:e.target.value as 'contain'|'cover'|'stretch'})}><option value="contain">Proporcional · mostrar tudo</option><option value="cover">Proporcional · preencher (recortar bordas)</option><option value="stretch">Esticar · pode deformar</option></select>
          <button className="crop-open" onClick={()=>setCroppingId(current.id)}><Crop size={16}/> Recortar imagem / reenquadrar</button>
          <button className="outline-button" onClick={()=>void fitSelectedToContent()}><Maximize2 size={15}/> Ajustar quadro ao conteúdo visível</button>
          {current.crop&&<p>Recorte ativo: {Math.round(current.crop.width*100)}% × {Math.round(current.crop.height*100)}% da imagem. Você pode editá-lo quando quiser.</p>}
          {hasNativeSize&&<div className={`aspect-status ${isStretched?'bad':'good'}`}><strong>{isStretched?<><AlertTriangle size={15}/> Deformação detectada: {aspectPercent}%</>:<><Check size={15}/> Proporção preservada</>}</strong><small>Imagem original: {imageSize.width} × {imageSize.height}px · Quadro: {Math.round(current.width)} × {Math.round(current.height)}px</small>{aspectError>.03&&current.fit!=='stretch'&&<small>O quadro tem outra proporção ({aspectPercent}%). O modo escolhido preserva a imagem por encaixe ou recorte.</small>}</div>}
          {hasNativeSize&&<button className="outline-button" onClick={()=>updateLayer(current.id,{height:Math.round(current.width/originalRatio),fit:'contain'})}>Restaurar proporção original do quadro</button>}
          <button className="yellow-wide" onClick={()=>{if(current.role==='logo')logoInputRef.current?.click();else {photoTargetRef.current=current.id;faceInputRef.current?.click();}}}><Upload size={15}/> Trocar arquivo</button>{current.role==='face'&&<><label>Qualidade da segmentação</label><select value={cutoutQuality} onChange={e=>setCutoutQuality(e.target.value as CutoutQuality)}><option value="isnet_quint8">Leve · CPU/WASM (~40 MB)</option><option value="isnet_fp16">Detalhes finos · CPU/WASM (~80 MB)</option></select><p>{current.isCutout?'Fundo transparente + contorno aplicado':'Envie uma foto e remova o fundo com WASM local.'}</p><button className="outline-button" disabled={busy||!(current.originalSrc||photosRef.current.has(current.id))} onClick={()=>void removeBackground()}><WandSparkles size={15}/> Recorte + contorno</button>{current.isCutout&&<><button className="mask-edit-button" onClick={()=>void openMaskEditor()}><WandSparkles size={15}/> Ajustar máscara / pincel manual</button><label>Contorno <b>{outlineDraft}px</b></label><input type="range" min="0" max="28" value={outlineDraft}
              onChange={e=>{const value=Number(e.target.value);outlineDraftRef.current=value;setOutlineDraft(value);}}
              onPointerUp={()=>void changeOutline(outlineDraftRef.current,current.outlineColor??'#ffffff')}
              onKeyUp={e=>{if(['ArrowLeft','ArrowRight','Home','End','PageUp','PageDown'].includes(e.key))void changeOutline(outlineDraftRef.current,current.outlineColor??'#ffffff');}}
              onBlur={()=>{if(outlineDraftRef.current!==(current.outlineWidth??12))void changeOutline(outlineDraftRef.current,current.outlineColor??'#ffffff');}}
            /><small>O contorno é recalculado quando você solta o seletor, evitando travamentos.</small><label>Cor do contorno</label><input type="color" value={current.outlineColor??'#ffffff'} onChange={e=>void changeOutline(current.outlineWidth??12,e.target.value)}/></>}</>}</section>}
          {(current.type==='arrow'||current.type==='circle')&&<section className="props-box"><h3>Elemento gráfico</h3><label>Cor</label><input type="color" value={current.color} onChange={e=>updateLayer(current.id,{color:e.target.value})}/></section>}
          {currentNativePiece&&<section className="props-box native-piece-editor">
            <h3>Peça original da biblioteca</h3>
            <p>Arte vetorial local. A miniatura e o canvas usam o mesmo arquivo incorporado.</p>
            <button className="outline-button" onClick={restoreNativePiece}><RotateCcw size={15}/> Restaurar arte e proporção originais</button>
          </section>}
          <section className="props-box size-editor"><h3>Tamanho da peça</h3>
            <div className="size-buttons"><button title="Diminuir a peça em 10%" onClick={()=>bumpSize(.9)}><Minus size={17}/> −10%</button><button title="Aumentar a peça em 10%" onClick={()=>bumpSize(1.1)}><Plus size={17}/> +10%</button></div>
            <button className="proportion-button" onClick={()=>updateLayer(current.id,{lockAspect:!(current.lockAspect??true)})}>
              {(current.lockAspect??true)?<Link2 size={15}/>:<Unlink2 size={15}/>}
              {(current.lockAspect??true)?'Proporção travada':'Proporção livre'}
            </button>
            <div className="size-inputs"><SizeNumber key={`${current.id}-width`} label="Largura (px)" value={layerDimensions(current).width} onCommit={n=>changeSize('width',n)}/>
              <SizeNumber key={`${current.id}-height`} label={current.type==='text'?'Tamanho da fonte (px)':'Altura (px)'} value={layerDimensions(current).height} onCommit={n=>changeSize('height',n)}/></div>
            {pic(current)&&<small>Modo {current.fit??'contain'}: a imagem só deforma com “Esticar” e proporções diferentes.</small>}
          </section>
          <section className="props-box"><h3>Geometria</h3><label>Posição horizontal <b>{Math.round(current.x)}px</b></label><input type="range" min="-50" max={project.width} value={current.x} onChange={e=>updateLayer(current.id,{x:+e.target.value})}/><label>Posição vertical <b>{Math.round(current.y)}px</b></label><input type="range" min="-50" max={project.height} value={current.y} onChange={e=>updateLayer(current.id,{y:+e.target.value})}/><label>Rotação <b>{current.rotation??0}°</b></label><input type="range" min="-45" max="45" value={current.rotation??0} onChange={e=>updateLayer(current.id,{rotation:+e.target.value})}/></section>
        </>}
        <section className="props-box"><h3>Nome da capa para exportar</h3><input value={filename} onChange={e=>setFilename(e.target.value)} placeholder="Nome da imagem"/></section>
        <section className="props-box background-editor"><h3>Fundo do template</h3>
          {backgroundDistorted&&<div className="aspect-status bad"><strong><AlertTriangle size={15}/> Fundo deformado em {Math.round(backgroundRatioError*100)}%</strong><small>Use “Mostrar tudo” ou “Preencher”.</small></div>}
          <label>Modo de fundo</label><select value={project.background.mode??'image'} onChange={e=>updateBackdrop({mode:e.target.value as 'image'|'color'|'gradient'})}>
            <option value="image">Imagem (template ou upload)</option><option value="color">Cor sólida</option><option value="gradient">Gradiente</option>
          </select>
          <div className="size-buttons"><button onClick={()=>backdropInputRef.current?.click()}><ImagePlus size={15}/> Trocar imagem</button><button onClick={restoreBackdrop}><RotateCcw size={15}/> Restaurar</button></div>
          {project.background.mode==='gradient'?<div className="color-pair"><label>Cor inicial<input type="color" value={project.background.gradientFrom??'#0b0b18'} onChange={e=>updateBackdrop({gradientFrom:e.target.value})}/></label><label>Cor final<input type="color" value={project.background.gradientTo??'#6b3907'} onChange={e=>updateBackdrop({gradientTo:e.target.value})}/></label></div>
          :<><label>Cor de fundo<input type="color" value={project.background.color} onChange={e=>updateBackdrop({color:e.target.value})}/></label></>}
          {(project.background.mode??'image')==='image'&&<>
            <label>Encaixe do fundo</label><select value={project.background.fit??'cover'} onChange={e=>updateBackdrop({fit:e.target.value as 'cover'|'contain'|'stretch'})}><option value="cover">Preencher sem deformar (recortar)</option><option value="contain">Mostrar tudo sem deformar</option><option value="stretch">Esticar (pode deformar)</option></select>
            <label>Enquadramento horizontal <b>{project.background.focusX??50}%</b></label><input type="range" min="0" max="100" value={project.background.focusX??50} onChange={e=>updateBackdrop({focusX:+e.target.value})}/>
            <label>Enquadramento vertical <b>{project.background.focusY??50}%</b></label><input type="range" min="0" max="100" value={project.background.focusY??50} onChange={e=>updateBackdrop({focusY:+e.target.value})}/>
            <label>Desfoque <b>{project.background.blur??0}px</b></label><input type="range" min="0" max="16" value={project.background.blur??0} onChange={e=>updateBackdrop({blur:+e.target.value})}/>
          </>}
          <label>Sobreposição de cor<input type="color" value={project.background.overlayColor??'#ffcc00'} onChange={e=>updateBackdrop({overlayColor:e.target.value})}/></label>
          <label>Intensidade da sobreposição <b>{Math.round((project.background.overlayOpacity??0)*100)}%</b></label><input type="range" min="0" max="0.9" step="0.05" value={project.background.overlayOpacity??0} onChange={e=>updateBackdrop({overlayOpacity:+e.target.value})}/>
          <label>Escurecimento <b>{Math.round((project.background.darkness??0)*100)}%</b></label><input type="range" min="0" max="0.8" step="0.05" value={project.background.darkness??0} onChange={e=>updateBackdrop({darkness:+e.target.value})}/>
        </section>
        <div className="tiny-security"><ShieldCheck size={15}/> Diretor IA: heurísticas locais, sem APIs pagas.</div>
      </aside>
    </div>
    {croppingId&&pic(project.layers.find(l=>l.id===croppingId))&&<CropEditor src={(project.layers.find(l=>l.id===croppingId) as PictureLayer).src} initial={(project.layers.find(l=>l.id===croppingId) as PictureLayer).crop} fileName={(project.layers.find(l=>l.id===croppingId) as PictureLayer).fileName??(project.layers.find(l=>l.id===croppingId) as PictureLayer).name} onApply={applyCrop} onClose={()=>setCroppingId(null)}/>}
    {maskSession&&<CutoutEditor original={maskSession.original} cutout={maskSession.cutout} onClose={()=>setMaskSession(null)} onApply={applyEditedMask}/>}
    <input ref={customPieceInputRef} hidden type="file" accept=".svg,.png,.jpg,.jpeg,.webp,image/svg+xml,image/png,image/jpeg,image/webp" multiple onChange={e=>{void addCustomPieces(e.target.files);e.target.value='';}}/>
    <input ref={importInputRef} hidden type="file" accept="application/json,application/zip,.json,.zip" onChange={e=>{void importBackup(e.target.files?.[0]);e.target.value='';}}/>
    <input ref={faceInputRef} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{uploadFace(e.target.files?.[0],photoTargetRef.current);photoTargetRef.current=null;e.target.value='';}}/>
    <input ref={logoInputRef} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{void uploadLogo(e.target.files?.[0]);e.target.value='';}}/>
    <input ref={backdropInputRef} hidden type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={e=>{uploadBackdrop(e.target.files?.[0]);e.target.value='';}}/>
  </div>;
}
