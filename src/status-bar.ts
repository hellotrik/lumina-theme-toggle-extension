/* Status bar items: quick light/dark toggle, and the active theme name which
   opens the theme picker for the current kind (light or dark). Both share one compact group. */

import * as vscode from "vscode";
import type { SwitchMode } from "./config";
import type { ThemeKind } from "./schedule";
import { resolveThemeLabel } from "./theme-registry";
import { getActiveColorTheme } from "./workbench";

const GROUP_NAME = "Lumina Theme";
const TOGGLE_ID = "aerixity.theme-toggle.toggle";
const PICKER_ID = "aerixity.theme-toggle.themePicker";
const TOGGLE_PRIORITY = 100;

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

function shortenStatusLabel(label: string) {
  const max = 22;
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

function buildPickerTooltip(themeLabel: string, kind: ThemeKind) {
  return `Color Theme: ${themeLabel}\nSelect the ${kind} theme`;
}

/** Create the status bar items and return handles to update and dispose them. */
export function createStatusBar(): StatusBar {
  const toggleItem = vscode.window.createStatusBarItem(TOGGLE_ID, vscode.StatusBarAlignment.Right, {
    location: { id: TOGGLE_ID, priority: TOGGLE_PRIORITY },
    alignment: vscode.StatusBarAlignment.Right,
    compact: true,
  });
  toggleItem.name = GROUP_NAME;
  toggleItem.command = "themeToggle.toggle";

  const themePickerItem = vscode.window.createStatusBarItem(
    PICKER_ID,
    vscode.StatusBarAlignment.Right,
    {
      location: { id: TOGGLE_ID, priority: TOGGLE_PRIORITY },
      alignment: vscode.StatusBarAlignment.Right,
      compact: true,
    },
  );
  themePickerItem.name = GROUP_NAME;
  themePickerItem.command = "themeToggle.selectLightTheme";

  toggleItem.show();
  themePickerItem.show();

  function buildToggleTooltip(kind: ThemeKind, mode: SwitchMode, enabled: boolean) {
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
      const themeLabel = resolveThemeLabel(getActiveColorTheme() ?? "");
      const icon = kind === "light" ? "$(theme-toggle-sun)" : "$(theme-toggle-moon)";
      const enabledSuffix = enabled || mode === "manualToggle" ? "" : " (off)";
      toggleItem.text = `${icon} ${MODE_LABELS[mode]}${enabledSuffix}`;
      toggleItem.tooltip = buildToggleTooltip(kind, mode, enabled);
      themePickerItem.text = `$(color-mode) ${shortenStatusLabel(themeLabel)}`;
      themePickerItem.command =
        kind === "light" ? "themeToggle.selectLightTheme" : "themeToggle.selectDarkTheme";
      themePickerItem.tooltip = buildPickerTooltip(themeLabel, kind);
    },
    dispose() {
      toggleItem.dispose();
      themePickerItem.dispose();
    },
  };
}
