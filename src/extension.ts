/* Extension entry point: creates the logger, status bar, and controller, wires
   up commands and the config/theme-change listeners, then establishes the
   correct theme on startup. */

import * as vscode from "vscode";
import { affectsOurConfig } from "./config";
import { initLog, log } from "./log";
import { createStatusBar } from "./status-bar";
import { createThemeController } from "./theme-controller";
import { registerCommands } from "./commands";
import { runsOnRemoteWorkspaceHost } from "./theme-registry";

export function activate(context: vscode.ExtensionContext): void {
  const output = initLog();
  log.info("Theme Toggle activated");
  if (runsOnRemoteWorkspaceHost()) {
    log.warn(
      "Remote workspace host: theme QuickPick only lists extensions installed on the remote. " +
        "Install Lumina locally to run in the UI extension host and see all themes.",
    );
  }

  const statusBar = createStatusBar();
  const controller = createThemeController(context, statusBar);

  context.subscriptions.push(
    output,
    statusBar,
    controller,
    ...registerCommands(controller),

    /* Re-evaluate whenever our settings change (mode, themes, schedule, etc.). */
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (affectsOurConfig(event)) {
        void controller.refresh("config");
      }
    }),

    /* Keep the status bar in sync when the theme changes for any reason,
       including VS Code's own OS-following in System Preference mode. */
    vscode.window.onDidChangeActiveColorTheme(() => {
      controller.onActiveThemeChanged();
    }),
  );

  void controller.refresh("activation");
}
