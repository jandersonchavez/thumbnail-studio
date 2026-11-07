export type BaseLayer = { id: string; name: string; x: number; y: number; rotation?: number; locked?: boolean; lockAspect?: boolean; slotId?: string; flipX?: boolean; flipY?: boolean };
export type TextLayer = BaseLayer & { type: 'text'; text: string; width: number; fontSize: number; fontFamily: string; color: string; stroke: string; strokeWidth: number; lineHeight: number; shadowColor: string; shadowBlur: number; shadowOffsetY: number; };
export type NormalizedCrop = { x: number; y: number; width: number; height: number };
export type PictureLayer = BaseLayer & { type: 'picture'; role: 'face'|'logo'|'decoration'; nativePieceId?: string; src: string; width: number; height: number; opacity?: number; isCutout?: boolean; fileName?: string; cutoutSrc?: string; originalSrc?: string; outlineWidth?: number; outlineColor?: string; fit?: 'contain'|'cover'|'stretch'; crop?: NormalizedCrop; };
export type ArrowLayer = BaseLayer & { type: 'arrow'; points: number[]; width?: number; height?: number; color: string; strokeWidth: number; pointerLength: number; pointerWidth: number; };
export type CircleLayer = BaseLayer & { type: 'circle'; radius: number; color: string; strokeWidth: number; };
export type SceneLayer = TextLayer | PictureLayer | ArrowLayer | CircleLayer;
export type SlotRole = 'face'|'logo'|'title'|'image';
export type TemplateSlot = { id: string; layerId: string; role: SlotRole; label: string; x: number; y: number; width: number; height: number; outlineColor?: string; outlineWidth?: number };
export type Background = {
  mode?: 'image'|'color'|'gradient'; src: string; color: string; fit?: 'contain'|'cover'|'stretch';
  blur?: number; darkness?: number; overlayColor?: string; overlayOpacity?: number;
  gradientFrom?: string; gradientTo?: string; focusX?: number; focusY?: number;
};
export type Template = { id: string; name: string; description: string; width: number; height: number; background: Background; layers: SceneLayer[]; frameId?: string; slots?: TemplateSlot[]; };
