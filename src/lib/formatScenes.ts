import type { Template, SceneLayer, TemplateSlot } from '../types/editor';
import type { Format } from '../templates/catalog';

/** Derive a first draft of the other format without ever mutating its source. */
export function adaptSceneFormat(scene:Template, format:Format):Template {
  const width=format==='16:9'?1280:720;
  const height=format==='16:9'?720:1280;
  if(scene.width===width&&scene.height===height)return structuredClone(scene);
  const srcW=scene.width,srcH=scene.height;
  const margin=18;
  const mapPoint=(x:number,y:number,w:number,h:number)=>({
    x:Math.round(Math.max(margin,Math.min(width-w-margin,x/srcW*width))),
    y:Math.round(Math.max(margin,Math.min(height-h-margin,y/srcH*height))),
  });
  const layers=scene.layers.map((layer):SceneLayer=>{
    const copy=structuredClone(layer);
    const oldW=layer.type==='circle'?layer.radius*2:layer.type==='arrow'?(layer.width??250):layer.width;
    const oldH=layer.type==='circle'?layer.radius*2:layer.type==='arrow'?(layer.height??155):layer.type==='text'?layer.fontSize:layer.height;
    const factor=Math.min(1,(width-2*margin)/Math.max(1,oldW));
    const newW=oldW*factor,newH=oldH*factor;
    if(copy.type==='circle') copy.radius=Math.round(copy.radius*factor);
    else if(copy.type==='text'){
      copy.width=Math.round(copy.width*factor);
      copy.fontSize=Math.max(14,Math.round(copy.fontSize*factor));
      copy.strokeWidth=Math.max(1,copy.strokeWidth*factor);
    } else {
      copy.width=Math.round(newW);
      copy.height=Math.round(newH);
    }
    const mapped=mapPoint(layer.x,layer.y,newW,newH);
    copy.x=mapped.x;copy.y=mapped.y;
    return copy;
  });
  const slots:TemplateSlot[]|undefined=scene.slots?.map(slot=>{
    const factor=Math.min(1,(width-2*margin)/Math.max(1,slot.width));
    const w=Math.round(slot.width*factor),h=Math.round(slot.height*factor);
    return {...slot,...mapPoint(slot.x,slot.y,w,h),width:w,height:h};
  });
  return {...structuredClone(scene),width,height,layers,slots,description:`${scene.description} · adaptação ${format}`};
}
