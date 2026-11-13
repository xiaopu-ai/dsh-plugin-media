# 开发者文档

[← 回到首页](../README.md)

改代码、自己编译、调后台配置时看这里。

## 其他安装方式

普通用户按[首页](../README.md#三步开始)填包名 `@xiaopuai/dsh-media` 就行。另外几种方式：

| 方式 | 在「插件 → 添加插件」里填什么 | 说明 |
|---|---|---|
| GitHub | `github:xiaopu-ai/dsh-plugin-media#path:/dsh-media` | 装的是仓库 `main` 当时的版本，不会自动提示更新；用同样的地址再装一次，或运行 `dsh plugin --profile desktop update @xiaopuai/dsh-media` 升级 |
| 压缩包 | [Releases](https://github.com/xiaopu-ai/dsh-plugin-media/releases) 里 `xiaopuai-dsh-media-<版本>.tgz` 的绝对路径 | 同上，不会自动提示更新 |
| 本地文件夹 | 克隆仓库后 `dsh-media` 文件夹的绝对路径 | 先在 `dsh-media/` 里运行 `npm install --omit=dev --legacy-peer-deps`（`--legacy-peer-deps` 不能少：那几个 `@deepseek-ai/*` 依赖由 DSH 运行时提供，npm 上没有）。改 `client.js` 保存就生效，适合改页面 |

命令行一样能装：`dsh plugin --profile desktop add <上面任意一种>`（`desktop` 换成你的 profile）。

0.5.0 起包名从 `dsh-media` 改成了 `@xiaopuai/dsh-media`（为了发到 npm）。DSH 把两个包名当成两个插件：装过 0.4.x 的，先在「插件」里删除旧的 dsh-media，再按新包名装；账号和数据存在 DSH 的 profile 里，不会丢。

## 和 DSH 版本的关系

插件在 `dsh-media/package.json` 的 `engines.dsh` 里声明支持 `>=0.2.2-rc.1 <0.3.0-0`：0.2.2-rc.1 到所有 0.2.x，不含 0.3 的预览版（DSH 比较版本时把预览版也算进去，所以上限写成 `<0.3.0-0`）。DSH 安装和每次启动都会核对：

- 不在范围内时，安装会被拒绝并提示「不兼容」；已经装好的插件在启动时被跳过，DSH 自己正常启动，配置和数据不变。插件管理里可以对某个版本手动「豁免」，风险自负。
- 按包名（npm）装的，插件页面的「版本」一栏只会列出兼容当前 DSH 的版本。
- 下限是插件实际用到的 DSH 接口出现的最早版本（对比过 rc.1 和 rc.2 的源码），不是编译时用的版本。DSH 出 0.3 时要重新核对接口、发新版本。

## 仓库里有什么

| 文件夹 | 是什么 |
|---|---|
| `dsh-media/` | **装的就是这个。** 一个完整的 DSH 插件包：后台（`lib/`，已编译好）、页面（`client.js`）、画面转接和 AI 助手工作区（`ui.js`）。 |
| `backend/` | 后台的源码和测试。只有改后台时才用得到，改完用 `build.sh` 重新生成 `dsh-media/lib/`。 |

## 开发

- **改页面**：改 `dsh-media/client.js`。想换样子改第 1 段「外观」（各平台的识别色、看板的 `--$-dy-*` 都在这里）；看板在第 3V 段。用本地文件夹方式装的，保存就生效（DSH 会切回对话首页，再点一下「自媒体」就行）。
- **改画面转接或 AI 助手的工作区**：改 `dsh-media/ui.js`，要重启 DSH。工作区默认是 `~/Documents/自媒体`，可以在 profile 的 `cordis.patch.yml` 里给 `id: media-ui` 那一行写 `config: { workspaceDir: 绝对路径 }`。
- **改后台**：改 `backend/src/`，然后运行 `sh backend/build.sh <DSH 源码目录>` 重新生成 `dsh-media/lib/`，再重装插件。后台用到 DSH 的内部包和 typert 生成器，所以要借 DSH 源码树编译，步骤都在 `build.sh` 里：

  ```sh
  git clone --depth 1 --branch dsh-v0.2.2-rc.2 https://github.com/deepseek-ai/deepseek-harness.git
  sh backend/build.sh ./deepseek-harness
  ```

  DSH 源码的版本要和装的 DSH 一致。插件包名会写进生成的接口描述（`lib/typert.host.js`），所以改包名也要重新编译。测试在 DSH 源码目录里运行：`pnpm exec vitest run packages/experimental/media-suite/tests`。
- **看平台接口返回了什么**（开发用）：启动 DSH 前设环境变量 `DSH_MEDIA_CAPTURE_DIR=<文件夹>`。之后：
  - 每次更新账号（抖音、视频号），平台后台返回的 JSON 都存一份到这个文件夹，抖音另外会多打开作品分析、粉丝、作品管理三个页面；
  - 在插件窗口里打开的平台页面，返回的数据也一样存下来；
  - 登录窗口的每一步写进 `login-trace.log`：页面和 iframe 的跳转、二维码轮询的状态码（比如微信的 `wx_errcode` 408 等待 / 404 已扫 / 405 已确认）、失败的请求、弹窗。只记路径和状态，不记登录凭证。
  不设就完全不生效。文件里是账号的真实数据，用完删掉。页面上还有一个开发用入口：`localStorage` 里 `dsh-media.dev` 设成 `1` 后，控制台里可以用 `__mediaFace.openBrowser(平台, 网址, 'browse', 账号 id)` 打开某个账号自己的平台页面。
- **看演示数据**：在 DSH 页面里打开开发者工具，运行 `localStorage.setItem('dsh-media.dev', '1')` 再刷新，空页面下方会多一个「载入演示数据（开发用）」。5 个演示账号覆盖 4 个平台，其中一个演示「需要重新扫码」的样子，作品带演示封面。看完在左边一列底部「清除演示数据」。正式用户看不到这个入口。
- **改后台配置**：在 DSH profile 自己的 `cordis.patch.yml` 里按 `id: media-suite` 覆盖，全部配置项见 `backend/src/index.ts` 的 `Config`。常用的几项：
  - `dataDir`：数据放哪，默认是 profile 目录下的 `media-suite/`。
  - `executablePath`：Chrome 的位置。
  - `maxAccountsPerPlatform`：每个平台最多几个账号，默认 3。
  - `staleHours`：多少小时没更新算数据过期，默认 30。
  - `historyDays`：每次更新后补多少天的历史，默认 30（各平台后台最多给 30 天：抖音要 90 天时粉丝接口回「参数不合法」）。补过的日子一直留着，总览的 90 天走势图靠每天的更新攒起来。
  - `briefHour`：今日简报每天几点（北京时间）自动写，默认 9。
  - `keepLoginsAlive`：DSH 开着时给视频号（每 30 分钟）和公众号（每天）做保活访问，默认 `true`。见[功能详解里的「登录能保持多久」](FEATURES.md#登录能保持多久)。
  - `defaultIntervalMinutes`：自动更新的间隔。

`backend/README.zh.md` 是后台原来的详细说明（接口、配置、行为），里面的包名还是改名前的 `@deepseek-ai/dsh-media-suite`，现在叫 `dsh-media`。

## dsh-media/client.js 的结构

- 0 名字：插件 id、类名前缀
- 1 外观：颜色、圆角、字体、各平台识别色都在这段。看板用的一套（`--$-dy-*`：字体、数字字体、底色、文字色、分段控件、主按钮、指标色）是照抖音数据中心实测的值，深色模式的值紧跟在下面
- 2 底座：通用组件（外框、菜单、卡片、按钮、表格……），原样来自底座 0.5，别在这里改
- 2b 补的组件：底座里还没有的小图表、封面等
- 3 调后台、数据小工具、登录用的小浏览器
- 3V 看板：3V.1 页面的数据 · 3V.2 设计系统（按钮、分段、卡片、指标卡、折线图、雷达图、平台 logo、封面、导出）· 3V.3 左边一列 · 3V.4 第一次打开 · 3V.5 总览 · 3V.6 账号看板 · 3V.7 作品详情弹窗 · 3V.8 添加平台和指标说明 · 3V.9 AI 助手 · 3V.10 整个页面；样式在这一段末尾，类名都以 `dy-` 开头
- 文案（中文、英文各一份；看板的在 `TEXT_V2`）
- 4 挂载

三条规矩：色值只写在「外观」段；类名都走 `cls()`；不引用 DSH 自带组件库、不动 `body`、不用 iframe。行内样式里要用外观段的变量时写 `` `var(--${P}-名字)` ``（`$-` 只在样式表里会被换掉）。
