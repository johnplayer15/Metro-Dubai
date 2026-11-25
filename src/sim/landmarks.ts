import * as THREE from 'three';
import { StationDef } from '../data/stations';
import { createStationSignTexture, ProceduralTextureSet } from './textures';

export interface TrainRig {
  group: THREE.Group;
  doorsLeft: THREE.Mesh[];
  doorsRight: THREE.Mesh[];
  headlightMat: THREE.MeshStandardMaterial;
  cabScreen: THREE.Mesh;
}

export interface StationRig {
  group: THREE.Group;
  station: StationDef;
  screenDoors: THREE.Mesh[];
  passengers: {
    mesh: THREE.Group;
    baseX: number;
    baseZ: number;
    phase: number;
    boarding: boolean;
  }[];
  signTex: THREE.CanvasTexture;
}

export function createDubaiMetroTrain(
  isAiTrain = false
): TrainRig {
  const group = new THREE.Group();
  const doorsLeft: THREE.Mesh[] = [];
  const doorsRight: THREE.Mesh[] = [];

  const bodyMat = new THREE.MeshStandardMaterial({
    color: isAiTrain ? 0xdbeafe : 0xe2e8f0,
    metalness: 0.65,
    roughness: 0.28,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.45,
    roughness: 0.48,
  });
  const stripeCyanMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    metalness: 0.35,
    roughness: 0.32,
  });
  const stripeRedMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    metalness: 0.25,
    roughness: 0.35,
  });
  const windowBandMat = new THREE.MeshStandardMaterial({
    color: 0x0b1322,
    metalness: 0.85,
    roughness: 0.12,
  });
  const doorMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    metalness: 0.72,
    roughness: 0.22,
  });
  const bogieMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.6,
    roughness: 0.75,
  });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfffbeb,
    emissiveIntensity: 2.2,
    roughness: 0.15,
  });
  const taillightMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 1.8,
    roughness: 0.2,
  });

  const numCars = 5;
  const carLength = 16.0;
  const gap = 0.85;
  const carWidth = 2.65;
  const carHeight = 3.15;
  const floorY = 1.05;

  // Front of train is at z = 0, extending backward along +Z (since train moves toward -Z)
  for (let c = 0; c < numCars; c++) {
    const carGroup = new THREE.Group();
    const carCenterZ = 8.4 + c * (carLength + gap);
    carGroup.position.set(0, 0, carCenterZ);

    // Main body shell
    const hull = new THREE.Mesh(
      new THREE.BoxGeometry(carWidth, carHeight, carLength),
      bodyMat
    );
    hull.position.y = floorY + carHeight * 0.5;
    hull.castShadow = true;
    hull.receiveShadow = true;
    carGroup.add(hull);

    // Dark panoramic window ribbon along both sides
    const winRibbon = new THREE.Mesh(
      new THREE.BoxGeometry(carWidth + 0.04, 1.15, carLength - 0.6),
      windowBandMat
    );
    winRibbon.position.y = floorY + 1.85;
    carGroup.add(winRibbon);

    // Signature Dubai Metro cyan/blue & gold-red livery stripes
    const cyanStripe = new THREE.Mesh(
      new THREE.BoxGeometry(carWidth + 0.05, 0.22, carLength - 0.2),
      stripeCyanMat
    );
    cyanStripe.position.y = floorY + 0.95;
    carGroup.add(cyanStripe);

    if (c === 0) {
      // Gold/Red accent on Lead Gold Class carriage
      const goldStripe = new THREE.Mesh(
        new THREE.BoxGeometry(carWidth + 0.055, 0.14, carLength - 0.3),
        stripeRedMat
      );
      goldStripe.position.y = floorY + 0.72;
      carGroup.add(goldStripe);
    }

    // Roof HVAC pods (2 per car)
    for (const pz of [-4.2, 4.2]) {
      const hvac = new THREE.Mesh(
        new THREE.BoxGeometry(1.7, 0.38, 3.2),
        roofMat
      );
      hvac.position.set(0, floorY + carHeight + 0.18, pz);
      carGroup.add(hvac);
    }

    // Bogies / wheelsets
    for (const bz of [-5.2, 5.2]) {
      const bogie = new THREE.Mesh(
        new THREE.BoxGeometry(2.15, 0.55, 2.5),
        bogieMat
      );
      bogie.position.set(0, 0.65, bz);
      carGroup.add(bogie);
    }

    // 3 pairs of sliding doors on each side
    const doorOffsets = [-4.6, 0, 4.6];
    for (const dz of doorOffsets) {
      const leftDoor = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 2.05, 1.45),
        doorMat
      );
      leftDoor.position.set(-carWidth * 0.5 - 0.02, floorY + 1.35, dz);
      leftDoor.userData.baseZ = dz;
      carGroup.add(leftDoor);
      doorsLeft.push(leftDoor);

      const rightDoor = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 2.05, 1.45),
        doorMat
      );
      rightDoor.position.set(carWidth * 0.5 + 0.02, floorY + 1.35, dz);
      rightDoor.userData.baseZ = dz;
      carGroup.add(rightDoor);
      doorsRight.push(rightDoor);
    }

    // Inter-car articulated gangway bellows
    if (c < numCars - 1) {
      const bellows = new THREE.Mesh(
        new THREE.BoxGeometry(2.1, 2.6, gap + 0.2),
        bogieMat
      );
      bellows.position.set(0, floorY + 1.4, carLength * 0.5 + gap * 0.5);
      carGroup.add(bellows);
    }

    group.add(carGroup);
  }

  // Aerodynamic Front Nose Cone (at z = 0 .. +0.4)
  const noseGroup = new THREE.Group();
  noseGroup.position.set(0, 0, 0.4);

  const noseLower = new THREE.Mesh(
    new THREE.CylinderGeometry(1.15, 1.45, 2.3, 12),
    bodyMat
  );
  noseLower.rotation.x = Math.PI * 0.38;
  noseLower.scale.set(1.0, 1.0, 0.68);
  noseLower.position.set(0, floorY + 0.75, -0.8);
  noseGroup.add(noseLower);

  const noseWindshield = new THREE.Mesh(
    new THREE.BoxGeometry(2.25, 1.25, 1.6),
    windowBandMat
  );
  noseWindshield.rotation.x = -0.35;
  noseWindshield.position.set(0, floorY + 1.95, -0.45);
  noseGroup.add(noseWindshield);

  // Twin LED Headlights
  for (const hx of [-0.82, 0.82]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 0.2), headlightMat);
    hl.position.set(hx, floorY + 0.72, -1.68);
    noseGroup.add(hl);
  }

  // Destination LED Strip
  const cabScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(1.4, 0.24),
    new THREE.MeshBasicMaterial({ color: 0xf59e0b })
  );
  cabScreen.rotation.y = Math.PI;
  cabScreen.position.set(0, floorY + 2.55, -0.95);
  noseGroup.add(cabScreen);

  group.add(noseGroup);

  // Rear Tail Cone
  const tailZ = 8.4 + (numCars - 1) * (carLength + gap) + carLength * 0.5;
  const tailHull = new THREE.Mesh(
    new THREE.CylinderGeometry(1.15, 1.45, 2.2, 12),
    bodyMat
  );
  tailHull.rotation.x = -Math.PI * 0.38;
  tailHull.scale.set(1.0, 1.0, 0.68);
  tailHull.position.set(0, floorY + 0.75, tailZ + 0.8);
  group.add(tailHull);

  for (const tx of [-0.82, 0.82]) {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.2), taillightMat);
    tl.position.set(tx, floorY + 0.75, tailZ + 1.65);
    group.add(tl);
  }

  return { group, doorsLeft, doorsRight, headlightMat, cabScreen };
}

