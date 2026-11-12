---
description: "Host service of the self-media suite: user-configured creator accounts, headless-browser scraping and export-file import, local metric history, scheduled monitoring, AI topic recommendations and account diagnosis, and an embedded browser for platform login."
kind: "package-reference"
---

# @deepseek-ai/dsh-media-suite

English | [中文](README.zh.md)

## Summary

The user configures their own creator accounts and benchmark accounts on 小红书 (Xiaohongshu), 抖音 (Douyin) and 微信公众号 (WeChat official accounts). The suite records follower counts and post metrics locally, either by reading the platform in a headless Chrome or by importing the files that creator backends export. It scrapes due accounts on a schedule, asks the user's model for topic recommendations and for what each own account should improve, and streams the headless browser into the Web panel so the user can scan a login QR code without any browser window opening. Further platforms register through `ctx.mediaSuite.registerAdapter()`.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

The Media suite bundle inserts this service and its browser panel. The service injects `llm` and `agentDefaultModel`, and registers its model tools while `tools` is available. Data lives under `<profile dir>/media-suite/` unless `dataDir` is set; a composition without a dsh profile must set `dataDir`, or loading fails.

| Field | Default | Meaning |
|---|---|---|
| `dataDir` | `<profile dir>/media-suite` | Database and browser profile directory. |
| `executablePath` | installed Google Chrome | Chrome or Chromium executable for the headless browser. |
| `viewportWidth`, `viewportHeight` | `1280`, `800` | Embedded browser size in CSS pixels. |
| `frameQuality` | `60` | JPEG quality of streamed frames. |
| `browserIdleMinutes` | `10` | A platform's browser closes after this long without views or scrapes. |
| `detachedViewSeconds` | `60` | A view without a frame subscriber closes after this long. |
| `loginPollSeconds` | `3` | Login detection interval of an open view. |
| `identifyTimeoutSeconds` | `120` | Deadline of identifying the logged-in account. |
| `qrPollSeconds` | `1.5` | Interval of login QR snapshots while a view is logged out. |
| `dragStepPixels` | `8` | Distance per intermediate mouse event while a button is held. |
| `navigationTimeoutSeconds` | `60` | Navigation timeout of browser pages; a slow page keeps loading after it instead of failing. |
| `scrapeTimeoutSeconds` | `180` | Deadline of one scrape. |
| `maxPostsPerScrape` | `30` | Posts read per scrape. |
| `historyDays` | `30` | Days of past daily counters an own account's scrape backfills where the platform reports them; `0` disables backfill. |
| `historyTimeoutSeconds` | `90` | Deadline of one history backfill. |
| `minIntervalMinutes`, `defaultIntervalMinutes` | `30`, `360` | Smallest and default monitoring interval. |
| `monitorTickSeconds` | `60` | How often due accounts are looked up. |
| `retryMinutes` | `30` | Delay before an automatic scrape is tried again after a failure that may pass on its own. |
| `analysisWindowDays` | `30` | Window of the diagnosis report. |
| `topicCount` | `12` | Suggestions requested per topic report. |
| `topicHistoryReports` | `3` | Earlier topic reports whose suggestions a new report is told not to repeat; `0` disables it. |
| `relatedRecentDays` | `30` | Age inside which found platform posts rank before older ones; `0` ranks by likes only. |
| `llmParseRetries` | `1` | Extra model calls after an answer that is not the requested JSON. |
| `researchKeywords`, `researchPostsPerKeyword` | `3`, `8` | Keywords from the niche and hashtags searched on the platform before topic generation, and posts kept per keyword; `0` keywords disables it. |
| `relatedPerTopic` | `6` | Related platform posts searched and kept per suggestion; `0` disables it. |
| `trendingCount` | `20` | Trending search entries given to topic generation; `0` disables reading the list. |
| `newsResults` | `6` | Web search results given to topic generation; `0` disables news search. |
| `benchmarkRefreshHours` | `24` | Age after which a benchmark account is scraped again before topic generation; `0` disables it. |
| `researchTimeoutSeconds` | `150` | Deadline of each research stage. |
| `uiFile` | unset | Page settings file (JSON with Chinese keys: 页面标题, 主色, 导航名称, 隐藏页面, 今天页板块); `界面样式.css` next to it adds styles. `uiSettings` reads both on every call and reports what it cannot understand; unset keeps the built-in page. |
| `studioDir` | unset | Folder of the creation workbench (`server.mjs`) the 写作 (Write) view embeds; unset leaves the page explaining how to set it. |
| `studioPort`, `studioStartSeconds` | `5289`, `20` | Loopback port the workbench is started on, and how long it may take to answer. |
| `studioFetchChars` | `60000` | Most characters of a fetched page the model gateway returns to the workbench. |
| `reportHistory` | `20` | Reports returned per list call. |
| `llmMaxTokens`, `llmTimeoutSeconds` | `16000`, `300` | Output cap and deadline of one report. |
| `provider`, `model` | the default model | Explicit report model; both or neither. |

