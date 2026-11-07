import type { PictureLayer, SceneLayer, Template, TemplateSlot, TextLayer, SlotRole } from '../types/editor';
export type FrameId = 'react'|'versus'|'tutorial'|'shorts';
export const frameCatalog: {id:FrameId; title:string; description:string; icon:string}[] = [
 {id:'react', title:'React / Opinião',description:'Rosto em destaque, título forte e logo no topo',icon:'😮'},
 {id:'versus',title:'VS · Duas pessoas',description:'Dois retratos e identidade ao centro',icon:'⚔️'},
 {id:'tutorial',title:'Tutorial + Print',description:'Área de screenshot, título e rosto pequeno',icon:'💻'},
 {id:'shorts',title:'Shorts / TikTok',description:'Composição vertical com zonas de interface',icon:'📱'},
];
const picture = (id:string,role:PictureLayer['role'],name:string,src:string):PictureLayer=>({id,name,type:'picture',role,src,x:0,y:0,width:200,height:200,fit:'contain',lockAspect:true});
const text = ():TextLayer=>({id:'title',name:'Título principal',type:'text',x:0,y:0,width:600,fontSize:80,text:'TÍTULO DO VÍDEO!',fontFamily:'Road Rage',color:'#ffcc00',stroke:'#000000',strokeWidth:12,lineHeight:1.02,shadowColor:'#000000',shadowBlur:8,shadowOffsetY:5});
/** A frame is semantic layout, not a flattened image. Every slot links to a replaceable layer. */
export function applyFrame(scene:Template, frameId:FrameId, brandSrc='/zero2players-logo.png'):Template {
 const W=scene.width,H=scene.height,v=H>W; const box=(x:number,y:number,w:number,h:number):[number,number,number,number]=>[Math.round(x*W),Math.round(y*H),Math.round(w*W),Math.round(h*H)];
 const slotSpecs: Array<[string,SlotRole,string,[number,number,number,number]]> = frameId==='versus' ? [
  ['face','face','Player 1',box(v?.03:.02,v?.36:.23,v?.47:.36,v?.36:.65)],
  ['face-p2','face','Player 2',box(v?.52:.65,v?.36:.23,v?.45:.33,v?.36:.65)],
  ['logo','logo','Logo do canal',box(v?.33:.41,v?.10:.22,v?.34:.18,v?.20:.37)],
  ['title','title','Título VS',box(.04,v?.79:.77,.92,v?.16:.18)],
 ] : frameId==='tutorial' ? [
  ['screenshot','image','Print / tela',box(v?.06:.30,v?.31:.22,v?.88:.65,v?.43:.63)],
  ['face','face','Apresentador',box(v?.51:.70,v?.58:.33,v?.45:.26,v?.27:.50)],
  ['logo','logo','Logo do canal',box(.05,.04,v?.23:.14,v?.13:.23)],
  ['title','title','Título tutorial',box(v?.05:.21,v?.17:.07,v?.9:.74,v?.13:.22)],
 ] : frameId==='shorts' ? [
  ['face','face','Pessoa / objeto',box(v?.13:.56,v?.36:.2,v?.72:.4,v?.44:.6)],
  ['logo','logo','Logo do canal',box(.05,.04,v?.26:.16,v?.14:.26)],
  ['title','title','Título superior',box(.07,v?.19:.55,.84,v?.19:.32)],
 ] : [
  ['face','face','Rosto / reação',box(v?.18:.63,v?.39:.14,v?.68:.34,v?.43:.73)],
  ['logo','logo','Logo do canal',box(.04,.04,v?.22:.13,v?.13:.23)],
  ['title','title','Título de impacto',box(.045,v?.80:.68,v?.91:.54,v?.13:.25)],
 ];
 const idsInFrame = new Set(slotSpecs.map(([id])=>id));
 const layers=[...scene.layers.filter(l=>!['screenshot','face-p2'].includes(l.id)||idsInFrame.has(l.id))]; const slots:TemplateSlot[]=[];
 for(const [id,role,label,coords] of slotSpecs){
   const [x,y,width,height]=coords;
   let layer=layers.find(l=>l.id===id);
   if(!layer) {
     layer=id==='title'?text():id==='logo'?picture(id,'logo',label,brandSrc):id==='screenshot'?picture(id,'decoration',label,'/tutorial-screen.svg'):picture(id,'face',label,id==='face-p2'?'/demo-person-blue.svg':'/demo-person.svg');
     layers.push(layer);
   }
   const slotId=`slot-${id}`;
   // Avoid mutating scene layers; replace the layer by id.
   const index=layers.findIndex(l=>l.id===id);
   const old=layers[index];
   const patch:Partial<SceneLayer> = old.type==='text' ? {x,y,width,fontSize:Math.min(v?76:84,Math.max(35,Math.round(height*.52))),slotId} : {x,y,width,height,slotId};
   layers[index]={...old,...patch} as SceneLayer;
   slots.push({id:slotId,layerId:id,role,label,x,y,width,height,outlineColor:role==='face'?'#ffca27':'#67dafe',outlineWidth:role==='face'?3:2});
 }
 return {...scene, frameId, slots, layers};
}
