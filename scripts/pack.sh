#!/usr/bin/env bash
# 古月方源·大爱仙尊｜炼蛊炼天
# 早岁已知世事艰，仍许飞鸿荡云间。
# 一路寒风身如絮，命海沉浮客独行。
# 千磨万击心铸铁，殚精竭虑铸一剑。
# 今朝剑指叠云处，炼蛊炼人还炼天！
# 来源：蛊真人 · 《蛊真人》全诗词整理（完整版） · kairos-dao-header
# 打包 Lumina Theme Toggle → dist/theme-toggle-<version>.vsix → 安装到 Cursor/VS Code
# 参考工作日记「装完删旧目录」；默认安装，--no-install 仅产出 vsix。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT/dist"
BUMP="patch"
NO_BUMP=1
DO_INSTALL=1

bump_package_version() {
  local level="$1"
  node -e "
const fs = require('fs');
const path = 'package.json';
const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));
const level = process.argv[1];
const parts = String(pkg.version).trim().split('.');
while (parts.length < 3) parts.push('0');
const major = parseInt(parts[0], 10) || 0;
const minor = parseInt(parts[1], 10) || 0;
const patch = parseInt(parts[2], 10) || 0;
let next;
if (level === 'patch') {
  next = [major, minor, patch + 1];
} else if (level === 'minor') {
  next = [major, minor + 1, 0];
} else if (level === 'major') {
  next = [major + 1, 0, 0];
} else {
  console.error('invalid level');
  process.exit(1);
}
pkg.version = next.join('.');
fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');
console.log(pkg.version);
" "$level"
}

usage() {
  cat <<EOF
用法: $(basename "$0") [选项]

  产出: dist/theme-toggle-<version>.vsix（版本来自 package.json）

选项:
  --bump          打包前修订号 +1（默认不升版，交给 release-please）
  --bump LEVEL    自增级别：patch | minor | major（隐含升版）
  --no-install    只打包，不安装到 Cursor / VS Code
  -h, --help      显示此帮助

示例:
  $(basename "$0")              # 按当前版本打包
  $(basename "$0") --bump       # patch +1 后打包
  $(basename "$0") --bump minor
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-bump) NO_BUMP=1; shift ;;
    --no-install) DO_INSTALL=0; shift ;;
    --bump)
      NO_BUMP=0
      if [[ $# -ge 2 && "$2" != --* ]]; then
        BUMP="$2"
        shift 2
      else
        BUMP="patch"
        shift
      fi
      ;;
    -h|--help) usage; exit 0 ;;
    *) echo "未知选项: $1" >&2; usage >&2; exit 1 ;;
  esac
done

case "$BUMP" in
  patch|minor|major) ;;
  *)
    echo "无效 --bump: $BUMP（仅 patch | minor | major）" >&2
    exit 1
    ;;
esac

install_cli() {
  if command -v cursor >/dev/null 2>&1; then
    echo "cursor"
  elif command -v code >/dev/null 2>&1; then
    echo "code"
  else
    echo ""
  fi
}

cleanup_old_extension_dirs() {
  local version keep_dir ext_root publisher name
  publisher="$(node -p "require('./package.json').publisher")"
  name="$(node -p "require('./package.json').name")"
  version="$(node -p "require('./package.json').version")"
  keep_dir="${publisher}.${name}-${version}"
  for ext_root in "${HOME}/.cursor/extensions" "${HOME}/.vscode/extensions"; do
    if [[ ! -d "$ext_root" ]]; then
      continue
    fi
    shopt -s nullglob
    for dir in "$ext_root"/"${publisher}.${name}-"*; do
      if [[ "$(basename "$dir")" != "$keep_dir" ]]; then
        echo "→ 移除旧扩展目录 $(basename "$dir")"
        rm -rf "$dir"
      fi
    done
    shopt -u nullglob
  done
}

if ! command -v pnpm >/dev/null; then
  echo "需要 pnpm" >&2
  exit 1
fi

cd "$ROOT"

OLD_VERSION="$(node -p "require('./package.json').version")"
if [[ "$NO_BUMP" -eq 0 ]]; then
  echo "→ 版本 $OLD_VERSION → $BUMP +1"
  NEW_VERSION="$(bump_package_version "$BUMP")"
  echo "→ 新版本 $NEW_VERSION"
else
  echo "→ 版本保持 $OLD_VERSION"
fi

VERSION="$(node -p "require('./package.json').version")"
VSIX="$OUT_DIR/theme-toggle-${VERSION}.vsix"

echo "→ pnpm install"
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

echo "→ production build"
pnpm run package-build

mkdir -p "$OUT_DIR"
echo "→ vsce package"
pnpm exec vsce package --no-dependencies -o "$VSIX"

SIZE="$(du -h "$VSIX" | awk '{print $1}')"
echo "→ $VSIX ($SIZE)"

if [[ "$DO_INSTALL" -eq 0 ]]; then
  echo ""
  echo "跳过安装（--no-install）"
  exit 0
fi

CLI="$(install_cli)"
if [[ -z "$CLI" ]]; then
  echo ""
  echo "未找到 cursor 或 code CLI；请手动安装：" >&2
  echo "  cursor --install-extension \"$VSIX\" --force" >&2
  exit 1
fi

echo ""
echo "→ 安装到 $CLI"
"$CLI" --install-extension "$VSIX" --force
cleanup_old_extension_dirs
echo "→ 完成；Developer: Reload Window 后生效"