### Remote methods

The Client calls `ctx.remote.mediaSuite.<method>`. Account methods are `platforms`, `accounts`, `saveAccount`, `deleteAccount`, `overview`, `posts`, `refresh` and `importFile`; report methods are `generateTopics`, `generateTopicsAbout` (the same report steered by a direction of at most 500 characters, which the report records), `topicReports`, `analyze` and `analysisReports`; browser methods are `loginState`, `browserOpen`, the `browserFrames` stream, `browserInput`, `identify` and `browserClose`. Failures are `RemoteError` codes `media/not-found`, `media/invalid`, `media/busy`, `media/login-required`, `media/browser-unavailable`, `media/llm-failed` and `media/import-failed`. A failed scrape is not a Remote failure: `refresh` returns the recorded run with `ok: false` and an `errorCode` of `login-required`, `invalid-profile`, `unsupported`, `browser-unavailable` or `scrape-failed`.

### Add an own account by scanning

The panel opens a view, the user scans the platform's login QR code, and the stream sends an `identity` frame once the view turns logged-in and the adapter reads the account; `identify(viewId)` reads it on request. While the view is logged out, the stream also sends `qr` frames: a PNG of the login QR code captured at twice its CSS size, with `width` and `height` in CSS pixels, sent again only when the image changes; one frame without `data` follows when the code disappears or the view logs in, and new subscribers receive the latest `qr` frame. The identity carries the nickname, a canonical profile URL, and `existingAccountId` when an own account already matches. `saveAccount` treats an own draft without an id that matches a stored own account as an update of it, so scanning the same account twice adds no duplicate.

### Register a platform

A platform package injects `mediaSuite` and calls `ctx.mediaSuite.registerAdapter(adapter)`; unloading that plugin removes the platform. An adapter supplies its descriptor, export-file columns, `detectLogin(page)`, and, when `descriptor.scrape` is true, `scrape(page, account, limits)`. `scrapableRoles` limits scraping to some roles; other roles are import-only and monitoring skips them. An optional `identify(page, signal)` reads the logged-in account for scan-to-add, and `identityMatch: 'platform'` declares that profile URLs do not distinguish the platform's accounts. `qrSelectors` names the login QR element for snapshots. An optional `history(page, account, limits)` returns daily counters of an own account's past days for backfill.

<a id="understand-the-implementation"></a>
## Understand the implementation

