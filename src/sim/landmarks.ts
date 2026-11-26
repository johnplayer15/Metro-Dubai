import * as THREE from 'three';
import { StationDef } from '../data/stations';
import {
  createCockpitAuxUpdater,
  createCockpitDmiUpdater,
  createPlatformDepartureTexture,
  createStationSignTexture,
  ProceduralTextureSet,
} from './textures';

export interface TrainRig {
  group: THREE.Group;
  exteriorLeadGroup: THREE.Group;
  cockpitGroup: THREE.Group;
  cockpitLeverPivot: THREE.Group;
  cockpitWiperPivot: THREE.Group;
  speedLockLampMat: THREE.MeshStandardMaterial;
  dmi: ReturnType<typeof createCockpitDmiUpdater> | null;
  aux: ReturnType<typeof createCockpitAuxUpdater> | null;
  doorsLeft: THREE.Mesh[];
  doorsRight: THREE.Mesh[];
  headlightMat: THREE.MeshStandardMaterial;
  headlightBeamMat: THREE.MeshBasicMaterial;
  cabScreen: THREE.Mesh;
}

export interface AnimatedPerson {
  mesh: THREE.Group;
  legL: THREE.Mesh;
  legR: THREE.Mesh;
  baseX: number;
  baseZ: number;
  phase: number;
  role: 'board' | 'alight' | 'stroll';
}

export interface StationRig {
  group: THREE.Group;
  station: StationDef;
  screenDoors: THREE.Mesh[];
  passengers: AnimatedPerson[];
  edgeLedMat: THREE.MeshStandardMaterial;
  signTex: THREE.CanvasTexture;
  depTex: THREE.CanvasTexture;
}

