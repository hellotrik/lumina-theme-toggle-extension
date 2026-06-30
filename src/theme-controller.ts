/* Owns the switching loop. `refresh()` dispatches explicitly on the configured
   mode, resolves the theme to show, applies it, and arms a timer for the next
   transition. All theme writes funnel through here so behaviour stays consistent
   across modes. */

import * as vscode from "vscode";
import type { SwitchMode } from "./config";
import { config, writeTarget } from "./config";
import { resolveCoordinates } from "./location";
import { log } from "./log";
import type { ScheduleResult, ThemeKind } from "./schedule";
import { resolveSchedule, resolveSunriseSunset } from "./schedule";
import type { StatusBar } from "./status-bar";
import {
  getActiveColorTheme,
  isActiveThemeLight,
  setActiveColorTheme,
  setAutoDetectColorScheme,
  setPreferredThemes,
} from "./workbench";

/* Re-evaluate at most this far in the future. Timed modes return a precise
   `nextTransitionMs`, but we cap the actual timer so that after the machine
   sleeps, the clock drifts, or DST shifts, we recover within the cap by
   recomputing from scratch on the next tick. */
const MAX_TIMER_MS = 60 * 60 * 1_000;

type RefreshReason = "activation" | "config" | "timer";

/* Write the configured theme for `kind`, notifying on an automatic change.
   Pure of controller state, so it lives at module scope. */
async function applyKind(kind: ThemeKind, isAutomatic: boolean) {
  const themeId = kind === "light" ? config.lightTheme : config.darkTheme;
  if (getActiveColorTheme() === themeId) {
    return;
  }
  await setActiveColorTheme(themeId, writeTarget());
  log.info(`Applied ${kind} theme: ${themeId}`);
  if (isAutomatic && config.showNotifications) {
    void vscode.window.showInformationMessage(
      `Theme Toggle switched to your ${kind} theme: ${themeId}`,
    );
  }
}

export type ThemeController = {
  refresh(reason: RefreshReason): Promise<void>;
  toggleNow(): Promise<void>;
  onActiveThemeChanged(): void;
  dispose(): void;
};

/** Create the controller. State (timer, disposal, one-shot warning) lives in the
    closure; the returned object is the public surface the extension wires up. */
export function createThemeController(
  context: vscode.ExtensionContext,
  statusBar: StatusBar,
): ThemeController {
  let timer: NodeJS.Timeout | undefined;
  let disposed = false;
  let warnedNoLocation = false;

  function clearTimer() {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
  }

  function armTimer(ms: number) {
    const delay = Math.max(1000, Math.min(ms, MAX_TIMER_MS));
    timer = setTimeout(() => {
      void refresh("timer");
    }, delay);
  }

  function updateStatusBar(mode: SwitchMode, enabled: boolean) {
    statusBar.update(isActiveThemeLight() ? "light" : "dark", mode, enabled);
  }

  /* Disable native auto-detect (so our writes take effect), set the theme, and
     arm the timer for the next transition. */
  async function drive(result: ScheduleResult, isAutomatic: boolean) {
    await setAutoDetectColorScheme(false);
    await applyKind(result.kind, isAutomatic);
    if (result.nextTransitionMs !== undefined) {
      armTimer(result.nextTransitionMs);
    }
  }

  async function driveSunriseSunset(isAutomatic: boolean) {
    const now = new Date();
    const coords = await resolveCoordinates(context, now);
    if (!coords) {
      warnNoLocationOnce();
      return;
    }
    await drive(resolveSunriseSunset(now, coords), isAutomatic);
  }

  function warnNoLocationOnce() {
    if (warnedNoLocation) {
      return;
    }
    warnedNoLocation = true;
    log.warn("Sunrise/Sunset: could not resolve a location");
    void vscode.window.showWarningMessage(
      "Theme Toggle: could not determine your location for sunrise/sunset. " +
        "Set themeToggle.latitude and themeToggle.longitude, or check your network.",
    );
  }

  /* Reconciles host settings with the active mode, applies the resolved theme,
     and re-arms the timer. Safe to call repeatedly. */
  async function refresh(reason: RefreshReason): Promise<void> {
    if (disposed) {
      return;
    }
    clearTimer();

    const mode = config.mode;
    const enabled = config.enabled;
    const isAutomatic = reason !== "activation";

    switch (mode) {
      case "manualToggle":
        /* Never switches on its own and never touches host settings, so simply
           installing the extension can't change the user's configuration. The
           toggle command is what flips the theme in this mode. */
        break;

      case "systemPreference":
        /* Delegate to VS Code: it follows the OS and switches between the
           preferred light/dark themes for us. Those host settings are global
           (application scope), so this mode always follows the OS across every
           window regardless of `applyTo`. */
        await setPreferredThemes(config.lightTheme, config.darkTheme);
        await setAutoDetectColorScheme(true);
        log.info(
          config.applyTo === "workspace"
            ? "System Preference mode: following OS appearance (global; not workspace-scoped)"
            : "System Preference mode: following OS appearance",
        );
        break;

      case "sunriseSunset":
        if (enabled) {
          await driveSunriseSunset(isAutomatic);
        }
        break;

      case "manualSchedule":
        if (enabled) {
          await drive(
            resolveSchedule(new Date(), config.scheduleLightTime, config.scheduleDarkTime),
            isAutomatic,
          );
        }
        break;
    }

    updateStatusBar(mode, enabled);
  }

  return {
    refresh,

    /* Flip to the opposite of whatever is currently shown. */
    async toggleNow() {
      await setAutoDetectColorScheme(false);
      const nextKind: ThemeKind = isActiveThemeLight() ? "dark" : "light";
      await applyKind(nextKind, false);
      log.info(`Manual toggle -> ${nextKind}`);
      updateStatusBar(config.mode, config.enabled);
    },

    /* React to the user (or OS, in System Preference mode) changing the theme. */
    onActiveThemeChanged() {
      updateStatusBar(config.mode, config.enabled);
    },

    dispose() {
      disposed = true;
      clearTimer();
    },
  };
}
