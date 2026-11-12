#!/bin/sh
# 编译自媒体后台，产出 ../dsh-media/lib（装插件用的那份）。只有改了后台源码（src/）才需要跑。
#
# 用法：sh build.sh <DSH 源码目录>
#   DSH 源码要和你装的 DSH 版本一致，例如：
#   git clone --depth 1 --branch dsh-v0.2.2-rc.2 https://github.com/deepseek-ai/deepseek-harness.git
# 要求：Node 24 或更新。pnpm 用 DSH 源码指定的版本，由 npx 临时下载。
#
# 后台用到 DSH 的内部包和 typert 生成器，所以要放进 DSH 源码树里编译：
#   1. 把 src/ 等复制到 <DSH>/packages/experimental/media-suite
#   2. 登记到 <DSH>/tsconfig.host.json（typert 生成器从这里找包）
#   3. pnpm install --ignore-scripts（不运行任何依赖的安装脚本）
#   4. 生成 typert 接口描述 → tsc 编译 → tsdown 打包进 ../dsh-media/lib
set -eu

here=$(cd "$(dirname "$0")" && pwd)
dsh=$(cd "${1:?用法：sh build.sh <DSH 源码目录>}" && pwd)
pkg="$dsh/packages/experimental/media-suite"
out=$(cd "$here/../dsh-media" && pwd)/lib

test -f "$dsh/tsconfig.host.json" || { echo "不是 DSH 源码目录：$dsh" >&2; exit 1; }
pnpm_spec=$(node -p "require('$dsh/package.json').packageManager")
pnpm() { npx -y "$pnpm_spec" "$@"; }

echo "· 后台源码放进 $pkg"
rm -rf "$pkg"
mkdir -p "$pkg"
cp -R "$here/src" "$here/tests" "$here/locale" "$here/package.json" "$here/tsconfig.json" "$here/tsdown.plugin.config.ts" "$pkg/"

echo "· 登记到 tsconfig.host.json"
node -e '
const fs = require("fs")
const file = process.argv[1]
const ref = "{ \"path\": \"./packages/experimental/media-suite\" }"
const text = fs.readFileSync(file, "utf8")
if (!text.includes(ref)) {
  if (!text.includes("\"references\": [")) throw new Error("tsconfig.host.json 里没找到 references")
  fs.writeFileSync(file, text.replace("\"references\": [", "\"references\": [\n    " + ref + ","))
}' "$dsh/tsconfig.host.json"

echo "· 安装依赖（不运行安装脚本）"
(cd "$dsh" && pnpm install --ignore-scripts --reporter=append-only >/dev/null)

echo "· 生成 typert 接口描述"
(cd "$dsh" && node --import tsx/esm scripts/generate-typert.ts)

echo "· tsc 编译"
(cd "$pkg" && pnpm exec tsc -b tsconfig.json)

echo "· 打包进 $out"
(cd "$pkg" && DSH_MEDIA_OUT="$out" pnpm exec tsdown --config-loader native --config tsdown.plugin.config.ts)

echo "完成：$out"
