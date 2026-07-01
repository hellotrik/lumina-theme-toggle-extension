/* Registers the Command Palette commands and the QuickPick UIs they drive. */

import * as vscode from "vscode";
import { config, type SwitchMode } from "./config";
import { log } from "./log";
import type { ThemeController } from "./theme-controller";
import { getThemesForKind, runsOnRemoteWorkspaceHost } from "./theme-registry";

type ModePick = vscode.QuickPickItem & { mode: SwitchMode };

const MODE_PICKS: ModePick[] = [
  {
    mode: "manualToggle",
    label: "$(color-mode) Manual Toggle",
    detail: "Switch only when you run the toggle command or click the status bar.",
  },
  {
    mode: "systemPreference",
    label: "$(device-desktop) System Preference",
    detail: "Follow the operating system's light/dark appearance setting.",
  },
  {
    mode: "sunriseSunset",
    label: "$(lightbulb) Sunrise / Sunset",
    detail: "Switch automatically based on local sunrise and sunset times.",
  },
  {
    mode: "manualSchedule",
    label: "$(clock) Manual Schedule",
    detail: "Switch at user-defined times of day.",
  },
];

/** Register every command and return their disposables. */
export function registerCommands(controller: ThemeController): vscode.Disposable[] {
  return [
    vscode.commands.registerCommand("themeToggle.toggle", async () => {
      await controller.toggleNow();
    }),

    vscode.commands.registerCommand("themeToggle.selectMode", async () => {
      const current = config.mode;
      const items: ModePick[] = MODE_PICKS.map((pick) => ({
        mode: pick.mode,
        label: pick.label,
        detail: pick.detail,
        description: pick.mode === current ? "current" : undefined,
      }));
      const picked = await vscode.window.showQuickPick(items, {
        placeHolder: "Select how Theme Toggle chooses the active theme",
      });
      if (picked) {
        if (picked.mode === "manualSchedule") {
          await configureScheduleTimes();
        }
        await config.setMode(picked.mode);
        log.info(`Mode changed to ${picked.mode}`);
        await controller.refresh("config");
      }
    }),

    vscode.commands.registerCommand("themeToggle.selectLightTheme", async () => {
      await pickThemeForKind("light", controller);
    }),

    vscode.commands.registerCommand("themeToggle.selectDarkTheme", async () => {
      await pickThemeForKind("dark", controller);
    }),

    vscode.commands.registerCommand("themeToggle.toggleEnabled", async () => {
      const next = !config.enabled;
      await config.setEnabled(next);
      log.info(`Automatic switching ${next ? "enabled" : "disabled"}`);
      await controller.refresh("config");
      void vscode.window.showInformationMessage(
        `Theme Toggle: automatic switching ${next ? "enabled" : "disabled"}.`,
      );
    }),
  ];
}

/* 24-hour HH:MM, matching the schedule settings' validation pattern. */
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/* Prompt for the light then dark switch times when Manual Schedule is chosen, so
   users set them inline instead of opening Settings. A cancelled box keeps that
   time's current value. */
async function configureScheduleTimes() {
  const light = await promptTime("Switch to the light theme at", config.scheduleLightTime);
  if (light !== undefined) {
    await config.setScheduleLightTime(light.trim());
  }
  const dark = await promptTime("Switch to the dark theme at", config.scheduleDarkTime);
  if (dark !== undefined) {
    await config.setScheduleDarkTime(dark.trim());
  }
}

function promptTime(prompt: string, current: string) {
  return vscode.window.showInputBox({
    title: "Theme Toggle — Manual Schedule",
    prompt: `${prompt} (24-hour HH:MM)`,
    value: current,
    validateInput: (value) =>
      TIME_PATTERN.test(value.trim()) ? undefined : "Enter a 24-hour time like 07:00 or 19:30.",
  });
}

async function pickThemeForKind(kind: "light" | "dark", controller: ThemeController) {
  if (runsOnRemoteWorkspaceHost()) {
    log.warn(
      "Running on the remote extension host — only themes installed on the remote are visible. " +
        "Install Lumina on the local machine so it runs in the UI extension host.",
    );
  }

  const themes = getThemesForKind(kind);
  if (themes.length === 0) {
    const action = await vscode.window.showWarningMessage(
      "Theme Toggle: no color themes found in this extension host.",
      "Open theme picker",
    );
    if (action === "Open theme picker") {
      await vscode.commands.executeCommand("workbench.action.selectTheme");
    }
    return;
  }

  const current = kind === "light" ? config.lightTheme : config.darkTheme;

  const items: vscode.QuickPickItem[] = themes.map((theme) => ({
    label: theme.label,
    description: theme.id === current ? "current" : undefined,
    detail: theme.extensionName,
  }));

  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: `Select the ${kind} theme`,
    matchOnDetail: true,
  });
  if (!picked) {
    return;
  }

  const chosen = themes.find((theme) => theme.label === picked.label);
  if (!chosen) {
    return;
  }

  if (kind === "light") {
    await config.setLightTheme(chosen.id);
  } else {
    await config.setDarkTheme(chosen.id);
  }
  log.info(`Selected ${kind} theme: ${chosen.id}`);
  await controller.refresh("config");
  await controller.applyKindNow(kind);
}
