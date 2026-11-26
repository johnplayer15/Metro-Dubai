import * as THREE from 'three';

function finalizeTexture(
  canvas: HTMLCanvasElement,
  maxAnisotropy: number,
  isColor: boolean,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
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
  facadeEmissive: THREE.CanvasTexture;
  facadeBump: THREE.CanvasTexture;
  museumCalligraphy: THREE.CanvasTexture;
  dubaiFrameGold: THREE.CanvasTexture;
  highwayAsphalt: THREE.CanvasTexture;
  highwayGantry: THREE.CanvasTexture;
  viaductConcrete: THREE.CanvasTexture;
  trackBed: THREE.CanvasTexture;
  desertSand: THREE.CanvasTexture;
  waterRipple: THREE.CanvasTexture;
  platformFloor: THREE.CanvasTexture;
  dustParticle: THREE.CanvasTexture;
  dispose: () => void;
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextureSet {
  const created: THREE.Texture[] = [];
  const track = (t: THREE.CanvasTexture) => {
    created.push(t);
    return t;
  };

  // 1. High-detail Architectural Glass Skyscraper Curtain Walls (512x1024)
  const makeFacade = (
    baseTop: string,
    baseBot: string,
    mullion: string,
    litColor: string,
    litProb: number
  ) => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 1024;
    const ctx = c.getContext('2d')!;
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 1024);
    bgGrad.addColorStop(0, baseTop);
    bgGrad.addColorStop(1, baseBot);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 512, 1024);

    const cols = 12;
    const rows = 36;
    const cw = 512 / cols;
    const ch = 1024 / rows;

    for (let r = 0; r < rows; r++) {
      const floorBandLit = Math.random() < litProb;
      const isMechFloor = r === 12 || r === 24;
      for (let col = 0; col < cols; col++) {
        const x = col * cw;
        const y = r * ch;
        if (isMechFloor) {
          ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
          ctx.fillRect(x + 2, y + 2, cw - 4, ch - 4);
          continue;
        }
        const isLit = floorBandLit && Math.random() < 0.74;
        if (isLit) {
          ctx.fillStyle = litColor;
          ctx.fillRect(x + 3, y + 4, cw - 6, ch - 7);
          ctx.fillStyle = 'rgba(255,255,255,0.32)';
          ctx.fillRect(x + 4, y + 5, cw - 8, 4);
        } else {
          const refl = 0.05 + (1 - r / rows) * 0.11 + Math.random() * 0.06;
          ctx.fillStyle = `rgba(186, 230, 253, ${refl.toFixed(3)})`;
          ctx.fillRect(x + 3, y + 4, cw - 6, ch - 7);
        }
      }
      ctx.fillStyle = mullion;
      ctx.fillRect(0, r * ch, 512, isMechFloor ? 6 : 4);
    }
    for (let col = 0; col < cols; col++) {
      ctx.fillStyle = mullion;
      ctx.fillRect(col * cw, 0, col % 3 === 0 ? 4 : 2, 1024);
    }
    return track(finalizeTexture(c, maxAnisotropy, true, 1, 2));
  };

  const facadeCyan = makeFacade('#1a4a6e', '#0c2336', '#33658a', '#bae6fd', 0.25);
  const facadeGold = makeFacade('#4a3921', '#1f1810', '#b89456', '#fde68a', 0.32);
  const facadeDarkLit = makeFacade('#0b1322', '#060a12', '#1e293b', '#fef08a', 0.56);

  const emCanvas = document.createElement('canvas');
  emCanvas.width = 512;
  emCanvas.height = 1024;
  const ectx = emCanvas.getContext('2d')!;
  ectx.fillStyle = '#000000';
  ectx.fillRect(0, 0, 512, 1024);
  for (let r = 0; r < 36; r++) {
    if (r === 12 || r === 24) continue;
    const band = Math.random() < 0.58;
    for (let c = 0; c < 12; c++) {
      if (band && Math.random() < 0.68) {
        ectx.fillStyle = Math.random() > 0.28 ? '#fde68a' : '#bae6fd';
        ectx.fillRect(c * (512 / 12) + 4, r * (1024 / 36) + 5, 512 / 12 - 8, 1024 / 36 - 9);
      }
    }
  }
  const facadeEmissive = track(finalizeTexture(emCanvas, maxAnisotropy, true, 1, 2));

  const bCanvas = document.createElement('canvas');
  bCanvas.width = 256;
  bCanvas.height = 512;
  const bctx = bCanvas.getContext('2d')!;
  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, 256, 512);
  bctx.fillStyle = '#ffffff';
  for (let r = 0; r < 18; r++) bctx.fillRect(0, r * (512 / 18), 256, 3);
  for (let col = 0; col < 6; col++) bctx.fillRect(col * (256 / 6), 0, 3, 512);
  const facadeBump = track(finalizeTexture(bCanvas, maxAnisotropy, false, 2, 4));

  // 2. Museum of the Future Calligraphic Stainless Texture
  const mc = document.createElement('canvas');
  mc.width = 1024;
  mc.height = 512;
  const mctx = mc.getContext('2d')!;
  const grad = mctx.createLinearGradient(0, 0, 1024, 512);
  grad.addColorStop(0, '#cbd5e1');
  grad.addColorStop(0.5, '#f1f5f9');
  grad.addColorStop(1, '#94a3b8');
  mctx.fillStyle = grad;
  mctx.fillRect(0, 0, 1024, 512);

  mctx.strokeStyle = 'rgba(15,23,42,0.12)';
  mctx.lineWidth = 2;
  for (let x = 0; x < 1024; x += 64) {
    mctx.beginPath();
    mctx.moveTo(x, 0);
    mctx.lineTo(x, 512);
    mctx.stroke();
  }

  for (let i = 0; i < 11; i++) {
    const yBase = 40 + i * 42;
    mctx.strokeStyle = '#0f172a';
    mctx.lineWidth = 10;
    mctx.lineCap = 'round';
    mctx.beginPath();
    mctx.moveTo(0, yBase);
    for (let x = 0; x <= 1024; x += 32) {
      const wave = Math.sin(x * 0.016 + i * 1.1) * 24 + Math.cos(x * 0.032 - i) * 10;
      mctx.lineTo(x, yBase + wave);
    }
    mctx.stroke();
    mctx.strokeStyle = '#bae6fd';
    mctx.lineWidth = 4;
    mctx.stroke();
  }
  const museumCalligraphy = track(finalizeTexture(mc, maxAnisotropy, true, 2, 1));

  // 3. Dubai Frame Gold Mashrabiya Texture
  const df = document.createElement('canvas');
  df.width = 512;
  df.height = 512;
  const dctx = df.getContext('2d')!;
  const goldGrad = dctx.createLinearGradient(0, 0, 512, 512);
  goldGrad.addColorStop(0, '#b7801e');
  goldGrad.addColorStop(0.5, '#eab308');
  goldGrad.addColorStop(1, '#a16207');
  dctx.fillStyle = goldGrad;
  dctx.fillRect(0, 0, 512, 512);
  dctx.strokeStyle = '#fef9c3';
  dctx.lineWidth = 4;
  for (let y = 0; y < 512; y += 64) {
    for (let x = 0; x < 512; x += 64) {
      dctx.beginPath();
      dctx.arc(x + 32, y + 32, 24, 0, Math.PI * 2);
      dctx.stroke();
      dctx.strokeRect(x + 8, y + 8, 48, 48);
    }
  }
  const dubaiFrameGold = track(finalizeTexture(df, maxAnisotropy, true, 2, 6));

  // 4. Sheikh Zayed Road 12-Lane Highway Asphalt (1024x1024)
  const hw = document.createElement('canvas');
  hw.width = 1024;
  hw.height = 1024;
  const hctx = hw.getContext('2d')!;
  hctx.fillStyle = '#1b1f27';
  hctx.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 12000; i++) {
    const px = Math.random() * 1024;
    const py = Math.random() * 1024;
    hctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.1)';
    hctx.fillRect(px, py, 2, 2);
  }
  const allLanes = [82, 168, 254, 340, 426, 598, 684, 770, 856, 942];
  hctx.fillStyle = 'rgba(0,0,0,0.14)';
  for (const lx of allLanes) hctx.fillRect(lx - 18, 0, 36, 1024);
  hctx.fillStyle = '#facc15';
  hctx.fillRect(28, 0, 8, 1024);
  hctx.fillRect(482, 0, 8, 1024);
  hctx.fillRect(534, 0, 8, 1024);
  hctx.fillRect(988, 0, 8, 1024);
  hctx.fillStyle = '#e2e8f0';
  const dividers = [125, 211, 297, 383, 641, 727, 813, 899];
  for (let y = 0; y < 1024; y += 96) {
    for (const dx of dividers) hctx.fillRect(dx - 3, y + 12, 6, 48);
  }
  const highwayAsphalt = track(finalizeTexture(hw, maxAnisotropy, true, 1, 1));

  // 5. UAE Green/Blue Highway Overhead Gantry Sign
  const hg = document.createElement('canvas');
  hg.width = 512;
  hg.height = 128;
  const hgctx = hg.getContext('2d')!;
  hgctx.fillStyle = '#065f46';
  hgctx.fillRect(0, 0, 512, 128);
  hgctx.strokeStyle = '#ffffff';
  hgctx.lineWidth = 4;
  hgctx.strokeRect(6, 6, 500, 116);
  hgctx.fillStyle = '#ffffff';
  hgctx.font = 'bold 26px "Plus Jakarta Sans", sans-serif';
  hgctx.textAlign = 'center';
  hgctx.fillText('E11  SHEIKH ZAYED RD  ·  شارع الشيخ زايد', 256, 50);
  hgctx.fillStyle = '#fde68a';
  hgctx.font = '600 22px "Plus Jakarta Sans", sans-serif';
  hgctx.fillText('Downtown  ·  Dubai Marina  ·  Abu Dhabi', 256, 92);
  const highwayGantry = track(finalizeTexture(hg, maxAnisotropy, true, 1, 1));

  // 6. Viaduct Precast Concrete
  const vc = document.createElement('canvas');
  vc.width = 512;
  vc.height = 512;
  const vctx = vc.getContext('2d')!;
  vctx.fillStyle = '#d4cec3';
  vctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 4500; i++) {
    vctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.035)' : 'rgba(255,255,255,0.045)';
    vctx.fillRect(Math.random() * 512, Math.random() * 512, 3, 3);
  }
  vctx.strokeStyle = 'rgba(90,84,74,0.24)';
  vctx.lineWidth = 3;
  for (let y = 0; y < 512; y += 128) vctx.strokeRect(2, y + 2, 508, 124);
  const viaductConcrete = track(finalizeTexture(vc, maxAnisotropy, true, 1, 1));

  // 7. Track Bed with Concrete Sleepers, Clips & Third Rail
  const tb = document.createElement('canvas');
  tb.width = 256;
  tb.height = 512;
  const tctx = tb.getContext('2d')!;
  tctx.fillStyle = '#94a3b8';
  tctx.fillRect(0, 0, 256, 512);
  for (let y = 0; y < 512; y += 32) {
    tctx.fillStyle = '#cbd5e1';
    tctx.fillRect(22, y + 4, 212, 14);
    tctx.fillStyle = '#475569';
    tctx.fillRect(22, y + 18, 212, 3);
    tctx.fillStyle = '#334155';
    tctx.fillRect(58, y + 3, 16, 16);
    tctx.fillRect(182, y + 3, 16, 16);
  }
  tctx.fillStyle = '#64748b';
  tctx.fillRect(114, 0, 28, 512);
  const trackBed = track(finalizeTexture(tb, maxAnisotropy, true, 1, 3));

  // 8. Desert Sand Ripples (512x512)
  const ds = document.createElement('canvas');
  ds.width = 512;
  ds.height = 512;
  const sctx = ds.getContext('2d')!;
  sctx.fillStyle = '#dbb786';
  sctx.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 14) {
    sctx.fillStyle = 'rgba(176, 124, 68, 0.16)';
    sctx.beginPath();
    for (let x = 0; x <= 512; x += 16) {
      const yy = y + Math.sin(x * 0.03 + y * 0.06) * 4;
      if (x === 0) sctx.moveTo(x, yy);
      else sctx.lineTo(x, yy);
    }
    sctx.lineTo(512, y + 6);
    sctx.lineTo(0, y + 6);
    sctx.closePath();
    sctx.fill();
  }
  const desertSand = track(finalizeTexture(ds, maxAnisotropy, true, 70, 70));

  // 9. Arabian Gulf Water Ripple Bump Map
  const wr = document.createElement('canvas');
  wr.width = 256;
  wr.height = 256;
  const wctx = wr.getContext('2d')!;
  wctx.fillStyle = '#808080';
  wctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 650; i++) {
    const wx = Math.random() * 256;
    const wy = Math.random() * 256;
    const len = 12 + Math.random() * 28;
    wctx.strokeStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.22)';
    wctx.lineWidth = 2;
    wctx.beginPath();
    wctx.moveTo(wx, wy);
    wctx.lineTo(wx + len, wy + (Math.random() - 0.5) * 3);
    wctx.stroke();
  }
  const waterRipple = track(finalizeTexture(wr, maxAnisotropy, false, 40, 80));

  // 10. Station Platform Terrazzo + Yellow Tactile Line
  const pf = document.createElement('canvas');
  pf.width = 512;
  pf.height = 512;
  const pctx = pf.getContext('2d')!;
  pctx.fillStyle = '#d8dee6';
  pctx.fillRect(0, 0, 512, 512);
  pctx.strokeStyle = 'rgba(15,23,42,0.12)';
  pctx.lineWidth = 2;
  for (let i = 0; i <= 512; i += 64) {
    pctx.beginPath();
    pctx.moveTo(i, 0);
    pctx.lineTo(i, 512);
    pctx.stroke();
    pctx.beginPath();
    pctx.moveTo(0, i);
    pctx.lineTo(512, i);
    pctx.stroke();
  }
  pctx.fillStyle = '#facc15';
  pctx.fillRect(0, 0, 34, 512);
  pctx.fillStyle = '#ca8a04';
  for (let y = 8; y < 512; y += 16) {
    pctx.fillRect(8, y, 6, 6);
    pctx.fillRect(20, y, 6, 6);
  }
  const platformFloor = track(finalizeTexture(pf, maxAnisotropy, true, 1, 14));

  // 11. Soft radial particle sprite for Sandstorm Dust & Night Fog
  const dp = document.createElement('canvas');
  dp.width = 64;
  dp.height = 64;
  const dpCtx = dp.getContext('2d')!;
  const radGrad = dpCtx.createRadialGradient(32, 32, 2, 32, 32, 30);
  radGrad.addColorStop(0, 'rgba(255,255,255,0.85)');
  radGrad.addColorStop(0.5, 'rgba(255,255,255,0.35)');
  radGrad.addColorStop(1, 'rgba(255,255,255,0)');
  dpCtx.fillStyle = radGrad;
  dpCtx.fillRect(0, 0, 64, 64);
  const dustParticle = track(finalizeTexture(dp, maxAnisotropy, true, 1, 1));

  return {
    facadeCyan,
    facadeGold,
    facadeDarkLit,
    facadeEmissive,
    facadeBump,
    museumCalligraphy,
    dubaiFrameGold,
    highwayAsphalt,
    highwayGantry,
    viaductConcrete,
    trackBed,
    desertSand,
    waterRipple,
    platformFloor,
    dustParticle,
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

  ctx.fillStyle = '#0f1d36';
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(0, 0, 512, 10);

  ctx.fillStyle = '#dc2626';
  ctx.fillRect(18, 28, 86, 72);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 34px "Chakra Petch", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(code, 61, 65);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '600 28px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(arabicName, 124, 46);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = 'bold 26px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(name, 124, 88);

  return finalizeTexture(c, maxAnisotropy, true, 1, 1);
}

