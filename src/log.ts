/* Minimal logger backed by a VS Code Output Channel ("Theme Toggle"). Gives
   users and contributors a single, visible place to see what the extension did
   and why — far easier to debug than scattered `console` calls. */

import * as vscode from "vscode";

let channel: vscode.OutputChannel | undefined;

/** Create the output channel. Call once from `activate`; returns it for disposal. */
export function initLog(): vscode.OutputChannel {
  channel = vscode.window.createOutputChannel("Theme Toggle");
  return channel;
}

export const log = {
  info(message: string): void {
    write("INFO", message);
  },
  warn(message: string): void {
    write("WARN", message);
  },
  error(message: string, err?: unknown): void {
    write("ERROR", err ? `${message}: ${stringifyError(err)}` : message);
  },
};

function write(level: string, message: string) {
  channel?.appendLine(`[${level}] ${message}`);
}

function stringifyError(err: unknown) {
  if (err instanceof Error) {
    return err.stack ?? err.message;
  }
  return String(err);
}
