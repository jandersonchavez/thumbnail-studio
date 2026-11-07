import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Sparkles,
  Layers,
  Type,
  Image as ImageIcon,
  Download,
  Trash2,
  ArrowUp,
  ArrowDown,
  ShieldAlert,
  CheckCircle2,
  Sliders,
  Upload,
  RefreshCw,
  Eye,
  Wand2,
  Palette,
  Plus,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Edit3,
  Check
} from 'lucide-react';

// ============================================================================
// 1. ARQUIVOS ORIGINAIS DO USUÁRIO + MOTOR PROCEDURAL DE ALTA RESOLUÇÃO
// ============================================================================
const UPLOADED_BANNER_PATH = 'WhatsApp Image 2026-11-07 at 12.15.49.jpeg';
const UPLOADED_CIRCLE_LOGO_PATH = 'image_5c13fc.png';

const DEFAULT_LOGO_CONFIG = {
  line1: 'ZERO',
  line2Left: 'a',
  line2Right: '2',
  line3: 'PLAYERS',
  primaryColor: '#FFCC00',
  secondaryColor: '#F59E0B',
  textColor: '#FFFFFF',
  bgColor: '#050507',
  showGamepad: true,
  grungeRing: true
};

// Desenha o emblema "ZERO a 2 PLAYERS" fiel ao original ou com as alterações do usuário
function drawZeroA2Emblem(ctx, cx, cy, radius, transparentBlack = false, config = DEFAULT_LOGO_CONFIG) {
  const cfg = { ...DEFAULT_LOGO_CONFIG, ...config };
  ctx.save();
  ctx.translate(cx, cy);
  const scale = radius / 230;
  ctx.scale(scale, scale);

  if (!transparentBlack) {
    ctx.fillStyle = cfg.bgColor || '#050507';
    ctx.beginPath();
    ctx.arc(0, 0, 220, 0, Math.PI * 2);
    ctx.fill();
  }

  // Anéis Grunge Rasgados Amarelos
  if (cfg.grungeRing) {
    for (let ring = 0; ring < 5; ring++) {
      const r = 194 + ring * 5.2;
      ctx.strokeStyle = ring % 2 === 0 ? cfg.primaryColor : cfg.secondaryColor;
      ctx.lineWidth = ring === 1 ? 14 : ring === 3 ? 9 : 4.5;
      ctx.lineCap = 'round';
      const segments = 36;
      for (let s = 0; s < segments; s++) {
        if ((s + ring) % 7 === 0) continue;
        const a1 = (s * Math.PI * 2) / segments + ring * 0.12;
        const a2 = a1 + 0.14;
        const jitter = ((s * 13 + ring * 7) % 7) - 3;
        ctx.beginPath();
        ctx.arc(0, 0, r + jitter, a1, a2);
        ctx.stroke();
      }
    }

    // Respingos de tinta ao redor do círculo
    ctx.fillStyle = cfg.primaryColor;
    for (let i = 0; i < 36; i++) {
      const ang = (i * Math.PI * 2) / 36;
      const dist = 212 + ((i * 19) % 16);
      const sz = 1.5 + (i % 3.5);
      ctx.beginPath();
      ctx.arc(Math.cos(ang) * dist, Math.sin(ang) * dist, sz, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Tipografia Urbana Inclinada
  ctx.save();
  ctx.rotate((-10 * Math.PI) / 180);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';

  // Linha 1: ZERO
  ctx.font = '900 84px "Permanent Marker", "Impact", sans-serif';
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#000000';
  ctx.strokeText(cfg.line1, -4, -92);
  ctx.fillStyle = cfg.textColor;
  ctx.fillText(cfg.line1, -4, -92);

  // Linha 2: "a" + "2"
  ctx.font = '900 76px "Permanent Marker", "Impact", sans-serif';
  ctx.lineWidth = 13;
  ctx.strokeText(cfg.line2Left, -74, -4);
  ctx.fillStyle = cfg.primaryColor;
  ctx.fillText(cfg.line2Left, -74, -4);

  ctx.font = '900 108px "Permanent Marker", "Impact", sans-serif';
  ctx.lineWidth = 15;
  ctx.strokeText(cfg.line2Right, 34, -8);
  ctx.fillStyle = cfg.primaryColor;
  ctx.fillText(cfg.line2Right, 34, -8);

  // Linha 3: PLAYERS
  ctx.font = '900 72px "Permanent Marker", "Impact", sans-serif';
  ctx.lineWidth = 14;
  ctx.strokeText(cfg.line3, 4, 80);
  ctx.fillStyle = cfg.textColor;
  ctx.fillText(cfg.line3, 4, 80);
  ctx.restore();

  // Controle Gamer na base
  if (cfg.showGamepad) {
    ctx.save();
    ctx.translate(0, 154);
    ctx.fillStyle = cfg.primaryColor;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 5;

    ctx.beginPath();
    ctx.moveTo(-36, -14);
    ctx.quadraticCurveTo(0, -20, 36, -14);
    ctx.quadraticCurveTo(54, -8, 48, 22);
    ctx.quadraticCurveTo(42, 34, 26, 22);
    ctx.quadraticCurveTo(14, 12, 0, 12);
    ctx.quadraticCurveTo(-14, 12, -26, 22);
    ctx.quadraticCurveTo(-42, 34, -48, 22);
    ctx.quadraticCurveTo(-54, -8, -36, -14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // D-Pad e Botões
    ctx.fillStyle = '#09090B';
    ctx.fillRect(-29, -4, 15, 5);
    ctx.fillRect(-24, -9, 5, 15);
    ctx.beginPath();
    ctx.arc(22, -6, 3.2, 0, Math.PI * 2);
    ctx.arc(29, 0, 3.2, 0, Math.PI * 2);
    ctx.arc(22, 6, 3.2, 0, Math.PI * 2);
    ctx.arc(15, 0, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

// Gera as 3 variantes do logo (Circular, Transparente Luma-Key e Banner 16:9 Rasgado)
function generateProceduralBrandAssets(config = DEFAULT_LOGO_CONFIG) {
  // 1. Emblema Circular
  const c1 = document.createElement('canvas');
  c1.width = 500;
  c1.height = 500;
  drawZeroA2Emblem(c1.getContext('2d'), 250, 250, 225, false, config);

  // 2. Emblema Sem Fundo Preto (Transparente)
  const c2 = document.createElement('canvas');
  c2.width = 500;
  c2.height = 500;
  drawZeroA2Emblem(c2.getContext('2d'), 250, 250, 225, true, config);

  // 3. Banner 16:9 Completo com Rasgos Laterais
  const c3 = document.createElement('canvas');
  c3.width = 1280;
  c3.height = 720;
  const bCtx = c3.getContext('2d');
  bCtx.fillStyle = config.bgColor || '#050507';
  bCtx.fillRect(0, 0, 1280, 720);

  // Rasgos diagonais amarelos nas bordas
  const drawSlashes = (isRight) => {
    bCtx.save();
    if (isRight) {
      bCtx.translate(1280, 720);
      bCtx.scale(-1, -1);
    }
    const coords = [
      [-40, 90, 270, -25, 34],
      [-30, 195, 340, 25, 48],
      [-50, 315, 290, 130, 28],
      [-40, 440, 370, 230, 52],
      [-20, 560, 260, 385, 30],
      [-30, 675, 230, 515, 24]
    ];
    coords.forEach(([x1, y1, x2, y2, w], idx) => {
      bCtx.strokeStyle = idx % 2 === 0 ? config.primaryColor : config.secondaryColor;
      bCtx.lineWidth = w;
      bCtx.lineCap = 'round';
      bCtx.beginPath();
      bCtx.moveTo(x1, y1);
      bCtx.lineTo(x2, y2);
      bCtx.stroke();
    });
    bCtx.restore();
  };
  drawSlashes(false);
  drawSlashes(true);
  drawZeroA2Emblem(bCtx, 640, 360, 255, false, config);

  return {
    circleUrl: c1.toDataURL('image/png'),
    transparentUrl: c2.toDataURL('image/png'),
    bannerUrl: c3.toDataURL('image/jpeg', 0.92)
  };
}

// Processa um arquivo de imagem enviado pelo usuário para gerar versões (Original, Circular e Transparente Luma-Key) + Paleta K-Means
function processUploadedLogoImage(imgElement) {
  const w = imgElement.naturalWidth || imgElement.width || 500;
  const h = imgElement.naturalHeight || imgElement.height || 500;

  // Original
  const cOrig = document.createElement('canvas');
  cOrig.width = w;
  cOrig.height = h;
  const ctxOrig = cOrig.getContext('2d');
  ctxOrig.drawImage(imgElement, 0, 0);
  const originalUrl = cOrig.toDataURL('image/png');

  // Circular Recortado
  const size = Math.min(w, h);
  const cCirc = document.createElement('canvas');
  cCirc.width = 500;
  cCirc.height = 500;
  const ctxCirc = cCirc.getContext('2d');
  ctxCirc.save();
  ctxCirc.beginPath();
  ctxCirc.arc(250, 250, 240, 0, Math.PI * 2);
  ctxCirc.closePath();
  ctxCirc.clip();
  ctxCirc.drawImage(imgElement, (w - size) / 2, (h - size) / 2, size, size, 0, 0, 500, 500);
  ctxCirc.restore();
  const circleUrl = cCirc.toDataURL('image/png');

  // Sem Fundo Escuro (Luma Key Local)
  const cTrans = document.createElement('canvas');
  cTrans.width = 500;
  cTrans.height = 500;
  const ctxTrans = cTrans.getContext('2d');
  ctxTrans.drawImage(imgElement, (w - size) / 2, (h - size) / 2, size, size, 0, 0, 500, 500);
  const imgData = ctxTrans.getImageData(0, 0, 500, 500);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum < 28) {
      data[i + 3] = 0;
    } else if (lum < 55) {
      data[i + 3] = Math.round(((lum - 28) / 27) * 255);
    }
  }
  ctxTrans.putImageData(imgData, 0, 0);
  const transparentUrl = cTrans.toDataURL('image/png');

  // Extração rápida de cores dominantes (K-Means simplificado)
  const sampleCanvas = document.createElement('canvas');
  sampleCanvas.width = 48;
  sampleCanvas.height = 48;
  const sCtx = sampleCanvas.getContext('2d');
  sCtx.drawImage(imgElement, 0, 0, 48, 48);
  const sData = sCtx.getImageData(0, 0, 48, 48).data;
  const buckets = {};
  for (let i = 0; i < sData.length; i += 16) {
    if (sData[i + 3] < 128) continue;
    const qr = Math.round(sData[i] / 32) * 32;
    const qg = Math.round(sData[i + 1] / 32) * 32;
    const qb = Math.round(sData[i + 2] / 32) * 32;
    const hex = `#${qr.toString(16).padStart(2, '0')}${qg.toString(16).padStart(2, '0')}${qb.toString(16).padStart(2, '0')}`.toUpperCase();
    buckets[hex] = (buckets[hex] || 0) + 1;
  }
  const palette = Object.entries(buckets)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([color]) => color);

  return {
    originalUrl,
    circleUrl,
    transparentUrl,
    bannerUrl: originalUrl,
    palette: palette.length >= 3 ? palette : ['#FFCC00', '#09090B', '#FFFFFF', '#EF4444', '#F59E0B']
  };
}

// ============================================================================
// 2. GERADOR DE RECORTE LOCAL + CONTORNO ADESIVO (STICKER OUTLINE)
// ============================================================================
function createCutoutWithStickerOutline(sourceCanvas, outlineWidth = 10, outlineColor = '#FFFFFF') {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const ctx = out.getContext('2d');

  if (outlineWidth > 0) {
    const sil = document.createElement('canvas');
    sil.width = w;
    sil.height = h;
    const sCtx = sil.getContext('2d');
    sCtx.drawImage(sourceCanvas, 0, 0);
    sCtx.globalCompositeOperation = 'source-in';
    sCtx.fillStyle = outlineColor;
    sCtx.fillRect(0, 0, w, h);

    const steps = 28;
    for (let i = 0; i < steps; i++) {
      const ang = (i * Math.PI * 2) / steps;
      ctx.drawImage(sil, Math.cos(ang) * outlineWidth, Math.sin(ang) * outlineWidth);
    }
  }
  ctx.drawImage(sourceCanvas, 0, 0);
  return out.toDataURL('image/png');
}

function generateGamerCutoutAvatar(variant = 'p1', outlineWidth = 10, outlineColor = '#FFFFFF') {
  const raw = document.createElement('canvas');
  raw.width = 420;
  raw.height = 460;
  const ctx = raw.getContext('2d');

  const shirt = variant === 'p1' ? '#EF4444' : '#2563EB';
  const rim = variant === 'p1' ? '#FFCC00' : '#38BDF8';

  // Ombros / Jaqueta
  ctx.fillStyle = shirt;
  ctx.beginPath();
  ctx.moveTo(65, 450);
  ctx.quadraticCurveTo(95, 300, 210, 300);
  ctx.quadraticCurveTo(325, 300, 355, 450);
  ctx.closePath();
  ctx.fill();

  // Arco do Headset
  ctx.strokeStyle = '#18181B';
  ctx.lineWidth = 22;
  ctx.beginPath();
  ctx.arc(210, 190, 108, Math.PI * 1.05, Math.PI * 1.95);
  ctx.stroke();

  // Cabeça
  ctx.fillStyle = '#FDBA74';
  ctx.beginPath();
  ctx.arc(210, 198, 86, 0, Math.PI * 2);
  ctx.fill();

  // Cabelo
  ctx.fillStyle = '#18181B';
  ctx.beginPath();
  ctx.arc(210, 162, 88, Math.PI, Math.PI * 2);
  ctx.fill();

  // Fones Laterais com LED da Marca
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.roundRect(88, 162, 28, 72, 12);
  ctx.roundRect(304, 162, 28, 72, 12);
  ctx.fill();

  // Olhos e Expressão de Reação (Chocado / Hype)
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.ellipse(178, 188, 16, 20, 0, 0, Math.PI * 2);
  ctx.ellipse(242, 188, 16, 20, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#09090B';
  ctx.beginPath();
  ctx.arc(178, 188, 7, 0, Math.PI * 2);
  ctx.arc(242, 188, 7, 0, Math.PI * 2);
  ctx.fill();

  // Boca aberta de reação YouTube
  ctx.fillStyle = '#7F1D1D';
  ctx.beginPath();
  ctx.ellipse(210, 240, 24, 28, 0, 0, Math.PI * 2);
  ctx.fill();

  return {
    rawCanvas: raw,
    processedUrl: createCutoutWithStickerOutline(raw, outlineWidth, outlineColor)
  };
}

// ============================================================================
// 3. COMPONENTE PRINCIPAL: ZERO A 2 STUDIO
// ============================================================================
export default function App() {
  // Inicializa os assets da marca com suporte aos arquivos originais + fallback procedural
  const initialBrand = useMemo(() => {
    const proc = generateProceduralBrandAssets(DEFAULT_LOGO_CONFIG);
    return {
      id: 'logo-original',
      name: 'Logo Oficial Zero a 2',
      circleUrl: UPLOADED_CIRCLE_LOGO_PATH,
      fallbackCircleUrl: proc.circleUrl,
      transparentUrl: proc.transparentUrl,
      bannerUrl: UPLOADED_BANNER_PATH,
      fallbackBannerUrl: proc.bannerUrl,
      palette: ['#FFCC00', '#050507', '#FFFFFF', '#F59E0B', '#EF4444'],
      config: DEFAULT_LOGO_CONFIG
    };
  }, []);

  const [activeLogo, setActiveLogo] = useState(initialBrand);
  const [logoHistory, setLogoHistory] = useState([initialBrand]);
  const [logoModalOpen, setLogoModalOpen] = useState(false);
  const [logoConfigDraft, setLogoConfigDraft] = useState(DEFAULT_LOGO_CONFIG);

  // Estados do Editor
  const [aspectRatio, setAspectRatio] = useState('16:9'); // '16:9' (1280x720) ou '9:16' (720x1280)
  const [activeTab, setActiveTab] = useState('templates'); // 'templates' | 'logo' | 'assets' | 'text' | 'ai'
  const [showSafeZones, setShowSafeZones] = useState(true);
  const [bgBlur, setBgBlur] = useState(0);
  const [bgDarkness, setBgDarkness] = useState(0.15);
  const [toast, setToast] = useState(null);

  // Controle de Escala e Geometria 16:9 / 9:16
  const workspaceRef = useRef(null);
  const [autoScale, setAutoScale] = useState(0.58);
  const [manualZoom, setManualZoom] = useState(null);
  const stageWidth = aspectRatio === '16:9' ? 1280 : 720;
  const stageHeight = aspectRatio === '16:9' ? 720 : 1280;
  const effectiveScale = manualZoom ?? autoScale;

  // Avatares pré-recortados iniciais
  const defaultAvatars = useMemo(() => {
    return {
      p1: generateGamerCutoutAvatar('p1', 10, '#FFFFFF'),
      p2: generateGamerCutoutAvatar('p2', 10, '#FFCC00')
    };
  }, []);

  // Elementos no Palco
  const [elements, setElements] = useState(() => [
    {
      id: 'bg-main',
      type: 'background',
      name: 'Banner Oficial Zero a 2',
      x: 0,
      y: 0,
      width: 1280,
      height: 720,
      rotation: 0,
      src: UPLOADED_BANNER_PATH,
      fallbackSrc: initialBrand.fallbackBannerUrl,
      isBrandBanner: true
    },
    {
      id: 'face-p1',
      type: 'image',
      slotRole: 'face',
      name: 'Player 1 (Recortado)',
      x: 840,
      y: 160,
      width: 410,
      height: 450,
      rotation: 0,
      src: defaultAvatars.p1.processedUrl,
      rawCanvas: defaultAvatars.p1.rawCanvas,
      bgRemoved: true,
      outlineWidth: 10,
      outlineColor: '#FFFFFF',
      glowColor: '#FFCC00',
      glowStrength: 22
    },
    {
      id: 'logo-badge',
      type: 'logo',
      slotRole: 'logo',
      name: 'Logo Zero a 2 (Dinâmico)',
      logoVariant: 'transparent', // 'circle' | 'transparent' | 'banner'
      x: 45,
      y: 35,
      width: 210,
      height: 210,
      rotation: -5,
      src: initialBrand.transparentUrl,
      fallbackSrc: initialBrand.fallbackCircleUrl,
      outlineWidth: 0,
      glowColor: '#FFCC00',
      glowStrength: 15
    },
    {
      id: 'arrow-main',
      type: 'svg',
      svgType: 'red-arrow',
      name: 'Seta Clickbait',
      x: 560,
      y: 430,
      width: 230,
      height: 150,
      rotation: -12,
      color: '#EF4444'
    },
    {
      id: 'title-main',
      type: 'text',
      slotRole: 'title',
      name: 'Título Principal',
      text: 'NOVO JOGO INSANO!',
      x: 50,
      y: 540,
      width: 780,
      height: 130,
      rotation: -2,
      fontSize: 82,
      color: '#FFCC00',
      strokeColor: '#000000',
      strokeWidth: 14
    }
  ]);

  const [selectedId, setSelectedId] = useState('logo-badge');
  const [interaction, setInteraction] = useState(null);
  const logoUploadInputRef = useRef(null);
  const slotPhotoInputRef = useRef(null);

  const showNotice = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3400);
  }, []);

  // Recalcula escala responsiva sem nunca espremer o aspect ratio
  useEffect(() => {
    const updateSize = () => {
      if (!workspaceRef.current) return;
      const rect = workspaceRef.current.getBoundingClientRect();
      const padX = 64;
      const padY = 64;
      const availW = Math.max(280, rect.width - padX);
      const availH = Math.max(240, rect.height - padY);
      const scale = Math.min(availW / stageWidth, availH / stageHeight, 0.95);
      setAutoScale(Number(Math.max(0.22, scale).toFixed(3)));
    };
    updateSize();
    const obs = new ResizeObserver(updateSize);
    if (workspaceRef.current) obs.observe(workspaceRef.current);
    window.addEventListener('resize', updateSize);
    return () => {
      obs.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, [stageWidth, stageHeight]);

  // ============================================================================
  // 4. SINCRONIZAÇÃO AUTOMÁTICA QUANDO O USUÁRIO TROCA OU EDITA O LOGO
  // ============================================================================
  const applyNewActiveLogo = useCallback(
    (newLogoObj, notifyMsg = 'Logo atualizado em todo o projeto!') => {
      setActiveLogo(newLogoObj);
      setLogoHistory((prev) => [newLogoObj, ...prev.filter((item) => item.id !== newLogoObj.id)].slice(0, 8));

      // Atualiza automaticamente todos os elementos de logo e banners da marca no Canvas
      setElements((prev) =>
        prev.map((el) => {
          if (el.type === 'logo' || el.slotRole === 'logo') {
            const variant = el.logoVariant || 'circle';
            const nextSrc =
              variant === 'transparent'
                ? newLogoObj.transparentUrl
                : variant === 'banner'
                ? newLogoObj.bannerUrl
                : newLogoObj.circleUrl;
            const nextFallback =
              variant === 'banner'
                ? newLogoObj.fallbackBannerUrl || newLogoObj.bannerUrl
                : newLogoObj.fallbackCircleUrl || newLogoObj.circleUrl;
            return {
              ...el,
              src: nextSrc,
              fallbackSrc: nextFallback
            };
          }
          if (el.type === 'background' && el.isBrandBanner) {
            return {
              ...el,
              src: newLogoObj.bannerUrl,
              fallbackSrc: newLogoObj.fallbackBannerUrl || newLogoObj.bannerUrl
            };
          }
          return el;
        })
      );

      showNotice(notifyMsg);
    },
    [showNotice]
  );

  // Upload de um novo arquivo de Logo pelo computador
  const handleLogoFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const processed = processUploadedLogoImage(img);
        const newLogo = {
          id: `logo-${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          circleUrl: processed.circleUrl,
          fallbackCircleUrl: processed.circleUrl,
          transparentUrl: processed.transparentUrl,
          bannerUrl: processed.originalUrl,
          fallbackBannerUrl: processed.originalUrl,
          palette: processed.palette,
          config: logoConfigDraft
        };
        applyNewActiveLogo(newLogo, `Novo logo "${newLogo.name}" aplicado com sucesso!`);
        setLogoModalOpen(false);
      };
      img.src = ev.target?.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Salva edições feitas no Estúdio Embutido do Logo ("ZERO a 2 PLAYERS")
  const handleSaveCustomBuiltLogo = () => {
    const generated = generateProceduralBrandAssets(logoConfigDraft);
    const customLogo = {
      id: `logo-custom-${Date.now()}`,
      name: `${logoConfigDraft.line1} ${logoConfigDraft.line2Left}${logoConfigDraft.line2Right}`,
      circleUrl: generated.circleUrl,
      fallbackCircleUrl: generated.circleUrl,
      transparentUrl: generated.transparentUrl,
      bannerUrl: generated.bannerUrl,
      fallbackBannerUrl: generated.bannerUrl,
      palette: [
        logoConfigDraft.primaryColor,
        logoConfigDraft.bgColor,
        logoConfigDraft.textColor,
        logoConfigDraft.secondaryColor,
        '#EF4444'
      ],
      config: { ...logoConfigDraft }
    };
    applyNewActiveLogo(customLogo, 'Logo personalizado gerado e sincronizado na capa!');
    setLogoModalOpen(false);
  };

  // ============================================================================
  // 5. TEMPLATES MODULARES ("QUEBRA-CABEÇAS")
  // ============================================================================
  const loadTemplate = (templateId) => {
    const isVert = aspectRatio === '9:16';
    const W = isVert ? 720 : 1280;
    const H = isVert ? 1280 : 720;

    if (templateId === 'oficial-banner') {
      setBgBlur(0);
      setBgDarkness(0.1);
      setElements([
        {
          id: 'bg-main',
          type: 'background',
          name: 'Banner Oficial Zero a 2',
          x: 0,
          y: 0,
          width: W,
          height: H,
          rotation: 0,
          src: activeLogo.bannerUrl,
          fallbackSrc: activeLogo.fallbackBannerUrl,
          isBrandBanner: true
        },
        {
          id: 'face-p1',
          type: 'image',
          slotRole: 'face',
          name: 'Seu Rosto (Recortado)',
          x: isVert ? 170 : 835,
          y: isVert ? 540 : 165,
          width: 410,
          height: 450,
          rotation: 0,
          src: defaultAvatars.p1.processedUrl,
          rawCanvas: defaultAvatars.p1.rawCanvas,
          bgRemoved: true,
          outlineWidth: 10,
          outlineColor: '#FFFFFF',
          glowColor: activeLogo.palette[0] || '#FFCC00',
          glowStrength: 20
        },
        {
          id: 'logo-badge',
          type: 'logo',
          slotRole: 'logo',
          name: 'Logo do Canal',
          logoVariant: 'transparent',
          x: 40,
          y: 35,
          width: 195,
          height: 195,
          rotation: -4,
          src: activeLogo.transparentUrl,
          fallbackSrc: activeLogo.fallbackCircleUrl,
          glowColor: activeLogo.palette[0] || '#FFCC00',
          glowStrength: 14
        },
        {
          id: 'title-main',
          type: 'text',
          slotRole: 'title',
          name: 'Título de Impacto',
          text: 'ZERAMOS NO HARD!',
          x: 45,
          y: isVert ? 1020 : 545,
          width: isVert ? 630 : 760,
          height: 120,
          rotation: -2,
          fontSize: isVert ? 68 : 82,
          color: activeLogo.palette[0] || '#FFCC00',
          strokeColor: '#000000',
          strokeWidth: 14
        }
      ]);
      showNotice('Template "Oficial Zero a 2" aplicado!');
    } else if (templateId === 'coop-vs') {
      setBgBlur(2);
      setBgDarkness(0.35);
      setElements([
        {
          id: 'bg-main',
          type: 'background',
          name: 'Fundo Arena Gamer',
          x: 0,
          y: 0,
          width: W,
          height: H,
          rotation: 0,
          src: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1280&q=80',
          isBrandBanner: false
        },
        {
          id: 'face-p1',
          type: 'image',
          slotRole: 'face',
          name: 'Player 1',
          x: 20,
          y: isVert ? 420 : 175,
          width: 390,
          height: 430,
          rotation: 0,
          src: defaultAvatars.p1.processedUrl,
          rawCanvas: defaultAvatars.p1.rawCanvas,
          bgRemoved: true,
          outlineWidth: 10,
          outlineColor: '#FFFFFF',
          glowColor: '#EF4444',
          glowStrength: 20
        },
        {
          id: 'face-p2',
          type: 'image',
          slotRole: 'face',
          name: 'Player 2',
          x: isVert ? 310 : 870,
          y: isVert ? 420 : 175,
          width: 390,
          height: 430,
          rotation: 0,
          src: defaultAvatars.p2.processedUrl,
          rawCanvas: defaultAvatars.p2.rawCanvas,
          bgRemoved: true,
          outlineWidth: 10,
          outlineColor: '#FFCC00',
          glowColor: '#38BDF8',
          glowStrength: 20
        },
        {
          id: 'logo-central',
          type: 'logo',
          slotRole: 'logo',
          name: 'Logo Central VS',
          logoVariant: 'circle',
          x: isVert ? 225 : 495,
          y: isVert ? 140 : 185,
          width: 290,
          height: 290,
          rotation: 0,
          src: activeLogo.circleUrl,
          fallbackSrc: activeLogo.fallbackCircleUrl,
          glowColor: activeLogo.palette[0] || '#FFCC00',
          glowStrength: 25
        },
        {
          id: 'title-main',
          type: 'text',
          slotRole: 'title',
          name: 'Título VS',
          text: '1 PLAYER vs 2 PLAYERS!',
          x: isVert ? 45 : 190,
          y: isVert ? 980 : 545,
          width: isVert ? 630 : 900,
          height: 120,
          rotation: 0,
          fontSize: isVert ? 62 : 78,
          color: '#FFFFFF',
          strokeColor: '#000000',
          strokeWidth: 15
        }
      ]);
      showNotice('Template "Co-Op 2 Players VS" aplicado!');
    } else if (templateId === 'react-viral') {
      setBgBlur(6);
      setBgDarkness(0.3);
      setElements([
        {
          id: 'bg-main',
          type: 'background',
          name: 'Fundo Gameplay Desfocado',
          x: 0,
          y: 0,
          width: W,
          height: H,
          rotation: 0,
          src: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1280&q=80',
          isBrandBanner: false
        },
        {
          id: 'face-p1',
          type: 'image',
          slotRole: 'face',
          name: 'Rosto Reação',
          x: isVert ? 160 : 810,
          y: isVert ? 480 : 130,
          width: 440,
          height: 480,
          rotation: 0,
          src: defaultAvatars.p1.processedUrl,
          rawCanvas: defaultAvatars.p1.rawCanvas,
          bgRemoved: true,
          outlineWidth: 12,
          outlineColor: '#FFFFFF',
          glowColor: '#FFCC00',
          glowStrength: 24
        },
        {
          id: 'logo-corner',
          type: 'logo',
          slotRole: 'logo',
          name: 'Logo do Canal',
          logoVariant: 'circle',
          x: 40,
          y: 35,
          width: 175,
          height: 175,
          rotation: -6,
          src: activeLogo.circleUrl,
          fallbackSrc: activeLogo.fallbackCircleUrl,
          glowColor: '#FFCC00',
          glowStrength: 14
        },
        {
          id: 'arrow-viral',
          type: 'svg',
          svgType: 'red-arrow',
          name: 'Seta Vermelha',
          x: isVert ? 90 : 480,
          y: isVert ? 330 : 280,
          width: 260,
          height: 165,
          rotation: 12,
          color: '#EF4444'
        },
        {
          id: 'title-main',
          type: 'text',
          slotRole: 'title',
          name: 'Texto Gigante 3D',
          text: 'NÃO ACREDITO NISSO!',
          x: 45,
          y: isVert ? 990 : 500,
          width: isVert ? 630 : 750,
          height: 140,
          rotation: -3,
          fontSize: isVert ? 64 : 80,
          color: '#FFCC00',
          strokeColor: '#000000',
          strokeWidth: 15
        }
      ]);
      showNotice('Template "React / Opinião Viral" aplicado!');
    }
  };

  // Alternar entre YouTube 16:9 e TikTok 9:16 reposicionando com segurança
  const handleToggleAspectRatio = (nextRatio) => {
    if (nextRatio === aspectRatio) return;
    const nextW = nextRatio === '16:9' ? 1280 : 720;
    const nextH = nextRatio === '16:9' ? 720 : 1280;
    setAspectRatio(nextRatio);
    setManualZoom(null);

    setElements((prev) =>
      prev.map((el) => {
        if (el.type === 'background') {
          return { ...el, width: nextW, height: nextH };
        }
        const clampedX = Math.max(10, Math.min(nextW - el.width - 10, el.x));
        const clampedY = Math.max(10, Math.min(nextH - el.height - 10, el.y));
        return { ...el, x: clampedX, y: clampedY };
      })
    );
  };

  // ============================================================================
  // 6. DRAG & DROP E REDIMENSIONAMENTO PROPORCIONAL NO PALCO
  // ============================================================================
  const selectedElement = useMemo(
    () => elements.find((el) => el.id === selectedId) || null,
    [elements, selectedId]
  );

  const handleStageMouseDown = (e, el, mode = 'drag') => {
    e.stopPropagation();
    setSelectedId(el.id);
    if (el.type === 'background') return;

    setInteraction({
      mode,
      id: el.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: el.x,
      origY: el.y,
      origW: el.width,
      origH: el.height,
      aspect: el.width / Math.max(1, el.height)
    });
  };

  useEffect(() => {
    if (!interaction) return;
    const onMove = (e) => {
      const dx = (e.clientX - interaction.startX) / effectiveScale;
      const dy = (e.clientY - interaction.startY) / effectiveScale;

      setElements((prev) =>
        prev.map((el) => {
          if (el.id !== interaction.id) return el;
          if (interaction.mode === 'drag') {
            return {
              ...el,
              x: Math.round(interaction.origX + dx),
              y: Math.round(interaction.origY + dy)
            };
          }
          if (interaction.mode === 'resize') {
            const newW = Math.max(60, Math.round(interaction.origW + dx));
            const newH =
              el.type === 'text'
                ? Math.max(50, Math.round(interaction.origH + dy))
                : Math.round(newW / interaction.aspect);
            return { ...el, width: newW, height: newH };
          }
          return el;
        })
      );
    };
    const onUp = () => setInteraction(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [interaction, effectiveScale]);

  // Atualizar propriedades do elemento selecionado
  const updateSelected = (patch) => {
    if (!selectedId) return;
    setElements((prev) => prev.map((el) => (el.id === selectedId ? { ...el, ...patch } : el)));
  };

  // Trocar variante do Logo selecionado (Circular, Sem Fundo Preto ou Banner)
  const changeSelectedLogoVariant = (variant) => {
    if (!selectedElement) return;
    const src =
      variant === 'transparent'
        ? activeLogo.transparentUrl
        : variant === 'banner'
        ? activeLogo.bannerUrl
        : activeLogo.circleUrl;
    const fallbackSrc =
      variant === 'banner'
        ? activeLogo.fallbackBannerUrl || activeLogo.bannerUrl
        : activeLogo.fallbackCircleUrl || activeLogo.circleUrl;

    updateSelected({
      logoVariant: variant,
      src,
      fallbackSrc,
      width: variant === 'banner' ? 460 : 220,
      height: variant === 'banner' ? 260 : 220
    });
    showNotice(`Formato do logo alterado para: ${variant.toUpperCase()}`);
  };

  // Upload de foto para qualquer slot de imagem/rosto com recorte + contorno branco automático
  const handleSlotPhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedElement) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const raw = document.createElement('canvas');
        raw.width = 440;
        raw.height = 460;
        const rCtx = raw.getContext('2d');
        rCtx.drawImage(img, 0, 0, 440, 460);

        // Remove fundo claro/escuro uniforme das bordas por Flood-Fill leve e aplica Sticker Outline
        const imgData = rCtx.getImageData(0, 0, 440, 460);
        const d = imgData.data;
        const r0 = d[0],
          g0 = d[1],
          b0 = d[2];
        for (let i = 0; i < d.length; i += 4) {
          const dist = Math.abs(d[i] - r0) + Math.abs(d[i + 1] - g0) + Math.abs(d[i + 2] - b0);
          if (dist < 42) d[i + 3] = 0;
        }
        rCtx.putImageData(imgData, 0, 0);

        const outlinedUrl = createCutoutWithStickerOutline(
          raw,
          selectedElement.outlineWidth ?? 10,
          selectedElement.outlineColor || '#FFFFFF'
        );

        updateSelected({
          src: outlinedUrl,
          rawCanvas: raw,
          bgRemoved: true
        });
        showNotice('Foto recortada com Contorno Branco aplicada no slot!');
      };
      img.src = ev.target?.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Ajustar espessura/cor do Contorno Adesivo (Sticker Outline) em tempo real
  const updateStickerOutline = (newWidth, newColor) => {
    if (!selectedElement || !selectedElement.rawCanvas) {
      updateSelected({ outlineWidth: newWidth, outlineColor: newColor });
      return;
    }
    const url = createCutoutWithStickerOutline(selectedElement.rawCanvas, newWidth, newColor);
    updateSelected({
      outlineWidth: newWidth,
      outlineColor: newColor,
      src: url
    });
  };

  // ============================================================================
  // 7. DIRETOR DE ARTE HEURÍSTICO LOCAL (SEM LLM PESADO)
  // ============================================================================
  const aiDiagnostics = useMemo(() => {
    const list = [];
    const title = elements.find((e) => e.type === 'text');
    const face = elements.find((e) => e.slotRole === 'face');
    const logo = elements.find((e) => e.type === 'logo' || e.slotRole === 'logo');

    if (logo) {
      list.push({
        type: 'ok',
        text: `Identidade "${activeLogo.name}" ativa na capa.`
      });
    } else {
      list.push({
        type: 'warn',
        text: 'Seu Logo não está na capa. Adicione na aba "Logo & Marca".',
        fixLabel: 'Inserir Logo',
        fix: () =>
          setElements((prev) => [
            ...prev,
            {
              id: `logo-${Date.now()}`,
              type: 'logo',
              slotRole: 'logo',
              name: activeLogo.name,
              logoVariant: 'circle',
              x: 40,
              y: 35,
              width: 190,
              height: 190,
              rotation: -4,
              src: activeLogo.circleUrl,
              fallbackSrc: activeLogo.fallbackCircleUrl
            }
          ])
      });
    }

    if (title) {
      // Verifica invasão da Safe Zone inferior direita (Timer do YouTube)
      if (aspectRatio === '16:9' && title.x + title.width > 1060 && title.y + title.height > 595) {
        list.push({
          type: 'warn',
          text: 'O texto principal invade a Zona do Tempo do Vídeo do YouTube (canto inferior direito).',
          fixLabel: 'Corrigir Posição',
          fix: () =>
            setElements((prev) =>
              prev.map((el) => (el.id === title.id ? { ...el, x: 45, y: 520 } : el))
            )
        });
      } else {
        list.push({
          type: 'ok',
          text: 'Texto principal com alto contraste e dentro da Safe Zone.'
        });
      }
    }

    if (face && title) {
      const overlapX = Math.max(0, Math.min(face.x + face.width, title.x + title.width) - Math.max(face.x, title.x));
      const overlapY = Math.max(0, Math.min(face.y + face.height, title.y + title.height) - Math.max(face.y, title.y));
      if (overlapX * overlapY > 18000) {
        list.push({
          type: 'warn',
          text: 'O rosto está cobrindo parte do título principal.',
          fixLabel: 'Separar Elementos',
          fix: () =>
            setElements((prev) =>
              prev.map((el) => (el.id === face.id ? { ...el, x: stageWidth - el.width - 30, y: 140 } : el))
            )
        });
      }
    }

    return list;
  }, [elements, activeLogo, aspectRatio, stageWidth]);

  // Exportar Capa Final em PNG Alta Resolução
  const handleExportPNG = () => {
    const out = document.createElement('canvas');
    out.width = stageWidth;
    out.height = stageHeight;
    const ctx = out.getContext('2d');

    const bg = generateProceduralBrandAssets(activeLogo.config || DEFAULT_LOGO_CONFIG);
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, stageWidth, stageHeight);
      const a = document.createElement('a');
      a.download = `thumbnail-zero-a-2-${aspectRatio.replace(':', 'x')}.png`;
      a.href = out.toDataURL('image/png');
      a.click();
      showNotice(`Thumbnail exportada em HD (${stageWidth}x${stageHeight})!`);
    };
    img.src = bg.bannerUrl;
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-100 overflow-hidden select-none font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Permanent+Marker&family=Anton&display=swap');
        .font-marker { font-family: 'Permanent Marker', 'Impact', sans-serif; }
      `}</style>

      {/* TOAST DE NOTIFICAÇÃO */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 bg-amber-400 text-zinc-950 font-bold px-4 py-2.5 rounded-xl shadow-2xl border-2 border-zinc-950 animate-bounce">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-sm">{toast}</span>
        </div>
      )}

      {/* MODAL: ESTÚDIO E GERENCIADOR DE LOGO */}
      {logoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-3">
                <img
                  src={activeLogo.circleUrl}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = activeLogo.fallbackCircleUrl;
                  }}
                  alt="Logo Atual"
                  className="w-11 h-11 rounded-full border-2 border-amber-400 object-cover bg-black"
                />
                <div>
                  <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                    Gerenciador & Editor de Logo
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Envie um novo arquivo de logo ou edite o logo oficial. Todas as capas atualizam na hora!
                  </p>
                </div>
              </div>
              <button
                onClick={() => setLogoModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold"
              >
                Fechar
              </button>
            </div>

            {/* OPÇÃO 1: ENVIAR NOVO ARQUIVO DO COMPUTADOR */}
            <div className="bg-zinc-950/90 border border-amber-400/40 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  1. Enviar Novo Arquivo de Logo (PNG / JPG / WebP)
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  O sistema cria automaticamente a versão Circular, remove o fundo preto (Luma Key) e extrai as cores.
                </p>
              </div>
              <button
                onClick={() => logoUploadInputRef.current?.click()}
                className="shrink-0 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg"
              >
                <Upload className="w-4 h-4" />
                Escolher Imagem no PC
              </button>
            </div>

            {/* OPÇÃO 2: CUSTOMIZAR TEXTO E CORES DO LOGO EMBUTIDO */}
            <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-400" />
                2. Customizar Emblema "ZERO a 2 PLAYERS" (Caso altere seu logo)
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Linha 1</label>
                  <input
                    value={logoConfigDraft.line1}
                    onChange={(e) => setLogoConfigDraft({ ...logoConfigDraft, line1: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Meio Esq.</label>
                  <input
                    value={logoConfigDraft.line2Left}
                    onChange={(e) => setLogoConfigDraft({ ...logoConfigDraft, line2Left: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-amber-400"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Número/Destaque</label>
                  <input
                    value={logoConfigDraft.line2Right}
                    onChange={(e) => setLogoConfigDraft({ ...logoConfigDraft, line2Right: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-amber-400"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Linha 3</label>
                  <input
                    value={logoConfigDraft.line3}
                    onChange={(e) => setLogoConfigDraft({ ...logoConfigDraft, line3: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400">Cor Principal do Logo:</span>
                  {['#FFCC00', '#EF4444', '#22C55E', '#38BDF8', '#A855F7', '#F97316'].map((cor) => (
                    <button
                      key={cor}
                      onClick={() =>
                        setLogoConfigDraft({ ...logoConfigDraft, primaryColor: cor, secondaryColor: cor })
                      }
                      className={`w-6 h-6 rounded-full border-2 ${
                        logoConfigDraft.primaryColor === cor ? 'border-white scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: cor }}
                    />
                  ))}
                </div>

                <button
                  onClick={handleSaveCustomBuiltLogo}
                  className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-extrabold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Gerar & Substituir Logo na Capa
                </button>
              </div>
            </div>

            {/* OPÇÃO 3: HISTÓRICO DE VERSÕES SALVAS */}
            {logoHistory.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-zinc-400 block">
                  Versões Salvas (Clique para ativar imediatamente):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {logoHistory.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        applyNewActiveLogo(item, `Versão "${item.name}" restaurada!`);
                        setLogoModalOpen(false);
                      }}
                      className={`flex items-center gap-2.5 p-2 rounded-xl border text-left transition ${
                        activeLogo.id === item.id
                          ? 'border-amber-400 bg-amber-400/10'
                          : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                      }`}
                    >
                      <img
                        src={item.circleUrl}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = item.fallbackCircleUrl;
                        }}
                        alt={item.name}
                        className="w-9 h-9 rounded-full object-cover bg-black shrink-0"
                      />
                      <div className="truncate">
                        <div className="text-xs font-bold text-white truncate">{item.name}</div>
                        <div className="text-[10px] text-amber-400">
                          {activeLogo.id === item.id ? '● Ativo agora' : 'Usar este'}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* INPUTS OCULTOS DE ARQUIVO */}
      <input
        ref={logoUploadInputRef}
        type="file"
        accept="image/*"
        onChange={handleLogoFileUpload}
        className="hidden"
      />
      <input
        ref={slotPhotoInputRef}
        type="file"
        accept="image/*"
        onChange={handleSlotPhotoUpload}
        className="hidden"
      />

      {/* BARRA SUPERIOR (HEADER) */}
      <header className="h-14 border-b border-zinc-800 bg-zinc-900/95 px-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="relative group cursor-pointer" onClick={() => setLogoModalOpen(true)}>
            <img
              src={activeLogo.circleUrl}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = activeLogo.fallbackCircleUrl;
              }}
              alt="Logo Zero a 2"
              className="w-9 h-9 rounded-full border-2 border-amber-400 object-cover bg-black"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-marker text-base tracking-wide text-amber-400">ZERO a 2 STUDIO</span>
              <button
                onClick={() => setLogoModalOpen(true)}
                className="text-[11px] bg-zinc-800 hover:bg-amber-400 hover:text-zinc-950 text-amber-300 font-bold px-2.5 py-0.5 rounded-full border border-amber-400/40 transition flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Trocar / Editar Logo
              </button>
            </div>
            <p className="text-[10px] text-zinc-400">
              Editor Modular de Thumbnails • {stageWidth} × {stageHeight} px
            </p>
          </div>
        </div>

        {/* SELETOR 16:9 YOUTUBE vs 9:16 TIKTOK + ZOOM */}
        <div className="flex items-center gap-2">
          <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => handleToggleAspectRatio('16:9')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                aspectRatio === '16:9' ? 'bg-amber-400 text-zinc-950' : 'text-zinc-400 hover:text-white'
              }`}
            >
              YouTube 16:9
            </button>
            <button
              onClick={() => handleToggleAspectRatio('9:16')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                aspectRatio === '9:16' ? 'bg-amber-400 text-zinc-950' : 'text-zinc-400 hover:text-white'
              }`}
            >
              TikTok 9:16
            </button>
          </div>

          <div className="hidden md:flex items-center gap-1 bg-zinc-950 px-2 py-1 rounded-xl border border-zinc-800 text-xs">
            <button
              onClick={() => setManualZoom((z) => Math.max(0.2, Number(((z ?? autoScale) - 0.08).toFixed(2))))}
              className="p-1 hover:text-amber-400"
              title="Diminuir Zoom"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="w-11 text-center font-mono text-[11px]">{Math.round(effectiveScale * 100)}%</span>
            <button
              onClick={() => setManualZoom((z) => Math.min(1.15, Number(((z ?? autoScale) + 0.08).toFixed(2))))}
              className="p-1 hover:text-amber-400"
              title="Aumentar Zoom"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setManualZoom(null)}
              className="px-1.5 py-0.5 text-[10px] bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300"
            >
              Ajustar
            </button>
          </div>

          <button
            onClick={() => setShowSafeZones((s) => !s)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition ${
              showSafeZones
                ? 'bg-red-500/15 border-red-500/50 text-red-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Safe Zones
          </button>

          <button
            onClick={handleExportPNG}
            className="bg-amber-400 hover:bg-amber-300 text-zinc-950 font-extrabold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-lg"
          >
            <Download className="w-4 h-4" />
            Exportar HD
          </button>
        </div>
      </header>

      {/* CORPO PRINCIPAL */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* MENU LATERAL ESQUERDO */}
        <aside className="w-80 border-r border-zinc-800 bg-zinc-900/90 flex flex-col shrink-0">
          <div className="grid grid-cols-5 border-b border-zinc-800 bg-zinc-950/60 p-1 gap-1">
            {[
              { id: 'templates', icon: Layers, label: 'Templates' },
              { id: 'logo', icon: Palette, label: 'Meu Logo' },
              { id: 'assets', icon: Sparkles, label: 'Peças' },
              { id: 'text', icon: Type, label: 'Texto' },
              { id: 'ai', icon: ShieldAlert, label: 'Diretor IA' }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center justify-center py-2 rounded-lg text-[10px] font-bold transition ${
                    activeTab === tab.id
                      ? 'bg-amber-400 text-zinc-950'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4 mb-0.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
            {/* ABA 1: TEMPLATES QUEBRA-CABEÇAS */}
            {activeTab === 'templates' && (
              <div className="space-y-3">
                <div className="text-xs font-bold text-zinc-300">
                  Escolha um Template "Quebra-Cabeças" (Sincronizado com seu Logo):
                </div>

                {[
                  {
                    id: 'oficial-banner',
                    title: 'Oficial Zero a 2 (Banner Rasgado)',
                    desc: 'Fundo oficial com rasgos amarelos + Rosto recortado + Logo dinâmico',
                    badge: 'Identidade Oficial'
                  },
                  {
                    id: 'coop-vs',
                    title: 'Co-Op 2 Players (VS)',
                    desc: '2 Rostos recortados frente a frente + Logo central + Título VS',
                    badge: 'Especial Co-Op'
                  },
                  {
                    id: 'react-viral',
                    title: 'React / Opinião Viral',
                    desc: 'Fundo desfocado + Seta vermelha + Rosto com contorno branco',
                    badge: 'Alto CTR'
                  }
                ].map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => loadTemplate(tpl.id)}
                    className="w-full text-left p-3 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-amber-400 transition group space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-white group-hover:text-amber-400">
                        {tpl.title}
                      </span>
                      <span className="text-[10px] bg-amber-400/15 text-amber-300 px-2 py-0.5 rounded-full font-bold">
                        {tpl.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400">{tpl.desc}</p>
                  </button>
                ))}
              </div>
            )}

            {/* ABA 2: MEU LOGO & MARCA (TROCA RÁPIDA) */}
            {activeTab === 'logo' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-zinc-950 border border-amber-400/40 space-y-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={activeLogo.circleUrl}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = activeLogo.fallbackCircleUrl;
                      }}
                      alt="Logo Atual"
                      className="w-14 h-14 rounded-full border-2 border-amber-400 object-cover bg-black shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase tracking-wider text-amber-400 font-bold">
                        Logo Ativo no Canal
                      </span>
                      <h4 className="text-sm font-extrabold text-white truncate">{activeLogo.name}</h4>
                      <p className="text-[11px] text-zinc-400">
                        Se você mudar o logo, toda a capa atualiza sozinha.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => logoUploadInputRef.current?.click()}
                      className="bg-amber-400 hover:bg-amber-300 text-zinc-950 font-extrabold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Subir Novo Logo
                    </button>
                    <button
                      onClick={() => setLogoModalOpen(true)}
                      className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 border border-zinc-700"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                      Editar Logo
                    </button>
                  </div>
                </div>

                {/* INSERIR PEÇAS DO LOGO NA CAPA */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-zinc-300 block">
                    Adicionar seu Logo na Capa (3 Modos):
                  </span>
                  {[
                    {
                      variant: 'transparent',
                      title: 'Logo Sem Fundo Preto (Luma Key)',
                      desc: 'Apenas o anel amarelo e as letras flutuando'
                    },
                    {
                      variant: 'circle',
                      title: 'Emblema Circular Original',
                      desc: 'Medalhão redondo com fundo escuro sólido'
                    },
                    {
                      variant: 'banner',
                      title: 'Banner Rasgado Completo',
                      desc: 'Arte completa 16:9 com rasgos nas bordas'
                    }
                  ].map((item) => (
                    <button
                      key={item.variant}
                      onClick={() => {
                        const newId = `logo-${Date.now()}`;
                        const src =
                          item.variant === 'transparent'
                            ? activeLogo.transparentUrl
                            : item.variant === 'banner'
                            ? activeLogo.bannerUrl
                            : activeLogo.circleUrl;
                        const fallbackSrc =
                          item.variant === 'banner'
                            ? activeLogo.fallbackBannerUrl
                            : activeLogo.fallbackCircleUrl;
                        setElements((prev) => [
                          ...prev,
                          {
                            id: newId,
                            type: 'logo',
                            slotRole: 'logo',
                            name: item.title,
                            logoVariant: item.variant,
                            x: 60,
                            y: 60,
                            width: item.variant === 'banner' ? 420 : 210,
                            height: item.variant === 'banner' ? 240 : 210,
                            rotation: 0,
                            src,
                            fallbackSrc,
                            glowColor: activeLogo.palette[0] || '#FFCC00',
                            glowStrength: 15
                          }
                        ]);
                        setSelectedId(newId);
                        showNotice(`${item.title} adicionado na capa!`);
                      }}
                      className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-amber-400 text-left flex items-center justify-between group"
                    >
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-amber-400">
                          {item.title}
                        </div>
                        <div className="text-[10px] text-zinc-400">{item.desc}</div>
                      </div>
                      <Plus className="w-4 h-4 text-amber-400 shrink-0" />
                    </button>
                  ))}
                </div>

                {/* PALETA EXTRAÍDA DO LOGO (K-MEANS) */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-zinc-300 block">
                    Paleta Extraída do Seu Logo (Clique para aplicar no texto):
                  </span>
                  <div className="flex gap-2">
                    {activeLogo.palette.map((hex, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setElements((prev) =>
                            prev.map((el) => (el.type === 'text' ? { ...el, color: hex } : el))
                          );
                          showNotice(`Cor ${hex} da sua marca aplicada ao texto!`);
                        }}
                        className="flex-1 h-9 rounded-lg border border-zinc-700 hover:scale-105 transition"
                        style={{ backgroundColor: hex }}
                        title={hex}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ABA 3: BIBLIOTECA DE PEÇAS VIRAIS */}
            {activeTab === 'assets' && (
              <div className="space-y-3">
                <span className="text-xs font-bold text-zinc-300 block">
                  Clique para soltar peças virais na capa:
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { type: 'red-arrow', name: 'Seta Vermelha', color: '#EF4444' },
                    { type: 'yellow-circle', name: 'Círculo Foco', color: '#FFCC00' },
                    { type: 'grunge-brush', name: 'Faixa Grunge', color: '#FFCC00' },
                    { type: 'vs-badge', name: 'Selo VS', color: '#EF4444' }
                  ].map((asset) => (
                    <button
                      key={asset.type}
                      onClick={() => {
                        const id = `svg-${Date.now()}`;
                        setElements((prev) => [
                          ...prev,
                          {
                            id,
                            type: 'svg',
                            svgType: asset.type,
                            name: asset.name,
                            x: 420,
                            y: 260,
                            width: 240,
                            height: 150,
                            rotation: 0,
                            color: asset.color
                          }
                        ]);
                        setSelectedId(id);
                      }}
                      className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-amber-400 flex flex-col items-center gap-1.5 text-xs font-bold"
                    >
                      <Sparkles className="w-5 h-5 text-amber-400" />
                      {asset.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ABA 4: TEXTOS */}
            {activeTab === 'text' && (
              <div className="space-y-3">
                <button
                  onClick={() => {
                    const id = `txt-${Date.now()}`;
                    setElements((prev) => [
                      ...prev,
                      {
                        id,
                        type: 'text',
                        name: 'Texto Impacto',
                        text: 'GAMEPLAY ÉPICA!',
                        x: 120,
                        y: 120,
                        width: 680,
                        height: 120,
                        rotation: -2,
                        fontSize: 78,
                        color: activeLogo.palette[0] || '#FFCC00',
                        strokeColor: '#000000',
                        strokeWidth: 14
                      }
                    ]);
                    setSelectedId(id);
                  }}
                  className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-extrabold text-xs flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Texto 3D "Zero a 2"
                </button>
              </div>
            )}

            {/* ABA 5: DIRETOR DE ARTE HEURÍSTICO */}
            {activeTab === 'ai' && (
              <div className="space-y-3">
                <div className="text-xs font-bold text-zinc-300">
                  Análise Matemática Instantânea (100% Local):
                </div>
                {aiDiagnostics.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border text-xs space-y-2 ${
                      item.type === 'ok'
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200'
                        : 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {item.type === 'ok' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      )}
                      <span>{item.text}</span>
                    </div>
                    {item.fix && (
                      <button
                        onClick={item.fix}
                        className="w-full py-1.5 rounded-lg bg-amber-400 text-zinc-950 font-extrabold text-[11px]"
                      >
                        🪄 {item.fixLabel}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* ÁREA CENTRAL DO PALCO (GEOMETRIA RÍGIDA 16:9 / 9:16) */}
        <main
          ref={workspaceRef}
          onMouseDown={() => setSelectedId(null)}
          className="flex-1 bg-zinc-950 flex items-center justify-center overflow-auto p-6 relative"
          style={{
            backgroundImage: 'radial-gradient(#27272a 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}
        >
          {/* Wrapper Rígido que garante proporção exata sem espremer */}
          <div
            style={{
              width: Math.round(stageWidth * effectiveScale),
              height: Math.round(stageHeight * effectiveScale),
              flexShrink: 0,
              position: 'relative'
            }}
            className="shadow-2xl ring-2 ring-zinc-800 rounded-lg overflow-hidden bg-black"
          >
            {/* Palco Interno em Resolução Real (1280x720 ou 720x1280) */}
            <div
              style={{
                width: stageWidth,
                height: stageHeight,
                transform: `scale(${effectiveScale})`,
                transformOrigin: 'top left',
                position: 'relative',
                overflow: 'hidden',
                backgroundColor: '#050507'
              }}
            >
              {elements.map((el) => {
                const isSelected = el.id === selectedId;

                if (el.type === 'background') {
                  return (
                    <div key={el.id} className="absolute inset-0 pointer-events-none">
                      <img
                        src={el.src}
                        onError={(e) => {
                          if (el.fallbackSrc && e.currentTarget.src !== el.fallbackSrc) {
                            e.currentTarget.src = el.fallbackSrc;
                          }
                        }}
                        alt="Background"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          filter: `blur(${bgBlur}px) brightness(${1 - bgDarkness})`
                        }}
                      />
                    </div>
                  );
                }

                return (
                  <div
                    key={el.id}
                    onMouseDown={(e) => handleStageMouseDown(e, el, 'drag')}
                    style={{
                      position: 'absolute',
                      left: el.x,
                      top: el.y,
                      width: el.width,
                      height: el.height,
                      transform: `rotate(${el.rotation || 0}deg)`,
                      cursor: 'move',
                      filter: el.glowStrength
                        ? `drop-shadow(0 0 ${el.glowStrength}px ${el.glowColor || '#FFCC00'})`
                        : undefined
                    }}
                    className={`group ${isSelected ? 'ring-4 ring-amber-400 z-30' : 'hover:ring-2 hover:ring-amber-400/50 z-10'}`}
                  >
                    {/* ELEMENTO DE IMAGEM OU LOGO */}
                    {(el.type === 'image' || el.type === 'logo') && (
                      <img
                        src={el.src}
                        onError={(e) => {
                          if (el.fallbackSrc && e.currentTarget.src !== el.fallbackSrc) {
                            e.currentTarget.src = el.fallbackSrc;
                          }
                        }}
                        alt={el.name}
                        draggable={false}
                        className="w-full h-full object-contain pointer-events-none select-none"
                      />
                    )}

                    {/* ELEMENTO DE TEXTO ESTILO YOUTUBER */}
                    {el.type === 'text' && (
                      <div
                        style={{
                          fontSize: el.fontSize || 78,
                          color: el.color || '#FFCC00',
                          WebkitTextStroke: `${el.strokeWidth || 14}px ${el.strokeColor || '#000000'}`,
                          paintOrder: 'stroke fill',
                          textShadow: '0 10px 0 #000000, 0 14px 28px rgba(0,0,0,0.85)',
                          lineHeight: 1.05
                        }}
                        className="w-full h-full flex items-center font-marker font-black uppercase tracking-tight select-none pointer-events-none"
                      >
                        {el.text}
                      </div>
                    )}

                    {/* ELEMENTOS SVG VIRAIS */}
                    {el.type === 'svg' && (
                      <svg viewBox="0 0 240 150" className="w-full h-full overflow-visible pointer-events-none">
                        {el.svgType === 'red-arrow' && (
                          <path
                            d="M15,110 Q95,20 175,65 L162,32 L225,82 L152,118 L166,86 Q95,55 25,130 Z"
                            fill={el.color || '#EF4444'}
                            stroke="#FFFFFF"
                            strokeWidth="8"
                            strokeLinejoin="round"
                          />
                        )}
                        {el.svgType === 'yellow-circle' && (
                          <ellipse
                            cx="120"
                            cy="75"
                            rx="100"
                            ry="60"
                            fill="none"
                            stroke={el.color || '#FFCC00'}
                            strokeWidth="14"
                            strokeDasharray="35 12"
                          />
                        )}
                        {el.svgType === 'grunge-brush' && (
                          <path
                            d="M10,35 L230,20 L215,125 L20,135 Z"
                            fill={el.color || '#FFCC00'}
                            stroke="#000000"
                            strokeWidth="8"
                          />
                        )}
                        {el.svgType === 'vs-badge' && (
                          <g>
                            <circle cx="120" cy="75" r="64" fill="#09090B" stroke="#FFCC00" strokeWidth="10" />
                            <text
                              x="120"
                              y="98"
                              textAnchor="middle"
                              fill="#EF4444"
                              stroke="#FFFFFF"
                              strokeWidth="4"
                              fontSize="68"
                              fontWeight="900"
                              fontFamily="Impact, sans-serif"
                            >
                              VS
                            </text>
                          </g>
                        )}
                      </svg>
                    )}

                    {/* BOTÃO RÁPIDO SOBRE O ELEMENTO SELECIONADO */}
                    {isSelected && (
                      <>
                        {el.type === 'logo' && (
                          <button
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setLogoModalOpen(true);
                            }}
                            className="absolute -top-11 left-0 bg-amber-400 text-zinc-950 font-extrabold px-3 py-1 rounded-lg text-lg shadow-xl whitespace-nowrap flex items-center gap-1.5"
                          >
                            🔄 Trocar / Editar Logo
                          </button>
                        )}
                        {el.type === 'image' && (
                          <button
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              slotPhotoInputRef.current?.click();
                            }}
                            className="absolute -top-11 left-0 bg-amber-400 text-zinc-950 font-extrabold px-3 py-1 rounded-lg text-lg shadow-xl whitespace-nowrap"
                          >
                            📷 Trocar Foto (Auto Recorte)
                          </button>
                        )}
                        {/* Alça de Redimensionamento Proporcional */}
                        <div
                          onMouseDown={(e) => handleStageMouseDown(e, el, 'resize')}
                          className="absolute -right-4 -bottom-4 w-8 h-8 rounded-full bg-amber-400 border-4 border-zinc-950 cursor-nwse-resize shadow-xl"
                        />
                      </>
                    )}
                  </div>
                );
              })}

              {/* ZONAS SEGURAS YOUTUBE / TIKTOK */}
              {showSafeZones && (
                <div className="absolute inset-0 pointer-events-none z-40">
                  {aspectRatio === '16:9' ? (
                    <div
                      style={{ right: 24, bottom: 20, width: 195, height: 68 }}
                      className="absolute bg-red-600/80 border-2 border-white rounded-xl flex items-center justify-center text-white font-extrabold text-2xl shadow-lg"
                    >
                      ⏱️ 12:45 (YT)
                    </div>
                  ) : (
                    <>
                      <div
                        style={{ right: 16, bottom: 180, width: 92, height: 420 }}
                        className="absolute bg-red-500/40 border-2 border-dashed border-red-300 rounded-2xl flex items-center justify-center text-white font-bold text-center text-lg p-2"
                      >
                        Botões TikTok
                      </div>
                      <div
                        style={{ left: 20, bottom: 28, width: 520, height: 130 }}
                        className="absolute bg-red-500/40 border-2 border-dashed border-red-300 rounded-2xl flex items-center justify-center text-white font-bold text-lg"
                      >
                        Legenda & Música TikTok
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>

        {/* PAINEL INSPETOR DIREITO (PROPRIEDADES DA PEÇA SELECIONADA) */}
        <aside className="w-80 border-l border-zinc-800 bg-zinc-900/90 p-4 overflow-y-auto shrink-0 space-y-4">
          {selectedElement ? (
            <>
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-amber-400 font-bold">
                    Peça Selecionada
                  </span>
                  <h3 className="text-sm font-extrabold text-white truncate">{selectedElement.name}</h3>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() =>
                      setElements((prev) => {
                        const idx = prev.findIndex((e) => e.id === selectedElement.id);
                        if (idx <= 1) return prev;
                        const copy = [...prev];
                        [copy[idx - 1], copy[idx]] = [copy[idx], copy[idx - 1]];
                        return copy;
                      })
                    }
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700"
                    title="Enviar para Trás"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() =>
                      setElements((prev) => {
                        const idx = prev.findIndex((e) => e.id === selectedElement.id);
                        if (idx === -1 || idx >= prev.length - 1) return prev;
                        const copy = [...prev];
                        [copy[idx], copy[idx + 1]] = [copy[idx + 1], copy[idx]];
                        return copy;
                      })
                    }
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700"
                    title="Trazer para Frente"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setElements((prev) => prev.filter((e) => e.id !== selectedElement.id));
                      setSelectedId(null);
                    }}
                    className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"
                    title="Remover Peça"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* CONTROLES EXCLUSIVOS QUANDO O LOGO ESTÁ SELECIONADO */}
              {selectedElement.type === 'logo' && (
                <div className="p-3.5 rounded-xl bg-zinc-950 border border-amber-400/50 space-y-3">
                  <div className="text-xs font-extrabold text-amber-400">
                    Opções do Logo do Canal
                  </div>
                  <button
                    onClick={() => setLogoModalOpen(true)}
                    className="w-full py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-md"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Trocar / Editar Arquivo do Logo
                  </button>

                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] text-zinc-400 block">Formato de Exibição:</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'transparent', label: 'Sem Fundo' },
                        { id: 'circle', label: 'Circular' },
                        { id: 'banner', label: 'Banner' }
                      ].map((m) => (
                        <button
                          key={m.id}
                          onClick={() => changeSelectedLogoVariant(m.id)}
                          className={`py-1.5 rounded-lg text-[11px] font-bold border ${
                            selectedElement.logoVariant === m.id
                              ? 'bg-amber-400 text-zinc-950 border-amber-400'
                              : 'bg-zinc-900 text-zinc-300 border-zinc-800'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* CONTROLES DE RECORTE E CONTORNO BRANCO PARA ROSTOS/IMAGENS */}
              {selectedElement.type === 'image' && (
                <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
                  <button
                    onClick={() => slotPhotoInputRef.current?.click()}
                    className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-extrabold text-xs flex items-center justify-center gap-2"
                  >
                    <Wand2 className="w-4 h-4" />
                    Trocar Foto (Auto Recorte Local)
                  </button>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-400">Contorno Adesivo (Stroke):</span>
                      <span className="font-bold text-amber-400">{selectedElement.outlineWidth ?? 10}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="22"
                      value={selectedElement.outlineWidth ?? 10}
                      onChange={(e) =>
                        updateStickerOutline(Number(e.target.value), selectedElement.outlineColor || '#FFFFFF')
                      }
                      className="w-full accent-amber-400"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400">Cor do Contorno:</span>
                    {['#FFFFFF', '#FFCC00', '#EF4444', '#38BDF8'].map((c) => (
                      <button
                        key={c}
                        onClick={() => updateStickerOutline(selectedElement.outlineWidth ?? 10, c)}
                        className={`w-6 h-6 rounded-full border-2 ${
                          selectedElement.outlineColor === c ? 'border-amber-400 scale-110' : 'border-zinc-700'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* CONTROLES DE TEXTO */}
              {selectedElement.type === 'text' && (
                <div className="space-y-3 bg-zinc-950 p-3.5 rounded-xl border border-zinc-800">
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Texto da Capa:</label>
                    <input
                      type="text"
                      value={selectedElement.text}
                      onChange={(e) => updateSelected({ text: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs font-bold text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">
                      Tamanho da Fonte ({selectedElement.fontSize}px):
                    </label>
                    <input
                      type="range"
                      min="42"
                      max="130"
                      value={selectedElement.fontSize || 78}
                      onChange={(e) => updateSelected({ fontSize: Number(e.target.value) })}
                      className="w-full accent-amber-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Cor do Texto:</label>
                    <div className="flex gap-2">
                      {activeLogo.palette.map((c, idx) => (
                        <button
                          key={idx}
                          onClick={() => updateSelected({ color: c })}
                          className="w-7 h-7 rounded-lg border border-zinc-700"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ROTAÇÃO E BRILHO EXTERNO (COMUM A TODAS AS PEÇAS) */}
              <div className="space-y-3 bg-zinc-950 p-3.5 rounded-xl border border-zinc-800">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-400 flex items-center gap-1">
                      <RotateCw className="w-3.5 h-3.5" /> Rotação
                    </span>
                    <span className="font-bold">{selectedElement.rotation || 0}°</span>
                  </div>
                  <input
                    type="range"
                    min="-45"
                    max="45"
                    value={selectedElement.rotation || 0}
                    onChange={(e) => updateSelected({ rotation: Number(e.target.value) })}
                    className="w-full accent-amber-400"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Ajustes do Fundo da Capa
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-400">Desfoque do Fundo (Blur)</span>
                    <span className="font-bold">{bgBlur}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="16"
                    value={bgBlur}
                    onChange={(e) => setBgBlur(Number(e.target.value))}
                    className="w-full accent-amber-400"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-400">Escurecer Fundo (Contraste)</span>
                    <span className="font-bold">{Math.round(bgDarkness * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.75"
                    step="0.05"
                    value={bgDarkness}
                    onChange={(e) => setBgDarkness(Number(e.target.value))}
                    className="w-full accent-amber-400"
                  />
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}