function createPassengerFigure(robeVariant: number): THREE.Group {
  const fig = new THREE.Group();

  const skinMat = new THREE.MeshStandardMaterial({ color: 0xc68b59, roughness: 0.75 });
  const palette = [0xf8fafc, 0x1e293b, 0x0f172a, 0x334155, 0x0284c7, 0xb45309];
  const outfitColor = palette[robeVariant % palette.length];
  const clothMat = new THREE.MeshStandardMaterial({ color: outfitColor, roughness: 0.82 });

  const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.82, 8), clothMat);
  legs.position.y = 0.41;
  fig.add(legs);

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.64, 8), clothMat);
  torso.position.y = 1.1;
  fig.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), skinMat);
  head.position.y = 1.56;
  fig.add(head);

  if (robeVariant % 3 === 0) {
    // Traditional Ghutra headwear
    const ghutra = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.17, 0.22, 8),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 })
    );
    ghutra.position.y = 1.6;
    fig.add(ghutra);
  }

  return fig;
}

export function createDubaiStation(
  station: StationDef,
  textures: ProceduralTextureSet,
  maxAnisotropy: number
): StationRig {
  const group = new THREE.Group();
  const screenDoors: THREE.Mesh[] = [];
  const passengers: StationRig['passengers'] = [];

  const stationLength = 104;
  const shellColor =
    station.architectureTheme === 'gold-shell'
      ? 0xd4a853
      : station.architectureTheme === 'heritage-sandstone'
      ? 0xc99c63
      : 0xcbd5e1;

  const goldShellMat = new THREE.MeshStandardMaterial({
    color: shellColor,
    metalness: 0.72,
    roughness: 0.28,
  });
  const ribMat = new THREE.MeshStandardMaterial({
    color: 0x947536,
    metalness: 0.8,
    roughness: 0.24,
  });
  const glassCanopyMat = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    metalness: 0.15,
    roughness: 0.08,
    transparent: true,
    opacity: 0.42,
    side: THREE.DoubleSide,
  });
  const concreteMat = new THREE.MeshStandardMaterial({
    map: textures.viaductConcrete,
    roughness: 0.85,
    metalness: 0.05,
  });
  const platformMat = new THREE.MeshStandardMaterial({
    map: textures.platformFloor,
    roughness: 0.55,
    metalness: 0.1,
  });
  const psdFrameMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.75,
    roughness: 0.28,
  });
  const psdGlassMat = new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    metalness: 0.2,
    roughness: 0.1,
    transparent: true,
    opacity: 0.52,
  });

  // 1. Platforms (Left side x = -4.2, Right side x = +8.8 so both tracks are flanked)
  // Note: Player track is at x = 0; Opposite AI track is at x = +4.6
  const leftPlatform = new THREE.Mesh(
    new THREE.BoxGeometry(5.2, 1.15, stationLength),
    platformMat
  );
  leftPlatform.position.set(-4.35, 0.55, 42);
  leftPlatform.receiveShadow = true;
  group.add(leftPlatform);

  const rightPlatform = new THREE.Mesh(
    new THREE.BoxGeometry(5.2, 1.15, stationLength),
    platformMat
  );
  rightPlatform.position.set(8.95, 0.55, 42);
  rightPlatform.receiveShadow = true;
  group.add(rightPlatform);

  // Under-platform concourse & support columns down to street
  const concourseBox = new THREE.Mesh(
    new THREE.BoxGeometry(18.5, 3.4, stationLength * 0.75),
    concreteMat
  );
  concourseBox.position.set(2.3, -2.5, 42);
  group.add(concourseBox);

  // Escalator skybridge entrances to Sheikh Zayed Rd
  for (const side of [-1, 1]) {
    const bridge = new THREE.Mesh(
      new THREE.BoxGeometry(12, 2.8, 7.5),
      glassCanopyMat
    );
    bridge.position.set(2.3 + side * 14, -2.1, 42);
    group.add(bridge);

    const tower = new THREE.Mesh(
      new THREE.BoxGeometry(5.5, 11.5, 7.5),
      goldShellMat
    );
    tower.position.set(2.3 + side * 20, -4.5, 42);
    group.add(tower);
  }

  // 2. Iconic Curved Dubai Metro Aero-Shell Canopy (spanning x=-7 to x=+11.6)
  const archCount = 11;
  const archGeo = new THREE.TorusGeometry(9.8, 0.28, 8, 28, Math.PI);
  for (let i = 0; i < archCount; i++) {
    const az = -6 + i * (stationLength / (archCount - 1));
    const arch = new THREE.Mesh(archGeo, ribMat);
    arch.position.set(2.3, 1.6, az);
    group.add(arch);
  }

  // Curved Outer Gold-Shell Roof Panels (centered around theta=PI so rotation.x=+PI/2 arches overhead)
  const shellRoof = new THREE.Mesh(
    new THREE.CylinderGeometry(
      9.9,
      9.9,
      stationLength + 4,
      24,
      1,
      true,
      Math.PI - Math.PI * 0.44,
      Math.PI * 0.88
    ),
    goldShellMat
  );
  shellRoof.rotation.x = Math.PI * 0.5;
  shellRoof.position.set(2.3, 1.6, 42);
  shellRoof.material.side = THREE.DoubleSide;
  group.add(shellRoof);

  // Side Curtain Glass Walls
  for (const gx of [-6.95, 11.55]) {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 4.4, stationLength),
      glassCanopyMat
    );
    wall.position.set(gx, 3.3, 42);
    group.add(wall);
  }

  // 3. Platform Screen Doors (along player track edge x = -1.78, aligned to train cars at 8.4 + c * 16.85)
  const psdBaseZStart = 8.4;
  for (let car = 0; car < 5; car++) {
    const carZ = psdBaseZStart + car * 16.85;
    for (const dz of [-4.6, 0, 4.6]) {
      const doorZ = carZ + dz;
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 2.35, 0.25),
        psdFrameMat
      );
      frame.position.set(-1.75, 2.25, doorZ - 0.9);
      group.add(frame);

      const leaf = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 2.2, 1.5),
        psdGlassMat
      );
      leaf.position.set(-1.75, 2.2, doorZ);
      leaf.userData.baseZ = doorZ;
      group.add(leaf);
      screenDoors.push(leaf);
    }
  }

  // 4. Precision Stop Marker Sign at z = 0 (front nose aligns here!)
  const stopPost = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 2.8, 0.18),
    new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3 })
  );
  stopPost.position.set(-2.2, 2.4, 0);
  group.add(stopPost);

  const stopBoard = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.65, 1.2),
    new THREE.MeshBasicMaterial({ color: 0xfacc15 })
  );
  stopBoard.position.set(-2.1, 3.4, 0);
  group.add(stopBoard);

  // 5. Bilingual Station Signage
  const signTex = createStationSignTexture(
    station.code,
    station.name,
    station.arabicName,
    maxAnisotropy
  );
  const signMat = new THREE.MeshBasicMaterial({ map: signTex });
  for (const sz of [14, 42, 70]) {
    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.15, 4.6), signMat);
    signBoard.position.set(-6.5, 3.9, sz);
    group.add(signBoard);
  }

  // 6. Waiting Passengers on the left platform
  const pCount = 16;
  for (let i = 0; i < pCount; i++) {
    const pMesh = createPassengerFigure(i);
    const px = -2.8 - (i % 3) * 0.7;
    const pz = 5 + i * 4.6 + (Math.random() - 0.5) * 1.4;
    pMesh.position.set(px, 1.12, pz);
    pMesh.rotation.y = Math.PI * 0.5; // Facing track
    group.add(pMesh);
    passengers.push({
      mesh: pMesh,
      baseX: px,
      baseZ: pz,
      phase: Math.random() * Math.PI * 2,
      boarding: i % 2 === 0,
    });
  }

  return { group, station, screenDoors, passengers, signTex };
}

