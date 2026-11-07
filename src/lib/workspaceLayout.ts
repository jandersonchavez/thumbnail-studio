import type { NormalizedCrop, PictureLayer, SceneLayer, Template } from '../types/editor';

/** Non-exported pasteboard around the thumbnail, in design pixels. */
export const PASTEBOARD = 240;

export function sceneBounds(layer: SceneLayer): { x: number; y: number; width: number; height: number } {
  if (layer.type === 'picture') return { x: layer.x, y: layer.y, width: layer.width, height: layer.height };
  if (layer.type === 'text') return { x: layer.x, y: layer.y, width: layer.width, height: layer.fontSize * 1.25 };
  if (layer.type === 'arrow') return { x: layer.x, y: layer.y, width: layer.width ?? 250, height: layer.height ?? 155 };
  return { x: layer.x - layer.radius, y: layer.y - layer.radius, width: layer.radius * 2, height: layer.radius * 2 };
}

const overlap = (a: {x:number;y:number;width:number;height:number}, b: {x:number;y:number;width:number;height:number}) =>
  Math.max(0, Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)) *
  Math.max(0, Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));

/** Pick an uncluttered position, with a strong penalty for obscuring the active layer. */
export function findFreePosition(scene: Template, width: number, height: number, selectedIds: string[] = []) {
  const margin = 18;
  const stepX = Math.max(35, (scene.width - width - 2*margin)/6);
  const stepY = Math.max(35, (scene.height - height - 2*margin)/5);
  const maxX = Math.max(margin,scene.width - width - margin);
  const maxY = Math.max(margin,scene.height - height - margin);
  const centerX = scene.width/2 - width/2, centerY = scene.height/2 - height/2;
  let best = { x: margin, y: margin, cost: Number.POSITIVE_INFINITY };
  for(let iy=0;iy<=5;iy++) for(let ix=0;ix<=6;ix++){
    const x = Math.round(Math.min(maxX, margin + ix*stepX));
    const y = Math.round(Math.min(maxY, margin + iy*stepY));
    const box = { x,y,width,height };
    let cost = .025*(Math.abs(x-centerX)+Math.abs(y-centerY));
    for (const layer of scene.layers) {
      const penalty = selectedIds.includes(layer.id) ? 10 : 1;
      cost += overlap(box,sceneBounds(layer)) / Math.max(1,width*height) * 100 * penalty;
    }
    if(cost < best.cost) best={x,y,cost};
  }
  return {x:best.x,y:best.y};
}

/** Reduces oversized source images to a usable insertion size without distortion. */
export function boundedImageSize(scene: Template, nativeWidth: number, nativeHeight: number) {
  const w = Math.max(1,nativeWidth), h=Math.max(1,nativeHeight);
  const ratio = Math.min(1, scene.width*.36/w, scene.height*.55/h);
  return { width: Math.max(40,Math.round(w*ratio)), height: Math.max(40,Math.round(h*ratio)) };
}

export type CropPatch = Partial<PictureLayer>;
/** Fit the actual cropped pixels into a proportional frame; preserve the uncropped layout for Undo/Reset. */
export function calculateCropPatch(layer: PictureLayer, crop: NormalizedCrop | undefined, nativeWidth: number, nativeHeight: number, scene: Template): CropPatch {
  const saved = layer.uncroppedFrame;
  const base = saved ?? {x:layer.x,y:layer.y,width:layer.width,height:layer.height,fit:layer.fit};
  if(!crop) return {crop:undefined,uncroppedFrame:undefined,x:base.x,y:base.y,width:base.width,height:base.height,fit:base.fit??'contain'};
  const w=Math.max(1,nativeWidth),h=Math.max(1,nativeHeight);
  // Contain the original source in its uncropped box before cropping it.
  const factor = Math.min(base.width/w,base.height/h);
  let newW=w*crop.width*factor, newH=h*crop.height*factor;
  const cap = Math.min(1,(scene.width*.88)/Math.max(1,newW),(scene.height*.84)/Math.max(1,newH));
  newW=Math.max(2,Math.round(newW*cap)); newH=Math.max(2,Math.round(newH*cap));
  const contentW=w*factor, contentH=h*factor;
  const originX=base.x+(base.width-contentW)/2;
  const originY=base.y+(base.height-contentH)/2;
  const proposedX=originX+crop.x*contentW;
  const proposedY=originY+crop.y*contentH;
  const x=Math.round(Math.max(-PASTEBOARD/2,Math.min(scene.width-newW+PASTEBOARD/2,proposedX)));
  const y=Math.round(Math.max(-PASTEBOARD/2,Math.min(scene.height-newH+PASTEBOARD/2,proposedY)));
  return {crop,uncroppedFrame:base,x,y,width:newW,height:newH,fit:'contain',lockAspect:true};
}