export function createDubaiMetroTrain(
  isAiTrain = false,
  maxAnisotropy = 4,
  isSoftwareGl = false
): TrainRig {
  const group = new THREE.Group();
  const exteriorLeadGroup = new THREE.Group();
  const cockpitGroup = new THREE.Group();
  const doorsLeft: THREE.Mesh[] = [];
  const doorsRight: THREE.Mesh[] = [];

  const bodyMat = isSoftwareGl
    ? new THREE.MeshStandardMaterial({
        color: isAiTrain ? 0xdbeafe : 0xe2e8f0,
        metalness: 0.65,
        roughness: 0.25,
      })
    : new THREE.MeshPhysicalMaterial({
        color: isAiTrain ? 0xdbeafe : 0xe8edf2,
        metalness: 0.68,
        roughness: 0.22,
        clearcoat: 0.8,
        clearcoatRoughness: 0.14,
      });

  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.48,
    roughness: 0.45,
  });
  const stripeCyanMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    metalness: 0.35,
    roughness: 0.3,
  });
  const stripeRedMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    metalness: 0.25,
    roughness: 0.32,
  });
  const windowBandMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    emissive: 0xfef3c7,
    emissiveIntensity: 0.22,
    metalness: 0.88,
    roughness: 0.1,
  });
  const doorMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    metalness: 0.75,
    roughness: 0.2,
  });
  const bogieMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.62,
    roughness: 0.7,
  });
  const wheelMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    metalness: 0.85,
    roughness: 0.3,
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
  const headlightBeamMat = new THREE.MeshBasicMaterial({
    color: 0xfff7d6,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });

  const numCars = 5;
  const carLength = 16.0;
  const gap = 0.85;
  const carWidth = 2.65;
  const carHeight = 3.15;
  const floorY = 1.05;

  for (let c = 0; c < numCars; c++) {
    const carGroup = new THREE.Group();
    const carCenterZ = 8.4 + c * (carLength + gap);
    carGroup.position.set(0, 0, carCenterZ);

    const hull = new THREE.Mesh(
      new THREE.BoxGeometry(carWidth, carHeight, carLength),
      bodyMat
    );
    hull.position.y = floorY + carHeight * 0.5;
    hull.castShadow = true;
    hull.receiveShadow = true;
    carGroup.add(hull);

    // Lower skirt & underframe equipment box
    const underframe = new THREE.Mesh(
      new THREE.BoxGeometry(carWidth * 0.86, 0.45, carLength - 1.2),
      bogieMat
    );
    underframe.position.y = floorY - 0.15;
    carGroup.add(underframe);

    const winRibbon = new THREE.Mesh(
      new THREE.BoxGeometry(carWidth + 0.04, 1.15, carLength - 0.6),
      windowBandMat
    );
    winRibbon.position.y = floorY + 1.85;
    carGroup.add(winRibbon);

    const cyanStripe = new THREE.Mesh(
      new THREE.BoxGeometry(carWidth + 0.05, 0.22, carLength - 0.2),
      stripeCyanMat
    );
    cyanStripe.position.y = floorY + 0.95;
    carGroup.add(cyanStripe);

    if (c === 0) {
      const goldStripe = new THREE.Mesh(
        new THREE.BoxGeometry(carWidth + 0.055, 0.14, carLength - 0.3),
        stripeRedMat
      );
      goldStripe.position.y = floorY + 0.72;
      carGroup.add(goldStripe);
    }

    // Roof HVAC pods + louvered ribs
    for (const pz of [-4.2, 4.2]) {
      const hvac = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.38, 3.2), roofMat);
      hvac.position.set(0, floorY + carHeight + 0.18, pz);
      carGroup.add(hvac);
    }

    // Bogies with visible axle wheel discs
    for (const bz of [-5.2, 5.2]) {
      const bogie = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.45, 2.5), bogieMat);
      bogie.position.set(0, 0.62, bz);
      carGroup.add(bogie);

      for (const wz of [-0.85, 0.85]) {
        for (const wx of [-0.74, 0.74]) {
          const wheel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.42, 0.42, 0.14, 12),
            wheelMat
          );
          wheel.rotation.z = Math.PI * 0.5;
          wheel.position.set(wx, 0.46, bz + wz);
          carGroup.add(wheel);
        }
      }
    }

    const doorOffsets = [-4.6, 0, 4.6];
    for (const dz of doorOffsets) {
      const leftDoor = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.05, 1.45), doorMat);
      leftDoor.position.set(-carWidth * 0.5 - 0.02, floorY + 1.35, dz);
      leftDoor.userData.baseZ = dz;
      carGroup.add(leftDoor);
      doorsLeft.push(leftDoor);

      const rightDoor = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.05, 1.45), doorMat);
      rightDoor.position.set(carWidth * 0.5 + 0.02, floorY + 1.35, dz);
      rightDoor.userData.baseZ = dz;
      carGroup.add(rightDoor);
      doorsRight.push(rightDoor);
    }

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

  // Aerodynamic Front Nose Cone
  exteriorLeadGroup.position.set(0, 0, 0.4);
  const noseLower = new THREE.Mesh(
    new THREE.CylinderGeometry(1.15, 1.45, 2.3, 12),
    bodyMat
  );
  noseLower.rotation.x = Math.PI * 0.38;
  noseLower.scale.set(1.0, 1.0, 0.68);
  noseLower.position.set(0, floorY + 0.75, -0.8);
  exteriorLeadGroup.add(noseLower);

  const couplerSkirt = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.38, 0.65),
    bogieMat
  );
  couplerSkirt.position.set(0, floorY + 0.05, -1.65);
  exteriorLeadGroup.add(couplerSkirt);

  const noseWindshield = new THREE.Mesh(
    new THREE.BoxGeometry(2.25, 1.25, 1.6),
    windowBandMat
  );
  noseWindshield.rotation.x = -0.35;
  noseWindshield.position.set(0, floorY + 1.95, -0.45);
  exteriorLeadGroup.add(noseWindshield);

  for (const hx of [-0.82, 0.82]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 0.2), headlightMat);
    hl.position.set(hx, floorY + 0.72, -1.68);
    exteriorLeadGroup.add(hl);
  }

  const cabScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(1.4, 0.24),
    new THREE.MeshBasicMaterial({ color: 0xf59e0b })
  );
  cabScreen.rotation.y = Math.PI;
  cabScreen.position.set(0, floorY + 2.55, -0.95);
  exteriorLeadGroup.add(cabScreen);
  group.add(exteriorLeadGroup);

  // Volumetric-style Headlight Cones (attached to train root so they shine in BOTH Cockpit & Exterior views!)
  for (const hx of [-0.82, 0.82]) {
    const beamCone = new THREE.Mesh(
      new THREE.ConeGeometry(4.6, 52, 16, 1, true),
      headlightBeamMat
    );
    beamCone.rotation.x = -Math.PI * 0.5 + 0.06;
    beamCone.position.set(hx, floorY + 0.65, -27.5);
    group.add(beamCone);
  }

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

  // ---------------- HIGH-DETAIL 3D DRIVER COCKPIT ----------------
  const cockpitLeverPivot = new THREE.Group();
  const cockpitWiperPivot = new THREE.Group();
  const speedLockLampMat = new THREE.MeshStandardMaterial({
    color: 0x064e3b,
    emissive: 0x10b981,
    emissiveIntensity: 0.0,
    roughness: 0.3,
  });
  let dmi: ReturnType<typeof createCockpitDmiUpdater> | null = null;
  let aux: ReturnType<typeof createCockpitAuxUpdater> | null = null;

  if (!isAiTrain) {
    const dashMat = new THREE.MeshStandardMaterial({
      color: 0x141c2b,
      roughness: 0.52,
      metalness: 0.28,
    });
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.26,
      metalness: 0.8,
    });
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x0b1220,
      roughness: 0.62,
      metalness: 0.22,
    });
    const sideGlassMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.14,
      roughness: 0.08,
      metalness: 0.2,
    });

    // Main sculpted driver desk
    const deskBase = new THREE.Mesh(new THREE.BoxGeometry(2.46, 0.62, 1.1), dashMat);
    deskBase.position.set(0, floorY + 1.0, -0.78);
    deskBase.rotation.x = 0.22;
    cockpitGroup.add(deskBase);

    // Side control wings flanking the driver seat
    for (const sx of [-1.05, 1.05]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.55, 0.95), dashMat);
      wing.position.set(sx, floorY + 1.08, -0.35);
      cockpitGroup.add(wing);
    }

    const deskLip = new THREE.Mesh(new THREE.BoxGeometry(2.48, 0.045, 0.08), trimMat);
    deskLip.position.set(0, floorY + 1.24, -0.26);
    cockpitGroup.add(deskLip);

    // Nose hood contour visible below windshield sill
    const hoodTip = new THREE.Mesh(new THREE.BoxGeometry(2.26, 0.24, 0.78), bodyMat);
    hoodTip.position.set(0, floorY + 1.02, -1.48);
    hoodTip.rotation.x = 0.25;
    cockpitGroup.add(hoodTip);

    // Wrap-around A-Pillars + Side Quarter Glass
    for (const px of [-1.24, 1.24]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.11, 1.56, 0.14), pillarMat);
      pillar.position.set(px, floorY + 1.92, -0.82);
      pillar.rotation.x = -0.32;
      pillar.rotation.z = px < 0 ? -0.06 : 0.06;
      cockpitGroup.add(pillar);

      const sideWindow = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 1.15), sideGlassMat);
      sideWindow.position.set(px + (px < 0 ? 0.03 : -0.03), floorY + 1.9, -0.32);
      sideWindow.rotation.y = Math.PI * 0.5;
      cockpitGroup.add(sideWindow);
    }

    // Overhead Cab Ceiling & Instrument Eyebrow Console
    const ceiling = new THREE.Mesh(new THREE.BoxGeometry(2.58, 0.14, 1.3), pillarMat);
    ceiling.position.set(0, floorY + 2.66, -0.25);
    cockpitGroup.add(ceiling);

    const headerBar = new THREE.Mesh(new THREE.BoxGeometry(2.54, 0.24, 0.62), pillarMat);
    headerBar.position.set(0, floorY + 2.58, -0.62);
    cockpitGroup.add(headerBar);

    // Warm recessed cab overhead reading light strip
    const cabLightStrip = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.03, 0.08),
      new THREE.MeshBasicMaterial({ color: 0xbae6fd })
    );
    cabLightStrip.position.set(0, floorY + 2.46, -0.52);
    cockpitGroup.add(cabLightStrip);

    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(2.26, 0.08, 0.2),
      new THREE.MeshStandardMaterial({
        color: 0x020617,
        transparent: true,
        opacity: 0.78,
        roughness: 0.2,
      })
    );
    visor.position.set(0, floorY + 2.45, -0.96);
    visor.rotation.x = 0.28;
    cockpitGroup.add(visor);

    // Dual Glass-Cockpit 3D Displays:
    // Left Display: Live Speedometer, Limit, Speed Lock & Next Station DMI
    dmi = createCockpitDmiUpdater(maxAnisotropy);
    const dmiHousing = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.36, 0.055), pillarMat);
    dmiHousing.position.set(-0.24, floorY + 1.37, -0.78);
    dmiHousing.rotation.x = -0.52;
    dmiHousing.rotation.y = 0.08;
    cockpitGroup.add(dmiHousing);

    const dmiScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.62, 0.31),
      new THREE.MeshBasicMaterial({ map: dmi.texture })
    );
    dmiScreen.position.set(-0.24, floorY + 1.384, -0.754);
    dmiScreen.rotation.x = -0.52;
    dmiScreen.rotation.y = 0.08;
    cockpitGroup.add(dmiScreen);

    // Right Display: Live Train Systems, Weather & Passenger Load Monitor
    aux = createCockpitAuxUpdater(maxAnisotropy);
    const auxHousing = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.34, 0.055), pillarMat);
    auxHousing.position.set(0.42, floorY + 1.37, -0.76);
    auxHousing.rotation.x = -0.52;
    auxHousing.rotation.y = -0.14;
    cockpitGroup.add(auxHousing);

    const auxScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.56, 0.28),
      new THREE.MeshBasicMaterial({ map: aux.texture })
    );
    auxScreen.position.set(0.42, floorY + 1.384, -0.735);
    auxScreen.rotation.x = -0.52;
    auxScreen.rotation.y = -0.14;
    cockpitGroup.add(auxScreen);

    // Physical Master Controller Throttle/Brake Lever
    const leverSlot = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.04, 0.34),
      new THREE.MeshStandardMaterial({ color: 0x020617, roughness: 0.8 })
    );
    leverSlot.position.set(-0.74, floorY + 1.28, -0.62);
    leverSlot.rotation.x = 0.22;
    cockpitGroup.add(leverSlot);

    cockpitLeverPivot.position.set(-0.74, floorY + 1.26, -0.62);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.22, 10), trimMat);
    shaft.position.y = 0.11;
    cockpitLeverPivot.add(shaft);

    const handleGrip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.028, 0.16, 12),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.32, metalness: 0.35 })
    );
    handleGrip.rotation.z = Math.PI * 0.5;
    handleGrip.position.y = 0.22;
    cockpitLeverPivot.add(handleGrip);
    cockpitGroup.add(cockpitLeverPivot);

    // Illuminated Speed-Lock Indicator Lamp + Door/E-Stop Buttons
    const lockLamp = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.032, 0.03, 14),
      speedLockLampMat
    );
    lockLamp.position.set(-0.56, floorY + 1.27, -0.52);
    lockLamp.rotation.x = 0.22;
    cockpitGroup.add(lockLamp);

    const btnConfigs = [
      { x: 0.68, z: -0.54, color: 0x10b981, emissive: 0x059669, r: 0.03 },
      { x: 0.78, z: -0.54, color: 0xf59e0b, emissive: 0xd97706, r: 0.03 },
      { x: 0.9, z: -0.62, color: 0xef4444, emissive: 0xb91c1c, r: 0.044 },
    ];
    for (const bc of btnConfigs) {
      const btn = new THREE.Mesh(
        new THREE.CylinderGeometry(bc.r, bc.r * 1.1, 0.035, 14),
        new THREE.MeshStandardMaterial({
          color: bc.color,
          emissive: bc.emissive,
          emissiveIntensity: 0.9,
          roughness: 0.28,
        })
      );
      btn.position.set(bc.x, floorY + 1.27, bc.z);
      btn.rotation.x = 0.22;
      cockpitGroup.add(btn);
    }

    // Animated Windshield Wiper
    cockpitWiperPivot.position.set(0.15, floorY + 1.22, -1.14);
    const wiperArm = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.92, 0.02), pillarMat);
    wiperArm.position.y = 0.45;
    cockpitWiperPivot.add(wiperArm);
    cockpitWiperPivot.rotation.z = 1.28;
    cockpitGroup.add(cockpitWiperPivot);

    cockpitGroup.visible = false;
    group.add(cockpitGroup);
  }

  return {
    group,
    exteriorLeadGroup,
    cockpitGroup,
    cockpitLeverPivot,
    cockpitWiperPivot,
    speedLockLampMat,
    dmi,
    aux,
    doorsLeft,
    doorsRight,
    headlightMat,
    headlightBeamMat,
    cabScreen,
  };
}

