import type { Template, SceneLayer } from '../types/editor';

export type TemplateKind = 'oficial' | 'coop' | 'react';
export type Format = '16:9' | '9:16';
export const catalog: Array<{ id: TemplateKind; name: string; tag: string; description: string }> = [
  { id: 'oficial', name: 'Oficial Zero a 2', tag: 'IDENTIDADE', description: 'Rasgos amarelos, logo central, reação e frase gamer.' },
  { id: 'coop', name: 'Co-Op 2 Players (VS)', tag: 'VERSUS', description: 'Dois rostos, emblema central e disputa entre jogadores.' },
  { id: 'react', name: 'React / Opinião Viral', tag: 'ALTO CTR', description: 'Fundo dramático, seta vermelha e rosto com borda branca.' },
];

const face = (id:string, src:string, x:number,y:number,w:number,h:number):SceneLayer => ({
  type:'picture', id, name:id==='face-p2'?'Player 2 · substituir':'Rosto · substituir', role:'face',
  x,y,width:w,height:h,src,isCutout:false,fit:'contain'
});
const logo = (src:string,x:number,y:number,w:number):SceneLayer => ({
  type:'picture',id:'logo',name:'Logo do canal',role:'logo',src,x,y,width:w,height:w,fit:'contain'
});
const title = (text:string,x:number,y:number,w:number,size:number,color='#ffcc00'):SceneLayer => ({
  type:'text',id:'title',name:'Título principal',x,y,width:w,text,fontSize:size,
  fontFamily:'Road Rage', color,stroke:'#09090b',strokeWidth:10,
  lineHeight:1.02,shadowColor:'#000000',shadowBlur:14,shadowOffsetY:9,
});
const arrow = (x:number,y:number):SceneLayer => ({
  type:'arrow',id:'arrow',name:'Seta vermelha',x,y,points:[0,65,155,0,220,25],
  width:250,height:155,color:'#ef4444',strokeWidth:22,pointerLength:46,pointerWidth:50,
});

/** Each template is a real scene with independent edit-ready objects, not a flattened picture. */
export function createTemplate(kind: TemplateKind, format: Format, brandSrc='/zero2players-logo.png'): Template {
  const v = format === '9:16', width = v?720:1280, height = v?1280:720;
  if (kind==='oficial') return {
    id:`oficial-${format}`,name:'Oficial Zero a 2',description:'Template gamer com identidade da marca.',width,height,
    background:{src:'/brand-background.svg',color:'#050507',blur:0,darkness:.03},
    layers:[
      logo(brandSrc,v?176:435,v?135:135,v?365:400),
      face('face','/demo-person.svg',v?170:863,v?665:220,v?430:380,v?440:455),
      arrow(v?70:630,v?750:460),
      title('NOVO JOGO\nINSANO!',v?55:45,v?985:515,v?615:760,v?75:88),
    ]
  };
  if (kind==='coop') return {
    id:`coop-${format}`,name:'Co-Op 2 Players (VS)',description:'Disputa entre dois jogadores.',width,height,
    background:{src:'/arena-background.svg',color:'#0c0d15',blur:1,darkness:.18},
    layers:[
      face('face','/demo-person.svg',v?5:0,v?480:165,v?360:455,v?490:530),
      face('face-p2','/demo-person-blue.svg',v?360:830,v?500:165,v?355:440,v?480:530),
      logo(brandSrc,v?260:505,v?245:215,v?210:270),
      title('1 PLAYER\nVS 2 PLAYERS!',v?35:260,v?1040:555,v?660:860,v?72:76,'#ffffff'),
    ]
  };
  return {
    id:`react-${format}`,name:'React / Opinião Viral',description:'Reação, seta e texto gigante.',width,height,
    background:{src:'/react-background.svg',color:'#11131a',blur:4,darkness:.12},
    layers:[
      face('face','/demo-person.svg',v?115:790,v?430:85,v?515:480,v?585:620),
      logo(brandSrc,36,32,v?160:160),
      arrow(v?80:505,v?345:310),
      title('NÃO ACREDITO\nNISSO!',v?55:45,v?1020:500,v?615:770,v?72:88),
    ]
  };
}
