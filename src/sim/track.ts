import * as THREE from 'three';
import { DUBAI_STATIONS, TOTAL_ROUTE_M } from '../data/stations';

export interface TrackPose {
  x: number;
  y: number;
  z: number;
  yaw: number; // Radians around Y (0 = moving along -Z)
  pitch: number; // Radians grade angle
}

const BASE_VIADUCT_Y = 9.6;

/**
 * Smooth lateral centerline along Sheikh Zayed Road (E11), 0m -> 42,500m.
 * Note: Forward travel progresses along negative Z (z = -s) so standard Three.js
 * forward (-Z) aligns naturally with camera look direction.
 */
export function getTrackX(s: number): number {
  return (
    210 * Math.sin(s * 0.00023) +
    95 * Math.sin(s * 0.00059 + 0.8) +
    42 * Math.cos(s * 0.0011)
  );
}

/**
 * Viaduct deck elevation. Stays level around every station platform (±160m)
 * while rising smoothly over major highway interchanges.
 */
export function getTrackY(s: number): number {
  // Smoothstation flattening mask: 0 near stations, 1 between stations
  let stationFlatten = 1;
  for (let i = 0; i < DUBAI_STATIONS.length; i++) {
    const dist = Math.abs(s - DUBAI_STATIONS[i].distanceM);
    if (dist < 240) {
      const t = THREE.MathUtils.clamp((dist - 110) / 130, 0, 1);
      const smooth = t * t * (3 - 2 * t);
      if (smooth < stationFlatten) stationFlatten = smooth;
    }
  }
  const undulation =
    1.8 * Math.sin(s * 0.0007 + 0.4) + 1.1 * Math.cos(s * 0.0014);
  return BASE_VIADUCT_Y + Math.max(0, undulation) * stationFlatten;
}

export function getTrackZ(s: number): number {
  return -s;
}

/**
 * Compute world position and orientation at track distance s (meters).
 * Writes into optional target objects to avoid per-frame allocations.
 */
export function sampleTrackPose(s: number, out?: TrackPose): TrackPose {
  const ds = 1.0;
  const x0 = getTrackX(s);
  const y0 = getTrackY(s);
  const z0 = getTrackZ(s);

  const x1 = getTrackX(s + ds);
  const y1 = getTrackY(s + ds);
  const z1 = getTrackZ(s + ds);

  const dx = x1 - x0;
  const dy = y1 - y0;
  const dz = z1 - z0; // -1

  // Yaw around +Y so object facing -Z turns along (dx, dz)
  const yaw = Math.atan2(-dx, -dz);
  const horiz = Math.hypot(dx, dz);
  const pitch = Math.atan2(dy, horiz);

  if (out) {
    out.x = x0;
    out.y = y0;
    out.z = z0;
    out.yaw = yaw;
    out.pitch = pitch;
    return out;
  }
  return { x: x0, y: y0, z: z0, yaw, pitch };
}

/**
 * Get the current speed limit (km/h) at track distance s.
 * Drops smoothly to 65 km/h within 300m approaching a station, 110 km/h on open expressway.
 */
export function getSpeedLimitAt(s: number, nextStationIdx: number): number {
  const station = DUBAI_STATIONS[Math.min(nextStationIdx, DUBAI_STATIONS.length - 1)];
  const distToNext = station.distanceM - s;
  if (distToNext >= -30 && distToNext <= 140) {
    return 55;
  }
  if (distToNext > 140 && distToNext <= 380) {
    return 75;
  }
  if (s >= TOTAL_ROUTE_M - 350) {
    return 55;
  }
  return station.speedLimitKmh;
}

/**
 * Helper to place a roadside/landmark object relative to track tangent at distance s.
 * lateralOffset > 0 puts object to the RIGHT (inland / Sheikh Zayed Rd skyscrapers),
 * lateralOffset < 0 puts object to the LEFT (coastal / Arabian Gulf & Jumeirah side).
 */
export function getLateralTrackPoint(
  s: number,
  lateralOffset: number,
  outVec: THREE.Vector3
): THREE.Vector3 {
  const pose = sampleTrackPose(s);
  const cosY = Math.cos(pose.yaw);
  const sinY = Math.sin(pose.yaw);
  // Local +X rotated by yaw around Y: (cosY, 0, -sinY)
  outVec.set(
    pose.x + cosY * lateralOffset,
    0,
    pose.z - sinY * lateralOffset
  );
  return outVec;
}
