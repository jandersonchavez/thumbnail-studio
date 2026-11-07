import type { Template, PictureLayer, TextLayer } from '../types/editor';
import { contrastRatio } from './palette';
function overlap(a:{x:number;y:number;width:number;height:number},b:{x:number;y:number;width:number;height:number}){
  return Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*
    Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
}
export function evaluateComposition(project:Template):Array<{kind:'ok'|'warn';text:string}>{
  const {layers,width,height}=project;
  const title=layers.find(l=>l.id==='title') as TextLayer|undefined;
  const faces=layers.filter((l):l is PictureLayer=>l.type==='picture'&&l.role==='face');
  const logo=layers.find(l=>l.type==='picture'&&l.role==='logo');
  const messages:Array<{kind:'ok'|'warn';text:string}>=[];
  if(logo)messages.push({kind:'ok',text:'Identidade do canal presente na arte.'});
  if(!title){messages.push({kind:'warn',text:'Adicione um título para orientar a leitura.'});return messages;}
  const ratio=contrastRatio(title.color,project.background.color);
  messages.push(ratio<4.5?{kind:'warn',text:`Contraste estimado ${ratio.toFixed(1)}:1; examine a legibilidade do texto.`}:{kind:'ok',text:`Contraste estimado ${ratio.toFixed(1)}:1 para a cor de fundo base.`});
  const box={x:title.x,y:title.y,width:title.width,height:title.text.split('\n').length*title.fontSize*title.lineHeight};
  if(faces.some(f=>overlap(box,{x:f.x,y:f.y,width:f.width,height:f.height})>18000))
    messages.push({kind:'warn',text:'Texto e rosto se sobrepõem geometricamente; confira a leitura.'});
  else messages.push({kind:'ok',text:'Título e rosto sem colisões significativas.'});
  const zone=width>height?{x:width*.80,y:height*.84,width:width*.20,height:height*.16}:{x:width*.72,y:height*.65,width:width*.28,height:height*.35};
  if(overlap(box,zone)>1500)messages.push({kind:'warn',text:'Título invade uma área potencialmente coberta pela interface.'});
  else messages.push({kind:'ok',text:'Título fora da principal zona indicativa de interface.'});
  const centers=faces.map(f=>(f.x+f.width/2)/width);
  if(centers.length&&centers.some(x=>Math.min(Math.abs(x-1/3),Math.abs(x-2/3))<.12))
    messages.push({kind:'ok',text:'Rosto próximo a uma linha vertical da regra dos terços.'});
  return messages;
}
