/* Pure scheduling core. Imports no `vscode`, so it can be unit-tested in plain
   Node: all inputs (the current time, coordinates, configured times) are passed
   in and nothing is read from the host. */

import { addDays, isValid, parse, set } from "date-fns";
import * as SunCalc from "suncalc";

export type ThemeKind = "light" | "dark";

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type ScheduleResult = {
  /** The theme kind that should be active at the evaluated instant. */
  kind: ThemeKind;
  /** Milliseconds until the next scheduled switch, or `undefined` when there is
      no upcoming transition (e.g. polar day/night with no sunrise to wait for). */
  nextTransitionMs?: number;
};

export type HourMinute = {
  hours: number;
  minutes: number;
};

const DEFAULT_LIGHT: HourMinute = { hours: 7, minutes: 0 };
const DEFAULT_DARK: HourMinute = { hours: 19, minutes: 0 };

/* Any fixed date works as a parse reference; only the time-of-day is read back. */
const PARSE_REFERENCE = new Date(2_000, 0, 1);

/** Sunrise / Sunset: light between sunrise and sunset, dark otherwise. Times are
    computed locally from the coordinates with suncalc — no network involved. */
export function resolveSunriseSunset(now: Date, coords: Coordinates): ScheduleResult {
  const today = SunCalc.getTimes(now, coords.latitude, coords.longitude);
  const sunrise = today.sunrise.getTime();
  const sunset = today.sunset.getTime();

  /* Polar day/night (or any case where suncalc finds no crossing) yields an
     invalid Date — fall back to the sun's actual altitude, with no timer. */
  if (Number.isNaN(sunrise) || Number.isNaN(sunset)) {
    return { kind: altitudeKind(now, coords) };
  }

  const t = now.getTime();
  if (t < sunrise) {
    return { kind: "dark", nextTransitionMs: sunrise - t };
  }
  if (t < sunset) {
    return { kind: "light", nextTransitionMs: sunset - t };
  }

  /* After today's sunset: dark until tomorrow's sunrise. */
  const tomorrow = SunCalc.getTimes(addDays(now, 1), coords.latitude, coords.longitude);
  const nextSunrise = tomorrow.sunrise.getTime();
  return {
    kind: "dark",
    nextTransitionMs: Number.isNaN(nextSunrise) ? undefined : nextSunrise - t,
  };
}

/** Manual Schedule: switch to light at `lightTime` and dark at `darkTime`
    (24-hour HH:mm). Works regardless of which time is earlier by evaluating both
    boundaries across yesterday/today/tomorrow and picking the most recent one. */
export function resolveSchedule(now: Date, lightTime: string, darkTime: string): ScheduleResult {
  const light = parseTime(lightTime, DEFAULT_LIGHT);
  const dark = parseTime(darkTime, DEFAULT_DARK);

  const boundaries: { time: number; kind: ThemeKind }[] = [];
  for (const dayOffset of [-1, 0, 1]) {
    boundaries.push({ time: boundaryAt(now, dayOffset, light), kind: "light" });
    boundaries.push({ time: boundaryAt(now, dayOffset, dark), kind: "dark" });
  }

  const t = now.getTime();

  /* Single pass: the latest boundary at or before now decides the current kind;
     the earliest boundary strictly after now is the next transition. With three
     days of boundaries, both always exist. */
  let current: { time: number; kind: ThemeKind } | undefined;
  let next: { time: number; kind: ThemeKind } | undefined;
  for (const b of boundaries) {
    if (b.time <= t && (!current || b.time > current.time)) {
      current = b;
    }
    if (b.time > t && (!next || b.time < next.time)) {
      next = b;
    }
  }

  return {
    kind: current?.kind ?? "light",
    nextTransitionMs: next ? next.time - t : undefined,
  };
}

/** Parse a 24-hour "H:mm"/"HH:mm" string, falling back on malformed input. */
export function parseTime(value: string, fallback: HourMinute): HourMinute {
  const parsed = parse(value.trim(), "H:mm", PARSE_REFERENCE);
  if (!isValid(parsed)) {
    return fallback;
  }
  return { hours: parsed.getHours(), minutes: parsed.getMinutes() };
}

/* Epoch ms for `now`'s date shifted by `dayOffset`, at the given time-of-day. */
function boundaryAt(now: Date, dayOffset: number, time: HourMinute) {
  const atTime = set(now, {
    hours: time.hours,
    minutes: time.minutes,
    seconds: 0,
    milliseconds: 0,
  });
  return addDays(atTime, dayOffset).getTime();
}

function altitudeKind(now: Date, coords: Coordinates) {
  const pos = SunCalc.getPosition(now, coords.latitude, coords.longitude);
  return pos.altitude > 0 ? "light" : "dark";
}
