/* Enumerates installed color themes. There is no documented API for this, so we
   scan every extension's `contributes.themes` declaration in its package.json. */

import * as vscode from "vscode";

const EXTENSION_ID = "aerixity.theme-toggle";

/** The kind of UI a contributed theme targets, as declared in its manifest. */
export type ThemeUiKind = "light" | "dark" | "highContrast" | "highContrastLight";

export type InstalledTheme = {
  /** The value written to `workbench.colorTheme`. VS Code matches on the theme
      `id` when present, otherwise the `label`. We mirror that precedence here. */
  id: string;
  label: string;
  uiKind: ThemeUiKind;
  extensionName: string;
};

/* Enumerate every installed color theme, ordered by label. */
function getInstalledThemes(): InstalledTheme[] {
  const themes: InstalledTheme[] = [];

  for (const extension of vscode.extensions.all) {
    const contributes = extension.packageJSON?.contributes;
    const contributedThemes = contributes?.themes;
    if (!Array.isArray(contributedThemes)) {
      continue;
    }

    for (const theme of contributedThemes) {
      const value: string | undefined = theme.id ?? theme.label;
      if (!value) {
        continue;
      }
      themes.push({
        id: value,
        label: theme.label ?? value,
        uiKind: normalizeUiTheme(theme.uiTheme),
        extensionName: extension.packageJSON?.displayName ?? extension.id ?? "Unknown",
      });
    }
  }

  return themes.sort((a, b) => a.label.localeCompare(b.label));
}

export type ThemeGroups = {
  standard: InstalledTheme[];
  highContrast: InstalledTheme[];
};

/** Installed themes for one side of the toggle, split into standard and high-contrast. */
export function getThemeGroupsForKind(kind: "light" | "dark"): ThemeGroups {
  const all = getInstalledThemes();
  if (kind === "light") {
    return {
      standard: all.filter((theme) => theme.uiKind === "light"),
      highContrast: all.filter((theme) => theme.uiKind === "highContrastLight"),
    };
  }
  return {
    standard: all.filter((theme) => theme.uiKind === "dark"),
    highContrast: all.filter((theme) => theme.uiKind === "highContrast"),
  };
}

/** Flat list of every theme for `kind` (standard first, then high contrast). */
export function getThemesForKind(kind: "light" | "dark"): InstalledTheme[] {
  const groups = getThemeGroupsForKind(kind);
  return [...groups.standard, ...groups.highContrast];
}

/** Human-readable label for a `workbench.colorTheme` value (id or label). */
export function resolveThemeLabel(themeId: string): string {
  if (!themeId) {
    return "Color Theme";
  }
  const match = getInstalledThemes().find(
    (theme) => theme.id === themeId || theme.label === themeId,
  );
  return match?.label ?? themeId;
}

/** True when connected to a remote workspace and this extension runs on the remote
    host. Theme packs install on the local UI host, so `vscode.extensions.all`
    cannot see them from the remote host. */
export function runsOnRemoteWorkspaceHost(): boolean {
  if (!vscode.env.remoteName) {
    return false;
  }
  const self = vscode.extensions.getExtension(EXTENSION_ID);
  return self?.extensionKind === vscode.ExtensionKind.Workspace;
}

function normalizeUiTheme(uiTheme: unknown) {
  switch (uiTheme) {
    case "vs":
      return "light";
    case "hc-light":
      return "highContrastLight";
    case "hc-black":
      return "highContrast";
    case "vs-dark":
    default:
      return "dark";
  }
}
