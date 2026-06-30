# AGENTS.md

This repository is a VS Code extension (**Lumina – Theme Toggle**). The authoritative
developer guide is [CLAUDE.md](CLAUDE.md): it documents the commands, architecture, and
code rules. Read it first. This file only adds Cursor Cloud–specific notes.

## Cursor Cloud specific instructions

- **Stack / commands**: TypeScript VS Code extension built with esbuild, managed with
  `pnpm` (Node >= 20.12). All standard commands live in `package.json` and the table in
  `CLAUDE.md` (`pnpm test`, `pnpm run lint`, `pnpm run fmt:check`, `pnpm run check-types`,
  `pnpm run compile`/`watch`, `pnpm run package`). The Husky pre-push hook and CI both run
  `fmt:check` + `lint` + `check-types` + `test`; run those four before declaring work done.
- **There is no VS Code binary in the cloud VM**, so the normal "press F5" Extension
  Development Host cannot launch here. The `vscode` module only exists inside a real
  extension host (VS Code / Cursor / VSCodium), so anything importing `vscode` cannot run
  under plain Node or be unit-tested by Vitest.
- **What Vitest covers**: only the `vscode`-free pure core, in practice `src/schedule.ts`
  (see `test/schedule.test.ts`). Code that imports `vscode` (controller, commands, status
  bar, config, workbench, location, theme-registry) is normally verified manually in the
  Extension Development Host.
- **Headless end-to-end check without VS Code**: because esbuild bundles the extension as
  CommonJS with `vscode` marked external, the compiled `dist/extension.js` does
  `require("vscode")` at runtime. You can exercise the real `activate()` → command →
  controller → workbench flow in plain Node by intercepting `Module._load` to return a mock
  `vscode` object, then `require("./dist/extension.js")`, calling `activate(context)`, and
  invoking commands via your mock's `executeCommand`. Run `pnpm run compile` first.
  Note: the controller arms a `setTimeout` (capped at 1h) for the next transition in the
  timed modes, which keeps the Node event loop alive — call `process.exit(0)` when your
  harness finishes, or run it backgrounded, otherwise it appears to "hang".
- `pnpm install` prints a warning that build scripts for `@vscode/vsce-sign` and `keytar`
  are ignored. That is expected: those are only needed for Marketplace/Open VSX publishing,
  not for development, and the warning is harmless.