export function createPlatformDepartureTexture(
  code: string,
  name: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 504, 120);

  ctx.fillStyle = '#f59e0b';
  ctx.font = 'bold 26px "Chakra Petch", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`RED LINE · ${code} ${name.toUpperCase()}`, 20, 44);

  ctx.fillStyle = '#38bdf8';
  ctx.font = '600 24px "JetBrains Mono", monospace';
  ctx.fillText('NEXT: R42 UAE EXCHANGE   BOARDING', 20, 92);

  return finalizeTexture(c, maxAnisotropy, true, 1, 1);
}

export function createCockpitDmiUpdater(maxAnisotropy: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(4, maxAnisotropy);

  const update = (
    speedKmh: number,
    limitKmh: number,
    notch: number,
    nextCode: string,
    nextName: string,
    distToNextM: number,
    doorsOpen: boolean,
    speedLockEnabled: boolean,
    speedLockKmh: number
  ) => {
    ctx.fillStyle = '#060b14';
    ctx.fillRect(0, 0, 512, 256);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, 504, 248);

    const cx = 132;
    const cy = 132;
    const rad = 82;
    const startA = Math.PI * 0.78;
    const endA = Math.PI * 2.22;

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, rad, startA, endA);
    ctx.stroke();

    const limitFrac = Math.min(1, limitKmh / 120);
    const limitA = startA + (endA - startA) * limitFrac;
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, cy, rad + 13, limitA - 0.05, limitA + 0.05);
    ctx.stroke();

    if (speedLockEnabled) {
      const lockFrac = Math.min(1, speedLockKmh / 120);
      const lockA = startA + (endA - startA) * lockFrac;
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(cx, cy, rad + 13, lockA - 0.05, lockA + 0.05);
      ctx.stroke();
    }

    const spFrac = Math.min(1, speedKmh / 120);
    const spA = startA + (endA - startA) * spFrac;
    ctx.strokeStyle = speedKmh > limitKmh + 4 ? '#ef4444' : '#38bdf8';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(cx, cy, rad, startA, spA);
    ctx.stroke();

    ctx.fillStyle = speedKmh > limitKmh + 4 ? '#f87171' : '#f8fafc';
    ctx.font = 'bold 52px "Chakra Petch", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.round(speedKmh)}`, cx, cy - 6);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 15px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`KM/H · LIM ${limitKmh}`, cx, cy + 32);

    if (speedLockEnabled) {
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 14px "JetBrains Mono", monospace';
      ctx.fillText(`LOCK ${speedLockKmh} KM/H`, cx, cy + 56);
    }

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(256, 20, 234, 216);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.strokeRect(256, 20, 234, 216);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(272, 34, 56, 28);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px "Chakra Petch", sans-serif';
    ctx.fillText(nextCode, 282, 48);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(nextName.slice(0, 16), 336, 48);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 28px "JetBrains Mono", monospace';
    ctx.fillText(`${(distToNextM / 1000).toFixed(2)} km`, 272, 102);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
    const notchTxt = speedLockEnabled
      ? `CRUISE HOLD (${speedLockKmh})`
      : notch === 0
      ? 'COAST (0)'
      : notch > 0
      ? `TRACTION (+${notch})`
      : notch === -3
      ? 'EMERGENCY (EB)'
      : `BRAKE (${notch})`;
    ctx.fillText(notchTxt, 272, 144);

    ctx.fillStyle = doorsOpen ? '#10b981' : '#334155';
    ctx.fillRect(272, 174, 202, 40);
    ctx.fillStyle = doorsOpen ? '#052e16' : '#e2e8f0';
    ctx.font = 'bold 18px "Chakra Petch", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(doorsOpen ? 'DOORS OPEN · BOARDING' : 'DOORS LOCKED · READY', 373, 195);

    texture.needsUpdate = true;
  };

  return { texture, update, dispose: () => texture.dispose() };
}

