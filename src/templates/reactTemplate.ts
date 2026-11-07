import type { Template } from '../types/editor';

export const reactTemplate: Template = {
  id: 'react-impact-01',
  name: 'REACT • Impacto',
  description: 'Fundo dramático, chamada gigante, rosto em destaque e seta vermelha.',
  width: 1280,
  height: 720,
  background: { src: '/react-background.svg', color: '#11131a' },
  layers: [
    {
      id: 'face', name: 'Rosto / recorte', type: 'picture', role: 'face',
      src: '/demo-person.svg', x: 684, y: 80, width: 590, height: 640,
      isCutout: false,
    },
    {
      id: 'title', name: 'Chamada principal', type: 'text',
      x: 58, y: 183, width: 665, text: 'ISSO MUDOU\nTUDO!',
      fontSize: 99, fontFamily: 'Impact, Arial Black, sans-serif',
      color: '#ffffff', stroke: '#1c0a0c', strokeWidth: 6,
      lineHeight: 1.04, shadowColor: '#000000', shadowBlur: 15, shadowOffsetY: 10,
    },
    {
      id: 'kicker', name: 'Texto de apoio', type: 'text',
      x: 64, y: 106, width: 580, text: 'MINHA REAÇÃO',
      fontSize: 44, fontFamily: 'Impact, Arial Black, sans-serif',
      color: '#ffc727', stroke: '#120d0f', strokeWidth: 4,
      lineHeight: 1.02, shadowColor: '#000000', shadowBlur: 6, shadowOffsetY: 4,
    },
    {
      id: 'arrow', name: 'Seta de destaque', type: 'arrow',
      x: 572, y: 470, points: [0, 0, 154, -48, 249, -164],
      color: '#ff3131', strokeWidth: 31, pointerLength: 52, pointerWidth: 54,
    },
    {
      id: 'logo', name: 'Logo ZERO 2 PLAYERS', type: 'picture', role: 'logo',
      src: '/zero2players-logo.png', x: 1136, y: 24, width: 111, height: 109,
    },
    {
      id: 'badge', name: 'Selo', type: 'text',
      x: 69, y: 617, width: 475, text: 'VOCÊ VIU ISSO?!',
      fontSize: 44, fontFamily: 'Impact, Arial Black, sans-serif',
      color: '#ffc727', stroke: '#280b05', strokeWidth: 5,
      lineHeight: 1, shadowColor: '#000000', shadowBlur: 8, shadowOffsetY: 5,
    },
  ],
};
