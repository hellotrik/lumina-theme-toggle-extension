/* Helpers for reading and writing the host's built-in `workbench.*` / `window.*`
   theme settings. Kept separate from our own `themeToggle.*` config so the two
   namespaces never get confused. */

import * as vscode from "vscode";

const WORKBENCH = "workbench";
const WINDOW = "window";

/** Write the active color theme to the given target. Applies immediately, no
    reload required. The caller picks the target (global vs workspace). */
export function setActiveColorTheme(
  themeId: string,
  target: vscode.ConfigurationTarget,
): Thenable<void> {
  return vscode.workspace.getConfiguration(WORKBENCH).update("colorTheme", themeId, target);
}

export function getActiveColorTheme(): string | undefined {
  return vscode.workspace.getConfiguration(WORKBENCH).get<string>("colorTheme");
}

/**
 * Toggle VS Code's native OS-following behaviour. We only write when the value
 * actually differs, to avoid churning the user's settings file.
 */
export async function setAutoDetectColorScheme(enabled: boolean): Promise<void> {
  const cfg = vscode.workspace.getConfiguration(WINDOW);
  const current = cfg.get<boolean>("autoDetectColorScheme", false);
  if (current !== enabled) {
    await cfg.update("autoDetectColorScheme", enabled, vscode.ConfigurationTarget.Global);
  }
}

/** Mirror our chosen themes into VS Code's preferred-theme settings (System Preference mode). */
export async function setPreferredThemes(lightThemeId: string, darkThemeId: string): Promise<void> {
  const cfg = vscode.workspace.getConfiguration(WORKBENCH);
  await cfg.update("preferredLightColorTheme", lightThemeId, vscode.ConfigurationTarget.Global);
  await cfg.update("preferredDarkColorTheme", darkThemeId, vscode.ConfigurationTarget.Global);
}

/** Whether VS Code currently reports a light active theme. */
export function isActiveThemeLight(): boolean {
  const kind = vscode.window.activeColorTheme.kind;
  return kind === vscode.ColorThemeKind.Light || kind === vscode.ColorThemeKind.HighContrastLight;
}
