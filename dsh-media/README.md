# dsh-media · 自媒体

DeepSeek Harness（DSH）插件：一个页面看抖音、小红书、微信公众号、视频号多个账号的数据（照抖音创作者中心「数据中心」排版），右边是读得到这些数据的 AI 助手。

要求 DSH 0.2.x（0.2.2-rc.1 起）；扫码登录和抓数据要用本机的 Google Chrome。

安装：DSH 里「插件 → 添加插件」，填 `github:xiaopu-ai/dsh-plugin-media#path:/dsh-media`，或者 [Releases](https://github.com/xiaopu-ai/dsh-plugin-media/releases) 里压缩包的路径。用本地文件夹装之前，先在这个文件夹里运行 `npm install --omit=dev --legacy-peer-deps`。

包里有什么：

- `lib/` —— 后台，已编译好（源码在上一层的 `backend/`）
- `client.js` —— 页面：左边一列（平台 logo + 账号）、看板（雷达图、作品数据、粉丝数据、作品列表，都带导出）、作品弹窗、右边的 AI 助手
- `ui.js` —— 替页面接住登录小浏览器的画面；给 AI 助手建工作区（默认 `~/Documents/自媒体`）
- `cordis.patch.yml` —— 装好后挂上的两行：`media-suite`（后台）、`media-ui`（画面转接和 AI 助手工作区）

第一次打开是空的，只让你添加账号；演示数据只在开发时打开（`localStorage.setItem('dsh-media.dev', '1')`）。

更多说明见仓库首页：https://github.com/xiaopu-ai/dsh-plugin-media

许可：MIT © 2026 xiaopu-ai
