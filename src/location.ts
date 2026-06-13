/* Resolves coordinates for the sunrise/sunset schedule. Prefers the user's
   manually configured latitude/longitude, otherwise a day-cached IP lookup. */

import { format } from "date-fns";
import type * as vscode from "vscode";
import { config } from "./config";
import { log } from "./log";
import type { Coordinates } from "./schedule";

const IP_CACHE_KEY = "themeToggle.ipLocation";
const IP_ENDPOINT = "https://ipapi.co/json/";
const FETCH_TIMEOUT_MS = 8_000;

/** Day stamp ("yyyy-MM-dd") so we re-resolve at most once per day. */
type CachedLocation = Coordinates & { day: string };

/** Resolve coordinates for sunrise/sunset. Prefers the user's manually configured
    latitude/longitude; otherwise uses a day-cached IP geolocation lookup, falling
    back to a stale cache if the network call fails. Returns `undefined` only when
    no coordinates can be determined at all. */
export async function resolveCoordinates(
  context: vscode.ExtensionContext,
  now: Date,
): Promise<Coordinates | undefined> {
  const lat = config.latitude;
  const lon = config.longitude;
  if (isFiniteNumber(lat) && isFiniteNumber(lon)) {
    return { latitude: lat, longitude: lon };
  }

  const today = format(now, "yyyy-MM-dd");
  const cached = context.globalState.get<CachedLocation>(IP_CACHE_KEY);
  if (cached && cached.day === today) {
    return { latitude: cached.latitude, longitude: cached.longitude };
  }

  try {
    const fetched = await fetchIpLocation();
    if (fetched) {
      await context.globalState.update(IP_CACHE_KEY, {
        ...fetched,
        day: today,
      } satisfies CachedLocation);
      return fetched;
    }
  } catch (err: unknown) {
    log.error("IP geolocation failed", err);
  }

  /* Network failed but we have an old reading — better than nothing. */
  if (cached) {
    return { latitude: cached.latitude, longitude: cached.longitude };
  }
  return undefined;
}

/* One-shot IP geolocation request with a timeout. Returns `undefined` on any problem. */
async function fetchIpLocation() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(IP_ENDPOINT, { signal: controller.signal });
    if (!res.ok) {
      return undefined;
    }
    return readCoordinates(await res.json());
  } finally {
    clearTimeout(timeout);
  }
}

/* Extract coordinates from an untrusted JSON body without an `as` assertion. */
function readCoordinates(data: unknown) {
  if (
    typeof data === "object" &&
    data !== null &&
    "latitude" in data &&
    "longitude" in data &&
    isFiniteNumber(data.latitude) &&
    isFiniteNumber(data.longitude)
  ) {
    return { latitude: data.latitude, longitude: data.longitude };
  }
  return undefined;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
