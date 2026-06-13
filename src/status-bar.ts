/* Status bar item showing the current kind + mode. Clicking it runs the toggle
   command for a quick light/dark flip. */

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

/** Create the status bar item and return handles to update and dispose it. */
export function createStatusBar(): StatusBar {
  const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  item.command = "themeToggle.toggle";
  item.show();

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
      item.text = `${icon} ${MODE_LABELS[mode]}${enabledSuffix}`;
      item.tooltip = buildTooltip(kind, mode, enabled);
    },
    dispose() {
      item.dispose();
    },
  };
}