/* ---------------- ICONIC DUBAI LANDMARKS ---------------- */

export function createBurjKhalifa(textures: ProceduralTextureSet): THREE.Group {
  const group = new THREE.Group();

  const glassMat = new THREE.MeshStandardMaterial({
    map: textures.facadeCyan,
    metalness: 0.85,
    roughness: 0.16,
  });
  const silverRibMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.9,
    roughness: 0.2,
  });
  const spireMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.85,
    metalness: 0.9,
    roughness: 0.15,
  });

  // Grand Downtown Podium
  const podium = new THREE.Mesh(new THREE.CylinderGeometry(42, 48, 14, 6), silverRibMat);
  podium.position.y = 7;
  group.add(podium);

  // Central hexagonal core climbing 290m
  const core = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 16, 290, 6), glassMat);
  core.position.y = 145;
  group.add(core);

  // Y-shaped spiraling setback tiers (3 wings x 5 stepped heights = 15 distinct setbacks)
  const wingAngles = [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3];
  const tierHeights = [75, 120, 168, 212, 252];
  const tierRadii = [28, 22, 16, 11, 7];

  for (let t = 0; t < tierHeights.length; t++) {
    const h = tierHeights[t];
    const r = tierRadii[t];
    const angleShift = t * 0.14;
    for (let w = 0; w < 3; w++) {
      const ang = wingAngles[w] + angleShift;
      const wing = new THREE.Mesh(
        new THREE.CylinderGeometry(r * 0.26, r * 0.34, h, 8),
        glassMat
      );
      wing.position.set(Math.cos(ang) * r * 0.68, h * 0.5, Math.sin(ang) * r * 0.68);
      group.add(wing);

      const trim = new THREE.Mesh(
        new THREE.CylinderGeometry(r * 0.28, r * 0.28, 1.6, 8),
        silverRibMat
      );
      trim.position.set(Math.cos(ang) * r * 0.68, h, Math.sin(ang) * r * 0.68);
      group.add(trim);
    }
  }

  // Iconic Needle Spire up to 380m
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 3.2, 95, 8), spireMat);
  spire.position.y = 290 + 47.5;
  group.add(spire);

  // Aviation Warning Beacon
  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(1.4, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xef4444 })
  );
  beacon.position.y = 386;
  group.add(beacon);

  return group;
}

