# Changelog

## [1.2.0](https://github.com/hellotrik/lumina-theme-toggle-extension/compare/v1.1.4...v1.2.0) (2026-07-14)


### Features

* add esbuild configuration and VSCode setup for extension development ([541963e](https://github.com/hellotrik/lumina-theme-toggle-extension/commit/541963ecc3fead617d3c08498aeb99192b21ed86))
* add new media assets including icon images and theme toggle font ([f3fc60e](https://github.com/hellotrik/lumina-theme-toggle-extension/commit/f3fc60e50cdbfd624b5587d3f35921ca763ddccd))
* add themeToggle.applyTo to scope theme switching per workspace ([2436fef](https://github.com/hellotrik/lumina-theme-toggle-extension/commit/2436fefa0525da13d9184b14475736976782ef91))
* add Vitest configuration and initial tests for schedule functionality ([1378104](https://github.com/hellotrik/lumina-theme-toggle-extension/commit/1378104e0b3d2e506e2f6b6a5ef2898093bf5024))
* implement core functionality for theme toggling with command palette integration ([7176d8b](https://github.com/hellotrik/lumina-theme-toggle-extension/commit/7176d8ba09925b4378f6da84cf29126f74475f41))
* per-workspace theme switching via themeToggle.applyTo ([b0a87e9](https://github.com/hellotrik/lumina-theme-toggle-extension/commit/b0a87e9d1bd31357726c6b7c836fd26b87b47f3a))


### Bug Fixes

* publish Open VSX namespace ([81a8b48](https://github.com/hellotrik/lumina-theme-toggle-extension/commit/81a8b48ad7b5fcfde20cead5ba6368d183d56f70))
* publish to Open VSX ([d40101f](https://github.com/hellotrik/lumina-theme-toggle-extension/commit/d40101fdea4c588f5228e1de33b6e756d57b6baf))
* publish to Open VSX ([11ba0f3](https://github.com/hellotrik/lumina-theme-toggle-extension/commit/11ba0f3a7efffbd0f8bf0cb7018b75492571111a))
* publish to the VS Code Marketplace ([3e90aa7](https://github.com/hellotrik/lumina-theme-toggle-extension/commit/3e90aa74157c4d608f308798c270a2910b2fd038))
* update extension icon and repository links ([04dccca](https://github.com/hellotrik/lumina-theme-toggle-extension/commit/04dccca67913795e637bb6acb3c024307c621681))

## [1.1.4](https://github.com/dm3yb/lumina-theme-toggle-extension/compare/v1.1.3...v1.1.4) (2026-06-14)


### Bug Fixes

* update extension icon and repository links ([04dccca](https://github.com/dm3yb/lumina-theme-toggle-extension/commit/04dccca67913795e637bb6acb3c024307c621681))

## [1.1.3](https://github.com/dm3yb/vscode-theme-toggle/compare/v1.1.2...v1.1.3) (2026-06-13)


### Bug Fixes

* publish Open VSX namespace ([81a8b48](https://github.com/dm3yb/vscode-theme-toggle/commit/81a8b48ad7b5fcfde20cead5ba6368d183d56f70))

## [1.1.2](https://github.com/dm3yb/vscode-theme-toggle/compare/v1.1.1...v1.1.2) (2026-06-13)


### Bug Fixes

* publish to Open VSX ([d40101f](https://github.com/dm3yb/vscode-theme-toggle/commit/d40101fdea4c588f5228e1de33b6e756d57b6baf))
* publish to Open VSX ([11ba0f3](https://github.com/dm3yb/vscode-theme-toggle/commit/11ba0f3a7efffbd0f8bf0cb7018b75492571111a))

## [1.1.1](https://github.com/dm3yb/vscode-theme-toggle/compare/v1.1.0...v1.1.1) (2026-06-13)


### Bug Fixes

* publish to the VS Code Marketplace ([3e90aa7](https://github.com/dm3yb/vscode-theme-toggle/commit/3e90aa74157c4d608f308798c270a2910b2fd038))

## [1.1.0](https://github.com/dm3yb/vscode-theme-toggle/compare/v1.0.0...v1.1.0) (2026-06-13)


### Features

* add esbuild configuration and VSCode setup for extension development ([541963e](https://github.com/dm3yb/vscode-theme-toggle/commit/541963ecc3fead617d3c08498aeb99192b21ed86))
* add new media assets including icon images and theme toggle font ([f3fc60e](https://github.com/dm3yb/vscode-theme-toggle/commit/f3fc60e50cdbfd624b5587d3f35921ca763ddccd))
* add Vitest configuration and initial tests for schedule functionality ([1378104](https://github.com/dm3yb/vscode-theme-toggle/commit/1378104e0b3d2e506e2f6b6a5ef2898093bf5024))
* implement core functionality for theme toggling with command palette integration ([7176d8b](https://github.com/dm3yb/vscode-theme-toggle/commit/7176d8ba09925b4378f6da84cf29126f74475f41))

## 1.0.0 — 2026-06-14

Initial release.

- Four switching modes: **Manual Toggle**, **System Preference**, **Sunrise / Sunset**, and **Manual Schedule** (with inline time prompts).
- Configurable **light** and **dark** themes, picked from any installed theme.
- **Status bar** item with custom sun/moon icons (bundled icon font) and **Command Palette** commands.
- Optional notification when the theme changes automatically; master enable/disable switch.
- Sunrise/sunset computed locally with `suncalc` from manual coordinates or a one-time, day-cached IP geolocation fallback.
- Works in VS Code and VS Code–based editors (Cursor, Windsurf, VSCodium).
