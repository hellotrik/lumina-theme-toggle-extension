/* Enumerates installed color themes. There is no documented API for this, so we
   scan every extension's `contributes.themes` declaration in its package.json. */

import * as vscode from "vscode";

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

/** Themes suitable for a given side of the toggle. */
export function getThemesForKind(kind: "light" | "dark"): InstalledTheme[] {
  const all = getInstalledThemes();
  if (kind === "light") {
    return all.filter((theme) => theme.uiKind === "light" || theme.uiKind === "highContrastLight");
  }
  return all.filter((theme) => theme.uiKind === "dark" || theme.uiKind === "highContrast");
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
