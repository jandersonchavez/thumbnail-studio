import { useEffect, useRef, useState } from 'react';
import { Arrow, Circle, Group, Image as KonvaImage, Layer, Rect, Stage, Text, Transformer } from 'react-konva';
import useImage from 'use-image';
import Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { SceneLayer, PictureLayer, Template } from '../types/editor';
import { PASTEBOARD } from '../lib/workspaceLayout';
import { publicAssetUrl } from '../lib/publicAssets';

const ARROW_W=250, ARROW_H=155;
const minimum=(n:number)=>Math.max(24,Math.round(n));
const additive=(e:KonvaEventObject<MouseEvent>)=>e.evt.shiftKey||e.evt.ctrlKey||e.evt.metaKey;
type Patch={id:string;patch:Partial<SceneLayer>};
type OnChoose=(id:string|null,additive?:boolean)=>void;

/** A crop is stored in source-relative coordinates and never changes the original photo. */
function Picture({item,onChoose,onMoveStart,onMove,onMoveFinish}: {item:PictureLayer;onChoose:OnChoose;onMoveStart:(id:string)=>void;onMove:(id:string,node:Konva.Node)=>void;onMoveFinish:(id:string,node:Konva.Node)=>void}){
  const [img,status]=useImage(publicAssetUrl(item.src),'anonymous');
  const sw=img?.naturalWidth??0,sh=img?.naturalHeight??0;
  const raw=item.crop;
  const srcX=raw?raw.x*sw:0,srcY=raw?raw.y*sh:0;
  const srcW=raw?raw.width*sw:sw,srcH=raw?raw.height*sh:sh;
  const sourceRatio=srcW/Math.max(1,srcH),slotRatio=item.width/Math.max(1,item.height);
  const fit=item.fit??'contain';
  let innerX=0,innerY=0,innerW=item.width,innerH=item.height;
  let crop=sw>0&&sh>0?{x:srcX,y:srcY,width:srcW,height:srcH}:undefined;
  if(sw>0&&sh>0&&fit==='contain'){
    if(sourceRatio>slotRatio){innerH=item.width/sourceRatio;innerY=(item.height-innerH)/2;}
    else{innerW=item.height*sourceRatio;innerX=(item.width-innerW)/2;}
  }
  if(sw>0&&sh>0&&fit==='cover'){
    if(sourceRatio>slotRatio){const w=srcH*slotRatio;crop={x:srcX+(srcW-w)/2,y:srcY,width:w,height:srcH};}
    else{const h=srcW/slotRatio;crop={x:srcX,y:srcY+(srcH-h)/2,width:srcW,height:h};}
  }
  return <Group id={item.id} x={item.x} y={item.y} rotation={item.rotation??0}
    draggable={!item.locked} onClick={e=>onChoose(item.id,additive(e))} onTap={()=>onChoose(item.id)}
    onDragStart={()=>onMoveStart(item.id)} onDragMove={e=>onMove(item.id,e.target)} onDragEnd={e=>onMoveFinish(item.id,e.target)}>
    <Rect width={item.width} height={item.height} fill="rgba(0,0,0,0.001)"/>
    <Group x={item.flipX?item.width:0} y={item.flipY?item.height:0}
      scaleX={item.flipX?-1:1} scaleY={item.flipY?-1:1} listening={false}>
      <KonvaImage image={img??undefined} x={innerX} y={innerY} width={innerW} height={innerH}
        crop={crop} opacity={item.opacity??1} listening={false}/>
    </Group>
    {status==='failed'&&<Group listening={false}>
      <Rect width={item.width} height={item.height} fill="#20171a" stroke="#f43f5e" dash={[10,5]} cornerRadius={8}/>
      <Text x={12} y={Math.max(8,item.height/2-14)} width={Math.max(50,item.width-24)}
        align="center" fill="#ffd5d5" fontSize={Math.min(19,Math.max(10,item.width/16))}
        text="Imagem não carregada"/>
    </Group>}
  </Group>;
}
function Backdrop({template}:{template:Template}){
  const {width,height,background}=template;
  const [img]=useImage(publicAssetUrl(background.src),'anonymous');
  const imgRef=useRef<Konva.Image>(null);
  useEffect(()=>{
    const node=imgRef.current;if(!node)return;
    node.clearCache();if(img&&(background.blur??0)>0)node.cache({pixelRatio:1});node.getLayer()?.batchDraw();
  },[img,background.blur,width,height]);
  const sw=img?.naturalWidth??0,sh=img?.naturalHeight??0;
  const fit=background.fit??'cover';let x=0,y=0,w=width,h=height;
  let crop:{x:number;y:number;width:number;height:number}|undefined;
  if(sw>0&&sh>0&&fit==='contain'){
    const ratio=Math.min(width/sw,height/sh);w=sw*ratio;h=sh*ratio;x=(width-w)/2;y=(height-h)/2;
  }
  if(sw>0&&sh>0&&fit==='cover'){
    const canvasRatio=width/height,sourceRatio=sw/sh;
    const px=Math.min(1,Math.max(0,(background.focusX??50)/100));
    const py=Math.min(1,Math.max(0,(background.focusY??50)/100));
    if(sourceRatio>canvasRatio){const cropW=sh*canvasRatio;crop={x:(sw-cropW)*px,y:0,width:cropW,height:sh};}
    else{const cropH=sw/canvasRatio;crop={x:0,y:(sh-cropH)*py,width:sw,height:cropH};}
  }
  return <>
    <Rect width={width} height={height} fill={background.color} listening={false}/>
    {background.mode==='gradient'&&<Rect width={width} height={height} listening={false}
      fillLinearGradientStartPoint={{x:0,y:0}} fillLinearGradientEndPoint={{x:width,y:height}}
      fillLinearGradientColorStops={[0,background.gradientFrom??'#0b0b18',1,background.gradientTo??'#6b3907']}/>}
    {(background.mode??'image')==='image'&&<KonvaImage ref={imgRef} image={img??undefined} x={x} y={y} width={w} height={h} crop={crop}
      listening={false} filters={(background.blur??0)>0?[Konva.Filters.Blur]:[]} blurRadius={background.blur??0}/>}
    {(background.overlayOpacity??0)>0&&<Rect width={width} height={height} fill={background.overlayColor??'#ffcc00'} opacity={background.overlayOpacity??0} listening={false}/>}
    {(background.darkness??0)>0&&<Rect width={width} height={height} fill="#000000" opacity={background.darkness} listening={false}/>}
  </>;
}

