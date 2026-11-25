import React from 'react';
import {
  ChevronDown,
  ChevronUp,
  DoorOpen,
  Map as MapIcon,
  Moon,
  RotateCcw,
  Sun,
  Sunset,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  DUBAI_STATIONS,
  TOTAL_ROUTE_KM,
  TRAIN_MAX_CAPACITY,
} from '../data/stations';
import { CameraMode, SimTelemetry, TimeOfDay } from '../sim/DubaiMetroEngine';

interface MetroHUDProps {
  telemetry: SimTelemetry;
  cameraMode: CameraMode;
  timeOfDay: TimeOfDay;
  muted: boolean;
  hudCollapsed: boolean;
  mapOpen: boolean;
  onSetCameraMode: (m: CameraMode) => void;
  onSetTimeOfDay: (t: TimeOfDay) => void;
  onToggleMute: () => void;
  onToggleHud: () => void;
  onToggleMap: () => void;
  onSetNotch: (n: number) => void;
  onToggleDoors: () => void;
  onSoundHorn: () => void;
  onToggleAutopilot: () => void;
  onSetSimSpeed: (s: 1 | 2 | 4) => void;
  onRestart: () => void;
}

const NOTCHES = [
  { val: -3, label: 'EB', title: 'Emergency Brake' },
  { val: -2, label: '-2', title: 'Full Brake' },
  { val: -1, label: '-1', title: 'Brake' },
  { val: 0, label: '0', title: 'Coast' },
  { val: 1, label: '+1', title: 'Low Power' },
  { val: 2, label: '+2', title: 'Cruise' },
  { val: 3, label: '+3', title: 'Max Power' },
];

