/* Typed accessors for the extension's own `themeToggle.*` settings — the single
   place that reads and writes our configuration namespace. */

import * as vscode from "vscode";

export type SwitchMode = "manualToggle" | "systemPreference" | "sunriseSunset" | "manualSchedule";

const SECTION = "themeToggle";

export const config = {
  get lightTheme(): string {
    return read<string>("lightTheme", "Default Light Modern");
  },
  get darkTheme(): string {
    return read<string>("darkTheme", "Default Dark Modern");
  },
  get mode(): SwitchMode {
    return read<SwitchMode>("mode", "manualToggle");
  },
  get enabled(): boolean {
    return read<boolean>("enabled", true);
  },
  get showNotifications(): boolean {
    return read<boolean>("showNotifications", false);
  },
  get latitude(): number | null {
    return read<number | null>("latitude", null);
  },
  get longitude(): number | null {
    return read<number | null>("longitude", null);
  },
  get scheduleLightTime(): string {
    return read<string>("schedule.lightTime", "07:00");
  },
  get scheduleDarkTime(): string {
    return read<string>("schedule.darkTime", "19:00");
  },

  async setMode(mode: SwitchMode): Promise<void> {
    await write("mode", mode);
  },
  async setLightTheme(themeId: string): Promise<void> {
    await write("lightTheme", themeId);
  },
  async setDarkTheme(themeId: string): Promise<void> {
    await write("darkTheme", themeId);
  },
  async setEnabled(enabled: boolean): Promise<void> {
    await write("enabled", enabled);
  },
  async setScheduleLightTime(time: string): Promise<void> {
    await write("schedule.lightTime", time);
  },
  async setScheduleDarkTime(time: string): Promise<void> {
    await write("schedule.darkTime", time);
  },
};

function read<T>(key: string, fallback: T) {
  return vscode.workspace.getConfiguration(SECTION).get<T>(key, fallback);
}

function write(key: string, value: unknown) {
  return vscode.workspace
    .getConfiguration(SECTION)
    .update(key, value, vscode.ConfigurationTarget.Global);
}

/** True when a configuration change touches any `themeToggle.*` setting. */
export function affectsOurConfig(event: vscode.ConfigurationChangeEvent): boolean {
  return event.affectsConfiguration(SECTION);
}