export function createMuseumOfFuture(textures: ProceduralTextureSet): THREE.Group {
  const group = new THREE.Group();

  // Landscaped green hill mound
  const mound = new THREE.Mesh(
    new THREE.ConeGeometry(44, 14, 24),
    new THREE.MeshStandardMaterial({ color: 0x3f6212, roughness: 0.9 })
  );
  mound.position.y = 7;
  group.add(mound);

  const plinth = new THREE.Mesh(
    new THREE.CylinderGeometry(28, 32, 6, 24),
    new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.5, roughness: 0.4 })
  );
  plinth.position.y = 14;
  group.add(plinth);

  // Iconic Inclined Elliptical Torus with Arabic Calligraphy
  const torusMat = new THREE.MeshStandardMaterial({
    map: textures.museumCalligraphy,
    emissive: 0x0284c7,
    emissiveMap: textures.museumCalligraphy,
    emissiveIntensity: 0.35,
    metalness: 0.85,
    roughness: 0.2,
  });
  const torus = new THREE.Mesh(new THREE.TorusGeometry(24, 9.5, 24, 48), torusMat);
  torus.scale.set(1.18, 1.42, 0.85);
  torus.rotation.y = Math.PI * 0.2;
  torus.rotation.x = -0.18;
  torus.position.y = 44;
  group.add(torus);

  return group;
}

