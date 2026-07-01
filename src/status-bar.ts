/* Status bar items: quick light/dark toggle, and VS Code's built-in color theme
   picker (`workbench.action.selectTheme`). */

import * as vscode from "vscode";
import type { SwitchMode } from "./config";
import type { ThemeKind } from "./schedule";

const MODE_LABELS: Record<SwitchMode, string> = {
  manualToggle: "Manual",
  systemPreference: "System",
  sunriseSunset: "Sun",
  manualSchedule: "Schedule",
};

export type StatusBar = {
  update(kind: ThemeKind, mode: SwitchMode, enabled: boolean): void;
  dispose(): void;
};

/** Create the status bar items and return handles to update and dispose them. */
export function createStatusBar(): StatusBar {
  const toggleItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  toggleItem.command = "themeToggle.toggle";

  /* Higher priority sits further left; keep the theme picker beside the toggle. */
  const themePickerItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 101);
  themePickerItem.text = "$(color-mode)";
  themePickerItem.tooltip = "Color Theme\nOpen Preferences: Color Theme";
  themePickerItem.command = "workbench.action.selectTheme";

  toggleItem.show();
  themePickerItem.show();

  function buildTooltip(kind: ThemeKind, mode: SwitchMode, enabled: boolean) {
    const lines = [
      `Theme Toggle — ${kind === "light" ? "Light" : "Dark"} theme active`,
      `Mode: ${MODE_LABELS[mode]}`,
    ];
    if (mode !== "manualToggle") {
      lines.push(`Automatic switching: ${enabled ? "on" : "off"}`);
    }
    lines.push("Click to toggle light/dark");
    return lines.join("\n");
  }

  return {
    update(kind, mode, enabled) {
      const icon = kind === "light" ? "$(theme-toggle-sun)" : "$(theme-toggle-moon)";
      const enabledSuffix = enabled || mode === "manualToggle" ? "" : " (off)";
      toggleItem.text = `${icon} ${MODE_LABELS[mode]}${enabledSuffix}`;
      toggleItem.tooltip = buildTooltip(kind, mode, enabled);
    },
    dispose() {
      toggleItem.dispose();
      themePickerItem.dispose();
    },
  };
}
