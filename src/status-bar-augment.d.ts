/* Compact status bar grouping (VS Code 1.9x+ / Cursor). Hosts that lack it ignore
   the object priority and still show both items. */

declare module "vscode" {
  export interface StatusBarEntryAnchor {
    readonly id: string;
    readonly priority: number;
  }

  export interface StatusBarEntryLocation {
    readonly location: StatusBarEntryAnchor;
    readonly alignment: StatusBarAlignment;
    readonly compact: boolean;
  }

  export namespace window {
    export function createStatusBarItem(
      id: string,
      alignment?: StatusBarAlignment,
      priority?: number | StatusBarEntryLocation,
    ): StatusBarItem;
  }
}
