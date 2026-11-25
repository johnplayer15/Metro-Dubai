import * as THREE from 'three';

function finalizeColorTexture(
  canvas: HTMLCanvasElement,
  maxAnisotropy: number,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = Math.min(8, maxAnisotropy);
  tex.needsUpdate = true;
  return tex;
}

export interface ProceduralTextureSet {
  facadeCyan: THREE.CanvasTexture;
  facadeGold: THREE.CanvasTexture;
  facadeDarkLit: THREE.CanvasTexture;
  museumCalligraphy: THREE.CanvasTexture;
  dubaiFrameGold: THREE.CanvasTexture;
  highwayAsphalt: THREE.CanvasTexture;
  viaductConcrete: THREE.CanvasTexture;
  desertSand: THREE.CanvasTexture;
  platformFloor: THREE.CanvasTexture;
  dispose: () => void;
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextureSet {
  const created: THREE.Texture[] = [];
  const track = (t: THREE.CanvasTexture) => {
    created.push(t);
    return t;
  };

  // 1. Cyan/Silver Dubai Glass Skyscraper Curtain Wall
  const makeFacade = (
    bg: string,
    mullion: string,
    litColor: string,
    litProb: number
  ) => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 512;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 256, 512);

    const cols = 8;
    const rows = 24;
    const cw = 256 / cols;
    const ch = 512 / rows;