export function createDubaiFrame(textures: ProceduralTextureSet): THREE.Group {
  const group = new THREE.Group();
  const goldMat = new THREE.MeshStandardMaterial({
    map: textures.dubaiFrameGold,
    metalness: 0.88,
    roughness: 0.22,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    metalness: 0.8,
    roughness: 0.12,
  });

  // Podium base
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(92, 8, 22),
    new THREE.MeshStandardMaterial({ color: 0xd6cfc2, roughness: 0.7 })
  );
  base.position.y = 4;
  group.add(base);

  // Two 125m vertical towers
  for (const sx of [-36, 36]) {
    const tower = new THREE.Mesh(new THREE.BoxGeometry(12, 125, 14), goldMat);
    tower.position.set(sx, 66.5, 0);
    group.add(tower);
  }

  // Top Skybridge Deck
  const topBeam = new THREE.Mesh(new THREE.BoxGeometry(84, 14, 15), goldMat);
  topBeam.position.y = 128;
  group.add(topBeam);

  const skyGlass = new THREE.Mesh(new THREE.BoxGeometry(58, 7, 15.6), glassMat);
  skyGlass.position.y = 128;
  group.add(skyGlass);

  return group;
}

export function createEmiratesTowers(textures: ProceduralTextureSet): THREE.Group {
  const group = new THREE.Group();
  const silverGlass = new THREE.MeshStandardMaterial({
    map: textures.facadeCyan,
    color: 0xe2e8f0,
    metalness: 0.85,
    roughness: 0.18,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    metalness: 0.75,
    roughness: 0.25,
  });

  const configs = [
    { x: -18, z: 0, h: 175, r: 16 },
    { x: 20, z: 12, h: 145, r: 14 },
  ];

  for (const cfg of configs) {
    // Equilateral triangular prism tower
    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(cfg.r * 0.85, cfg.r, cfg.h, 3),
      silverGlass
    );
    tower.position.set(cfg.x, cfg.h * 0.5, cfg.z);
    group.add(tower);

    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 1.1, 32, 6), trimMat);
    spire.position.set(cfg.x, cfg.h + 16, cfg.z);
    group.add(spire);
  }

  const podium = new THREE.Mesh(new THREE.BoxGeometry(72, 12, 36), trimMat);
  podium.position.set(0, 6, 6);
  group.add(podium);

  return group;
}