export const MetroHUD: React.FC<MetroHUDProps> = ({
  telemetry,
  cameraMode,
  timeOfDay,
  muted,
  hudCollapsed,
  mapOpen,
  onSetCameraMode,
  onSetTimeOfDay,
  onToggleMute,
  onToggleHud,
  onToggleMap,
  onSetNotch,
  onToggleDoors,
  onSoundHorn,
  onToggleAutopilot,
  onSetSimSpeed,
  onRestart,
}) => {
  const distKm = (telemetry.distanceM / 1000).toFixed(2);
  const nextDistKm = (telemetry.distToNextStationM / 1000).toFixed(2);
  const progressPct = Math.min(100, (telemetry.distanceM / (TOTAL_ROUTE_KM * 1000)) * 100);
  const showDockingStrip =
    telemetry.stopErrorM !== null || telemetry.doorPhase !== 'closed';

  const activeDockStation =
    telemetry.currentStationIdx !== -1
      ? DUBAI_STATIONS[telemetry.currentStationIdx]
      : telemetry.nextStation;

  const withinStopZone =
    telemetry.stopErrorM !== null && Math.abs(telemetry.stopErrorM) <= 22;

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-4">
      {/* Top Bar Row */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        {/* Top-Left Compact Telemetry Strip */}
        <div className="pointer-events-auto rounded-xl border border-white/10 bg-slate-950/88 px-4 py-2.5 shadow-lg">
          <div className="flex items-center gap-3 text-sm font-semibold text-white">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-600" />
            <span className="font-display tracking-wide">Dubai Metro · Red Line</span>
            <span className="text-slate-500" aria-hidden="true">·</span>
            <span className="font-mono-tabular text-xs font-medium text-amber-300">
              {distKm} / {TOTAL_ROUTE_KM.toFixed(1)} km
            </span>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300">
            <span>
              Next: <strong className="text-white">{telemetry.nextStation.code} {telemetry.nextStation.name}</strong> ({nextDistKm} km)
            </span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span className="font-mono-tabular">
              Onboard {telemetry.passengersOnboard}/{TRAIN_MAX_CAPACITY}
            </span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span className="font-mono-tabular">
              Stops {telemetry.stationsVisited}/{DUBAI_STATIONS.length}
            </span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span className="font-mono-tabular text-sky-300">
              {telemetry.score.toLocaleString()} pts
            </span>
          </div>

          {/* Slim Route Progress Hairline */}
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-red-500 transition-transform duration-150"
              style={{
                width: '100%',
                transform: `translateX(${progressPct - 100}%)`,
              }}
            />
          </div>
        </div>

        {/* Top-Right View & Environment Controls */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-white/10 bg-slate-950/88 p-1">
            {([
              { id: 'cab', label: 'Cockpit' },
              { id: 'chase', label: 'Chase' },
              { id: 'drone', label: 'Drone' },
            ] as { id: CameraMode; label: string }[]).map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => onSetCameraMode(mode.id)}
                className={`whitespace-nowrap shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  cameraMode === mode.id
                    ? 'bg-sky-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          <div className="flex items-center rounded-lg border border-white/10 bg-slate-950/88 p-1">
            <button
              type="button"
              onClick={() => onSetTimeOfDay('sunset')}
              title="Sunset Lighting"
              className={`flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                timeOfDay === 'sunset'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Sunset className="h-3.5 w-3.5" />
              <span>Sunset</span>
            </button>
            <button
              type="button"
              onClick={() => onSetTimeOfDay('day')}
              title="Daytime Lighting"
              className={`flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                timeOfDay === 'day'
                  ? 'bg-sky-400 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Sun className="h-3.5 w-3.5" />
              <span>Day</span>
            </button>
            <button
              type="button"
              onClick={() => onSetTimeOfDay('night')}
              title="Night Lighting"
              className={`flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                timeOfDay === 'night'
                  ? 'bg-indigo-400 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Moon className="h-3.5 w-3.5" />
              <span>Night</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onToggleMap}
            className="flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-white/10 bg-slate-950/88 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-900 hover:text-white"
          >
            <MapIcon className="h-3.5 w-3.5 text-red-400" />
            <span>Route Map</span>
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Unmute Audio' : 'Mute Audio'}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-slate-950/88 text-slate-200 hover:bg-slate-900 hover:text-white"
          >
            {muted ? <VolumeX className="h-4 w-4 text-slate-400" /> : <Volume2 className="h-4 w-4 text-sky-400" />}
          </button>
        </div>
      </div>

      {/* Station Docking & Passenger Boarding Strip (appears near stations) */}
      {showDockingStrip && !telemetry.routeComplete && (
        <div className="pointer-events-auto mx-auto mt-2 flex flex-wrap items-center justify-center gap-4 rounded-xl border border-amber-400/30 bg-slate-950/90 px-5 py-2.5 shadow-xl">
          <div className="text-left">
            <div className="text-xs font-semibold text-amber-300">
              {activeDockStation.code} · {activeDockStation.name} · {activeDockStation.arabicName}
            </div>
            <div className="text-xs text-slate-300">
              {telemetry.doorPhase !== 'closed' ? (
                <span className="font-mono-tabular text-emerald-300">
                  Doors Open · +{telemetry.lastBoarded} Boarding / -{telemetry.lastAlighted} Alighting
                </span>
              ) : withinStopZone && telemetry.speedKmh < 1 ? (
                <span className="font-mono-tabular text-emerald-300">
                  Stopped in Dock Zone ({Math.abs(telemetry.stopErrorM ?? 0).toFixed(1)} m from mark)
                </span>
              ) : (
                <span className="font-mono-tabular">
                  Stop Mark: {(telemetry.stopErrorM ?? 0) >= 0 ? '+' : ''}
                  {(telemetry.stopErrorM ?? 0).toFixed(1)} m
                  {withinStopZone ? ' · In Zone' : ' · Slow to Dock'}
                </span>
              )}
            </div>
          </div>

          {(telemetry.canOpenDoors || telemetry.canDepart) && (
            <button
              type="button"
              onClick={onToggleDoors}
              className={`flex items-center gap-2 whitespace-nowrap shrink-0 rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                telemetry.canOpenDoors
                  ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                  : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
              }`}
            >
              <DoorOpen className="h-4 w-4" />
              <span>
                {telemetry.canOpenDoors ? 'Open Doors (Space)' : 'Close Doors & Depart (Space)'}
              </span>
            </button>
          )}
        </div>
      )}

      {/* Spacer keeps 3D viewport center 100% clear */}
      <div className="flex-1" />

      {/* Route Complete Modal */}
      {telemetry.routeComplete && telemetry.doorPhase === 'open' && (
        <div className="pointer-events-auto mx-auto mb-6 w-full max-w-lg rounded-2xl border border-amber-400/40 bg-slate-950/95 p-6 shadow-2xl">
          <div className="text-xs font-medium text-amber-300">
            Red Line Service Completed · R11 Centrepoint to R42 UAE Exchange
          </div>
          <h2 className="font-display mt-1 text-2xl font-bold text-white">
            42.5 km Route Complete
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-white/10 bg-slate-900/80 p-3">
              <div className="text-xs text-slate-400">Passengers Carried</div>
              <div className="font-mono-tabular mt-0.5 text-lg font-semibold text-white">
                {telemetry.totalPassengersServed.toLocaleString()}
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-slate-900/80 p-3">
              <div className="text-xs text-slate-400">Stations Docked</div>
              <div className="font-mono-tabular mt-0.5 text-lg font-semibold text-white">
                {telemetry.stationsVisited} / {DUBAI_STATIONS.length}
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-slate-900/80 p-3">
              <div className="text-xs text-slate-400">Ride Comfort</div>
              <div className="font-mono-tabular mt-0.5 text-lg font-semibold text-emerald-300">
                {telemetry.comfortPct}%
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-slate-900/80 p-3">
              <div className="text-xs text-slate-400">Final Score</div>
              <div className="font-mono-tabular mt-0.5 text-lg font-semibold text-sky-300">
                {telemetry.score.toLocaleString()} pts
              </div>
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={onRestart}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-500"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Start New Red Line Run</span>
            </button>
          </div>
        </div>
      )}

      {/* Collapsible Bottom Control Dock */}
      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={onToggleHud}
          className="pointer-events-auto mb-1.5 flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-950/88 px-3 py-1 text-xs font-medium text-slate-300 hover:text-white"
        >
          {hudCollapsed ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              <span>Show Controls (H)</span>
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              <span>Hide Controls (H)</span>
            </>
          )}
        </button>

        {!hudCollapsed && (
          <div className="pointer-events-auto flex w-full max-w-[940px] flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/90 px-5 py-3 shadow-2xl">
            {/* Speedometer */}
            <div className="flex items-baseline gap-3">
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span
                    className={`font-display font-mono-tabular text-3xl font-bold ${
                      telemetry.overspeeding ? 'text-red-400' : 'text-white'
                    }`}
                  >
                    {Math.round(telemetry.speedKmh)}
                  </span>
                  <span className="text-xs font-medium text-slate-400">km/h</span>
                </div>
                <div className="font-mono-tabular text-xs text-slate-400">
                  Limit {telemetry.speedLimitKmh} km/h
                  {telemetry.overspeeding ? ' · Overspeed' : ''}
                </div>
              </div>
            </div>

            {/* 7-Notch Master Traction / Brake Controller */}
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-slate-900 p-1">
                {NOTCHES.map((n) => {
                  const active = telemetry.notch === n.val;
                  let activeClass = 'bg-sky-500 text-slate-950';
                  if (n.val === -3) activeClass = 'bg-red-600 text-white';
                  else if (n.val < 0) activeClass = 'bg-amber-500 text-slate-950';
                  else if (n.val === 0) activeClass = 'bg-slate-200 text-slate-950';

                  return (
                    <button
                      key={n.val}
                      type="button"
                      title={n.title}
                      onClick={() => onSetNotch(n.val)}
                      className={`font-mono-tabular min-w-[40px] whitespace-nowrap shrink-0 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                        active
                          ? activeClass
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      {n.label}
                    </button>
                  );
                })}
              </div>
              <div className="text-[11px] text-slate-400">
                W / S Throttle & Brake · Space Doors · B Horn
              </div>
            </div>

            {/* Action Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onToggleDoors}
                disabled={!telemetry.canOpenDoors && !telemetry.canDepart}
                className={`whitespace-nowrap shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                  telemetry.canOpenDoors
                    ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                    : telemetry.canDepart
                    ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                    : 'cursor-not-allowed bg-slate-800 text-slate-500'
                }`}
              >
                {telemetry.doorPhase === 'closed' ? 'Open Doors' : 'Close Doors'}
              </button>

              <button
                type="button"
                onClick={onSoundHorn}
                className="whitespace-nowrap shrink-0 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800"
              >
                Horn
              </button>

              <button
                type="button"
                onClick={onToggleAutopilot}
                className={`whitespace-nowrap shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                  telemetry.autopilot
                    ? 'bg-sky-500 text-slate-950 hover:bg-sky-400'
                    : 'border border-white/10 bg-slate-900 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {telemetry.autopilot ? 'Auto-Pilot On' : 'Auto-Pilot'}
              </button>

              <div className="flex items-center rounded-lg border border-white/10 bg-slate-900 p-0.5">
                {([1, 2, 4] as const).map((sp) => (
                  <button
                    key={sp}
                    type="button"
                    onClick={() => onSetSimSpeed(sp)}
                    className={`font-mono-tabular whitespace-nowrap shrink-0 rounded-md px-2 py-1 text-xs font-semibold ${
                      telemetry.simSpeed === sp
                        ? 'bg-slate-200 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {sp}×
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 12-Station Route Map Modal */}
      {mapOpen && (
        <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-slate-950/75 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/15 bg-slate-950 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h2 className="font-display text-lg font-bold text-white">
                  Dubai Metro Red Line · 42.5 km Corridor
                </h2>
                <p className="text-xs text-slate-400">
                  12 Stations · Sheikh Zayed Road Elevated Viaduct
                </p>
              </div>
              <button
                type="button"
                onClick={onToggleMap}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {DUBAI_STATIONS.map((st, idx) => {
                const passed = telemetry.distanceM > st.distanceM + 25;
                const isNext = telemetry.nextStation.id === st.id;
                const isHere = telemetry.currentStationIdx === idx;
                return (
                  <div
                    key={st.id}
                    className={`flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-xs ${
                      isHere
                        ? 'border-emerald-400/50 bg-emerald-950/30'
                        : isNext
                        ? 'border-amber-400/40 bg-amber-950/20'
                        : 'border-white/10 bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`font-mono-tabular inline-block w-10 rounded px-1.5 py-0.5 text-center font-bold ${
                          isHere
                            ? 'bg-emerald-500 text-slate-950'
                            : passed
                            ? 'bg-slate-700 text-slate-300'
                            : 'bg-red-600 text-white'
                        }`}
                      >
                        {st.code}
                      </span>
                      <div>
                        <div className="font-semibold text-white">
                          {st.name} · <span className="font-normal text-slate-300">{st.arabicName}</span>
                        </div>
                        <div className="text-slate-400">
                          {st.district}
                          {st.landmark ? ` · ${st.landmark}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-mono-tabular">
                      <div className="font-semibold text-slate-200">
                        {(st.distanceM / 1000).toFixed(1)} km
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {isHere
                          ? 'Docked'
                          : isNext
                          ? 'Next Stop'
                          : passed
                          ? 'Passed'
                          : `${st.speedLimitKmh} km/h zone`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
              <div className="text-xs text-slate-400">
                Last Stop: {telemetry.lastStopGrade ?? 'Centrepoint'}
              </div>
              <button
                type="button"
                onClick={() => {
                  onRestart();
                  onToggleMap();
                }}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Restart Run</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
