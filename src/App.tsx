import { useEffect, useRef, useState } from 'react';
import { MetroHUD } from './components/MetroHUD';
import { DUBAI_STATIONS } from './data/stations';
import {
  CameraMode,
  DubaiMetroEngine,
  SimTelemetry,
  WeatherMode,
} from './sim/DubaiMetroEngine';

const INITIAL_TELEMETRY: SimTelemetry = {
  distanceM: 0,
  speedKmh: 0,
  speedLimitKmh: 90,
  notch: 0,
  passengersOnboard: 0,
  totalPassengersServed: 0,
  lastBoarded: 0,
  lastAlighted: 0,
  stationsVisited: 1,
  currentStationIdx: 0,
  nextStation: DUBAI_STATIONS[1],
  distToNextStationM: DUBAI_STATIONS[1].distanceM,
  doorPhase: 'open',
  boardingProgress: 0,
  canOpenDoors: false,
  canDepart: true,
  stopErrorM: 0,
  lastStopGrade: 'Ready at Centrepoint · Boarding',
  score: 0,
  comfortPct: 100,
  overspeeding: false,
  autopilot: false,
  speedLockEnabled: false,
  speedLockKmh: 85,
  weatherMode: 'auto',
  activeWeather: 'sunny',
  wiperActive: false,
  simSpeed: 1,
  routeComplete: false,
  elapsedSimSec: 0,
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<DubaiMetroEngine | null>(null);

  const [telemetry, setTelemetry] = useState<SimTelemetry>(INITIAL_TELEMETRY);
  const [cameraMode, setCameraMode] = useState<CameraMode>('cab');
  const [muted, setMuted] = useState(false);
  const [hudCollapsed, setHudCollapsed] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [contextLost, setContextLost] = useState(false);

  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const engine = new DubaiMetroEngine(
      mount,
      (next) => setTelemetry(next),
      (lost) => setContextLost(lost)
    );
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const eng = engineRef.current;
      if (!eng) return;
      if (
        e.repeat &&
        (e.code === 'Space' ||
          e.code === 'KeyH' ||
          e.code === 'KeyC' ||
          e.code === 'KeyL' ||
          e.code === 'KeyV')
      ) {
        return;
      }

      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          e.preventDefault();
          eng.stepNotch(1);
          break;
        case 'KeyS':
        case 'ArrowDown':
          e.preventDefault();
          eng.stepNotch(-1);
          break;
        case 'Space':
          e.preventDefault();
          eng.toggleDoors();
          break;
        case 'KeyB':
          eng.soundHorn();
          break;
        case 'KeyL':
          eng.toggleSpeedLock();
          break;
        case 'KeyV':
          eng.toggleWiper();
          break;
        case 'Equal':
        case 'NumpadAdd':
          eng.adjustSpeedLock(5);
          break;
        case 'Minus':
        case 'NumpadSubtract':
          eng.adjustSpeedLock(-5);
          break;
        case 'KeyH':
          setHudCollapsed((prev) => !prev);
          break;
        case 'KeyC':
          setCameraMode((prev) => {
            const next: CameraMode =
              prev === 'cab' ? 'chase' : prev === 'chase' ? 'drone' : 'cab';
            eng.setCameraMode(next);
            return next;
          });
          break;
        case 'KeyA':
          eng.setAutopilot(!telemetry.autopilot);
          break;
        case 'KeyM':
          setMapOpen((prev) => !prev);
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [telemetry.autopilot]);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-950">
      <div ref={canvasMountRef} className="h-full w-full" />

      {contextLost && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/90 p-6 text-center">
          <div className="max-w-sm rounded-xl border border-white/10 bg-slate-900 p-5">
            <h2 className="font-display text-lg font-bold text-white">
              Graphics Context Paused
            </h2>
            <p className="mt-1 text-sm text-slate-300">
              Restoring the 3D Dubai Metro viewport automatically.
            </p>
          </div>
        </div>
      )}

      <MetroHUD
        telemetry={telemetry}
        cameraMode={cameraMode}
        muted={muted}
        hudCollapsed={hudCollapsed}
        mapOpen={mapOpen}
        onSetCameraMode={(m) => {
          setCameraMode(m);
          engineRef.current?.setCameraMode(m);
        }}
        onSetWeatherMode={(w: WeatherMode) => {
          engineRef.current?.setWeatherMode(w);
        }}
        onToggleMute={() => {
          setMuted((prev) => {
            const next = !prev;
            engineRef.current?.setMuted(next);
            return next;
          });
        }}
        onToggleHud={() => setHudCollapsed((prev) => !prev)}
        onToggleMap={() => setMapOpen((prev) => !prev)}
        onSetNotch={(n) => engineRef.current?.setNotch(n)}
        onToggleDoors={() => engineRef.current?.toggleDoors()}
        onSoundHorn={() => engineRef.current?.soundHorn()}
        onToggleAutopilot={() =>
          engineRef.current?.setAutopilot(!telemetry.autopilot)
        }
        onToggleSpeedLock={() => engineRef.current?.toggleSpeedLock()}
        onAdjustSpeedLock={(d) => engineRef.current?.adjustSpeedLock(d)}
        onToggleWiper={() => engineRef.current?.toggleWiper()}
        onSetSimSpeed={(s) => engineRef.current?.setSimSpeed(s)}
        onRestart={() => engineRef.current?.restartRoute()}
      />
    </div>
  );
}