function createArticulatedPerson(variant: number): {
  mesh: THREE.Group;
  legL: THREE.Mesh;
  legR: THREE.Mesh;
} {
  const fig = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xc68b59, roughness: 0.75 });
  const palette = [0xf8fafc, 0x1e293b, 0x0f172a, 0x334155, 0x0284c7, 0xb45309, 0x7c2d12];
  const outfitColor = palette[variant % palette.length];
  const clothMat = new THREE.MeshStandardMaterial({ color: outfitColor, roughness: 0.82 });

  const legGeo = new THREE.CylinderGeometry(0.075, 0.07, 0.78, 6);
  legGeo.translate(0, -0.39, 0);

  const legL = new THREE.Mesh(legGeo, clothMat);
  legL.position.set(-0.08, 0.78, 0);
  fig.add(legL);

  const legR = new THREE.Mesh(legGeo, clothMat);
  legR.position.set(0.08, 0.78, 0);
  fig.add(legR);

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.17, 0.66, 8), clothMat);
  torso.position.y = 1.1;
  fig.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), skinMat);
  head.position.y = 1.56;
  fig.add(head);

  if (variant % 3 === 0) {
    const ghutra = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.17, 0.22, 8),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 })
    );
    ghutra.position.y = 1.6;
    fig.add(ghutra);
  } else if (variant % 4 === 1) {
    // Rolling suitcase next to traveler
    const bag = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.45, 0.32),
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5, metalness: 0.3 })
    );
    bag.position.set(0.28, 0.24, 0.05);
    fig.add(bag);
  }

  return { mesh: fig, legL, legR };
}

