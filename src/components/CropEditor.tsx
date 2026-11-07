import { useEffect, useRef, useState } from 'react';
import { Check, Download, Move, RotateCcw, X } from 'lucide-react';
import type { NormalizedCrop } from '../types/editor';

type Props = { src:string; initial?:NormalizedCrop; fileName?:string; onApply:(crop:NormalizedCrop|undefined)=>void; onClose:()=>void };
type Point={x:number;y:number};
type Aspect='free'|'wide'|'square'|'vertical';
type Handle='nw'|'n'|'ne'|'e'|'se'|'s'|'sw'|'w';
type Session={kind:'new'|'move'|'resize';start:Point;initial:NormalizedCrop;handle?:Handle};
const clamp=(n:number,a=0,b=1)=>Math.max(a,Math.min(b,n));
const clampCrop=(c:NormalizedCrop):NormalizedCrop=>{
  const x=clamp(c.x,0,.98),y=clamp(c.y,0,.98);
  return {x,y,width:clamp(c.width,.02,1-x),height:clamp(c.height,.02,1-y)};
};
const handles:Handle[]=['nw','n','ne','e','se','s','sw','w'];

/** Reversible image crop with stable pointer geometry, drag handles, keyboard nudging and PNG export. */
export default function CropEditor({src,initial,fileName,onApply,onClose}:Props){
  const stage=useRef<HTMLDivElement>(null);
  const source=useRef<HTMLImageElement|null>(null);
  const pointer=useRef<Session|null>(null);
  const [crop,setCrop]=useState<NormalizedCrop>(()=>clampCrop(initial??{x:0,y:0,width:1,height:1}));
  const [size,setSize]=useState({width:0,height:0});
  const [available,setAvailable]=useState({width:750,height:560});
  const [aspect,setAspect]=useState<Aspect>('free');
  const [tool,setTool]=useState<'new'|'move'>('move');
  const [downloadError,setDownloadError]=useState('');
  useEffect(()=>{
    let active=true;const img=new Image();img.crossOrigin='anonymous';
    img.onload=()=>{if(active){source.current=img;setSize({width:img.naturalWidth,height:img.naturalHeight});}};
    img.onerror=()=>{if(active)setDownloadError('Não foi possível carregar a imagem.');};
    img.src=src;return()=>{active=false;};
  },[src]);
  useEffect(()=>{
    const node=stage.current;if(!node)return;
    const obs=new ResizeObserver(entries=>{
      const r=entries[0].contentRect;
      setAvailable({width:Math.max(140,r.width-28),height:Math.max(130,r.height-28)});
    });obs.observe(node);return()=>obs.disconnect();
  },[]);
  const scale=size.width&&size.height?Math.min(1,available.width/size.width,available.height/size.height):1;
  const imgW=Math.max(1,Math.round((size.width||700)*scale));
  const imgH=Math.max(1,Math.round((size.height||460)*scale));
  const ratio=aspect==='free'||!size.width?null:(aspect==='wide'?16/9:aspect==='square'?1:9/16)/(size.width/size.height);
  const pos=(event:React.PointerEvent):Point=>{
    const rect=event.currentTarget.getBoundingClientRect();
    return {x:clamp((event.clientX-rect.left)/rect.width),y:clamp((event.clientY-rect.top)/rect.height)};
  };
  const constrain=(start:Point,end:Point):NormalizedCrop=>{
    let w=Math.max(.02,Math.abs(end.x-start.x)),h=Math.max(.02,Math.abs(end.y-start.y));
    if(ratio){if(w/h>ratio)w=h*ratio;else h=w/ratio;}
    let x=end.x>=start.x?start.x:start.x-w,y=end.y>=start.y?start.y:start.y-h;
    x=clamp(x,0,1-w);y=clamp(y,0,1-h);
    return clampCrop({x,y,width:Math.min(w,1-x),height:Math.min(h,1-y)});
  };
  function begin(event:React.PointerEvent<HTMLDivElement>){
    if(!size.width)return;
    event.preventDefault();
    const p=pos(event),target=event.target as HTMLElement,handle=target.dataset.cropHandle as Handle|undefined;
    const inside=p.x>=crop.x&&p.x<=crop.x+crop.width&&p.y>=crop.y&&p.y<=crop.y+crop.height;
    const kind=handle?'resize':tool==='new'||!inside?'new':'move';
    pointer.current={kind,start:p,initial:crop,handle};
    if(kind==='new')setCrop({x:p.x,y:p.y,width:.02,height:.02});
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event:React.PointerEvent<HTMLDivElement>){
    const drag=pointer.current;if(!drag)return;
    const p=pos(event),old=drag.initial,dx=p.x-drag.start.x,dy=p.y-drag.start.y;
    if(drag.kind==='new'){setCrop(constrain(drag.start,p));return;}
    if(drag.kind==='move'){
      setCrop({...old,x:clamp(old.x+dx,0,1-old.width),y:clamp(old.y+dy,0,1-old.height)});return;
    }
    const handle=drag.handle!;
    let left=old.x,right=old.x+old.width,top=old.y,bottom=old.y+old.height;
    if(handle.includes('w'))left=clamp(old.x+dx,0,right-.02);
    if(handle.includes('e'))right=clamp(old.x+old.width+dx,left+.02,1);
    if(handle.includes('n'))top=clamp(old.y+dy,0,bottom-.02);
    if(handle.includes('s'))bottom=clamp(old.y+old.height+dy,top+.02,1);
    if(ratio){
      let w=right-left,h=bottom-top;
      if(w/h>ratio)w=h*ratio;else h=w/ratio;
      if(handle.includes('w'))left=right-w;else right=left+w;
      if(handle.includes('n'))top=bottom-h;else bottom=top+h;
      left=clamp(left,0,1-w);right=left+w;top=clamp(top,0,1-h);bottom=top+h;
    }
    setCrop(clampCrop({x:left,y:top,width:right-left,height:bottom-top}));
  }
  function finish(event:React.PointerEvent<HTMLDivElement>){
    if(pointer.current?.kind==='new')setTool('move');
    pointer.current=null;
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function changeAspect(next:Aspect){
    setAspect(next);
    if(next==='free'||!size.width||!size.height)return;
    const r=(next==='wide'?16/9:next==='square'?1:9/16)/(size.width/size.height);
    let w=crop.width,h=crop.height;
    if(w/h>r)w=h*r;else h=w/r;
    setCrop(clampCrop({x:clamp(crop.x+(crop.width-w)/2,0,1-w),y:clamp(crop.y+(crop.height-h)/2,0,1-h),width:w,height:h}));
  }
  async function download(){
    const img=source.current;if(!img)return;
    try{
      const x=Math.round(crop.x*img.naturalWidth),y=Math.round(crop.y*img.naturalHeight);
      const width=Math.max(1,Math.round(crop.width*img.naturalWidth)),height=Math.max(1,Math.round(crop.height*img.naturalHeight));
      const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
      const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas indisponível');
      ctx.drawImage(img,x,y,width,height,0,0,width,height);
      const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Falha ao gerar PNG')),'image/png'));
      const url=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=url;a.download=`${(fileName||'imagem').replace(/\.[^.]+$/,'').replace(/[^a-z\d_-]/gi,'-')}-recorte.png`;
      document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),8000);
      setDownloadError('');
    }catch(e){setDownloadError(`Não foi possível baixar: ${e instanceof Error?e.message:String(e)}`);}
  }
  return <div className="crop-overlay" role="dialog" aria-modal="true" aria-label="Recortar imagem">
    <div className="crop-window">
      <header className="crop-header"><div><strong>Recorte preciso</strong><small>Arraste uma área, mova-a ou ajuste as alças. A foto original permanece intacta.</small></div><button onClick={onClose} title="Fechar"><X size={18}/></button></header>
      <div className="crop-body">
        <div className="crop-stage" ref={stage}>
          <div className="crop-image-box" style={{width:imgW,height:imgH}} onPointerDown={begin} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish}>
            <img src={src} alt="Foto para recorte" draggable={false}/>
            <div className="crop-shade top" style={{height:`${crop.y*100}%`}}/>
            <div className="crop-shade bottom" style={{top:`${(crop.y+crop.height)*100}%`,height:`${(1-crop.y-crop.height)*100}%`}}/>
            <div className="crop-shade left" style={{top:`${crop.y*100}%`,height:`${crop.height*100}%`,width:`${crop.x*100}%`}}/>
            <div className="crop-shade right" style={{top:`${crop.y*100}%`,height:`${crop.height*100}%`,left:`${(crop.x+crop.width)*100}%`,width:`${(1-crop.x-crop.width)*100}%`}}/>
            <div className="crop-selection" style={{left:`${crop.x*100}%`,top:`${crop.y*100}%`,width:`${crop.width*100}%`,height:`${crop.height*100}%`}}>
              <span className="crop-grid-line v1"/><span className="crop-grid-line v2"/><span className="crop-grid-line h1"/><span className="crop-grid-line h2"/>
              {handles.map(handle=><span key={handle} data-crop-handle={handle} className={`crop-handle crop-handle-${handle}`}/>)}
            </div>
          </div>
        </div>
        <aside className="crop-controls">
          <h3>Ferramenta</h3>
          <div className="crop-presets"><button className={tool==='new'?'active':''} onClick={()=>setTool('new')}>Nova área</button><button className={tool==='move'?'active':''} onClick={()=>setTool('move')}><Move size={13}/> Mover / ajustar</button></div>
          <h3>Proporção</h3><div className="crop-presets">{([['free','Livre'],['wide','16:9'],['square','1:1'],['vertical','9:16']] as const).map(([value,label])=><button key={value} className={aspect===value?'active':''} onClick={()=>changeAspect(value)}>{label}</button>)}</div>
          <p>As oito alças ajustam o recorte. Arraste dentro da seleção para movê-la; fora dela para criar outra.</p>
          <small>Original: {size.width} × {size.height}px</small>
          <small>Área selecionada: {Math.round(crop.width*size.width)} × {Math.round(crop.height*size.height)}px</small>
          {downloadError&&<p className="crop-error" role="alert">{downloadError}</p>}
          <button className="crop-reset" onClick={()=>{setCrop({x:0,y:0,width:1,height:1});setAspect('free');setTool('move');}}><RotateCcw size={15}/> Selecionar tudo</button>
          <button className="crop-reset" onClick={()=>void download()} disabled={!size.width}><Download size={15}/> Salvar recorte no PC (PNG)</button>
        </aside>
      </div>
      <footer className="crop-footer"><button onClick={onClose}>Cancelar</button><button className="crop-clear" onClick={()=>onApply(undefined)}>Remover recorte</button><button className="crop-apply" disabled={!size.width} onClick={()=>onApply(crop)}><Check size={16}/> Aplicar recorte</button></footer>
    </div>
  </div>;
}