- **Store.** One `node:sqlite` file, `media.db`, holds accounts, snapshots, posts, runs, reports and the last detected login state per platform. Rows are JSON documents validated with zod on read; `PRAGMA user_version` gates migrations, and a newer file is refused. Posts merge by account and post id: fields a new row leaves undefined keep their stored values. Deleting an account removes everything it owns in one transaction.
- **Browser.** Logins live in persistent Chrome profiles under `browser/` (mode `0700`), launched headless through `playwright-core` with the installed Chrome. Each platform has a shared profile `browser/<platform>`, and an own account connected by scanning keeps its login in its own profile `browser/<platform>--<uuid>`, recorded as the account's `loginProfile`, so several accounts of one platform stay logged in side by side. `browserOpen` with `fresh` opens a new, empty account profile; `saveAccount` with that view's id assigns it to the account and deletes an account profile the account used before. Deleting the account deletes its profile, and profiles no account refers to are deleted when the plugin starts. An account without `loginProfile` uses the shared profile. A benchmark account is read with the profile of a logged-in own account on its platform, else the first own account's, else the shared one. The user agent drops the `HeadlessChrome` token and `navigator.webdriver` is false. Scrapes and embedded views share a profile's context, so a QR login in the panel is reused by scrapes. Scrapes for one profile run one at a time on fresh pages. Views stream CDP `Page.startScreencast` JPEG frames; each subscriber gets the latest frame and login state first, consecutive frames coalesce for slow subscribers, and pop-ups continue in the same view. Views open the platform's QR login page: `xiaohongshu.com/login`, the 抖音 creator center and the 公众号 backend. A view never waits for or fails on a slow page; the screencast shows whatever has loaded. Login detection runs on every load and on a poll. Inputs of one view apply in arrival order; a held button turns moves into stepped drags, so slider captchas receive intermediate events. Identification runs on a separate page of the same profile, so the user's view is not navigated. QR snapshots locate the QR element by adapter selectors, else by an image whose class, id, alt or URL mentions a QR code, else by the largest near-square image between 90 and 400 CSS pixels, and capture it through the view's CDP session without touching the page or its input.
- **Adapters.** Page data is read by in-page scripts given as source text and validated by pure parsers. 小红书 reads `window.__INITIAL_STATE__` on the profile page (exact `liked` and `collected` totals, notes with publish time) and falls back to the rendered counters; the site may redirect to `rednote.com`, which serves the same pages, and its `/login` page on either domain reads as logged out. 抖音 captures the profile and post-list JSON responses the profile page requests, scrolling for more posts, and falls back to the rendered counters; an own account without a URL reads `/user/self`. A session cookie on any `douyin.com` domain or the creator center's logged-in area counts as logged in, so the creator-center QR login is reused by `www` pages. Identification reads the `www` self profile, falling back to the creator center's user info. 微信公众号 reads the logged-in backend: the follower total from the home page and articles from the `appmsgpublish` list. 抖音 history reads the creator center's data overview (`/janus/douyin/creator/data/overview/dashboard` and its `/fans` variant) as the page loads its default 7 days, then requests up to `historyDays` (30, 60 or 90) from inside the page so the creator center signs the requests; it yields daily `plays`, `profileViews` (homepage visits), `postLikes`, net followers and, when reported, follower totals.
- **Import.** CSV is decoded as UTF-8, or as GB18030 when the bytes are not UTF-8; xlsx and xls are read by SheetJS. The header row is the first of the first ten rows that maps two known columns. Adapter columns match before generic ones, exact synonyms before contained synonyms. Sheets with a title column yield posts; other sheets with account counters yield one snapshot per dated row. Times without a zone are read as China time.
- **Reports.** A one-shot model call through `ctx.llm.prepareCall` on the configured or default model, with Chinese prompts that request one JSON object. Both prompts carry pre-computed content statistics: median and mean plays with the top post's multiple of the median, median interaction, save, comment and share rates, and the split by format and by China-time publish slot. They define the rates, ask the model to compare posts with the account's own median and to cite only input numbers, and ask for a summary of two or three short paragraphs. Each post line carries its China publish time, weekday, interaction rate and save rate. Topic prompts add the account's best and worst posts, the top posts of benchmark accounts on the same platform or in the same niche, and per-platform headline lengths. Before a topic report, benchmark accounts older than `benchmarkRefreshHours` are scraped again, and the account's platform trending list, platform searches for keywords taken from the niche and the most-played hashtags (skipping tags that contain the account name), and `ctx.web` news for those keywords are read; the prompt carries them and asks for two or three search keywords per suggestion. Each suggestion's keywords are then searched on the platform, and the most liked results by other authors are stored with it as related posts. A research source that is missing or fails is skipped and recorded in the report's notes; it never fails the report. `findRelated` searches the suggestions of a stored report again, by keywords or by title for reports generated before keywords existed, and replaces their related posts; a suggestion whose search fails keeps its previous ones. Platform descriptors carry `search` so the page offers that search only where the adapter can search. Adapters provide search and trending through optional `search` and `trending` functions; the built-in 抖音 adapter captures the web search and trending pages. Diagnosis prompts add window deltas, cadence, engagement rates, the creator-center funnel of plays, profile visits, net followers and the visit-to-follow rate where the platform reports daily data, and ask for actions that name the metric and target to check. Answers are validated with zod and stored; unknown enum values fall back instead of failing the report.
- **Creation workbench.** With `studioDir` set, `studioOpen` starts the folder's `server.mjs` as a child process on `studioPort` the first time the 写作 (Write) view asks, using the Host's own executable as Node, and stops it with the plugin; it returns the workbench address with `?embed=dsh`, which tells the workbench it is embedded. The suite gives the process a random write token through `WB_TOKEN` and the embedding origins through `WB_FRAME_ANCESTORS`. `studioWriteArticle` turns one suggestion of a stored topic report into the workbench's `idea` fields (angle, reasoning, first headline, a brief with headlines, keywords, references and related posts, and the related posts as evidence) and posts it to the workbench's `/api/projects`; a taken project name gets a number appended. A topic whose format is video becomes a video script instead of an article: topic generation asks the model for a filming plan on video topics (the opening line, three to five talking points, a suggested length and cover text), the plan joins the brief, the workbench fills the script's skeleton from it, and the returned address opens the writing step. Failures are `media/studio-failed` with the workbench's reason.
- **Model gateway.** Before starting the workbench, the suite opens a loopback HTTP gateway on a free port and passes its address and a random key to the workbench as `WB_DSH_GATEWAY` and `WB_DSH_GATEWAY_KEY`. `GET /models` lists every model the client's providers list, as `provider/model`, with the client's default model, which leads the list even when its provider cannot list models. `POST /v1/messages` takes a Messages request, translates it to the Host's model call (text, images stored through `attachments`, tool calls and tool results; thinking and server-tool blocks are dropped), runs it with `ctx.llm.prepareCall` on the named model, or on the client's default for `dsh` or no model, and returns the Host's stream chunks as Messages stream events, or one assembled message for a non-streaming request. The client's credentials never reach the workbench. `POST /web/search` and `POST /web/fetch` run the Host's `web` service, standing in for server-side web tools that only some providers run. Every route requires the key.
- **Account matching.** Profile URLs compare without query, fragment or trailing slash, with `rednote.com` read as `xiaohongshu.com`. With `identityMatch: 'platform'`, as for 微信公众号 whose backend URL names no account, an identity matches the platform's only own account, and otherwise, like a save, the own account with the same URL and name.
- **History backfill.** After a successful scrape of an own account whose adapter offers `history`, each reported past day without a snapshot gets one at 12:00 China time, with source `scrape`. Days already holding a snapshot and the day of the newest snapshot are never overwritten. A follower total is the reported one, or the newest total minus the net changes of later days; a gap leaves earlier totals unknown. Daily values go to `extra` as `plays`, `profileViews`, `postLikes` and `fansNet`, and the overview series carries `plays` and `profileViews`. A failed backfill only adds a note to the run message.
- **Drafts.** Other plugins hand finished content to the suite through the Host method `addDraft` (`ctx.get('mediaSuite')?.addDraft(...)`, not a Remote method): a source name, a kind (`video`, `article` or `card`), a title, and optional absolute file and folder paths, a one-line note and a workbench project id. `studioWriteArticle` adds an article draft for the project it creates. Drafts live in the `drafts` table added by schema version 2. `markDraftPublished` records the post address, or clears it; `revealDraft` shows the draft's file, or its folder, in the Host computer's file manager; `removeDraft` drops the entry and leaves the files.
- **Sample data.** `loadDemo` replaces earlier samples with an own 抖音 account and a benchmark account marked `demo`, thirty days of counters, posts, a topic report, a diagnosis report and two drafts, all fixed by a seed and labelled as samples; `clearDemo` deletes them with their data. Sample accounts are never fetched, imported into or monitored.
- **Monitor.** A timer finds accounts whose monitoring is on and whose last scrape, successful or not, is older than their interval, and scrapes them one at a time. A failed scrape that may pass on its own, such as a slow page, is tried again after `retryMinutes` when that is sooner; a failure that needs the user (`login-required`, `invalid-profile`, `unsupported`) waits the whole interval.