export function createBurjAlArab(): THREE.Group {
  const group = new THREE.Group();

  // Offshore man-made island & causeway
  const island = new THREE.Mesh(
    new THREE.CylinderGeometry(42, 46, 3.5, 24),
    new THREE.MeshStandardMaterial({ color: 0xe2d5be, roughness: 0.85 })
  );
  island.position.y = 1.75;
  group.add(island);

  // Iconic White Sail Core
  const sailMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.35,
    metalness: 0.15,
  });
  const exoskeletonMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    metalness: 0.7,
    roughness: 0.25,
  });

  const sailBody = new THREE.Mesh(
    new THREE.CylinderGeometry(4, 24, 155, 16, 1, false, 0, Math.PI),
    sailMat
  );
  sailBody.scale.set(1.4, 1, 0.7);
  sailBody.position.set(0, 80, 0);
  group.add(sailBody);

  // Blue glass spine & mast
  const spine = new THREE.Mesh(new THREE.BoxGeometry(6, 185, 8), exoskeletonMat);
  spine.position.set(0, 92.5, -4);
  group.add(spine);

  // Cantilevered Helipad Disc
  const helipad = new THREE.Mesh(
    new THREE.CylinderGeometry(11, 9, 2.2, 20),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 })
  );
  helipad.position.set(0, 122, 16);
  group.add(helipad);

  return group;
}

export function createSkiDubaiDome(textures: ProceduralTextureSet): THREE.Group {
  const group = new THREE.Group();

  const mallBase = new THREE.Mesh(
    new THREE.BoxGeometry(110, 20, 68),
    new THREE.MeshStandardMaterial({ color: 0xd6cfc2, roughness: 0.65 })
  );
  mallBase.position.y = 10;
  group.add(mallBase);

  // Tilted futuristic Ski Slope Tube
  const slope = new THREE.Mesh(
    new THREE.CylinderGeometry(15, 20, 92, 16),
    new THREE.MeshStandardMaterial({
      map: textures.facadeCyan,
      color: 0xe0f2fe,
      metalness: 0.75,
      roughness: 0.22,
    })
  );
  slope.rotation.z = -0.45;
  slope.position.set(10, 44, 0);
  group.add(slope);

  return group;
}

export function createCayanTower(textures: ProceduralTextureSet): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    map: textures.facadeGold,
    metalness: 0.8,
    roughness: 0.22,
  });

  // 18 twisting floor segments (90-degree helical rotation!)
  const segCount = 18;
  const segH = 8.2;
  for (let i = 0; i < segCount; i++) {
    const seg = new THREE.Mesh(new THREE.BoxGeometry(22, segH, 22), mat);
    seg.position.y = i * segH + segH * 0.5;
    seg.rotation.y = (i / segCount) * (Math.PI * 0.5);
    group.add(seg);
  }
  return group;
}

export function createJebelAliPort(): THREE.Group {
  const group = new THREE.Group();
  const craneRed = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.45, metalness: 0.4 });
  const containerColors = [0x0284c7, 0xd97706, 0x059669, 0x475569];

  for (let i = 0; i < 4; i++) {
    const gz = (i - 1.5) * 42;
    const leg1 = new THREE.Mesh(new THREE.BoxGeometry(2.5, 42, 2.5), craneRed);
    leg1.position.set(-10, 21, gz);
    group.add(leg1);
    const leg2 = new THREE.Mesh(new THREE.BoxGeometry(2.5, 42, 2.5), craneRed);
    leg2.position.set(10, 21, gz);
    group.add(leg2);
    const boom = new THREE.Mesh(new THREE.BoxGeometry(46, 3, 3.2), craneRed);
    boom.position.set(-4, 38, gz);
    group.add(boom);

    const stack = new THREE.Mesh(
      new THREE.BoxGeometry(16, 8, 12),
      new THREE.MeshStandardMaterial({ color: containerColors[i % containerColors.length], roughness: 0.7 })
    );
    stack.position.set(22, 4, gz);
    group.add(stack);
  }
  return group;
}
