import { defineConfig } from 'tsdown'

/**
 * 把编译好的后台打进插件包 dsh-media 的 lib/：DSH 自己的包（@deepseek-ai/*）运行时由 DSH 提供，playwright-core
 * 作为插件包的依赖安装，这两类留在外面；zod、SheetJS、iconv-lite 直接打进来，装插件时不用再下载。
 * 由 build.sh 在 tsc 和 generate-typert 之后调用；DSH_MEDIA_OUT 是插件包的 lib 目录。
 */
const out = process.env.DSH_MEDIA_OUT
if (out === undefined || out === '') throw new Error('DSH_MEDIA_OUT 没设：应该是 dsh-media/lib 的绝对路径')

export default defineConfig({
  entry: { index: 'lib/types/index.js', 'typert.host': 'lib/typert.host.js' },
  outDir: out,
  format: ['esm'],
  platform: 'node',
  target: 'es2024',
  fixedExtension: false,
  dts: false,
  clean: true,
  deps: {
    neverBundle: [/^@deepseek-ai\//, 'playwright-core'],
    alwaysBundle: [/^zod(\/|$)/, /^xlsx(\/|$)/, /^iconv-lite(\/|$)/],
  },
})