<a id="further-exploration"></a>
## Further Exploration

- [API Gateway](../../../docs/api-gateway.md): Remote methods, streams and failure codes.
- [Remote API cookbook](../../../docs/cookbook/adding-a-remote-api.md): the steps this controller follows.
- [Tool authoring reference](../../../docs/cookbook/adding-a-tool.md): the model tools.

<a id="model-experience"></a>
## Model Experience

### Media tools

#### What the model sees

While `tools` is available, every Agent sees four tools: `media_accounts` lists configured accounts, `media_overview` summarizes one account's stored metrics over a window, and `media_topics` and `media_analyze` generate and store a report. Each returns Markdown text in Chinese. An account argument that matches no id or exact name fails with the list of configured accounts.

#### Token effect

The four declarations add a few hundred tokens to every request. Results are short summaries; a topic report is about one to two thousand characters.

#### KV Cache effect

The declarations are static, so they do not change the request prefix between steps.

### Writing tools

#### What the model sees

When `studioDir` is set and `tools` is available, every Agent also sees six writing tools over the creation workbench's HTTP API, so projects written from a conversation are the ones the 写作 view shows. `writing_projects` lists article, video script and 小红书 card projects, optionally filtered by title or type. `writing_create` creates one (type `script` is a video script, whose skeleton is in its `article.md`) with an optional brief filed under its research notes. `writing_read` returns an article's Markdown with a version stamp, and `writing_save` replaces it; a stamp older than the file fails instead of overwriting, and the workbench keeps the replaced text as a restorable version. `writing_assistant` runs one turn of the workbench's own writing assistant on the client's default model and returns its reply, the steps and files it changed, and how many decisions and image generations wait for the author in the 写作 view; cancelling the call stops the turn. `writing_check` returns the workbench's style check. A project argument takes an id, an exact title or a unique part of a title; several or no matches fail with the candidates. Results are Chinese text.