type Props={project:Template;selectedIds:string[];scale:number;showSlots?:boolean;stageRef:React.RefObject<Konva.Stage>;select:OnChoose;updateMany:(patches:Patch[])=>void};
export default function ThumbnailCanvas({project,selectedIds,scale,showSlots=false,stageRef,select,updateMany}:Props){
  const transformer=useRef<Konva.Transformer>(null);
  const dragSources=useRef<{id:string;at:Map<string,{x:number;y:number}>}|null>(null);
  const selectStart=useRef<{x:number;y:number}|null>(null);
  const [selectionBox,setSelectionBox]=useState<{x:number;y:number;width:number;height:number}|null>(null);
  const chosen=project.layers.find(l=>l.id===selectedIds[0]);
  useEffect(()=>{
    const nodes=selectedIds.filter(id=>!project.layers.find(l=>l.id===id)?.locked)
      .map(id=>stageRef.current?.findOne(`#${id}`)).filter((n):n is Konva.Node=>Boolean(n));
    transformer.current?.nodes(nodes);
    transformer.current?.getLayer()?.batchDraw();
  },[selectedIds,project.layers,stageRef]);

  function startMove(id:string){
    if(!selectedIds.includes(id)||selectedIds.length<2){dragSources.current=null;return;}
    const at=new Map<string,{x:number;y:number}>();
    for(const sid of selectedIds){const n=stageRef.current?.findOne(`#${sid}`);if(n)at.set(sid,{x:n.x(),y:n.y()});}
    dragSources.current={id,at};
  }
  function moveTogether(id:string,node:Konva.Node){
    const current=dragSources.current;if(!current||current.id!==id)return;
    const origin=current.at.get(id);if(!origin)return;
    const dx=node.x()-origin.x,dy=node.y()-origin.y;
    for(const [sid,entry] of current.at){if(sid===id)continue;stageRef.current?.findOne(`#${sid}`)?.position({x:entry.x+dx,y:entry.y+dy});}
    node.getLayer()?.batchDraw();
  }
  // Keep at least 40px of every moved object's anchor inside the visible pasteboard.
  const keepReachable=(n:number,limit:number)=>Math.round(Math.max(-PASTEBOARD+40,Math.min(limit+PASTEBOARD-40,n)));
  function finishMove(id:string,node:Konva.Node){
    moveTogether(id,node);
    const current=dragSources.current;dragSources.current=null;
    if(current&&current.id===id){
      const origin=current.at.get(id);if(!origin)return;
      const dx=node.x()-origin.x,dy=node.y()-origin.y;
      updateMany([...current.at].map(([sid,p])=>({id:sid,patch:{x:keepReachable(p.x+dx,project.width),y:keepReachable(p.y+dy,project.height)}})));
    }else updateMany([{id,patch:{x:keepReachable(node.x(),project.width),y:keepReachable(node.y(),project.height)}}]);
  }
  function commitTransforms(){
    const patches:Patch[]=[];
    for(const id of selectedIds){
      const layer=project.layers.find(l=>l.id===id);const node=stageRef.current?.findOne(`#${id}`);
      if(!layer||!node||layer.locked)continue;
      const sx=node.scaleX(),sy=node.scaleY();
      node.scale({x:1,y:1});
      const base={x:keepReachable(node.x(),project.width),y:keepReachable(node.y(),project.height),rotation:node.rotation()};
      if(layer.type==='picture')patches.push({id,patch:{...base,width:minimum(layer.width*Math.abs(sx)),height:minimum(layer.height*Math.abs(sy))}});
      else if(layer.type==='arrow')patches.push({id,patch:{...base,width:minimum((layer.width??ARROW_W)*Math.abs(sx)),height:minimum((layer.height??ARROW_H)*Math.abs(sy))}});
      else if(layer.type==='text')patches.push({id,patch:{...base,width:minimum(layer.width*Math.abs(sx)),fontSize:Math.max(12,layer.fontSize*Math.abs(sy))}});
      else patches.push({id,patch:{...base,radius:minimum(layer.radius*(Math.abs(sx)+Math.abs(sy))/2)}});
    }
    updateMany(patches);
  }
  function stagePoint(){const p=stageRef.current?.getPointerPosition();return p?{x:p.x,y:p.y}:null;}
  function startSelection(e:KonvaEventObject<MouseEvent>){
    if(e.target!==e.target.getStage())return;
    const p=stagePoint();if(!p)return;
    selectStart.current=p;setSelectionBox({x:p.x,y:p.y,width:0,height:0});
  }
  function moveSelection(){
    const start=selectStart.current,p=stagePoint();if(!start||!p)return;
    setSelectionBox({x:Math.min(start.x,p.x),y:Math.min(start.y,p.y),width:Math.abs(p.x-start.x),height:Math.abs(p.y-start.y)});
  }
  function finishSelection(e:KonvaEventObject<MouseEvent>){
    const start=selectStart.current,p=stagePoint();selectStart.current=null;
    setSelectionBox(null);
    if(!start||!p)return;
    const rect={x:Math.min(start.x,p.x),y:Math.min(start.y,p.y),width:Math.abs(p.x-start.x),height:Math.abs(p.y-start.y)};
    if(rect.width<5&&rect.height<5){select(null);return;}
    const ids=project.layers.filter(l=>!l.locked).filter(l=>{
      const node=stageRef.current?.findOne(`#${l.id}`);
      return node&&Konva.Util.haveIntersection(rect,node.getClientRect());
    }).map(l=>l.id);
    // Replace selection with first item, then add the rest.
    if(!e.evt.shiftKey)select(null);
    ids.forEach((id,i)=>select(id,e.evt.shiftKey||i>0));
  }
  return <Stage ref={stageRef} width={(project.width+2*PASTEBOARD)*scale} height={(project.height+2*PASTEBOARD)*scale}
      onMouseDown={startSelection} onMouseMove={moveSelection} onMouseUp={finishSelection}
      onTouchStart={e=>{if(e.target===e.target.getStage())select(null);}}>
    <Layer x={PASTEBOARD*scale} y={PASTEBOARD*scale} scaleX={scale} scaleY={scale}>
      <Backdrop template={project}/>
      {project.layers.map(item=>{
        if(item.type==='picture')return <Picture key={item.id} item={item} onChoose={select} onMoveStart={startMove} onMove={moveTogether} onMoveFinish={finishMove}/>;
        if(item.type==='text')return <Text key={item.id} id={item.id} x={item.x} y={item.y}
          width={item.width} text={item.text} fontFamily={item.fontFamily} fontStyle="bold"
          fontSize={item.fontSize} lineHeight={item.lineHeight} fill={item.color} stroke={item.stroke}
          strokeWidth={item.strokeWidth} fillAfterStrokeEnabled shadowColor={item.shadowColor}
          shadowBlur={item.shadowBlur} shadowOffsetY={item.shadowOffsetY} shadowOpacity={.92}
          rotation={item.rotation??0} draggable={!item.locked}
          onClick={e=>select(item.id,additive(e))} onTap={()=>select(item.id)}
          onDragStart={()=>startMove(item.id)} onDragMove={e=>moveTogether(item.id,e.target)} onDragEnd={e=>finishMove(item.id,e.target)}/>;
        if(item.type==='arrow'){
          const w=item.width??ARROW_W,h=item.height??ARROW_H;
          return <Group key={item.id} id={item.id} x={item.x} y={item.y}
            rotation={item.rotation??0} draggable={!item.locked}
            onClick={e=>select(item.id,additive(e))} onTap={()=>select(item.id)}
            onDragStart={()=>startMove(item.id)} onDragMove={e=>moveTogether(item.id,e.target)} onDragEnd={e=>finishMove(item.id,e.target)}>
              <Rect width={w} height={h} fill="rgba(0,0,0,0.001)"/>
              <Group x={item.flipX?w:0} y={item.flipY?h:0} scaleX={(item.flipX?-1:1)*w/ARROW_W} scaleY={(item.flipY?-1:1)*h/ARROW_H} listening={false}>
                <Arrow points={item.points} stroke="#ffffff" fill="#ffffff"
                  strokeWidth={item.strokeWidth+9} pointerLength={item.pointerLength+10}
                  pointerWidth={item.pointerWidth+13} lineCap="round" lineJoin="round"/>
                <Arrow points={item.points} stroke={item.color} fill={item.color}
                  strokeWidth={item.strokeWidth} pointerLength={item.pointerLength}
                  pointerWidth={item.pointerWidth} lineCap="round" lineJoin="round"/>
              </Group>
          </Group>;
        }
        return <Circle key={item.id} id={item.id} x={item.x} y={item.y} radius={item.radius}
          stroke={item.color} strokeWidth={item.strokeWidth} draggable={!item.locked}
          onClick={e=>select(item.id,additive(e))} onTap={()=>select(item.id)}
          onDragStart={()=>startMove(item.id)} onDragMove={e=>moveTogether(item.id,e.target)} onDragEnd={e=>finishMove(item.id,e.target)}/>;
      })}
      <Transformer ref={transformer} rotateEnabled keepRatio={selectedIds.length>1?true:(chosen?.lockAspect??true)}
        flipEnabled={false} anchorFill="#ffffff" anchorStroke="#ffcc00" borderStroke="#ffcc00" anchorSize={12}
        enabledAnchors={['top-left','top-right','bottom-left','bottom-right']}
        boundBoxFunc={(oldBox,newBox)=>newBox.width<25||newBox.height<25?oldBox:newBox}
        onTransformEnd={commitTransforms}/>
    </Layer>
    {selectionBox&&<Layer listening={false}><Rect {...selectionBox} stroke="#ffcb22" dash={[7,4]} fill="rgba(255,203,34,0.12)" listening={false}/></Layer>}
    {showSlots&&project.slots&&<Layer name="slot-guides" listening={false} x={PASTEBOARD*scale} y={PASTEBOARD*scale} scaleX={scale} scaleY={scale}>
      {project.slots.map(slot=><Group key={slot.id} x={slot.x} y={slot.y} listening={false}>
        <Rect width={slot.width} height={slot.height} stroke={slot.outlineColor??'#ffcc00'} strokeWidth={slot.outlineWidth??2}
          dash={[11,8]} cornerRadius={12} opacity={.86} listening={false}/>
        <Rect x={6} y={5} width={Math.min(slot.width-12,Math.max(95,slot.label.length*11))} height={29} fill="#111117" opacity={.87} cornerRadius={6} listening={false}/>
        <Text x={12} y={12} fontSize={15} fontStyle="bold" fill="#ffe18c" text={slot.label.toUpperCase()} listening={false}/>
      </Group>)}
    </Layer>}
  </Stage>;
}