export function createDubaiStation(
  station: StationDef,
  textures: ProceduralTextureSet,
  maxAnisotropy: number
): StationRig {
  const group = new THREE.Group();
  const screenDoors: THREE.Mesh[] = [];
  const passengers: AnimatedPerson[] = [];

  const stationLength = 104;
  const shellColor =
    station.architectureTheme === 'gold-shell'
      ? 0xd9ad58
      : station.architectureTheme === 'heritage-sandstone'
      ? 0xc99c63
      : 0xcbd5e1;

  const goldShellMat = new THREE.MeshStandardMaterial({
    color: shellColor,
    metalness: 0.76,
    roughness: 0.24,
  });
  const ribMat = new THREE.MeshStandardMaterial({
    color: 0x947536,
    metalness: 0.82,
    roughness: 0.22,
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
    roughness: 0.52,
    metalness: 0.12,
  });
  const psdFrameMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.78,
    roughness: 0.25,
  });
  const psdGlassMat = new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    metalness: 0.25,
    roughness: 0.1,
    transparent: true,
    opacity: 0.52,
  });
  const edgeLedMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.9,
    roughness: 0.2,
  });

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

  // Illuminated platform edge LED indicator strip
  const edgeLed = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.06, stationLength - 4),
    edgeLedMat
  );
  edgeLed.position.set(-1.78, 1.14, 42);
  group.add(edgeLed);

  const concourseBox = new THREE.Mesh(
    new THREE.BoxGeometry(18.5, 3.4, stationLength * 0.75),
    concreteMat
  );
  concourseBox.position.set(2.3, -2.5, 42);
  group.add(concourseBox);

  // Escalator skybridge entrances + Red Line Totem Pillars
  for (const side of [-1, 1]) {
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(12, 2.8, 7.5), glassCanopyMat);
    bridge.position.set(2.3 + side * 14, -2.1, 42);
    group.add(bridge);

    const tower = new THREE.Mesh(new THREE.BoxGeometry(5.5, 11.5, 7.5), goldShellMat);
    tower.position.set(2.3 + side * 20, -4.5, 42);
    group.add(tower);

    // RTA Red Line illuminated entrance totem
    const totem = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 4.5, 0.8),
      new THREE.MeshStandardMaterial({
        color: 0xdc2626,
        emissive: 0x991b1b,
        emissiveIntensity: 0.7,
        roughness: 0.3,
      })
    );
    totem.position.set(2.3 + side * 24, -7.2, 46);
    group.add(totem);
  }

  const archCount = 11;
  const archGeo = new THREE.TorusGeometry(9.8, 0.28, 8, 28, Math.PI);
  for (let i = 0; i < archCount; i++) {
    const az = -6 + i * (stationLength / (archCount - 1));
    const arch = new THREE.Mesh(archGeo, ribMat);
    arch.position.set(2.3, 1.6, az);
    group.add(arch);
  }

  // Warm canopy ceiling LED light bars
  const canopyLightMat = new THREE.MeshBasicMaterial({ color: 0xfef3c7 });
  for (let i = 0; i < 6; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(10, 0.1, 0.35), canopyLightMat);
    bar.position.set(2.3, 9.6, 8 + i * 14);
    group.add(bar);
  }

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

  for (const gx of [-6.95, 11.55]) {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 4.4, stationLength),
      glassCanopyMat
    );
    wall.position.set(gx, 3.3, 42);
    group.add(wall);
  }

  // Overhead Digital Platform Departure Displays
  const depTex = createPlatformDepartureTexture(station.code, station.name, maxAnisotropy);
  const depMat = new THREE.MeshBasicMaterial({ map: depTex });
  for (const dz of [22, 62]) {
    const depBoard = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.65, 0.14), depMat);
    depBoard.position.set(-4.0, 4.2, dz);
    group.add(depBoard);
  }

  const psdBaseZStart = 8.4;
  for (let car = 0; car < 5; car++) {
    const carZ = psdBaseZStart + car * 16.85;
    for (const dz of [-4.6, 0, 4.6]) {
      const doorZ = carZ + dz;
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.35, 0.25), psdFrameMat);
      frame.position.set(-1.75, 2.25, doorZ - 0.9);
      group.add(frame);

      const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.2, 1.5), psdGlassMat);
      leaf.position.set(-1.75, 2.2, doorZ);
      leaf.userData.baseZ = doorZ;
      group.add(leaf);
      screenDoors.push(leaf);
    }
  }

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

  // 28 Articulated Animated Commuters (platform queues + street entrance pedestrians)
  for (let i = 0; i < 24; i++) {
    const p = createArticulatedPerson(i);
    const px = -2.65 - (i % 3) * 0.72;
    const pz = 4 + i * 3.25 + (Math.random() - 0.5) * 1.1;
    p.mesh.position.set(px, 1.12, pz);
    p.mesh.rotation.y = Math.PI * 0.5;
    group.add(p.mesh);
    passengers.push({
      mesh: p.mesh,
      legL: p.legL,
      legR: p.legR,
      baseX: px,
      baseZ: pz,
      phase: Math.random() * Math.PI * 2,
      role: i % 3 === 0 ? 'alight' : i % 3 === 1 ? 'board' : 'stroll',
    });
  }

  // 4 Street-level plaza pedestrians outside station entrance
  for (let i = 0; i < 4; i++) {
    const p = createArticulatedPerson(i + 10);
    const px = -19 - (i % 2) * 2.2;
    const pz = 34 + i * 4.5;
    p.mesh.position.set(px, -9.5, pz);
    group.add(p.mesh);
    passengers.push({
      mesh: p.mesh,
      legL: p.legL,
      legR: p.legR,
      baseX: px,
      baseZ: pz,
      phase: Math.random() * Math.PI * 2,
      role: 'stroll',
    });
  }

  return { group, station, screenDoors, passengers, edgeLedMat, signTex, depTex };
}