#### Token effect

The six declarations add several hundred tokens to every request. `writing_read` returns the whole article, usually a few thousand characters; the other results are short.

#### KV Cache effect

The declarations are static while the plugin is loaded, so they do not change the request prefix between steps.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- Scraping depends on page structures and private web APIs that the platforms change without notice. The parsers were checked against a live 小红书 profile page, logged out; logged-in 小红书, 抖音 and 微信公众号 scraping were not exercised with real accounts. Export import is the fallback.
- Scrapes require a login, because visitor pages round counters, as `1万+`, and hide post ids.
- 微信公众号 benchmark accounts are import-only. Its interaction counters depend on fields the publish list returns, which vary by account.
- Platforms may show a captcha to headless browsers; the user solves it in the embedded view.
- A browser profile directory can be used by one process at a time, so two dsh processes sharing a profile cannot both open it.
- Topic research runs searches with the user's logged-in platform account, one keyword after another; a report with eight suggestions adds about one to three minutes, and frequent searches may trigger platform verification. Only 抖音 implements search and trending.
- The creation workbench is a separate local app; the suite relies on its `/api/stamp` and `/api/projects` endpoints and its `WB_TOKEN` and `WB_FRAME_ANCESTORS` variables. If another program holds `studioPort`, the workbench does not start and the page reports it.
- Related posts store the cover URLs the platform served. 抖音 signs these URLs, so covers of older reports may stop loading and show a placeholder.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>