export function createCockpitAuxUpdater(maxAnisotropy: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(4, maxAnisotropy);

  const update = (
    weatherLabel: string,
    passengers: number,
    capacity: number,
    comfortPct: number,
    gradePct: number
  ) => {
    ctx.fillStyle = '#070d19';
    ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, 504, 248);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 20px "Chakra Petch", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('TRAIN SYSTEMS & ENVIRONMENT', 24, 38);

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(24, 56, 224, 82);
    ctx.fillRect(264, 56, 224, 82);
    ctx.fillRect(24, 152, 224, 82);
    ctx.fillRect(264, 152, 224, 82);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 15px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('PASSENGER LOAD', 40, 82);
    ctx.fillText('WEATHER CONDITION', 280, 82);
    ctx.fillText('RIDE COMFORT', 40, 178);
    ctx.fillText('TRACK GRADE', 280, 178);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 28px "JetBrains Mono", monospace';
    ctx.fillText(`${passengers}/${capacity}`, 40, 118);
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(weatherLabel.toUpperCase(), 280, 118);

    ctx.fillStyle = comfortPct >= 85 ? '#34d399' : '#f87171';
    ctx.fillText(`${comfortPct}%`, 40, 214);
    ctx.fillStyle = '#bae6fd';
    ctx.fillText(`${gradePct >= 0 ? '+' : ''}${gradePct.toFixed(1)}%`, 280, 214);

    texture.needsUpdate = true;
  };

  return { texture, update, dispose: () => texture.dispose() };
}