/* ---------------- ICONIC DUBAI LANDMARKS ---------------- */

export function createBurjKhalifa(textures: ProceduralTextureSet): THREE.Group {
  const group = new THREE.Group();

  const glassMat = new THREE.MeshStandardMaterial({
    map: textures.facadeCyan,
    bumpMap: textures.facadeBump,
    bumpScale: 0.35,
    emissive: 0x38bdf8,
    emissiveMap: textures.facadeEmissive,
    emissiveIntensity: 0.6,
    metalness: 0.88,
    roughness: 0.14,
  });
  const silverRibMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.92,
    roughness: 0.18,
  });
  const spireMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: 0x38bdf8,
    emissiveIntensity: 1.45,
    metalness: 0.9,
    roughness: 0.15,
  });

  const podium = new THREE.Mesh(new THREE.CylinderGeometry(42, 48, 14, 6), silverRibMat);
  podium.position.y = 7;
  group.add(podium);

  const core = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 16, 290, 6), glassMat);
  core.position.y = 145;
  group.add(core);

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

  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 3.2, 95, 8), spireMat);
  spire.position.y = 290 + 47.5;
  group.add(spire);

  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(1.6, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xef4444 })
  );
  beacon.position.y = 386;
  group.add(beacon);

  return group;
}

export function createMuseumOfFuture(textures: ProceduralTextureSet): THREE.Group {
  const group = new THREE.Group();

  const mound = new THREE.Mesh(
    new THREE.ConeGeometry(44, 14, 24),
    new THREE.MeshStandardMaterial({ color: 0x3f6212, roughness: 0.9 })
  );
  mound.position.y = 7;
  group.add(mound);

  const plinth = new THREE.Mesh(
    new THREE.CylinderGeometry(28, 32, 6, 24),
    new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.55, roughness: 0.35 })
  );
  plinth.position.y = 14;
  group.add(plinth);

  const torusMat = new THREE.MeshStandardMaterial({
    map: textures.museumCalligraphy,
    emissive: 0x38bdf8,
    emissiveMap: textures.museumCalligraphy,
    emissiveIntensity: 0.45,
    metalness: 0.88,
    roughness: 0.16,
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
    metalness: 0.9,
    roughness: 0.18,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    metalness: 0.85,
    roughness: 0.1,
  });

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(92, 8, 22),
    new THREE.MeshStandardMaterial({ color: 0xd6cfc2, roughness: 0.7 })
  );
  base.position.y = 4;
  group.add(base);

  for (const sx of [-36, 36]) {
    const tower = new THREE.Mesh(new THREE.BoxGeometry(12, 125, 14), goldMat);
    tower.position.set(sx, 66.5, 0);
    group.add(tower);
  }

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
    bumpMap: textures.facadeBump,
    bumpScale: 0.3,
    color: 0xe2e8f0,
    metalness: 0.85,
    roughness: 0.16,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    metalness: 0.78,
    roughness: 0.22,
  });

  const configs = [
    { x: -18, z: 0, h: 175, r: 16 },
    { x: 20, z: 12, h: 145, r: 14 },
  ];

  for (const cfg of configs) {
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

  const island = new THREE.Mesh(
    new THREE.CylinderGeometry(42, 46, 3.5, 24),
    new THREE.MeshStandardMaterial({ color: 0xe2d5be, roughness: 0.85 })
  );
  island.position.y = 1.75;
  group.add(island);

  const sailMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: 0x0284c7,
    emissiveIntensity: 0.2,
    roughness: 0.32,
    metalness: 0.18,
  });
  const exoskeletonMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    metalness: 0.72,
    roughness: 0.24,
  });

  const sailBody = new THREE.Mesh(
    new THREE.CylinderGeometry(4, 24, 155, 16, 1, false, 0, Math.PI),
    sailMat
  );
  sailBody.scale.set(1.4, 1, 0.7);
  sailBody.position.set(0, 80, 0);
  group.add(sailBody);

  const spine = new THREE.Mesh(new THREE.BoxGeometry(6, 185, 8), exoskeletonMat);
  spine.position.set(0, 92.5, -4);
  group.add(spine);

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

  const slope = new THREE.Mesh(
    new THREE.CylinderGeometry(15, 20, 92, 16),
    new THREE.MeshStandardMaterial({
      map: textures.facadeCyan,
      bumpMap: textures.facadeBump,
      bumpScale: 0.25,
      color: 0xe0f2fe,
      metalness: 0.78,
      roughness: 0.2,
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
    bumpMap: textures.facadeBump,
    bumpScale: 0.3,
    metalness: 0.82,
    roughness: 0.2,
  });

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

export function createHighwayGantry(textures: ProceduralTextureSet): THREE.Group {
  const group = new THREE.Group();
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.75,
    roughness: 0.3,
  });

  for (const px of [-24, 24]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 10.5, 8), steelMat);
    post.position.set(px, 5.25, 0);
    group.add(post);
  }

  const truss = new THREE.Mesh(new THREE.BoxGeometry(50, 0.9, 0.9), steelMat);
  truss.position.set(0, 9.8, 0);
  group.add(truss);

  const signMat = new THREE.MeshBasicMaterial({ map: textures.highwayGantry });
  const sign = new THREE.Mesh(new THREE.BoxGeometry(18, 3.4, 0.3), signMat);
  sign.position.set(0, 9.8, 0.55);
  group.add(sign);

  return group;
}