    for (let r = 0; r < rows; r++) {
      const floorBandLit = Math.random() < litProb;
      for (let col = 0; col < cols; col++) {
        const x = col * cw;
        const y = r * ch;
        const isLit = floorBandLit && Math.random() < 0.72;
        if (isLit) {
          ctx.fillStyle = litColor;
          ctx.fillRect(x + 2, y + 3, cw - 4, ch - 5);
        } else {
          const shade = 0.85 + Math.random() * 0.25;
          ctx.fillStyle = `rgba(255,255,255,${(0.04 * shade).toFixed(3)})`;
          ctx.fillRect(x + 2, y + 3, cw - 4, ch - 5);
        }
      }
      // Horizontal spandrel beam
      ctx.fillStyle = mullion;
      ctx.fillRect(0, r * ch, 256, 3);
    }
    for (let col = 0; col < cols; col++) {
      ctx.fillStyle = mullion;
      ctx.fillRect(col * cw, 0, 2, 512);
    }
    return track(finalizeColorTexture(c, maxAnisotropy, 1, 2));
  };

  const facadeCyan = makeFacade('#12324a', '#245270', '#a7f3d0', 0.22);
  const facadeGold = makeFacade('#2d251b', '#8f7248', '#fde68a', 0.28);
  const facadeDarkLit = makeFacade('#0b1322', '#1e293b', '#fef08a', 0.48);

  // 2. Museum of the Future Calligraphic Stainless Texture
  const mc = document.createElement('canvas');
  mc.width = 512;
  mc.height = 256;
  const mctx = mc.getContext('2d')!;
  const grad = mctx.createLinearGradient(0, 0, 512, 256);
  grad.addColorStop(0, '#cbd5e1');
  grad.addColorStop(0.5, '#e2e8f0');
  grad.addColorStop(1, '#94a3b8');
  mctx.fillStyle = grad;
  mctx.fillRect(0, 0, 512, 256);

  // Stylized sweeping Arabic-inspired calligraphic ribbons
  mctx.strokeStyle = '#0f172a';
  mctx.lineWidth = 5;
  mctx.lineCap = 'round';
  for (let i = 0; i < 10; i++) {
    const yBase = 24 + i * 22;
    mctx.beginPath();
    mctx.moveTo(0, yBase);
    for (let x = 0; x <= 512; x += 32) {
      const wave = Math.sin(x * 0.03 + i * 1.1) * 14 + Math.cos(x * 0.06 - i) * 6;
      mctx.lineTo(x, yBase + wave);
    }
    mctx.stroke();

    // Luminous inner window slit
    mctx.strokeStyle = '#7dd3fc';
    mctx.lineWidth = 2;
    mctx.stroke();
    mctx.strokeStyle = '#0f172a';
    mctx.lineWidth = 5;
  }
  const museumCalligraphy = track(finalizeColorTexture(mc, maxAnisotropy, 2, 1));

  // 3. Dubai Frame Gold Mashrabiya Texture
  const df = document.createElement('canvas');
  df.width = 256;
  df.height = 256;
  const dctx = df.getContext('2d')!;
  dctx.fillStyle = '#c9932c';
  dctx.fillRect(0, 0, 256, 256);
  dctx.strokeStyle = '#fef08a';
  dctx.lineWidth = 3;
  for (let y = 0; y < 256; y += 32) {
    for (let x = 0; x < 256; x += 32) {
      dctx.beginPath();
      dctx.arc(x + 16, y + 16, 12, 0, Math.PI * 2);
      dctx.stroke();
      dctx.strokeRect(x + 4, y + 4, 24, 24);
    }
  }
  const dubaiFrameGold = track(finalizeColorTexture(df, maxAnisotropy, 2, 6));

  // 4. Sheikh Zayed Road 12-Lane Highway Asphalt
  const hw = document.createElement('canvas');
  hw.width = 512;
  hw.height = 512;
  const hctx = hw.getContext('2d')!;
  hctx.fillStyle = '#1e222b';
  hctx.fillRect(0, 0, 512, 512);
  // Subtle aggregate grain
  for (let i = 0; i < 3000; i++) {
    const px = Math.random() * 512;
    const py = Math.random() * 512;
    hctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.08)';
    hctx.fillRect(px, py, 2, 2);
  }
  // Yellow edge lines + median
  hctx.fillStyle = '#eab308';
  hctx.fillRect(14, 0, 5, 512);
  hctx.fillRect(238, 0, 5, 512);
  hctx.fillRect(269, 0, 5, 512);
  hctx.fillRect(493, 0, 5, 512);

  // Dashed lane dividers (5 lanes each direction)
  hctx.fillStyle = '#e2e8f0';
  const leftLanes = [60, 105, 150, 195];
  const rightLanes = [317, 362, 407, 452];
  for (let y = 0; y < 512; y += 64) {
    for (const lx of leftLanes) hctx.fillRect(lx, y + 8, 4, 34);
    for (const rx of rightLanes) hctx.fillRect(rx, y + 8, 4, 34);
  }
  const highwayAsphalt = track(finalizeColorTexture(hw, maxAnisotropy, 1, 1));

  // 5. Viaduct Precast Concrete
  const vc = document.createElement('canvas');
  vc.width = 256;
  vc.height = 256;
  const vctx = vc.getContext('2d')!;
  vctx.fillStyle = '#d6d1c7';
  vctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1500; i++) {
    vctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)';
    vctx.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
  }
  vctx.strokeStyle = 'rgba(100,95,85,0.22)';
  vctx.lineWidth = 2;
  vctx.strokeRect(1, 1, 254, 126);
  vctx.strokeRect(1, 129, 254, 126);
  const viaductConcrete = track(finalizeColorTexture(vc, maxAnisotropy, 1, 1));

  // 6. Desert Sand Ripples
  const ds = document.createElement('canvas');
  ds.width = 256;
  ds.height = 256;
  const sctx = ds.getContext('2d')!;
  sctx.fillStyle = '#d9b584';
  sctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 12) {
    sctx.fillStyle = 'rgba(180, 128, 70, 0.14)';
    sctx.beginPath();
    for (let x = 0; x <= 256; x += 16) {
      const yy = y + Math.sin(x * 0.05 + y * 0.1) * 3;
      if (x === 0) sctx.moveTo(x, yy);
      else sctx.lineTo(x, yy);
    }
    sctx.lineTo(256, y + 5);
    sctx.lineTo(0, y + 5);
    sctx.closePath();
    sctx.fill();
  }
  const desertSand = track(finalizeColorTexture(ds, maxAnisotropy, 60, 60));

  // 7. Station Platform Terrazzo + Yellow Tactile Line
  const pf = document.createElement('canvas');
  pf.width = 256;
  pf.height = 256;
  const pctx = pf.getContext('2d')!;
  pctx.fillStyle = '#cbd5e1';
  pctx.fillRect(0, 0, 256, 256);
  pctx.strokeStyle = 'rgba(15,23,42,0.1)';
  for (let i = 0; i <= 256; i += 64) {
    pctx.beginPath();
    pctx.moveTo(i, 0);
    pctx.lineTo(i, 256);
    pctx.stroke();
    pctx.beginPath();
    pctx.moveTo(0, i);
    pctx.lineTo(256, i);
    pctx.stroke();
  }
  // Yellow safety strip along edge
  pctx.fillStyle = '#facc15';
  pctx.fillRect(0, 0, 20, 256);
  const platformFloor = track(finalizeColorTexture(pf, maxAnisotropy, 1, 12));

  return {
    facadeCyan,
    facadeGold,
    facadeDarkLit,
    museumCalligraphy,
    dubaiFrameGold,
    highwayAsphalt,
    viaductConcrete,
    desertSand,
    platformFloor,
    dispose: () => {
      created.forEach((t) => t.dispose());
    },
  };
}

export function createStationSignTexture(
  code: string,
  name: string,
  arabicName: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext('2d')!;

  // Navy RTA background
  ctx.fillStyle = '#0f1d36';
  ctx.fillRect(0, 0, 512, 128);

  // Red Line accent bar
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(0, 0, 512, 10);

  // Station code badge
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(18, 28, 86, 72);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 34px "Chakra Petch", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(code, 61, 65);

  // Arabic station name (top right)
  ctx.fillStyle = '#f8fafc';
  ctx.font = '600 28px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(arabicName, 124, 46);

  // English station name
  ctx.fillStyle = '#cbd5e1';
  ctx.font = 'bold 26px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(name, 124, 88);

  return finalizeColorTexture(c, maxAnisotropy, 1, 1);
}
