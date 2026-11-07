import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Eraser, RotateCcw, Undo2, X, ZoomIn, ZoomOut } from 'lucide-react';

type Props = { original: Blob | null; cutout: Blob; onApply: (blob: Blob) => Promise<void>; onClose: () => void };
type Tool = 'remove'|'restore';
const clamp=(n:number,min=0,max=255)=>Math.max(min,Math.min(max,n));

/** Browser-only alpha matte editor: no photo is posted anywhere. */
export default function CutoutEditor({original,cutout,onApply,onClose}:Props){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const colorsRef=useRef<Uint8ClampedArray|null>(null);
  const alphaRef=useRef<Uint8ClampedArray|null>(null);
  const initialRef=useRef<Uint8ClampedArray|null>(null);
  const dimensionsRef=useRef({w:0,h:0});
  const historyRef=useRef<Uint8ClampedArray[]>([]);
  const paintingRef=useRef(false);
  const lastPointRef=useRef<{x:number;y:number}|null>(null);
  const scheduledRef=useRef<number|null>(null);
  const viewRef=useRef<'preview'|'mask'>('preview');
  const toolRef=useRef<Tool>('remove');
  const brushRef=useRef(22);
  const opacityRef=useRef(100);
  const [ready,setReady]=useState(false);
  const [view,setView]=useState<'preview'|'mask'>('preview');
  const [tool,setTool]=useState<Tool>('remove');
  const [brush,setBrush]=useState(22);
  const [opacity,setOpacity]=useState(100);
  const [zoom,setZoom]=useState(1);
  const [feather,setFeather]=useState(2);
  const [edge,setEdge]=useState(2);
  const [historyCount,setHistoryCount]=useState(0);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [size,setSize]=useState({w:0,h:0});
  viewRef.current=view; toolRef.current=tool;brushRef.current=brush;opacityRef.current=opacity;
  const render=useCallback(()=>{
    const alpha=alphaRef.current,colors=colorsRef.current,canvas=canvasRef.current;
    if(!alpha||!colors||!canvas)return;
    const {w,h}=dimensionsRef.current,ctx=canvas.getContext('2d',{willReadFrequently:true});
    if(!ctx)return;
    const frame=ctx.createImageData(w,h);
    if(viewRef.current==='mask'){
      for(let p=0;p<alpha.length;p++){const i=p*4;frame.data[i]=alpha[p];frame.data[i+1]=alpha[p];frame.data[i+2]=alpha[p];frame.data[i+3]=255;}
    } else {
      for(let p=0;p<alpha.length;p++){const i=p*4;frame.data[i]=colors[i];frame.data[i+1]=colors[i+1];frame.data[i+2]=colors[i+2];frame.data[i+3]=alpha[p];}
    }
    ctx.putImageData(frame,0,0);
  },[]);
  const scheduleRender=useCallback(()=>{
    if(scheduledRef.current!==null)return;
    scheduledRef.current=requestAnimationFrame(()=>{scheduledRef.current=null;render();});
  },[render]);
  useEffect(()=>{
    let cancelled=false;
    const setup=async()=>{
      try{
        const fg=await createImageBitmap(cutout);
        const source=original?await createImageBitmap(original):null;
        if(cancelled){fg.close();source?.close();return;}
        const sourceW=source?.width??fg.width,sourceH=source?.height??fg.height;
        const ratio=Math.min(1,1024/Math.max(sourceW,sourceH));
        const w=Math.max(1,Math.round(sourceW*ratio)),h=Math.max(1,Math.round(sourceH*ratio));
        const makeCanvas=()=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
        const c1=makeCanvas(),c2=makeCanvas();
        const a=c1.getContext('2d',{willReadFrequently:true}),b=c2.getContext('2d',{willReadFrequently:true});
        if(!a||!b)throw new Error('Canvas 2D indisponível.');
        a.drawImage(source??fg,0,0,w,h);b.drawImage(fg,0,0,w,h);
        const originalPixels=a.getImageData(0,0,w,h).data;
        const cutPixels=b.getImageData(0,0,w,h).data;
        const mask=new Uint8ClampedArray(w*h);
        for(let p=0;p<mask.length;p++)mask[p]=cutPixels[p*4+3];
        fg.close();source?.close();
        if(cancelled)return;
        dimensionsRef.current={w,h};colorsRef.current=originalPixels;alphaRef.current=mask;
        initialRef.current=new Uint8ClampedArray(mask);historyRef.current=[];
        const canvas=canvasRef.current;if(canvas){canvas.width=w;canvas.height=h;}
        setSize({w,h});setReady(true);render();
      }catch(e){if(!cancelled)setError(e instanceof Error?e.message:String(e));}
    };
    void setup();return()=>{cancelled=true;if(scheduledRef.current!==null)cancelAnimationFrame(scheduledRef.current);};
  },[original,cutout,render]);
  useEffect(()=>{scheduleRender();},[view,scheduleRender]);
  const snapshot=()=>{if(!alphaRef.current)return;historyRef.current.push(new Uint8ClampedArray(alphaRef.current));if(historyRef.current.length>10)historyRef.current.shift();setHistoryCount(historyRef.current.length);};
  const undo=()=>{const prev=historyRef.current.pop();if(!prev)return;alphaRef.current=prev;setHistoryCount(historyRef.current.length);scheduleRender();};
  const reset=()=>{if(!initialRef.current)return;snapshot();alphaRef.current=new Uint8ClampedArray(initialRef.current);scheduleRender();};
  const pos=(e:React.PointerEvent<HTMLCanvasElement>)=>{const bounds=e.currentTarget.getBoundingClientRect(),{w,h}=dimensionsRef.current;return{x:(e.clientX-bounds.left)*w/bounds.width,y:(e.clientY-bounds.top)*h/bounds.height};};
  const stamp=(x:number,y:number)=>{
    const mask=alphaRef.current;if(!mask)return;
    const {w,h}=dimensionsRef.current,r=brushRef.current;
    const xmin=Math.max(0,Math.floor(x-r)),xmax=Math.min(w-1,Math.ceil(x+r));
    const ymin=Math.max(0,Math.floor(y-r)),ymax=Math.min(h-1,Math.ceil(y+r));
    for(let yy=ymin;yy<=ymax;yy++)for(let xx=xmin;xx<=xmax;xx++){
      const dist=Math.hypot(xx-x,yy-y);if(dist>r)continue;
      const weight=(1-Math.pow(dist/r,2))*opacityRef.current/100;
      const i=yy*w+xx,goal=toolRef.current==='restore'?255:0;
      mask[i]=Math.round(mask[i]+(goal-mask[i])*weight);
    }
  };
  const stroke=(e:React.PointerEvent<HTMLCanvasElement>)=>{
    if(!paintingRef.current)return;
    const pt=pos(e),prev=lastPointRef.current??pt,steps=Math.max(1,Math.ceil(Math.hypot(pt.x-prev.x,pt.y-prev.y)/Math.max(2,brushRef.current/4)));
    for(let i=1;i<=steps;i++)stamp(prev.x+(pt.x-prev.x)*i/steps,prev.y+(pt.y-prev.y)*i/steps);
    lastPointRef.current=pt;scheduleRender();
  };
  const applyFilter=(kind:'feather'|'expand'|'shrink'|'halo')=>{
    const mask=alphaRef.current;if(!mask)return;snapshot();
    const {w,h}=dimensionsRef.current;
    if(kind==='halo'){
      for(let i=0;i<mask.length;i++)if(mask[i]>0&&mask[i]<240)mask[i]=clamp(Math.round((mask[i]-17)*255/238));
    }else{
      const radius=kind==='feather'?feather:edge;
      for(let pass=0;pass<radius;pass++){
        const before=new Uint8ClampedArray(mask);
        for(let y=0;y<h;y++)for(let x=0;x<w;x++){
          let total=0,count=0,extreme=kind==='shrink'?255:0;
          for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
            const yy=Math.min(h-1,Math.max(0,y+dy)),xx=Math.min(w-1,Math.max(0,x+dx)),value=before[yy*w+xx];
            total+=value;count++;extreme=kind==='shrink'?Math.min(extreme,value):Math.max(extreme,value);
          }
          mask[y*w+x]=kind==='feather'?Math.round(total/count):extreme;
        }
      }
    }
    scheduleRender();
  };
  const confirm=async()=>{
    const colors=colorsRef.current,mask=alphaRef.current;if(!colors||!mask)return;
    setSaving(true);setError('');
    try{
      const {w,h}=dimensionsRef.current,c=document.createElement('canvas');c.width=w;c.height=h;
      const ctx=c.getContext('2d');if(!ctx)throw new Error('Canvas indisponível.');
      const frame=ctx.createImageData(w,h);frame.data.set(colors);
      for(let p=0;p<mask.length;p++)frame.data[p*4+3]=mask[p];
      ctx.putImageData(frame,0,0);
      const blob=await new Promise<Blob>((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(new Error('Falha ao criar PNG.')),'image/png'));
      await onApply(blob);
    }catch(e){setError(e instanceof Error?e.message:String(e));setSaving(false);}
  };
  return <div className="mask-backdrop" role="dialog" aria-modal="true" aria-label="Refinar recorte de fundo">
    <div className="mask-dialog">
      <div className="mask-header"><div><strong>Refinar recorte</strong><small>Pincel + ajustes matemáticos locais · nada é enviado para servidores</small></div><button onClick={onClose} aria-label="Fechar" title="Fechar"><X size={19}/></button></div>
      <div className="mask-body"><aside className="mask-tools">
        <h3>Correção manual</h3><p>Use o pincel para restaurar partes do rosto/cabelo ou apagar restos de fundo.</p>
        <div className="mask-tool-switch"><button className={tool==='restore'?'active':''} onClick={()=>setTool('restore')}>+ Recuperar</button><button className={tool==='remove'?'active':''} onClick={()=>setTool('remove')}><Eraser size={13}/> Remover</button></div>
        <label>Tamanho do pincel <b>{brush}px</b></label><input type="range" min="3" max="95" value={brush} onChange={e=>setBrush(+e.target.value)}/>
        <label>Força <b>{opacity}%</b></label><input type="range" min="10" max="100" step="10" value={opacity} onChange={e=>setOpacity(+e.target.value)}/>
        <div className="mask-inline"><button disabled={!historyCount} onClick={undo}><Undo2 size={15}/> Desfazer</button><button onClick={reset}><RotateCcw size={15}/> Original</button></div>
        <h3>Acabamento</h3>
        <label>Suavidade <b>{feather}</b></label><input type="range" min="1" max="4" value={feather} onChange={e=>setFeather(+e.target.value)}/><button className="mask-button" onClick={()=>applyFilter('feather')}>Suavizar bordas</button>
        <label>Expandir / contrair <b>{edge}px</b></label><input type="range" min="1" max="5" value={edge} onChange={e=>setEdge(+e.target.value)}/><div className="mask-inline"><button onClick={()=>applyFilter('expand')}>+ Expandir</button><button onClick={()=>applyFilter('shrink')}>− Contrair</button></div>
        <button className="mask-button" onClick={()=>applyFilter('halo')}>Reduzir halo (leve)</button>
        <p>Os efeitos são cumulativos e podem ser desfeitos. O pincel trabalha sobre a máscara alfa, não sobre a foto original.</p>
      </aside>
      <section className="mask-preview"><div className="mask-preview-head"><strong>{ready?`${size.w} × ${size.h} px`:'Preparando imagem…'}</strong><div className="mask-inline"><button className={view==='preview'?'active':''} onClick={()=>setView('preview')}>Transparência</button><button className={view==='mask'?'active':''} onClick={()=>setView('mask')}>Ver máscara</button><button title="Diminuir zoom" onClick={()=>setZoom(z=>Math.max(.5,z-.25))}><ZoomOut size={15}/></button><button title="Aumentar zoom" onClick={()=>setZoom(z=>Math.min(3,z+.25))}><ZoomIn size={15}/></button></div></div>
        <div className="mask-canvas-scroll"><canvas ref={canvasRef} className={`mask-canvas ${view==='mask'?'mask-matte':''}`} style={{width:size.w?Math.round(Math.min(size.w,650)*zoom):0,height:size.w?Math.round(Math.min(size.w,650)*zoom*size.h/size.w):0}}
          onPointerDown={e=>{if(!ready)return;e.currentTarget.setPointerCapture(e.pointerId);snapshot();paintingRef.current=true;lastPointRef.current=null;stroke(e);}}
          onPointerMove={stroke} onPointerUp={()=>{paintingRef.current=false;lastPointRef.current=null;}} onPointerCancel={()=>{paintingRef.current=false;lastPointRef.current=null;}}/></div>
        <div className="mask-preview-bottom">{original?'Foto original disponível para recuperar detalhes.':'Sem a foto original: recuperar pixels transparentes pode deixar áreas sem cor.'} {error&&<b className="mask-error">{error}</b>}</div>
      </section></div>
      <footer className="mask-footer"><button onClick={onClose}>Cancelar</button><button className="mask-commit" disabled={!ready||saving} onClick={()=>void confirm()}><Check size={16}/> {saving?'Aplicando…':'Aplicar máscara e contorno branco'}</button></footer>
    </div>
  </div>;
}
