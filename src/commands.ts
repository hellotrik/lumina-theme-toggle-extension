/* Registers the Command Palette commands and the QuickPick UIs they drive. */

import * as vscode from "vscode";
import { config, writeTarget, type SwitchMode } from "./config";
import { log } from "./log";
import type { ThemeController } from "./theme-controller";
import {
  getThemeGroupsForKind,
  type InstalledTheme,
  runsOnRemoteWorkspaceHost,
} from "./theme-registry";
import { getActiveColorTheme, setActiveColorTheme, setAutoDetectColorScheme } from "./workbench";

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

type ThemePick = vscode.QuickPickItem & { themeId: string };

function buildThemePickItems(kind: "light" | "dark", current: string): ThemePick[] {
  const groups = getThemeGroupsForKind(kind);
  const items: ThemePick[] = [];

  if (groups.standard.length > 0) {
    items.push({
      label: kind === "light" ? "Light themes" : "Dark themes",
      kind: vscode.QuickPickItemKind.Separator,
      themeId: "",
    });
    for (const theme of groups.standard) {
      items.push(toThemePick(theme, current));
    }
  }

  if (groups.highContrast.length > 0) {
    items.push({
      label: kind === "light" ? "High contrast (light)" : "High contrast (dark)",
      kind: vscode.QuickPickItemKind.Separator,
      themeId: "",
    });
    for (const theme of groups.highContrast) {
      items.push(toThemePick(theme, current));
    }
  }

  return items;
}

function toThemePick(theme: InstalledTheme, current: string): ThemePick {
  return {
    label: theme.label,
    description: theme.id === current ? "current" : undefined,
    detail: theme.extensionName,
    themeId: theme.id,
  };
}

/* Live-preview picker, matching Preferences: Color Theme: arrow keys apply the
   hovered theme immediately; Esc restores whatever was active when the picker opened. */
async function pickThemeForKind(kind: "light" | "dark", controller: ThemeController) {
  if (runsOnRemoteWorkspaceHost()) {
    log.warn(
      "Running on the remote extension host — only themes installed on the remote are visible. " +
        "Install Lumina on the local machine so it runs in the UI extension host.",
    );
  }

  const configured = kind === "light" ? config.lightTheme : config.darkTheme;
  const items = buildThemePickItems(kind, configured);
  if (items.length === 0) {
    const action = await vscode.window.showWarningMessage(
      "Theme Toggle: no color themes found in this extension host.",
      "Open theme picker",
    );
    if (action === "Open theme picker") {
      await vscode.commands.executeCommand("workbench.action.selectTheme");
    }
    return;
  }

  const originalTheme = getActiveColorTheme();
  const target = writeTarget();
  await setAutoDetectColorScheme(false, target);

  const quickPick = vscode.window.createQuickPick<ThemePick>();
  quickPick.placeholder = `Select the ${kind} theme`;
  quickPick.matchOnDetail = true;
  quickPick.items = items;
  const currentItem = items.find((item) => item.themeId === configured);
  if (currentItem) {
    quickPick.activeItems = [currentItem];
  }

  let acceptedId: string | undefined;
  let previewing: string | undefined;

  async function preview(themeId: string) {
    if (!themeId || themeId === previewing) {
      return;
    }
    previewing = themeId;
    try {
      await setActiveColorTheme(themeId, target);
    } catch (err: unknown) {
      log.warn(`Theme preview failed for ${themeId}: ${String(err)}`);
    }
  }

  await new Promise<void>((resolve) => {
    const disposables: vscode.Disposable[] = [
      quickPick.onDidChangeActive((active) => {
        const item = active[0];
        if (item?.themeId) {
          void preview(item.themeId);
        }
      }),
      quickPick.onDidAccept(() => {
        const item = quickPick.selectedItems[0] ?? quickPick.activeItems[0];
        if (!item?.themeId) {
          return;
        }
        acceptedId = item.themeId;
        quickPick.hide();
      }),
      quickPick.onDidHide(() => {
        for (const disposable of disposables) {
          disposable.dispose();
        }
        quickPick.dispose();
        void (async () => {
          try {
            if (acceptedId) {
              if (kind === "light") {
                await config.setLightTheme(acceptedId);
              } else {
                await config.setDarkTheme(acceptedId);
              }
              log.info(`Selected ${kind} theme: ${acceptedId}`);
              await controller.refresh("config");
              await controller.applyKindNow(kind);
            } else if (originalTheme !== undefined && getActiveColorTheme() !== originalTheme) {
              await setActiveColorTheme(originalTheme, target);
            }
          } catch (err: unknown) {
            log.warn(`Theme picker finalize failed: ${String(err)}`);
          } finally {
            resolve();
          }
        })();
      }),
    ];
    quickPick.show();
  });
}
