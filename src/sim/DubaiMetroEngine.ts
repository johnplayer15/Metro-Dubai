import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  DUBAI_STATIONS,
  StationDef,
  TOTAL_ROUTE_M,
  TRAIN_MAX_CAPACITY,
} from '../data/stations';
import { MetroAudioEngine } from './audio';
import {
  createBurjAlArab,
  createBurjKhalifa,
  createCayanTower,
  createDubaiFrame,
  createDubaiMetroTrain,
  createDubaiStation,
  createEmiratesTowers,
  createHighwayGantry,
  createJebelAliPort,
  createMuseumOfFuture,
  createSkiDubaiDome,
  StationRig,
  TrainRig,
} from './landmarks';
import { createProceduralTextures, ProceduralTextureSet } from './textures';
import {
  getSpeedLimitAt,
  sampleTrackPose,
  TrackPose,
} from './track';

export type CameraMode = 'cab' | 'chase' | 'drone';
export type TimeOfDay = 'sunset' | 'day' | 'night';
export type DoorPhase = 'closed' | 'opening' | 'open' | 'closing';

export interface SimTelemetry {
  distanceM: number;
  speedKmh: number;
  speedLimitKmh: number;
  notch: number; // -3 .. +3
  passengersOnboard: number;
  totalPassengersServed: number;
  lastBoarded: number;
  lastAlighted: number;
  stationsVisited: number;
  currentStationIdx: number;
  nextStation: StationDef;
  distToNextStationM: number;
  doorPhase: DoorPhase;
  boardingProgress: number; // 0..1
  canOpenDoors: boolean;
  canDepart: boolean;
  stopErrorM: number | null;
  lastStopGrade: string | null;
  score: number;
  comfortPct: number;
  overspeeding: boolean;
  autopilot: boolean;
  simSpeed: 1 | 2 | 4;
  routeComplete: boolean;
  elapsedSimSec: number;
}

interface LandmarkPlacement {
  s: number;
  lateral: number;
  yawOffset: number;
  mesh: THREE.Group;
}

const _dummy = new THREE.Object3D();
const _pose: TrackPose = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 };
const _poseNext: TrackPose = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 };
const _camTargetPos = new THREE.Vector3();
const _camLookAt = new THREE.Vector3();
const _camCurrentPos = new THREE.Vector3();
const _camCurrentLook = new THREE.Vector3();
const _color = new THREE.Color();

function seededRand(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function buildPalmCrownGeometry(): THREE.BufferGeometry {
  const fronds: THREE.BufferGeometry[] = [];
  const count = 7;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const blade = new THREE.ConeGeometry(0.65, 3.6, 5);
    blade.rotateX(Math.PI * 0.42);
    blade.translate(0, 0.2, 1.5);
    blade.rotateY(angle);
    fronds.push(blade);
  }
  const merged = mergeGeometries(fronds);
  fronds.forEach((f) => f.dispose());
  return merged || new THREE.ConeGeometry(3.2, 2.6, 7);
}

