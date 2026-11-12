---
description: "自媒体套件的 Host 服务：用户配置的创作者账号、无头浏览器抓取与后台导出文件导入、本地指标历史、定时监控、AI 选题推荐与账号诊断，以及用于平台登录的内嵌浏览器。"
kind: "package-reference"
---

# @deepseek-ai/dsh-media-suite

[English](README.md) | 中文

## 概述

用户可以在小红书、抖音和微信公众号上配置自己的账号和对标账号。套件把粉丝数和作品数据保存在本地，数据来源有两种：在无头 Chrome 中读取平台页面，或导入创作者后台导出的文件。套件会按计划抓取到期的账号，调用用户的模型生成选题推荐和每个自有账号的改进建议，并把无头浏览器的画面实时传到 Web 面板，用户在面板里扫码登录，不会弹出任何浏览器窗口。其他平台可以通过 `ctx.mediaSuite.registerAdapter()` 注册。

## 目录

- [使用本包](#use-this-package)
- [实现原理](#understand-the-implementation)
- [延伸阅读](#further-exploration)
- [模型体验](#model-experience)
- [已知限制与后续工作](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

-----

<a id="use-this-package"></a>
## 使用本包

自媒体套件 Bundle 会插入本服务及其浏览器面板。本服务注入 `llm` 和 `agentDefaultModel`，在 `tools` 可用时注册模型工具。未设置 `dataDir` 时，数据保存在 `<profile 目录>/media-suite/`；没有 dsh profile 的组合必须设置 `dataDir`，否则加载失败。

| 字段 | 默认值 | 含义 |
|---|---|---|
| `dataDir` | `<profile 目录>/media-suite` | 数据库和浏览器资料目录。 |
| `executablePath` | 已安装的 Google Chrome | 无头浏览器使用的 Chrome 或 Chromium 可执行文件。 |
| `viewportWidth`、`viewportHeight` | `1280`、`800` | 内嵌浏览器尺寸，单位为 CSS 像素。 |
| `frameQuality` | `60` | 推送画面的 JPEG 质量。 |
| `browserIdleMinutes` | `10` | 某平台在这段时间内没有视图或抓取时关闭其浏览器。 |
| `detachedViewSeconds` | `60` | 没有画面订阅者的视图在这段时间后关闭。 |
| `loginPollSeconds` | `3` | 视图打开期间检测登录状态的间隔。 |
| `identifyTimeoutSeconds` | `120` | 识别当前登录账号的时限。 |
| `qrPollSeconds` | `1.5` | 视图未登录时截取登录二维码的间隔。 |
| `dragStepPixels` | `8` | 按住鼠标键移动时，每个中间鼠标事件的最大距离。 |
| `navigationTimeoutSeconds` | `60` | 浏览器页面的导航超时；超时后慢页面继续加载，不算失败。 |
| `scrapeTimeoutSeconds` | `180` | 单次抓取的时限。 |
| `maxPostsPerScrape` | `30` | 每次抓取读取的作品数。 |
| `historyDays` | `30` | 平台提供历史数据时，自有账号抓取后补全的天数；`0` 表示不补全。 |
| `historyTimeoutSeconds` | `90` | 单次补全历史数据的时限。 |
| `minIntervalMinutes`、`defaultIntervalMinutes` | `30`、`360` | 监控的最小间隔和默认间隔。 |
| `monitorTickSeconds` | `60` | 查找到期账号的频率。 |
| `retryMinutes` | `30` | 自动抓取遇到可能自行恢复的失败后，隔多久再试。 |
| `analysisWindowDays` | `30` | 诊断报告覆盖的天数。 |
| `topicCount` | `12` | 每份选题报告请求的选题数。 |
| `topicHistoryReports` | `3` | 新报告会被告知不要重复最近几份报告给过的选题；`0` 表示不限制。 |
| `relatedRecentDays` | `30` | 搜到的平台作品里，发布时间在这个天数内的排在更早的前面；`0` 表示只按点赞排。 |
| `llmParseRetries` | `1` | 模型的回答不是要求的 JSON 时，额外再问几次。 |
| `researchKeywords`、`researchPostsPerKeyword` | `3`、`8` | 生成选题前，从内容领域和话题标签中取出、在平台上搜索的关键词数，以及每个关键词保留的作品数；关键词数为 `0` 时不搜索。 |
| `relatedPerTopic` | `6` | 每个选题在平台上搜索并保留的同类作品数；`0` 表示不搜索。 |
| `trendingCount` | `20` | 提供给选题生成的热榜条数；`0` 表示不读取热榜。 |
| `newsResults` | `6` | 提供给选题生成的联网搜索结果数；`0` 表示不搜索新闻。 |
| `benchmarkRefreshHours` | `24` | 生成选题前，对标账号的数据超过多少小时就重新抓取；`0` 表示不更新。 |
| `researchTimeoutSeconds` | `150` | 每个资料收集阶段的时限。 |
| `uiFile` | 未设置 | 页面设置文件（中文键的 JSON：页面标题、主色、导航名称、隐藏页面、今天页板块）；同目录的 `界面样式.css` 会追加样式。`uiSettings` 每次调用都重新读取两个文件，并报告看不懂的部分；未设置时保持内置页面。 |
| `studioDir` | 未设置 | “写作”视图嵌入的创作工作台所在文件夹（包含 `server.mjs`）；未设置时页面会说明如何设置。 |
| `studioPort`、`studioStartSeconds` | `5289`、`20` | 启动工作台使用的本机端口，以及等待它响应的时限。 |
| `studioFetchChars` | `60000` | 模型转发口读取网页时最多返回给工作台的字数。 |
| `reportHistory` | `20` | 每次列表调用返回的报告数。 |
| `llmMaxTokens`、`llmTimeoutSeconds` | `16000`、`300` | 单份报告的输出上限和时限。 |
| `provider`、`model` | 默认模型 | 生成报告使用的模型；须同时设置或同时不设置。 |

### Remote 方法

Client 调用 `ctx.remote.mediaSuite.<method>`。账号方法有 `platforms`、`accounts`、`saveAccount`、`deleteAccount`、`overview`、`posts`、`refresh` 和 `importFile`；报告方法有 `generateTopics`、`generateTopicsAbout`（同样的报告，按一句不超过 500 字的方向来出，报告里会记下这个方向）、`topicReports`、`analyze` 和 `analysisReports`；浏览器方法有 `loginState`、`browserOpen`、`browserFrames` 流、`browserInput`、`identify` 和 `browserClose`。失败时抛出 `RemoteError`，错误码为 `media/not-found`、`media/invalid`、`media/busy`、`media/login-required`、`media/browser-unavailable`、`media/llm-failed` 和 `media/import-failed`。抓取失败不算 Remote 失败：`refresh` 返回已记录的运行结果，其中 `ok: false`，`errorCode` 为 `login-required`、`invalid-profile`、`unsupported`、`browser-unavailable` 或 `scrape-failed`。

### 扫码添加自有账号

面板打开一个视图，用户扫描平台的登录二维码；视图变为已登录且适配器读到账号后，流中会发送一个 `identity` 帧，也可以调用 `identify(viewId)` 主动读取。视图未登录时，流中还会发送 `qr` 帧：按 CSS 尺寸两倍截取的登录二维码 PNG，`width` 和 `height` 为 CSS 像素，只有图片变化时才再次发送；二维码消失或视图登录后，会再发送一个不带 `data` 的帧，新订阅者会收到最新的 `qr` 帧。识别结果包含昵称、规范的主页链接，以及已有匹配自有账号时的 `existingAccountId`。`saveAccount` 收到不带 id、且与已保存自有账号匹配的自有账号草稿时，会更新该账号，因此同一账号扫码两次不会产生重复。

### 注册平台

平台包注入 `mediaSuite` 并调用 `ctx.mediaSuite.registerAdapter(adapter)`；卸载该插件即移除该平台。适配器需要提供描述信息、导出文件的列定义和 `detectLogin(page)`；`descriptor.scrape` 为 true 时，还要提供 `scrape(page, account, limits)`。`scrapableRoles` 把抓取限定在部分角色上；其他角色只能导入，监控也会跳过它们。可选的 `identify(page, signal)` 为扫码添加读取当前登录的账号；`identityMatch: 'platform'` 表示该平台的主页链接不能区分不同账号。`qrSelectors` 指定截图用的登录二维码元素。可选的 `history(page, account, limits)` 返回自有账号过去每天的数据，用于补全历史。

<a id="understand-the-implementation"></a>
## 实现原理

- **存储。** 一个 `node:sqlite` 文件 `media.db` 保存账号、快照、作品、运行记录、报告，以及每个平台最近检测到的登录状态。每行是一个 JSON 文档，读取时用 zod 校验；`PRAGMA user_version` 控制迁移，遇到更新版本的文件会拒绝打开。作品按账号和作品 id 合并：新数据中未定义的字段保留原值。删除账号时，在同一个事务里删除它拥有的全部数据。
- **浏览器。** 登录保存在 `browser/` 下的持久 Chrome 资料目录里（权限 `0700`），通过 `playwright-core` 以无头方式启动已安装的 Chrome。每个平台有一个共用资料目录 `browser/<platform>`；扫码连接的自有账号把登录保存在自己的资料目录 `browser/<platform>--<uuid>` 里，目录名记在账号的 `loginProfile` 上，所以同一平台的几个账号可以同时保持登录。`browserOpen` 带 `fresh` 时打开一个全新的空账号资料目录；`saveAccount` 带上这个视图的 id 时把它分配给账号，并删除该账号之前用的账号资料目录。删除账号会删除它的资料目录，没有账号引用的资料目录在插件启动时删除。没有 `loginProfile` 的账号使用共用资料目录。对标账号用同平台已登录的自有账号的资料目录读取，没有已登录的就用第一个自有账号的，再没有就用共用的。用户代理去掉了 `HeadlessChrome` 标记，`navigator.webdriver` 为 false。同一资料目录的抓取和内嵌视图共用一个浏览器上下文，所以在面板中扫码登录后，抓取会沿用这次登录。同一资料目录的抓取依次执行，每次使用新页面。视图通过 CDP `Page.startScreencast` 推送 JPEG 画面；每个订阅者先收到最新画面和登录状态，订阅者处理较慢时连续的画面只保留最新一帧，弹出的新页面在同一视图中继续。视图打开各平台的扫码登录页：`xiaohongshu.com/login`、抖音创作者中心和公众号后台。视图从不等待慢页面，也不会因为页面慢而失败，画面显示已经加载出来的内容。每次页面加载以及定时轮询时都会检测登录状态。同一视图的输入按到达顺序执行；按住鼠标键时的移动会拆成多步拖动，使滑块验证码收到中间事件。账号识别在同一资料目录的另一个页面中进行，不会改变用户正在看的视图。二维码截图先按适配器选择器定位二维码元素，找不到时选 class、id、alt 或链接提到二维码的图片，再找不到时选 90 到 400 CSS 像素之间最大的近似正方形图片，并通过视图的 CDP 会话截取，不影响页面和输入。
- **适配器。** 页面数据由以源码文本形式注入的页内脚本读取，再交给纯函数解析器校验。小红书读取主页的 `window.__INITIAL_STATE__`（精确的 `liked` 与 `collected` 总数、带发布时间的笔记），读不到时退回到页面上显示的数字；网站可能跳转到页面相同的 `rednote.com`，两个域名下的 `/login` 页面都视为未登录。抖音捕获主页请求的主页信息和作品列表 JSON，滚动加载更多作品，读不到时退回到页面上显示的数字；不填链接的自有账号读取 `/user/self`。任一 `douyin.com` 域名下有会话 Cookie，或页面位于创作者中心的已登录区域，都视为已登录，因此在创作者中心扫码登录后，`www` 页面也能沿用这次登录。识别账号时先读取 `www` 的个人主页，读不到时再读取创作者中心的用户信息。微信公众号读取已登录的后台：从首页读取总用户数，从 `appmsgpublish` 列表读取文章。抖音历史数据读取创作者中心的数据总览（`/janus/douyin/creator/data/overview/dashboard` 及其 `/fans` 接口）：先在页面加载默认 7 天数据时捕获，再在页面内按 `historyDays`（30、60 或 90 天）请求，使请求经过创作者中心的签名；得到每天的 `plays`、`profileViews`（主页访问）、`postLikes`、粉丝净增，以及平台提供时的粉丝总数。
- **导入。** CSV 优先按 UTF-8 解码，字节不是合法 UTF-8 时按 GB18030 解码；xlsx 和 xls 由 SheetJS 读取。表头取前十行中第一行能对应上至少两个已知列的行。平台专属列优先于通用列，完全匹配的同义词优先于包含匹配。有标题列的工作表生成作品；其他含账号指标的工作表按日期每行生成一个快照。不带时区的时间按中国时间解析。
- **报告。** 在配置的模型或默认模型上通过 `ctx.llm.prepareCall` 做一次性调用，中文提示词要求只返回一个 JSON 对象。两类提示词都带有预先算好的内容统计：播放中位数和平均值、最高一条是中位数的几倍、互动率、收藏率、评论率和转发率的中位数，以及按内容形式和按北京时间发布时段的拆分。提示词给出各项比率的口径，要求模型以账号自己的中位数为基准比较作品、只引用输入里的数字，并把总结写成两到三段短文。每条作品都带有北京时间的发布时间、星期、互动率和收藏率。选题提示词另含账号表现最好和最差的作品、同平台或同领域对标账号的高互动作品，以及各平台的标题字数要求。生成选题前，先重新抓取数据超过 `benchmarkRefreshHours` 的对标账号，再读取账号所在平台的热榜，用内容领域和播放最高的话题标签（跳过包含账号名的标签）在平台上搜索，并通过 `ctx.web` 搜索这些关键词的新闻；提示词带上这些资料，并要求每个选题给出两到三个搜索关键词。随后用每个选题的关键词在平台上搜索，把其他作者点赞最多的结果作为同类作品与选题一起保存。缺少或失败的资料来源会被跳过并记入报告的备注，不会导致报告失败。`findRelated` 为已保存的报告重新搜索每个选题的同类作品：有关键词时按关键词搜索，关键词功能上线前生成的报告按选题标题搜索，并替换原有的同类作品；某个选题搜索失败时保留原来的结果。平台描述带有 `search` 字段，页面只在适配器支持搜索时提供这个操作。适配器通过可选的 `search` 和 `trending` 函数提供搜索和热榜；内置的抖音适配器从网页版搜索页和热榜页读取数据。诊断提示词另含时间窗口内的指标变化、发布节奏、互动率；平台提供日数据时，还包含播放、主页访问、净增粉丝和主页访问转粉率，并要求每条建议写明要观察的指标和目标值。回答经 zod 校验后保存；未知的枚举值会回退为默认值，不会导致整份报告失败。
- **创作工作台。** 设置了 `studioDir` 时，“写作”视图第一次请求 `studioOpen` 会以 Host 自身的可执行文件作为 Node，在 `studioPort` 上把该文件夹的 `server.mjs` 作为子进程启动，插件卸载时停止它；返回的工作台地址带 `?embed=dsh`，让工作台知道自己处于嵌入状态。套件通过 `WB_TOKEN` 给进程一个随机写入令牌，通过 `WB_FRAME_ANCESTORS` 告诉它允许嵌入的来源。`studioWriteArticle` 把已保存选题报告里的一个选题转换成工作台的 `idea` 字段（切入角度、推荐理由、第一个候选标题，包含候选标题、关键词、参考作品和同类作品的写作简报，以及作为证据的同类作品），提交到工作台的 `/api/projects`；项目名已被占用时自动加序号。形式是视频的选题会新建“视频脚本”而不是文章：选题生成时模型给视频选题多写一份拍摄方案（开口第一句、3 到 5 条口播提纲、建议时长、封面字），它进入写作简报，工作台用它填好口播稿的骨架，返回的地址直接打开写作页。失败时返回 `media/studio-failed` 和工作台给出的原因。
- **模型转发口。** 启动工作台前，套件先在本机空闲端口上开一个 HTTP 转发口，并通过 `WB_DSH_GATEWAY` 和 `WB_DSH_GATEWAY_KEY` 把地址和随机密钥交给工作台。`GET /models` 以「服务商/模型」列出客户端各服务商能列出的全部模型，以及客户端的默认模型；即使默认模型所属的服务商列不出模型，它也排在第一位。`POST /v1/messages` 接收 Messages 请求，翻译成 Host 的模型调用（文字、通过 `attachments` 存下的图片、工具调用和工具结果；思考块和服务端工具块会被去掉），用 `ctx.llm.prepareCall` 在指定模型上运行；模型为 `dsh` 或未指定时使用客户端的默认模型。Host 的流式数据块会转成 Messages 流式事件返回，非流式请求则返回一条组装好的消息。客户端的凭据不会交给工作台。`POST /web/search` 和 `POST /web/fetch` 调用 Host 的 `web` 服务，代替只有部分服务商提供的服务端联网工具。所有接口都要带这把密钥。
- **账号匹配。** 比较主页链接时忽略查询参数、片段和末尾斜杠，并把 `rednote.com` 视为 `xiaohongshu.com`。设置了 `identityMatch: 'platform'` 的平台（如后台链接不含账号信息的微信公众号），识别结果在该平台只有一个自有账号时与它匹配；否则与保存时一样，匹配链接和名称都相同的自有账号。
- **补全历史。** 适配器提供 `history` 的自有账号抓取成功后，每个还没有快照的过去日期会在中国时间 12:00 得到一个来源为 `scrape` 的快照。已有快照的日期和最新快照所在的日期不会被覆盖。粉丝总数取平台提供的值，否则用最新总数减去之后各天的净增推算；中间缺一天净增时，更早日期的总数保持未知。每天的数值写入 `extra` 的 `plays`、`profileViews`、`postLikes` 和 `fansNet`，总览序列带有 `plays` 和 `profileViews`。补全失败只会在运行记录的消息中注明。
- **待发布。** 其他插件通过 Host 方法 `addDraft`（`ctx.get('mediaSuite')?.addDraft(...)`，不是 Remote 方法）把做好的内容交给套件：来源名称、类型（`video`、`article` 或 `card`）、标题，以及可选的文件和文件夹绝对路径、一句说明和工作台项目 id。`studioWriteArticle` 会为它新建的项目添加一条文章待发布。待发布内容存在数据库第 2 版新增的 `drafts` 表里。`markDraftPublished` 记录或清除作品地址；`revealDraft` 在 Host 电脑的文件管理器中显示文件或所在文件夹；`removeDraft` 只移除记录，不删文件。
- **演示数据。** `loadDemo` 先清掉旧的演示数据，再添加标记为 `demo` 的一个抖音自有账号和一个对标账号，包含 30 天的数据、作品、一份选题报告、一份诊断报告和两条待发布内容，数字由固定种子生成并注明是演示；`clearDemo` 连同数据一起删除。演示账号不会被抓取、导入或监控。
- **监控。** 定时器找出已开启监控、且上次抓取（无论成功与否）早于其间隔的账号，逐个抓取。可能自行恢复的失败（例如页面加载慢）在 `retryMinutes` 后重试（如果这比账号的间隔短）；需要用户处理的失败（`login-required`、`invalid-profile`、`unsupported`）等满整个间隔。

<a id="further-exploration"></a>
## 延伸阅读

- [API Gateway](../../../docs/api-gateway.zh.md)：Remote 方法、流和错误码。
- [添加 Remote API](../../../docs/cookbook/adding-a-remote-api.zh.md)：本控制器遵循的步骤。
- [工具编写参考](../../../docs/cookbook/adding-a-tool.zh.md)：模型工具。

<a id="model-experience"></a>
## 模型体验

### 自媒体工具

#### 模型看到的内容

`tools` 可用时，每个 Agent 都能看到四个工具：`media_accounts` 列出已配置的账号，`media_overview` 汇总某个账号在一段时间内保存的指标，`media_topics` 和 `media_analyze` 生成并保存报告。每个工具都返回中文 Markdown 文本。账号参数与任何 id 或完整名称都不匹配时，调用失败并列出已配置的账号。

#### Token 影响

四个工具声明会给每次请求增加几百个 token。结果是简短摘要；一份选题报告约一到两千字。

#### KV Cache 影响

工具声明是固定的，不会在步骤之间改变请求前缀。

### 写作工具

#### 模型看到的内容

设置了 `studioDir` 且 `tools` 可用时，每个 Agent 还能看到六个写作工具。它们都通过创作工作台的 HTTP 接口工作，所以在对话里写的项目就是“写作”视图里的那些。`writing_projects` 列出文章、视频脚本和小红书卡片项目，可以按标题或类型筛选。`writing_create` 新建项目（类型写 `script` 是视频脚本，口播稿的骨架写在它的 `article.md` 里），可选的写作简报会存进项目的资料笔记。`writing_read` 返回文章的 Markdown 和版本号，`writing_save` 整篇替换正文；版本号比文件旧时报错而不是覆盖，被替换的正文会存成可恢复的历史版本。`writing_assistant` 用客户端默认模型跑一轮工作台自带的写作助手，返回它的回复、做过的步骤和改过的文件，以及有多少件待定事项和生图在“写作”视图里等作者确认；取消调用会停下这一轮。`writing_check` 返回工作台的体检结果。项目参数可以填 id、完整标题或标题里唯一的一段；匹配到多个或没有匹配时报错并列出候选。结果都是中文文本。

#### Token 影响

六个工具声明会给每次请求增加几百个 token。`writing_read` 返回整篇文章，通常几千字；其他结果都很短。

#### KV Cache 影响

插件加载期间工具声明保持不变，不会在步骤之间改变请求前缀。

## 已知限制与后续工作

<a id="known-limitations-and-deferred-work"></a>

- 抓取依赖平台的页面结构和非公开的 Web 接口，平台可能随时修改。解析器已在未登录状态下用一个真实的小红书主页验证过；登录后的小红书、抖音和微信公众号抓取尚未用真实账号验证。导入导出文件是备用方案。
- 抓取需要登录，因为访客看到的页面会把数字取整（如 `1万+`），并隐藏作品 id。
- 微信公众号的对标账号只能导入。其互动数据取决于发表列表返回的字段，不同账号返回的字段不同。
- 平台可能会向无头浏览器弹出验证码，用户需要在内嵌视图中完成验证。
- 同一个浏览器资料目录同时只能被一个进程使用，因此共用同一个 profile 的两个 dsh 进程不能同时打开它。
- 选题资料用用户已登录的平台账号逐个关键词搜索；一份 8 个选题的报告约多花一到三分钟，搜索过于频繁可能触发平台验证。目前只有抖音实现了搜索和热榜。
- 创作工作台是独立的本机应用；套件依赖它的 `/api/stamp` 和 `/api/projects` 接口，以及 `WB_TOKEN` 和 `WB_FRAME_ANCESTORS` 两个变量。如果 `studioPort` 被别的程序占用，工作台无法启动，页面会提示。
- 同类作品保存的是平台返回的封面地址。抖音会给这些地址签名，旧报告的封面可能失效并显示占位图。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作上下文 — 点击展开</summary>

无。

</details>