export class DubaiMetroEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean;
  private textures: ProceduralTextureSet;
  private audio: MetroAudioEngine;

  // Lighting, Sky & Atmosphere
  private sunLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private fog: THREE.FogExp2;
  private skyMat!: THREE.ShaderMaterial;
  private skyDome!: THREE.Mesh;
  private currentTimeOfDay: TimeOfDay = 'sunset';

  // Building Materials (adjusted dynamically per TimeOfDay)
  private buildingMats: THREE.MeshStandardMaterial[] = [];

  // Train & AI Train
  private trainRig: TrainRig;
  private aiTrainRig: TrainRig;
  private aiTrainS = 1800;
  private leverAnimAngle = 0;
  private cabPitchSway = 0;
  private lastDmiUpdateMs = 0;

  // Stations & Landmarks
  private stationRigs: StationRig[] = [];
  private landmarks: LandmarkPlacement[] = [];

  // Streamed Instanced Corridor Meshes
  private readonly SEG_COUNT = 64;
  private readonly SEG_LEN = 25;
  private viaductDeckInst!: THREE.InstancedMesh;
  private viaductParapetInst!: THREE.InstancedMesh;
  private viaductPierInst!: THREE.InstancedMesh;
  private trackBedLeftInst!: THREE.InstancedMesh;
  private trackBedRightInst!: THREE.InstancedMesh;
  private steelRailInst!: THREE.InstancedMesh;
  private highwayInst!: THREE.InstancedMesh;
  private highwayMedianInst!: THREE.InstancedMesh;
  private streetLampInst!: THREE.InstancedMesh;
  private palmTrunkInst!: THREE.InstancedMesh;
  private palmCrownInst!: THREE.InstancedMesh;
  private trafficInst!: THREE.InstancedMesh;
  private buildingCyanInst!: THREE.InstancedMesh;
  private buildingGoldInst!: THREE.InstancedMesh;
  private buildingDarkInst!: THREE.InstancedMesh;
  private desertGround!: THREE.Mesh;
  private gulfWater!: THREE.Mesh;

  private trafficVehicles: { offsetS: number; laneX: number; speedMs: number }[] = [];

  // Simulation Physics & Game State
  private distanceM = 0;
  private velocityMs = 0;
  private notch = 0;
  private passengersOnboard = 0;
  private totalPassengersServed = 0;
  private lastBoarded = 0;
  private lastAlighted = 0;
  private visitedStations = new Set<number>();
  private nextStationIdx = 1;
  private doorPhase: DoorPhase = 'open';
  private doorOpenAmount = 1;
  private boardingTimer = 0;
  private readonly BOARDING_DURATION = 3.8;
  private initialBoardingDone = false;
  private pendingBoardTarget = 118;
  private pendingAlightTarget = 0;
  private boardedSoFarThisStop = 0;
  private alightedSoFarThisStop = 0;
  private lastStopGrade: string | null = 'Ready at Centrepoint · Boarding';
  private score = 0;
  private comfortPct = 100;
  private autopilot = false;
  private simSpeed: 1 | 2 | 4 = 1;
  private cameraMode: CameraMode = 'cab';
  private camInitialized = false;
  private elapsedSimSec = 0;
  private routeComplete = false;
  private autoDepartWait = 0;

  private frameId = 0;
  private lastTimeMs = performance.now();
  private disposed = false;
  private onTelemetry: (t: SimTelemetry) => void;
  private lastTelemetryEmit = 0;
  private onContextLostCb?: (lost: boolean) => void;

  constructor(
    container: HTMLElement,
    onTelemetry: (t: SimTelemetry) => void,
    onContextLost?: (lost: boolean) => void
  ) {
    this.container = container;
    this.onTelemetry = onTelemetry;
    this.onContextLostCb = onContextLost;
    this.audio = new MetroAudioEngine();

    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth || 1280, container.clientHeight || 720);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.fog = new THREE.FogExp2(0xe2a97e, 0.00078);
    this.scene.fog = this.fog;
    this.scene.background = new THREE.Color(0xe2a97e);

    this.camera = new THREE.PerspectiveCamera(
      62,
      (container.clientWidth || 1280) / (container.clientHeight || 720),
      0.15,
      2800
    );

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.hemiLight = new THREE.HemisphereLight(0x93c5fd, 0xd4a574, 0.88);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xffd7a8, 2.2);
    this.sunLight.position.set(160, 140, 90);
    if (!this.isSoftwareGl) {
      this.sunLight.castShadow = true;
      this.sunLight.shadow.mapSize.set(1024, 1024);
      this.sunLight.shadow.camera.near = 10;
      this.sunLight.shadow.camera.far = 420;
      const d = 110;
      this.sunLight.shadow.camera.left = -d;
      this.sunLight.shadow.camera.right = d;
      this.sunLight.shadow.camera.top = d;
      this.sunLight.shadow.camera.bottom = -d;
      this.sunLight.shadow.bias = -0.0005;
      this.sunLight.shadow.normalBias = 0.02;
    }
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = createProceduralTextures(maxAniso);

    this.initSkyDome();
    this.initGroundAndWater();
    this.initStreamedCorridor();

    this.trainRig = createDubaiMetroTrain(false, maxAniso, this.isSoftwareGl);
    this.scene.add(this.trainRig.group);

    this.aiTrainRig = createDubaiMetroTrain(true, maxAniso, this.isSoftwareGl);
    this.scene.add(this.aiTrainRig.group);

    this.initStationsAndLandmarks(maxAniso);
    this.syncTrainCockpitVisibility();

    this.visitedStations.add(0);
    this.pendingBoardTarget = 118;
    this.pendingAlightTarget = 0;

    this.setTimeOfDay('sunset');

    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.handleContextRestored);
    window.addEventListener('resize', this.handleResize);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.updateSceneTransforms(0);
    this.emitTelemetry(true);
    this.startLoop();
  }

  private initSkyDome(): void {
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uTopColor: { value: new THREE.Color(0x274c77) },
        uMidColor: { value: new THREE.Color(0xc97b5d) },
        uHorizonColor: { value: new THREE.Color(0xf3b883) },
        uSunDir: { value: new THREE.Vector3(-0.65, 0.16, -0.74).normalize() },
        uSunColor: { value: new THREE.Color(0xfff1c9) },
        uStarIntensity: { value: 0.0 },
      },
      vertexShader: `
        varying vec3 vWorldDir;
        void main() {
          vWorldDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vWorldDir;
        uniform vec3 uTopColor;
        uniform vec3 uMidColor;
        uniform vec3 uHorizonColor;
        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        uniform float uStarIntensity;

        float hash(vec3 p) {
          p = fract(p * 0.3183099 + 0.1);
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }

        void main() {
          vec3 dir = normalize(vWorldDir);
          float h = clamp(dir.y, 0.0, 1.0);
          vec3 sky = mix(uHorizonColor, uMidColor, smoothstep(0.0, 0.24, h));
          sky = mix(sky, uTopColor, smoothstep(0.18, 0.78, h));

          float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
          float sunDisc = smoothstep(0.9985, 0.9996, sunDot);
          float sunHalo = pow(sunDot, 22.0) * 0.42;
          sky += uSunColor * (sunDisc * 1.4 + sunHalo);

          if (uStarIntensity > 0.01 && h > 0.08) {
            float star = step(0.9965, hash(floor(dir * 320.0)));
            sky += vec3(0.9, 0.95, 1.0) * star * uStarIntensity * smoothstep(0.08, 0.35, h);
          }

          gl_FragColor = vec4(sky, 1.0);
        }
      `,
    });

    this.skyDome = new THREE.Mesh(new THREE.SphereGeometry(2350, 32, 20), this.skyMat);
    this.scene.add(this.skyDome);
  }

  private handleContextLost = (e: Event) => {
    e.preventDefault();
    this.onContextLostCb?.(true);
  };

  private handleContextRestored = () => {
    this.onContextLostCb?.(false);
  };

  private handleResize = () => {
    if (this.disposed) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private initGroundAndWater(): void {
    const sandGeo = new THREE.PlaneGeometry(5400, 5400);
    sandGeo.rotateX(-Math.PI * 0.5);
    const sandMat = new THREE.MeshStandardMaterial({
      map: this.textures.desertSand,
      roughness: 0.92,
      metalness: 0.02,
    });
    this.desertGround = new THREE.Mesh(sandGeo, sandMat);
    this.desertGround.position.y = -0.15;
    this.desertGround.receiveShadow = true;
    this.scene.add(this.desertGround);

    const waterGeo = new THREE.PlaneGeometry(2400, 5400);
    waterGeo.rotateX(-Math.PI * 0.5);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0e7490,
      bumpMap: this.textures.waterRipple,
      bumpScale: 0.35,
      roughness: 0.14,
      metalness: 0.72,
    });
    this.gulfWater = new THREE.Mesh(waterGeo, waterMat);
    this.gulfWater.position.set(-1580, -0.05, 0);
    this.scene.add(this.gulfWater);
  }

  private initStreamedCorridor(): void {
    const concreteMat = new THREE.MeshStandardMaterial({
      map: this.textures.viaductConcrete,
      roughness: 0.84,
      metalness: 0.06,
    });
    const trackBedMat = new THREE.MeshStandardMaterial({
      map: this.textures.trackBed,
      roughness: 0.8,
      metalness: 0.12,
    });
    const steelRailMat = new THREE.MeshStandardMaterial({
      color: 0xdbeafe,
      metalness: 0.92,
      roughness: 0.22,
    });
    const roadMat = new THREE.MeshStandardMaterial({
      map: this.textures.highwayAsphalt,
      roughness: 0.82,
      metalness: 0.05,
    });

    const deckGeo = new THREE.BoxGeometry(10.6, 1.3, this.SEG_LEN + 0.6);
    this.viaductDeckInst = new THREE.InstancedMesh(deckGeo, concreteMat, this.SEG_COUNT);
    this.viaductDeckInst.frustumCulled = false;
    this.viaductDeckInst.receiveShadow = true;
    this.scene.add(this.viaductDeckInst);

    // Concrete safety parapet walls on both edges of the viaduct
    const parapetGeo = new THREE.BoxGeometry(0.32, 0.95, this.SEG_LEN + 0.6);
    this.viaductParapetInst = new THREE.InstancedMesh(parapetGeo, concreteMat, this.SEG_COUNT * 2);
    this.viaductParapetInst.frustumCulled = false;
    this.scene.add(this.viaductParapetInst);

    const pierGeo = new THREE.BoxGeometry(2.3, 10.5, 2.5);
    this.viaductPierInst = new THREE.InstancedMesh(pierGeo, concreteMat, this.SEG_COUNT);
    this.viaductPierInst.frustumCulled = false;
    this.scene.add(this.viaductPierInst);

    // Sleepered Track Beds (Player track x=0, Opposite track x=+4.6)
    const bedGeo = new THREE.PlaneGeometry(2.5, this.SEG_LEN + 0.5);
    bedGeo.rotateX(-Math.PI * 0.5);
    this.trackBedLeftInst = new THREE.InstancedMesh(bedGeo, trackBedMat, this.SEG_COUNT);
    this.trackBedLeftInst.frustumCulled = false;
    this.scene.add(this.trackBedLeftInst);

    this.trackBedRightInst = new THREE.InstancedMesh(bedGeo, trackBedMat, this.SEG_COUNT);
    this.trackBedRightInst.frustumCulled = false;
    this.scene.add(this.trackBedRightInst);

    // 4 gleaming steel running rails (2 per track)
    const railHeadGeo = new THREE.BoxGeometry(0.09, 0.14, this.SEG_LEN + 0.5);
    this.steelRailInst = new THREE.InstancedMesh(railHeadGeo, steelRailMat, this.SEG_COUNT * 4);
    this.steelRailInst.frustumCulled = false;
    this.scene.add(this.steelRailInst);

    // Sheikh Zayed Road 12-lane Expressway
    const roadGeo = new THREE.PlaneGeometry(48, this.SEG_LEN + 0.8);
    roadGeo.rotateX(-Math.PI * 0.5);
    this.highwayInst = new THREE.InstancedMesh(roadGeo, roadMat, this.SEG_COUNT);
    this.highwayInst.frustumCulled = false;
    this.highwayInst.receiveShadow = true;
    this.scene.add(this.highwayInst);

    const medianGeo = new THREE.BoxGeometry(0.9, 0.75, this.SEG_LEN + 0.6);
    this.highwayMedianInst = new THREE.InstancedMesh(medianGeo, concreteMat, this.SEG_COUNT);
    this.highwayMedianInst.frustumCulled = false;
    this.scene.add(this.highwayMedianInst);

    const lampGeo = new THREE.CylinderGeometry(0.18, 0.25, 10.5, 6);
    const lampMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      emissive: 0xfef08a,
      emissiveIntensity: 0.55,
      metalness: 0.6,
      roughness: 0.35,
    });
    this.streetLampInst = new THREE.InstancedMesh(lampGeo, lampMat, this.SEG_COUNT * 2);
    this.streetLampInst.frustumCulled = false;
    this.scene.add(this.streetLampInst);

    const trunkGeo = new THREE.CylinderGeometry(0.22, 0.36, 7.5, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78553a, roughness: 0.9 });
    this.palmTrunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, this.SEG_COUNT * 2);
    this.palmTrunkInst.frustumCulled = false;
    this.scene.add(this.palmTrunkInst);

    const crownGeo = buildPalmCrownGeometry();
    const crownMat = new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 0.78 });
    this.palmCrownInst = new THREE.InstancedMesh(crownGeo, crownMat, this.SEG_COUNT * 2);
    this.palmCrownInst.frustumCulled = false;
    this.scene.add(this.palmCrownInst);

    const carGeo = new THREE.BoxGeometry(2.05, 1.35, 4.5);
    const carMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.62,
      roughness: 0.25,
    });
    const trafficCount = 84;
    this.trafficInst = new THREE.InstancedMesh(carGeo, carMat, trafficCount);
    this.trafficInst.frustumCulled = false;
    const carPalette = [0xf8fafc, 0x0f172a, 0x94a3b8, 0x0284c7, 0xdc2626, 0xd97706];
    const lanes = [-17.5, -12.5, -7.5, 7.5, 12.5, 17.5];
    for (let i = 0; i < trafficCount; i++) {
      const laneIdx = i % lanes.length;
      const dir = laneIdx < 3 ? -1 : 1;
      this.trafficVehicles.push({
        offsetS: -280 + (i / trafficCount) * 1450,
        laneX: 28 + lanes[laneIdx],
        speedMs: dir * (22 + seededRand(i + 10) * 14),
      });
      _color.setHex(carPalette[i % carPalette.length]);
      this.trafficInst.setColorAt(i, _color);
    }
    if (this.trafficInst.instanceColor) this.trafficInst.instanceColor.needsUpdate = true;
    this.scene.add(this.trafficInst);

    const bGeo = new THREE.BoxGeometry(1, 1, 1);
    const makeBuildingInst = (tex: THREE.CanvasTexture, emissiveGlow: number) => {
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        bumpMap: this.textures.facadeBump,
        bumpScale: 0.25,
        emissive: 0xfef08a,
        emissiveMap: this.textures.facadeEmissive,
        emissiveIntensity: emissiveGlow,
        metalness: 0.78,
        roughness: 0.18,
      });
      this.buildingMats.push(mat);
      const inst = new THREE.InstancedMesh(bGeo, mat, 52);
      inst.frustumCulled = false;
      this.scene.add(inst);
      return inst;
    };
    this.buildingCyanInst = makeBuildingInst(this.textures.facadeCyan, 0.3);
    this.buildingGoldInst = makeBuildingInst(this.textures.facadeGold, 0.32);
    this.buildingDarkInst = makeBuildingInst(this.textures.facadeDarkLit, 0.65);
  }

  private initStationsAndLandmarks(maxAniso: number): void {
    for (const station of DUBAI_STATIONS) {
      const rig = createDubaiStation(station, this.textures, maxAniso);
      rig.group.visible = false;
      this.scene.add(rig.group);
      this.stationRigs.push(rig);
    }

    const addLandmark = (
      s: number,
      lateral: number,
      yawOffset: number,
      mesh: THREE.Group
    ) => {
      mesh.visible = false;
      this.scene.add(mesh);
      this.landmarks.push({ s, lateral, yawOffset, mesh });
    };

    addLandmark(6900, -145, 0.35, createDubaiFrame(this.textures));
    addLandmark(10650, 95, -0.25, createMuseumOfFuture(this.textures));
    addLandmark(11350, 145, 0.15, createEmiratesTowers(this.textures));
    addLandmark(14600, 195, 0.1, createBurjKhalifa(this.textures));
    addLandmark(21650, 115, 0, createSkiDubaiDome(this.textures));
    addLandmark(25400, -390, 0.3, createBurjAlArab());
    addLandmark(29950, -110, 0, createCayanTower(this.textures));
    addLandmark(42250, -125, 0.1, createJebelAliPort());

    // Highway overhead directional gantries along Sheikh Zayed Road
    for (let gs = 1800; gs < TOTAL_ROUTE_M; gs += 3200) {
      addLandmark(gs, 28, 0, createHighwayGantry(this.textures));
    }
  }

  private syncTrainCockpitVisibility(): void {
    const isCab = this.cameraMode === 'cab';
    this.trainRig.cockpitGroup.visible = isCab;
    this.trainRig.exteriorLeadGroup.visible = !isCab;
  }

  public setCameraMode(mode: CameraMode): void {
    this.cameraMode = mode;
    this.camInitialized = false;
    this.syncTrainCockpitVisibility();
  }

  public setTimeOfDay(tod: TimeOfDay): void {
    this.currentTimeOfDay = tod;
    if (tod === 'sunset') {
      const sky = 0xd98a5f;
      this.scene.background = new THREE.Color(sky);
      this.fog.color.setHex(sky);
      this.fog.density = 0.00072;
      this.sunLight.color.setHex(0xffcca0);
      this.sunLight.intensity = 2.35;
      this.hemiLight.color.setHex(0x93c5fd);
      this.hemiLight.groundColor.setHex(0xc48b5c);
      this.hemiLight.intensity = 0.9;
      this.renderer.toneMappingExposure = 1.08;
      this.trainRig.headlightMat.emissiveIntensity = 1.9;
      this.skyMat.uniforms.uTopColor.value.setHex(0x284b7a);
      this.skyMat.uniforms.uMidColor.value.setHex(0xc97b5d);
      this.skyMat.uniforms.uHorizonColor.value.setHex(0xf3b883);
      this.skyMat.uniforms.uSunDir.value.set(-0.65, 0.14, -0.75).normalize();
      this.skyMat.uniforms.uSunColor.value.setHex(0xffe9b5);
      this.skyMat.uniforms.uStarIntensity.value = 0.0;
      this.buildingMats.forEach((m, idx) => (m.emissiveIntensity = idx === 2 ? 0.55 : 0.25));
    } else if (tod === 'day') {
      const sky = 0x9bd0f7;
      this.scene.background = new THREE.Color(sky);
      this.fog.color.setHex(sky);
      this.fog.density = 0.00058;
      this.sunLight.color.setHex(0xfff9ee);
      this.sunLight.intensity = 2.65;
      this.hemiLight.color.setHex(0xe0f2fe);
      this.hemiLight.groundColor.setHex(0xd4b483);
      this.hemiLight.intensity = 1.08;
      this.renderer.toneMappingExposure = 1.02;
      this.trainRig.headlightMat.emissiveIntensity = 0.9;
      this.skyMat.uniforms.uTopColor.value.setHex(0x1d6fb8);
      this.skyMat.uniforms.uMidColor.value.setHex(0x60a5fa);
      this.skyMat.uniforms.uHorizonColor.value.setHex(0xdbeafe);
      this.skyMat.uniforms.uSunDir.value.set(0.35, 0.65, -0.45).normalize();
      this.skyMat.uniforms.uSunColor.value.setHex(0xffffff);
      this.skyMat.uniforms.uStarIntensity.value = 0.0;
      this.buildingMats.forEach((m) => (m.emissiveIntensity = 0.06));
    } else {
      const sky = 0x070e1f;
      this.scene.background = new THREE.Color(sky);
      this.fog.color.setHex(sky);
      this.fog.density = 0.00086;
      this.sunLight.color.setHex(0x7c93b8);
      this.sunLight.intensity = 0.85;
      this.hemiLight.color.setHex(0x1e3a5f);
      this.hemiLight.groundColor.setHex(0x0f172a);
      this.hemiLight.intensity = 0.72;
      this.renderer.toneMappingExposure = 1.25;
      this.trainRig.headlightMat.emissiveIntensity = 3.2;
      this.skyMat.uniforms.uTopColor.value.setHex(0x020617);
      this.skyMat.uniforms.uMidColor.value.setHex(0x0c1936);
      this.skyMat.uniforms.uHorizonColor.value.setHex(0x1e293b);
      this.skyMat.uniforms.uSunDir.value.set(-0.4, 0.45, -0.7).normalize();
      this.skyMat.uniforms.uSunColor.value.setHex(0xcbd5e1);
      this.skyMat.uniforms.uStarIntensity.value = 0.95;
      this.buildingMats.forEach((m, idx) => (m.emissiveIntensity = idx === 2 ? 1.15 : 0.65));
    }
  }

  public getTimeOfDay(): TimeOfDay {
    return this.currentTimeOfDay;
  }

  public setNotch(n: number): void {
    this.audio.init();
    this.notch = THREE.MathUtils.clamp(Math.round(n), -3, 3);
    if (this.autopilot && this.notch !== 0) {
      this.autopilot = false;
    }
  }

  public stepNotch(delta: number): void {
    this.setNotch(this.notch + delta);
  }

  public setAutopilot(enabled: boolean): void {
    this.audio.init();
    this.autopilot = enabled;
  }

  public setSimSpeed(speed: 1 | 2 | 4): void {
    this.simSpeed = speed;
  }

  public setMuted(mute: boolean): void {
    this.audio.setMuted(mute);
  }

  public soundHorn(): void {
    this.audio.init();
    this.audio.playHorn();
  }

  public toggleDoors(): void {
    this.audio.init();
    if (this.velocityMs > 0.25) return;

    const activeIdx = this.getDockableStationIdx();
    if (this.doorPhase === 'closed' && activeIdx !== -1) {
      this.beginStationBoarding(activeIdx);
    } else if (this.doorPhase === 'open' || this.doorPhase === 'opening') {
      this.completeBoardingTransfer();
      this.doorPhase = 'closing';
      this.audio.playDoorChime(false);
    }
  }

  public restartRoute(): void {
    this.distanceM = 0;
    this.velocityMs = 0;
    this.notch = 0;
    this.passengersOnboard = 0;
    this.totalPassengersServed = 0;
    this.lastBoarded = 0;
    this.lastAlighted = 0;
    this.visitedStations.clear();
    this.visitedStations.add(0);
    this.nextStationIdx = 1;
    this.doorPhase = 'open';
    this.doorOpenAmount = 1;
    this.boardingTimer = 0;
    this.initialBoardingDone = false;
    this.pendingBoardTarget = 118;
    this.pendingAlightTarget = 0;
    this.boardedSoFarThisStop = 0;
    this.alightedSoFarThisStop = 0;
    this.lastStopGrade = 'Ready at Centrepoint · Boarding';
    this.score = 0;
    this.comfortPct = 100;
    this.routeComplete = false;
    this.elapsedSimSec = 0;
    this.camInitialized = false;
    this.emitTelemetry(true);
  }

  private getDockableStationIdx(): number {
    for (let i = 0; i < DUBAI_STATIONS.length; i++) {
      const err = Math.abs(this.distanceM - DUBAI_STATIONS[i].distanceM);
      if (err <= 22) return i;
    }
    return -1;
  }

  private beginStationBoarding(stationIdx: number): void {
    const st = DUBAI_STATIONS[stationIdx];
    this.doorPhase = 'opening';
    this.boardingTimer = 0;
    this.boardedSoFarThisStop = 0;
    this.alightedSoFarThisStop = 0;
    this.audio.playDoorChime(true);

    const isNewVisit = !this.visitedStations.has(stationIdx);
    if (isNewVisit) {
      this.visitedStations.add(stationIdx);
      const stopErr = Math.abs(this.distanceM - st.distanceM);
      let pts = 80;
      let grade = `Safe Dock (${stopErr.toFixed(1)}m)`;
      if (stopErr <= 2.5) {
        pts = 250;
        grade = `Perfect Stop (${stopErr.toFixed(1)}m)`;
      } else if (stopErr <= 7.5) {
        pts = 160;
        grade = `Precision Stop (${stopErr.toFixed(1)}m)`;
      }
      this.score += pts;
      this.lastStopGrade = `${grade} · +${pts} pts`;

      const alighting =
        stationIdx === DUBAI_STATIONS.length - 1
          ? this.passengersOnboard
          : Math.round(this.passengersOnboard * st.alightingRatio);
      const remainingAfterAlight = Math.max(0, this.passengersOnboard - alighting);
      const rawBoard =
        st.boardingMax > st.boardingMin
          ? Math.round(
              st.boardingMin + Math.random() * (st.boardingMax - st.boardingMin)
            )
          : 0;
      const actualBoard = Math.min(
        rawBoard,
        TRAIN_MAX_CAPACITY - remainingAfterAlight
      );
      this.pendingAlightTarget = alighting;
      this.pendingBoardTarget = actualBoard;
      this.score += actualBoard + alighting;

      if (stationIdx === DUBAI_STATIONS.length - 1) {
        this.routeComplete = true;
      } else if (this.nextStationIdx <= stationIdx) {
        this.nextStationIdx = Math.min(DUBAI_STATIONS.length - 1, stationIdx + 1);
      }
    } else {
      this.pendingAlightTarget = 0;
      this.pendingBoardTarget = 0;
    }
  }

  private completeBoardingTransfer(): void {
    const remAlight = this.pendingAlightTarget - this.alightedSoFarThisStop;
    const remBoard = this.pendingBoardTarget - this.boardedSoFarThisStop;
    if (remAlight > 0) {
      this.passengersOnboard = Math.max(0, this.passengersOnboard - remAlight);
      this.alightedSoFarThisStop += remAlight;
    }
    if (remBoard > 0) {
      this.passengersOnboard = Math.min(
        TRAIN_MAX_CAPACITY,
        this.passengersOnboard + remBoard
      );
      this.totalPassengersServed += remBoard;
      this.boardedSoFarThisStop += remBoard;
    }
    this.lastAlighted = this.alightedSoFarThisStop;
    this.lastBoarded = this.boardedSoFarThisStop;
  }

  private updatePhysics(dt: number): void {
    const simDt = dt * this.simSpeed;
    this.elapsedSimSec += simDt;

    this.aiTrainS -= 24 * simDt;
    if (this.aiTrainS < this.distanceM - 1500) {
      this.aiTrainS = this.distanceM + 2600;
    }

    if (!this.initialBoardingDone && this.distanceM < 5 && this.doorPhase === 'open') {
      this.boardingTimer += dt;
      const frac = THREE.MathUtils.clamp(this.boardingTimer / 2.2, 0, 1);
      const targetBoard = Math.round(this.pendingBoardTarget * frac);
      if (targetBoard > this.boardedSoFarThisStop) {
        const diff = targetBoard - this.boardedSoFarThisStop;
        this.passengersOnboard = Math.min(TRAIN_MAX_CAPACITY, this.passengersOnboard + diff);
        this.totalPassengersServed += diff;
        this.boardedSoFarThisStop = targetBoard;
        this.lastBoarded = targetBoard;
      }
      if (frac >= 1) {
        this.initialBoardingDone = true;
      }
    }

    if (this.doorPhase === 'opening') {
      this.doorOpenAmount = Math.min(1, this.doorOpenAmount + dt * 1.8);
      if (this.doorOpenAmount >= 1) this.doorPhase = 'open';
    } else if (this.doorPhase === 'open') {
      this.doorOpenAmount = 1;
      if (this.initialBoardingDone) {
        this.boardingTimer += dt;
        const frac = THREE.MathUtils.clamp(this.boardingTimer / this.BOARDING_DURATION, 0, 1);
        const tgtAlight = Math.round(this.pendingAlightTarget * Math.min(1, frac * 1.4));
        if (tgtAlight > this.alightedSoFarThisStop) {
          const diff = tgtAlight - this.alightedSoFarThisStop;
          this.passengersOnboard = Math.max(0, this.passengersOnboard - diff);
          this.alightedSoFarThisStop = tgtAlight;
          this.lastAlighted = tgtAlight;
        }
        const tgtBoard = Math.round(this.pendingBoardTarget * frac);
        if (tgtBoard > this.boardedSoFarThisStop) {
          const diff = tgtBoard - this.boardedSoFarThisStop;
          this.passengersOnboard = Math.min(TRAIN_MAX_CAPACITY, this.passengersOnboard + diff);
          this.totalPassengersServed += diff;
          this.boardedSoFarThisStop = tgtBoard;
          this.lastBoarded = tgtBoard;
        }
      }
    } else if (this.doorPhase === 'closing') {
      this.doorOpenAmount = Math.max(0, this.doorOpenAmount - dt * 1.8);
      if (this.doorOpenAmount <= 0) this.doorPhase = 'closed';
    }

    if (this.autopilot && !this.routeComplete) {
      const nextSt = DUBAI_STATIONS[this.nextStationIdx];
      const distToStop = nextSt.distanceM - this.distanceM;
      const limitMs = getSpeedLimitAt(this.distanceM, this.nextStationIdx) / 3.6;

      if (this.doorPhase !== 'closed') {
        this.notch = 0;
        const boardingDone =
          this.doorPhase === 'open' &&
          ((this.distanceM < 5 && this.initialBoardingDone) ||
            this.boardingTimer >= this.BOARDING_DURATION);
        if (boardingDone) {
          this.autoDepartWait += dt;
          if (this.autoDepartWait > 0.7) {
            this.autoDepartWait = 0;
            this.toggleDoors();
          }
        }
      } else if (Math.abs(distToStop) <= 2.2 && this.velocityMs < 1.2) {
        this.velocityMs = 0;
        this.notch = -1;
        this.beginStationBoarding(this.nextStationIdx);
      } else {
        const desiredBrakingDecel = 1.05;
        const stopCurveSpeed =
          distToStop > 0 ? Math.sqrt(2 * desiredBrakingDecel * distToStop) : 0;
        const targetSpeed = Math.min(limitMs * 0.96, stopCurveSpeed);

        if (this.velocityMs > targetSpeed + 1.8) this.notch = -2;
        else if (this.velocityMs > targetSpeed + 0.3) this.notch = -1;
        else if (this.velocityMs < targetSpeed - 1.5 && distToStop > 20) this.notch = 3;
        else if (this.velocityMs < targetSpeed - 0.3 && distToStop > 12) this.notch = 1;
        else this.notch = 0;
      }
    }

    if (this.doorPhase !== 'closed') {
      this.velocityMs = 0;
      if (this.notch > 0) this.notch = 0;
    } else {
      let accel = 0;
      if (this.notch === 3) accel = 1.25;
      else if (this.notch === 2) accel = 0.85;
      else if (this.notch === 1) accel = 0.45;
      else if (this.notch === 0) accel = -0.05;
      else if (this.notch === -1) accel = -0.95;
      else if (this.notch === -2) accel = -1.65;
      else if (this.notch === -3) {
        accel = -2.8;
        if (this.velocityMs > 4) {
          this.comfortPct = Math.max(40, this.comfortPct - dt * 6);
        }
      }

      this.velocityMs += accel * simDt;
      if (this.velocityMs < 0) this.velocityMs = 0;
      const maxVelMs = 115 / 3.6;
      if (this.velocityMs > maxVelMs) this.velocityMs = maxVelMs;

      this.distanceM += this.velocityMs * simDt;
      if (this.distanceM > TOTAL_ROUTE_M + 40) {
        this.distanceM = TOTAL_ROUTE_M + 40;
        this.velocityMs = 0;
      }

      const currentTarget = DUBAI_STATIONS[this.nextStationIdx];
      if (
        currentTarget &&
        this.distanceM > currentTarget.distanceM + 26 &&
        this.nextStationIdx < DUBAI_STATIONS.length - 1
      ) {
        this.nextStationIdx++;
      }
    }

    const speedKmh = this.velocityMs * 3.6;
    const limitKmh = getSpeedLimitAt(this.distanceM, this.nextStationIdx);
    if (speedKmh > limitKmh + 6) {
      this.comfortPct = Math.max(40, this.comfortPct - dt * 2.5);
    } else {
      this.comfortPct = Math.min(100, this.comfortPct + dt * 0.4);
    }

    // Smooth cockpit suspension pitch sway & lever tilt
    const targetLever = -this.notch * 0.16;
    this.leverAnimAngle = THREE.MathUtils.damp(this.leverAnimAngle, targetLever, 12, dt || 0.016);
    const targetPitchSway = this.doorPhase === 'closed' ? this.notch * 0.0045 : 0;
    this.cabPitchSway = THREE.MathUtils.damp(this.cabPitchSway, targetPitchSway, 6, dt || 0.016);

    this.audio.updateMotion(speedKmh, this.notch / 3);
  }

  private updateSceneTransforms(dt: number): void {
    sampleTrackPose(this.distanceM, _pose);
    const ox = _pose.x;
    const oz = _pose.z;

    this.skyDome.position.set(0, 0, 0);
    this.desertGround.position.set(0, -0.15, 0);
    this.textures.desertSand.offset.set(ox * 0.012, -oz * 0.012);
    this.gulfWater.position.set(-1580, -0.05, 0);
    this.textures.waterRipple.offset.y += (dt || 0.016) * 0.04;

    this.sunLight.position.set(160, 140, 90);
    this.sunLight.target.position.set(0, 10, -40);

    this.trainRig.group.position.set(0, _pose.y, 0);
    this.trainRig.group.rotation.set(_pose.pitch + this.cabPitchSway, _pose.yaw, 0, 'YXZ');

    // Animate 3D cockpit lever & live DMI display
    this.trainRig.cockpitLeverPivot.rotation.x = this.leverAnimAngle;
    const nowMs = performance.now();
    if (this.cameraMode === 'cab' && this.trainRig.dmi && nowMs - this.lastDmiUpdateMs > 85) {
      this.lastDmiUpdateMs = nowMs;
      const nextSt = DUBAI_STATIONS[this.nextStationIdx];
      this.trainRig.dmi.update(
        this.velocityMs * 3.6,
        getSpeedLimitAt(this.distanceM, this.nextStationIdx),
        this.notch,
        nextSt.code,
        nextSt.name,
        Math.max(0, nextSt.distanceM - this.distanceM),
        this.doorPhase !== 'closed'
      );
    }

    const slideOffset = this.doorOpenAmount * 0.85;
    for (const d of this.trainRig.doorsLeft) {
      d.position.z = (d.userData.baseZ as number) + slideOffset;
    }

    const aiRelS = this.aiTrainS - this.distanceM;
    if (Math.abs(aiRelS) < 1600) {
      sampleTrackPose(this.aiTrainS, _poseNext);
      const cosA = Math.cos(_poseNext.yaw);
      const sinA = Math.sin(_poseNext.yaw);
      this.aiTrainRig.group.visible = true;
      this.aiTrainRig.group.position.set(
        _poseNext.x - ox + cosA * 4.6,
        _poseNext.y,
        _poseNext.z - oz - sinA * 4.6
      );
      this.aiTrainRig.group.rotation.set(-_poseNext.pitch, _poseNext.yaw + Math.PI, 0, 'YXZ');
    } else {
      this.aiTrainRig.group.visible = false;
    }

    const baseSegment = Math.floor((this.distanceM - 300) / this.SEG_LEN);
    let lampIdx = 0;
    let palmIdx = 0;
    let parapetIdx = 0;
    let railIdx = 0;

    for (let i = 0; i < this.SEG_COUNT; i++) {
      const segS = (baseSegment + i) * this.SEG_LEN;
      sampleTrackPose(segS, _poseNext);
      const rx = _poseNext.x - ox;
      const rz = _poseNext.z - oz;
      const cosY = Math.cos(_poseNext.yaw);
      const sinY = Math.sin(_poseNext.yaw);

      // Viaduct Deck
      _dummy.position.set(rx + cosY * 2.3, _poseNext.y - 0.65, rz - sinY * 2.3);
      _dummy.rotation.set(_poseNext.pitch, _poseNext.yaw, 0, 'YXZ');
      _dummy.scale.set(1, 1, 1);
      _dummy.updateMatrix();
      this.viaductDeckInst.setMatrixAt(i, _dummy.matrix);

      // Viaduct Parapet Walls (Left -2.8m, Right +7.4m)
      for (const px of [-2.8, 7.4]) {
        _dummy.position.set(rx + cosY * px, _poseNext.y + 0.45, rz - sinY * px);
        _dummy.rotation.set(_poseNext.pitch, _poseNext.yaw, 0, 'YXZ');
        _dummy.scale.set(1, 1, 1);
        _dummy.updateMatrix();
        this.viaductParapetInst.setMatrixAt(parapetIdx++, _dummy.matrix);
      }

      // Viaduct Pier
      _dummy.position.set(rx + cosY * 2.3, (_poseNext.y - 1.2) * 0.5, rz - sinY * 2.3);
      _dummy.rotation.set(0, _poseNext.yaw, 0);
      _dummy.scale.set(1, (_poseNext.y - 1.0) / 10.5, 1);
      _dummy.updateMatrix();
      this.viaductPierInst.setMatrixAt(i, _dummy.matrix);

      // Sleepered Track Beds
      _dummy.position.set(rx, _poseNext.y + 0.03, rz);
      _dummy.rotation.set(_poseNext.pitch, _poseNext.yaw, 0, 'YXZ');
      _dummy.scale.set(1, 1, 1);
      _dummy.updateMatrix();
      this.trackBedLeftInst.setMatrixAt(i, _dummy.matrix);

      _dummy.position.set(rx + cosY * 4.6, _poseNext.y + 0.03, rz - sinY * 4.6);
      _dummy.updateMatrix();
      this.trackBedRightInst.setMatrixAt(i, _dummy.matrix);

      // 4 Individual Steel Running Rails
      for (const railOffset of [-0.72, 0.72, 4.6 - 0.72, 4.6 + 0.72]) {
        _dummy.position.set(rx + cosY * railOffset, _poseNext.y + 0.1, rz - sinY * railOffset);
        _dummy.rotation.set(_poseNext.pitch, _poseNext.yaw, 0, 'YXZ');
        _dummy.scale.set(1, 1, 1);
        _dummy.updateMatrix();
        this.steelRailInst.setMatrixAt(railIdx++, _dummy.matrix);
      }

      // Sheikh Zayed Road + Median Jersey Barrier
      _dummy.position.set(rx + cosY * 28, 0.06, rz - sinY * 28);
      _dummy.rotation.set(0, _poseNext.yaw, 0);
      _dummy.scale.set(1, 1, 1);
      _dummy.updateMatrix();
      this.highwayInst.setMatrixAt(i, _dummy.matrix);

      _dummy.position.set(rx + cosY * 28, 0.38, rz - sinY * 28);
      _dummy.updateMatrix();
      this.highwayMedianInst.setMatrixAt(i, _dummy.matrix);

      for (const lx of [28, 5.5]) {
        _dummy.position.set(rx + cosY * lx, 5.25, rz - sinY * lx);
        _dummy.rotation.set(0, _poseNext.yaw, 0);
        _dummy.scale.set(1, 1, 1);
        _dummy.updateMatrix();
        this.streetLampInst.setMatrixAt(lampIdx++, _dummy.matrix);
      }

      for (const px of [-14, 56]) {
        const jx = rx + cosY * px;
        const jz = rz - sinY * px;
        _dummy.position.set(jx, 3.75, jz);
        _dummy.rotation.set(0, (baseSegment + i) * 0.7, 0);
        _dummy.scale.set(1, 1, 1);
        _dummy.updateMatrix();
        this.palmTrunkInst.setMatrixAt(palmIdx, _dummy.matrix);

        _dummy.position.set(jx, 7.5, jz);
        _dummy.scale.set(1, 1, 1);
        _dummy.updateMatrix();
        this.palmCrownInst.setMatrixAt(palmIdx, _dummy.matrix);
        palmIdx++;
      }
    }
    this.viaductDeckInst.instanceMatrix.needsUpdate = true;
    this.viaductParapetInst.instanceMatrix.needsUpdate = true;
    this.viaductPierInst.instanceMatrix.needsUpdate = true;
    this.trackBedLeftInst.instanceMatrix.needsUpdate = true;
    this.trackBedRightInst.instanceMatrix.needsUpdate = true;
    this.steelRailInst.instanceMatrix.needsUpdate = true;
    this.highwayInst.instanceMatrix.needsUpdate = true;
    this.highwayMedianInst.instanceMatrix.needsUpdate = true;
    this.streetLampInst.instanceMatrix.needsUpdate = true;
    this.palmTrunkInst.instanceMatrix.needsUpdate = true;
    this.palmCrownInst.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < this.trafficVehicles.length; i++) {
      const v = this.trafficVehicles[i];
      v.offsetS += v.speedMs * dt * this.simSpeed;
      if (v.offsetS > 1250) v.offsetS -= 1550;
      if (v.offsetS < -300) v.offsetS += 1550;

      const worldS = this.distanceM + v.offsetS;
      sampleTrackPose(worldS, _poseNext);
      const cosY = Math.cos(_poseNext.yaw);
      const sinY = Math.sin(_poseNext.yaw);

      _dummy.position.set(
        _poseNext.x - ox + cosY * v.laneX,
        0.78,
        _poseNext.z - oz - sinY * v.laneX
      );
      _dummy.rotation.set(0, _poseNext.yaw, 0);
      _dummy.scale.set(1, 1, 1);
      _dummy.updateMatrix();
      this.trafficInst.setMatrixAt(i, _dummy.matrix);
    }
    this.trafficInst.instanceMatrix.needsUpdate = true;

    const cellSize = 45;
    const baseCell = Math.floor((this.distanceM - 450) / cellSize);
    let cIdx = 0;
    let gIdx = 0;
    let dIdx = 0;

    for (let cell = 0; cell < 39; cell++) {
      const worldCell = baseCell + cell;
      const cellS = worldCell * cellSize;
      const inDowntown = cellS > 8500 && cellS < 18500 ? 1.55 : 1.0;
      const inMarina = cellS > 27500 && cellS < 34500 ? 1.45 : 1.0;
      const inDesertOuter = cellS > 36000 ? 0.35 : 1.0;
      const heightBoost = Math.max(inDowntown, inMarina) * inDesertOuter;

      sampleTrackPose(cellS, _poseNext);
      const cosY = Math.cos(_poseNext.yaw);
      const sinY = Math.sin(_poseNext.yaw);

      for (let side = 0; side < 4; side++) {
        const seed = worldCell * 17 + side * 31;
        const r1 = seededRand(seed);
        if (cellS > 36500 && r1 > 0.45) continue;

        const r2 = seededRand(seed + 5);
        const r3 = seededRand(seed + 11);

        const isInland = side < 2;
        const lateral = isInland
          ? 76 + (side % 2) * 58 + r1 * 34
          : -(46 + (side % 2) * 52 + r1 * 30);

        const bWidth = 18 + r2 * 22;
        const bDepth = 18 + r3 * 22;
        const bHeight = (26 + Math.pow(r1, 1.4) * 115) * heightBoost;

        _dummy.position.set(
          _poseNext.x - ox + cosY * lateral,
          bHeight * 0.5,
          _poseNext.z - oz - sinY * lateral
        );
        _dummy.rotation.set(0, _poseNext.yaw + (r2 - 0.5) * 0.12, 0);
        _dummy.scale.set(bWidth, bHeight, bDepth);
        _dummy.updateMatrix();

        const variant = Math.abs(worldCell + side) % 3;
        if (variant === 0 && cIdx < 52) {
          this.buildingCyanInst.setMatrixAt(cIdx++, _dummy.matrix);
        } else if (variant === 1 && gIdx < 52) {
          this.buildingGoldInst.setMatrixAt(gIdx++, _dummy.matrix);
        } else if (dIdx < 52) {
          this.buildingDarkInst.setMatrixAt(dIdx++, _dummy.matrix);
        }
      }
    }
    _dummy.scale.set(0, 0, 0);
    _dummy.updateMatrix();
    while (cIdx < 52) this.buildingCyanInst.setMatrixAt(cIdx++, _dummy.matrix);
    while (gIdx < 52) this.buildingGoldInst.setMatrixAt(gIdx++, _dummy.matrix);
    while (dIdx < 52) this.buildingDarkInst.setMatrixAt(dIdx++, _dummy.matrix);
    this.buildingCyanInst.instanceMatrix.needsUpdate = true;
    this.buildingGoldInst.instanceMatrix.needsUpdate = true;
    this.buildingDarkInst.instanceMatrix.needsUpdate = true;

    const timeSec = performance.now() * 0.001;
    for (const rig of this.stationRigs) {
      const relS = rig.station.distanceM - this.distanceM;
      if (Math.abs(relS) < 1650) {
        sampleTrackPose(rig.station.distanceM, _poseNext);
        rig.group.visible = true;
        rig.group.position.set(_poseNext.x - ox, _poseNext.y, _poseNext.z - oz);
        rig.group.rotation.set(0, _poseNext.yaw, 0);

        const isActiveStop = Math.abs(relS) < 25;
        const psdSlide = isActiveStop ? this.doorOpenAmount * 0.85 : 0;
        for (const leaf of rig.screenDoors) {
          leaf.position.z = (leaf.userData.baseZ as number) + psdSlide;
        }

        for (const p of rig.passengers) {
          if (isActiveStop && this.doorOpenAmount > 0.5 && p.boarding) {
            const walk = Math.sin(timeSec * 3.2 + p.phase) * 0.5 + 0.5;
            p.mesh.position.x = THREE.MathUtils.lerp(p.baseX, -1.95, walk * 0.65);
          } else {
            p.mesh.position.x = p.baseX + Math.sin(timeSec * 0.9 + p.phase) * 0.08;
          }
        }
      } else {
        rig.group.visible = false;
      }
    }

    for (const lm of this.landmarks) {
      const relS = lm.s - this.distanceM;
      if (Math.abs(relS) < 2600) {
        sampleTrackPose(lm.s, _poseNext);
        const cosY = Math.cos(_poseNext.yaw);
        const sinY = Math.sin(_poseNext.yaw);
        lm.mesh.visible = true;
        lm.mesh.position.set(
          _poseNext.x - ox + cosY * lm.lateral,
          0,
          _poseNext.z - oz - sinY * lm.lateral
        );
        lm.mesh.rotation.y = _poseNext.yaw + lm.yawOffset;
      } else {
        lm.mesh.visible = false;
      }
    }

    // Camera Choreography
    const fwdX = -Math.sin(_pose.yaw);
    const fwdZ = -Math.cos(_pose.yaw);
    const rightX = Math.cos(_pose.yaw);
    const rightZ = -Math.sin(_pose.yaw);

    if (this.cameraMode === 'cab') {
      // Driver eye position inside the 3D cockpit overlooking the DMI desk, lever & windshield
      const eyeFwd = 0.08;
      const eyeUp = _pose.y + 2.95;
      _camTargetPos.set(fwdX * eyeFwd, eyeUp, fwdZ * eyeFwd);
      _camLookAt.set(
        fwdX * 85,
        _pose.y + 2.25 + Math.sin(_pose.pitch + this.cabPitchSway) * 85,
        fwdZ * 85
      );
      const targetFov = 68 + (this.velocityMs * 3.6 / 110) * 5;
      if (Math.abs(this.camera.fov - targetFov) > 0.05) {
        this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 4, dt || 0.016);
        this.camera.updateProjectionMatrix();
      }
    } else if (this.cameraMode === 'chase') {
      _camTargetPos.set(
        -fwdX * 36 + rightX * 7,
        _pose.y + 13.5,
        -fwdZ * 36 + rightZ * 7
      );
      _camLookAt.set(fwdX * 26, _pose.y + 2.2, fwdZ * 26);
      if (Math.abs(this.camera.fov - 56) > 0.05) {
        this.camera.fov = THREE.MathUtils.damp(this.camera.fov, 56, 4, dt || 0.016);
        this.camera.updateProjectionMatrix();
      }
    } else {
      _camTargetPos.set(
        fwdX * 14 - rightX * 28,
        _pose.y + 9.5,
        fwdZ * 14 - rightZ * 28
      );
      _camLookAt.set(-fwdX * 22, _pose.y + 2.5, -fwdZ * 22);
      if (Math.abs(this.camera.fov - 54) > 0.05) {
        this.camera.fov = THREE.MathUtils.damp(this.camera.fov, 54, 4, dt || 0.016);
        this.camera.updateProjectionMatrix();
      }
    }

    if (!this.camInitialized || this.cameraMode === 'cab') {
      _camCurrentPos.copy(_camTargetPos);
      _camCurrentLook.copy(_camLookAt);
      this.camInitialized = true;
    } else {
      const alpha = 1 - Math.exp(-8 * (dt || 0.016));
      _camCurrentPos.lerp(_camTargetPos, alpha);
      _camCurrentLook.lerp(_camLookAt, alpha);
    }

    this.camera.position.copy(_camCurrentPos);
    this.camera.lookAt(_camCurrentLook);
  }

  private emitTelemetry(force = false): void {
    const now = performance.now();
    if (!force && now - this.lastTelemetryEmit < 65) return;
    this.lastTelemetryEmit = now;

    const dockableIdx = this.getDockableStationIdx();
    const nextSt = DUBAI_STATIONS[this.nextStationIdx];
    const speedKmh = this.velocityMs * 3.6;
    const limitKmh = getSpeedLimitAt(this.distanceM, this.nextStationIdx);

    let closestErr: number | null = null;
    for (const st of DUBAI_STATIONS) {
      const diff = st.distanceM - this.distanceM;
      if (Math.abs(diff) < 350) {
        closestErr = diff;
        break;
      }
    }

    this.onTelemetry({
      distanceM: this.distanceM,
      speedKmh,
      speedLimitKmh: limitKmh,
      notch: this.notch,
      passengersOnboard: this.passengersOnboard,
      totalPassengersServed: this.totalPassengersServed,
      lastBoarded: this.lastBoarded,
      lastAlighted: this.lastAlighted,
      stationsVisited: this.visitedStations.size,
      currentStationIdx: dockableIdx,
      nextStation: nextSt,
      distToNextStationM: Math.max(0, nextSt.distanceM - this.distanceM),
      doorPhase: this.doorPhase,
      boardingProgress: THREE.MathUtils.clamp(
        this.boardingTimer / this.BOARDING_DURATION,
        0,
        1
      ),
      canOpenDoors:
        this.doorPhase === 'closed' && this.velocityMs < 0.25 && dockableIdx !== -1,
      canDepart: this.doorPhase === 'open',
      stopErrorM: closestErr,
      lastStopGrade: this.lastStopGrade,
      score: this.score,
      comfortPct: Math.round(this.comfortPct),
      overspeeding: speedKmh > limitKmh + 4,
      autopilot: this.autopilot,
      simSpeed: this.simSpeed,
      routeComplete: this.routeComplete,
      elapsedSimSec: this.elapsedSimSec,
    });
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private startLoop(): void {
    const tick = () => {
      if (this.disposed) return;
      const now = performance.now();
      const rawDt = (now - this.lastTimeMs) * 0.001;
      this.lastTimeMs = now;
      const dt = Math.min(rawDt, 0.08);

      this.updatePhysics(dt);
      this.updateSceneTransforms(dt);
      this.emitTelemetry(false);

      this.renderer.render(this.scene, this.camera);
      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.afterDraw(tick);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.removeEventListener(
      'webglcontextrestored',
      this.handleContextRestored
    );
    window.removeEventListener('resize', this.handleResize);

    this.audio.dispose();
    this.textures.dispose();
    this.trainRig.dmi?.dispose();
    for (const r of this.stationRigs) {
      r.signTex.dispose();
    }

    this.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else if (mesh.material) {
          mesh.material.dispose();
        }
      }
    });

    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
