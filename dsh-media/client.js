/*
 * 自媒体 · 页面（浏览器端）
 *
 * 这个文件不用打包，DSH 直接执行它；改完保存，页面会自动换成新的。
 * 它是照「DSH 插件底座」（0.5 版）写的：第 1、2 段和底座一样，自己的东西在第 2b、3 段。
 * 写界面只用一个函数 h(组件或标签, 属性, 内容…)，例如 h(Btn, { kind: 'primary', onClick: save }, '保存')。
 *
 * 文件分几段，从上往下：
 *   0.  名字        —— 插件叫什么、样式前缀
 *   1.  外观        —— 颜色、圆角、阴影、字体。想换样子先改这里，一处改完整套都变
 *   2.  底座        —— 现成的组件，和 DSH插件底座/底座/my-plugin/client.js 的第 2 段一样
 *   2b. 补的组件    —— 底座里还没有的：趋势图、迷你折线、封面图……标了 [底座候选]
 *   3.  自媒体的页面 —— 调后台、数据逻辑、登录小浏览器；3V 看板：左边一列（总览、各平台账号）、账号看板、作品弹窗、右边的 AI 助手；文案
 *   4.  挂载        —— 把页面接进 DSH
 *
 * 这个文件就是给你改的：外观、组件、页面都可以动。只有三条不能破（破了页面会坏或者和别的插件打架）：
 *   - 色值只写在第 1 段「外观」里，写了浅色的值就要在「深色」那一块也写一个；别的地方用 var(--前缀-名字)。
 *   - 样式类名都通过 cls('名字') 加前缀，不直接写 className: 'btn'。
 *   - 不 require DSH 自己的组件库，不往 document.body 里塞东西，不用 iframe。
 *
 * 两个容易踩的坑：
 *   - 页面里不要把变量叫 cls、h、api 这些底座已经用了的名字（比如 .map(cls => …)），不然整页白屏。
 *   - 自己画 SVG 时，颜色变量要写进样式（类名对应的样式，或者 style: { fill: chart(1) }）；写成 fill: 'var(…)' 属性不生效。
 *
 * 后台在哪：数据、抓取、AI 都在同一个包的后台里（lib/index.js，id: media-suite），这里直接调它的接口（见 3.1）。
 * 旁边的 ui.js 做两件事：替页面接住登录小浏览器的画面，给右边的 AI 助手准备工作区。
 */
window.__ModuleLoader__.load({
  id: '@xiaopuai/dsh-media',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { Fragment, useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo, useSyncExternalStore } = React

    // ================================================================== 0. 名字

    const ID = 'media-ui'            // 和 cordis.patch.yml 里的 id 一样
    const P = 'ms'                   // 样式前缀
    const BRIDGE = 'mediaUi/call'    // 和 index.js 里的 ROUTE 对上（那边多一个开头的 /api/）
    // 界面上的字在文件靠后的「文案」那一块（TEXT），中文和英文各一份。

    // ================================================================== 1. 外观（想换样子，先改这里）
    //
    // 整个插件的颜色、圆角、阴影、字体都从这一段取。默认值跟着 DSH 走：浅色深色自动变，看起来和 DSH 自己的界面一样。
    // 想做成自己的样子：把某一行的 var(--dsw-…) 换成自己的值（比如 --$-brand:#1F4FD8），
    // 然后在下面「深色」那一块给同一个名字写一个深色时用的值。只改圆角、字体不用管深色。
    // 写法里的 $- 会被换成第 0 段的前缀。别的地方要用颜色，写 var(--$-brand) 这样的名字，不要再写色值。
    const THEME = `
.$-root{
  /* 主色：主按钮、开关打开、选中的勾 */
  --$-brand:var(--dsw-alias-button-primary-fill);
  --$-brand-hover:var(--dsw-alias-button-primary-hover);
  --$-on-brand:var(--dsw-alias-label-primary-foreground);   /* 主色上面的字 */
  /* 强调色：输入框聚焦的边、「进行中」的标签、焦点框 */
  --$-accent:var(--dsw-alias-state-business-primary);
  /* 底色 */
  --$-bg:var(--dsw-alias-bg-base);                  /* 页面 */
  --$-card:var(--dsw-alias-settings-card-fill);     /* 卡片 */
  --$-raised:var(--dsw-alias-bg-layer-2);           /* 弹窗、抽屉、菜单 */
  --$-field:var(--dsw-alias-bg-layer-1);            /* 输入框 */
  --$-soft:var(--dsw-alias-interactive-bg-hover);   /* 浅浅的一层：鼠标停上去、选中的导航、灰色标签 */
  --$-mask:var(--dsw-alias-bg-mask-1);              /* 弹窗后面的遮罩 */
  /* 字 */
  --$-text:var(--dsw-alias-label-primary);          /* 正文 */
  --$-text-2:var(--dsw-alias-label-secondary);      /* 说明 */
  --$-text-3:var(--dsw-alias-label-tertiary);       /* 更淡的小字 */
  /* 线 */
  --$-line:var(--dsw-alias-border-l1);              /* 分隔线 */
  --$-line-2:var(--dsw-alias-border-l3);            /* 按钮、输入框的边 */
  --$-card-line:var(--dsw-alias-settings-card-stroke);
  /* 状态 */
  --$-success:var(--dsw-alias-state-success-primary);
  --$-warn:var(--dsw-alias-state-warn-primary);
  --$-danger:var(--dsw-alias-state-error-primary);
  /* 圆角：想方一点就都改小，想圆一点就都改大 */
  --$-r-xs:var(--dsw-radius-xs);   /* 4  */
  --$-r-sm:var(--dsw-radius-sm);   /* 8  小按钮、菜单里的一行 */
  --$-r-md:var(--dsw-radius-md);   /* 12 按钮、输入框 */
  --$-r-lg:var(--dsw-radius-lg);   /* 16 数字卡、缩略图 */
  --$-r-xl:var(--dsw-radius-xl);   /* 20 卡片 */
  --$-r-panel:var(--dsw-radius-panel); /* 28 弹窗、抽屉 */
  /* 阴影：从轻到重 */
  --$-shadow-1:var(--dsw-elevation-soft,0 0 0 .5px var(--dsw-alias-border-l3));
  --$-shadow-2:var(--dsw-elevation-panel);
  --$-shadow-3:var(--dsw-elevation-prominent);
  /* 字体：inherit 就是和 DSH 一样。标题想换一种字体改第二行，比如 "Songti SC",serif */
  --$-font:inherit;
  --$-font-title:inherit;
  /* 小提示条、看图的舞台 */
  --$-toast-bg:var(--dsw-alias-toast-bg,var(--dsw-alias-tooltip-bg));
  --$-toast-text:var(--dsw-alias-toast-label,var(--dsw-alias-label-primary-foreground));
  --$-stage-bg:var(--dsw-alias-bg-mask-photo,var(--dsw-alias-interactive-bg-hover));
  --$-stage-text:var(--dsw-alias-toast-label,var(--dsw-alias-label-primary));
  /* 图表配色 chart(1) 到 chart(9)：1 2 3 4 5 6 各一种颜色，7 8 9 是前三种淡一档 */
  --$-chart-1:var(--$-accent);
  --$-chart-2:var(--$-success);
  --$-chart-3:var(--$-warn);
  --$-chart-4:var(--dsw-alias-state-done-primary);
  --$-chart-5:var(--$-danger);
  --$-chart-6:var(--$-text-3);
  --$-chart-7:color-mix(in srgb,var(--$-chart-1) 45%,var(--$-bg));
  --$-chart-8:color-mix(in srgb,var(--$-chart-2) 45%,var(--$-bg));
  --$-chart-9:color-mix(in srgb,var(--$-chart-3) 45%,var(--$-bg));
  /* 各平台的识别色：左边一列平台名前面的小方块。没写的平台用 --$-p-other */
  --$-p-douyin:#FE2C55;
  --$-p-xiaohongshu:#FF2442;
  --$-p-wechat-mp:#07C160;
  --$-p-wechat-channels:#FA9D3B;
  --$-p-other:var(--$-accent);
  --$-on-p:#FFFFFF;
  --$-logo-douyin:#161823;   /* 抖音 logo 的底（App 图标是黑底） */
  /* 看板（第 3V 段）：照抖音创作者中心「数据中心」实测的值。字、底色、按钮、分段、指标色都在这里改 */
  --$-dy-font:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei","Helvetica Neue",sans-serif;
  --$-dy-font-num:"Douyin Sans","DIN Alternate","DIN Pro","Barlow",-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;
  --$-dy-bg:#F9F9FA;              /* 页面 */
  --$-dy-card:#FFFFFF;            /* 白卡片 */
  --$-dy-tile:#F9F9FA;            /* 卡片里的指标卡 */
  --$-dy-tile-hover:#F2F2F4;
  --$-dy-seg:#F2F2F4;             /* 分段控件、导出按钮的底 */
  --$-dy-seg-hover:#E8E8EB;
  --$-dy-hover:#F5F5F7;           /* 左边一列鼠标停上去 */
  --$-dy-line:rgba(37,38,50,.08);
  --$-dy-line-strong:rgba(37,38,50,.16);
  --$-dy-text:#252632;            /* 主文字 */
  --$-dy-text-strong:#161823;     /* 按钮上的字 */
  --$-dy-text-2:rgba(37,38,50,.6);
  --$-dy-text-3:rgba(37,38,50,.4);
  --$-dy-primary:#1C1F23;         /* 主按钮（照「作品发布」） */
  --$-dy-primary-hover:#33363B;
  --$-dy-on-primary:#FFFFFF;
  --$-dy-tooltip:rgba(22,24,35,.92);
  --$-dy-blue:#3D6CF5;
  --$-dy-blue-soft:rgba(61,108,245,.1);
  --$-dy-red:#F53F3F;
  --$-dy-red-soft:rgba(245,63,63,.08);
  --$-dy-orange:#FF7D00;
  --$-dy-orange-soft:rgba(255,125,0,.1);
  --$-dy-green:#00B42A;
  /* 指标色：指标卡下划线和折线同色，按指标的顺序取 */
  --$-dy-c1:#3D6CF5;
  --$-dy-c2:#FF7D00;
  --$-dy-c3:#14C9C9;
  --$-dy-c4:#F7BA1E;
  --$-dy-c5:#722ED1;
  --$-dy-c6:#F5319D;
  --$-dy-c7:#00B42A;
  --$-dy-c8:#3491FA;
  --$-dy-c9:#86909C;
}
/* 深色：上面哪一行写了自己的色值，就在这里给它写一个深色时用的值。没改颜色就留空。
   页面自己有日间/夜间开关（data-theme）时听开关的，没有时跟着 DSH。 */
body[data-ds-dark-theme] .$-root:not([data-theme=light]),.$-root[data-theme=dark]{
  --$-dy-bg:#121318;
  --$-dy-card:#1C1D23;
  --$-dy-tile:#24252C;
  --$-dy-tile-hover:#2C2D35;
  --$-dy-seg:#2A2B33;
  --$-dy-seg-hover:#34353E;
  --$-dy-hover:#24252C;
  --$-dy-line:rgba(255,255,255,.08);
  --$-dy-line-strong:rgba(255,255,255,.16);
  --$-dy-text:#E9E9EC;
  --$-dy-text-strong:#F5F5F7;
  --$-dy-text-2:rgba(233,233,236,.62);
  --$-dy-text-3:rgba(233,233,236,.4);
  --$-dy-primary:#F5F5F7;
  --$-dy-primary-hover:#FFFFFF;
  --$-dy-on-primary:#161823;
  --$-dy-tooltip:rgba(0,0,0,.9);
  --$-dy-blue-soft:rgba(61,108,245,.18);
  --$-dy-red-soft:rgba(245,63,63,.16);
  --$-dy-orange-soft:rgba(255,125,0,.16);
}
`

    // ================================================================== 2. 底座（现成的组件和它们的样式；想改某个组件长什么样，就改这里对应的那几行）

    /** 给类名加上前缀：cls('btn', 是否主按钮 && 'btn-primary') → 'mp-btn mp-btn-primary'。 */
    const cls = (...names) => names.filter(Boolean).join(' ').split(/\s+/).filter(Boolean).map(n => `${P}-${n}`).join(' ')
    /**
     * 图表配色：chart(1) 到 chart(9)，画图表、分层、占比时从这里取颜色，浅色深色都能区分。
     * 1 蓝 2 绿 3 橙 4 紫 5 红 6 灰，7 8 9 是蓝绿橙淡一档的颜色。用法：style: { background: chart(2) }
     */
    const chart = n => `var(--${P}-chart-${((Number(n) || 1) - 1) % 9 + 1})`

    // ---- 组件的样式：颜色、圆角都取自上面「外观」段的变量。写法里的 $- 会被换成第 0 段的前缀。
    const STYLES = `
.$-root{container:$-shell/inline-size;position:relative;display:flex;flex-direction:column;width:100%;height:100%;min-width:0;min-height:0;overflow:hidden;color:var(--$-text);background:var(--$-bg);font-family:var(--$-font);font-size:14px;line-height:22px}
.$-root *,.$-embed *{box-sizing:border-box}
.$-root button,.$-embed button{font:inherit}
.$-embed{color:var(--$-text);font-family:var(--$-font);font-size:14px;line-height:22px}
.$-h1,.$-h2,.$-nav-title,.$-bar-title,.$-modal-title,.$-empty-title,.$-stat b{font-family:var(--$-font-title)}
.$-root :focus-visible,.$-embed :focus-visible{outline:2px solid var(--$-accent);outline-offset:2px}
.$-root .$-modal:focus-visible,.$-root .$-drawer:focus-visible,.$-root .$-menu-panel:focus-visible{outline:none}
.$-shell{flex:1;display:flex;min-width:0;min-height:0}
.$-nav{flex:none;display:flex;flex-direction:column;gap:12px;width:208px;padding:calc(20px + var(--dsh-frame-top-clearance,0px)) 12px 16px;border-right:.5px solid var(--$-line);overflow-y:auto}
.$-nav-title{padding:0 8px;font-size:16px;line-height:24px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.$-nav-list{display:flex;flex-direction:column;gap:2px}
.$-nav-item{position:relative;display:flex;align-items:center;gap:10px;width:100%;height:34px;padding:0 10px;border:0;border-radius:var(--$-r-md);background:none;color:var(--$-text-2);font-size:14px;text-align:left;white-space:nowrap;cursor:pointer}
.$-nav-item[aria-current=page]{background:var(--$-soft);color:var(--$-text);font-weight:500}
.$-nav-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis}
.$-nav-badge{flex:none;min-width:18px;padding:0 6px;border-radius:999px;corner-shape:round;background:var(--$-soft);color:var(--$-text-2);font-size:12px;line-height:18px;text-align:center;font-variant-numeric:tabular-nums}
.$-nav-badge-danger{background:color-mix(in srgb,var(--$-danger) 12%,transparent);color:var(--$-danger)}
.$-nav-head,.$-nav-foot{flex:none;display:flex;flex-direction:column;gap:8px;min-width:0}
.$-nav-foot{margin-top:auto}
.$-nav-head p,.$-nav-foot p{margin:0}
.$-nav-group{padding:10px 10px 2px;color:var(--$-text-3);font-size:12px;line-height:18px;white-space:nowrap}
.$-nav-group:first-child{padding-top:0}
.$-nav-item[data-locked=true]{color:var(--$-text-3)}
.$-nav-lock{flex:none;display:inline-flex;color:var(--$-text-3)}
.$-main{position:relative;flex:1;display:flex;flex-direction:column;min-width:0;min-height:0}
.$-scroll{flex:1;min-height:0;overflow:auto}
.$-page{display:flex;flex-direction:column;gap:16px;max-width:1080px;margin:0 auto;padding:calc(24px + var(--dsh-frame-top-clearance,0px)) clamp(20px,3.5vw,40px) 48px}
.$-page-wide{max-width:none}
.$-head{display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:12px 16px}
.$-head-text{flex:1 1 280px;min-width:0}
.$-crumb{margin:0 0 2px;color:var(--$-text-3);font-size:12px;line-height:18px}
.$-h1{margin:0;font-size:22px;line-height:30px;font-weight:500}
.$-sub{margin:2px 0 0;color:var(--$-text-2);font-size:13px;line-height:20px}
.$-h2{margin:0;font-size:15px;line-height:22px;font-weight:500}
.$-muted{color:var(--$-text-2);font-size:13px;line-height:20px}
.$-faint{color:var(--$-text-3);font-size:12px;line-height:18px}
.$-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.$-stack{display:flex;flex-direction:column;gap:12px;min-width:0}
.$-grow{flex:1;min-width:0}
.$-grid{display:grid;gap:12px;grid-template-columns:repeat(var(--cols,3),minmax(0,1fr))}
.$-bar{flex:none;display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;padding:calc(8px + var(--dsh-frame-top-clearance,0px)) 12px 8px 16px;border-bottom:.5px solid var(--$-line)}
.$-bar-title{display:flex;align-items:center;gap:8px;font-size:15px;line-height:22px;font-weight:500;white-space:nowrap}
.$-bar-body{flex:1;display:flex;align-items:center;gap:12px;min-width:0}
.$-bar-tools{display:flex;align-items:center;gap:8px;white-space:nowrap}
.$-bar~*{--dsh-frame-top-clearance:0px}
.$-split{flex:1;display:flex;min-height:0}
.$-split-side{flex:none;display:flex;flex-direction:column;width:35%;min-width:320px;max-width:560px;min-height:0;border-right:.5px solid var(--$-line)}
.$-split-head{flex:none;display:flex;align-items:center;gap:8px;height:44px;padding:0 8px 0 16px;border-bottom:.5px solid var(--$-line);font-size:13px;font-weight:500}
.$-split-body{position:relative;flex:1;display:flex;flex-direction:column;min-height:0}
.$-split-body>*{flex:1;min-height:0}
.$-split-main{flex:1;min-width:0;overflow:auto}
.$-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:36px;padding:0 14px;border:0;border-radius:var(--$-r-md);background:transparent;color:var(--$-text);font-size:14px;line-height:22px;text-decoration:none;white-space:nowrap;cursor:pointer}
.$-btn:disabled{cursor:not-allowed;opacity:.4}
.$-btn-sm{height:28px;padding:0 10px;border-radius:var(--$-r-sm);font-size:12px;line-height:18px}
.$-btn-lg{height:44px;padding:0 20px;font-size:15px}
.$-btn-block{display:flex;width:100%}
.$-btn-label{display:contents}
.$-btn-primary{background:var(--$-brand);color:var(--$-on-brand)}
.$-btn-default{box-shadow:inset 0 0 0 .5px var(--$-line-2)}
.$-btn-danger{box-shadow:inset 0 0 0 .5px var(--$-line-2);color:var(--$-danger)}
.$-btn-icon{width:36px;padding:0}.$-btn-icon.$-btn-sm{width:28px}
.$-btn svg{flex:none}
.$-btn .$-spin{border-color:currentColor;border-top-color:transparent;opacity:.7}
.$-input{display:flex;align-items:center;gap:6px;width:100%;min-height:32px;padding:0 10px;border:.5px solid var(--$-line-2);border-radius:var(--$-r-md);background:var(--$-field);color:var(--$-text);font:inherit;font-size:14px;line-height:22px;outline:none}
.$-input::placeholder{color:var(--$-text-3)}
.$-input:focus{border-color:var(--$-accent)}
.$-input:disabled{opacity:.5}
.$-input:read-only:not(select){border-color:var(--$-line);background:transparent}
textarea.$-input{padding:6px 10px;min-height:72px;resize:vertical}
select.$-input{cursor:pointer}
.$-search{display:flex;align-items:center;gap:8px;width:min(var(--w,420px),100%);height:32px;padding:0 2px 0 10px;border:.5px solid var(--$-line-2);border-radius:var(--$-r-md);background:var(--$-field);color:var(--$-text-3)}
.$-search:focus-within{border-color:var(--$-accent)}
.$-search input{flex:1;min-width:0;height:100%;padding:0;border:0;outline:none;background:none;color:var(--$-text);font:inherit;font-size:14px}
.$-search input::placeholder{color:var(--$-text-3)}
.$-search input:disabled{opacity:.5}
.$-field{display:flex;flex-direction:column;gap:6px;min-width:0}
.$-field>.$-seg,.$-stack>.$-seg{align-self:flex-start}
.$-field>.$-seg-stretch,.$-stack>.$-seg-stretch{align-self:stretch}
.$-field-label{color:var(--$-text-2);font-size:13px;line-height:20px}
.$-field-hint{color:var(--$-text-3);font-size:12px;line-height:18px}
.$-field-error{color:var(--$-danger);font-size:12px;line-height:18px}
.$-check{display:inline-flex;flex-wrap:wrap;align-items:center;gap:8px;cursor:pointer;font-size:14px}
.$-check input{width:16px;height:16px;margin:0;accent-color:var(--$-brand);cursor:pointer}
.$-radios{display:flex;flex-direction:column;gap:8px}
.$-switch{position:relative;flex:none;width:36px;height:20px;padding:2px;border:0;border-radius:999px;corner-shape:round;background:var(--$-line-2);cursor:pointer}
.$-switch[aria-checked=true]{background:var(--$-brand)}
.$-switch i{display:block;width:16px;height:16px;border-radius:50%;corner-shape:round;background:var(--$-bg);transition:transform 120ms ease}
.$-switch[aria-checked=true] i{transform:translateX(16px);background:var(--$-on-brand)}
.$-tag{display:inline-flex;align-items:center;gap:4px;padding:1px 8px;border-radius:999px;corner-shape:round;background:var(--$-soft);color:var(--$-text-2);font-size:11px;line-height:17px;font-weight:500;white-space:nowrap}
.$-tag-success{background:color-mix(in srgb,var(--$-success) 10%,transparent);color:var(--$-success)}
.$-tag-warn{background:color-mix(in srgb,var(--$-warn) 12%,transparent);color:var(--$-warn)}
.$-tag-danger{background:color-mix(in srgb,var(--$-danger) 10%,transparent);color:var(--$-danger)}
.$-tag-info{background:color-mix(in srgb,var(--$-accent) 10%,transparent);color:var(--$-accent)}
.$-tag-outline{background:none;box-shadow:inset 0 0 0 .5px var(--$-line-2);color:var(--$-text-3)}
.$-dot{display:inline-block;flex:none;width:8px;height:8px;border-radius:50%;corner-shape:round;box-shadow:inset 0 0 0 1.5px var(--$-line-2)}
.$-dot-success{background:var(--$-success);box-shadow:none}
.$-dot-warn{background:var(--$-warn);box-shadow:none}
.$-dot-danger{background:var(--$-danger);box-shadow:none}
.$-dot-muted{background:var(--$-text-3);box-shadow:none}
.$-card{display:flex;flex-direction:column;gap:12px;min-width:0;padding:16px;border-radius:var(--$-r-xl);background:var(--$-card);box-shadow:inset 0 0 0 .5px var(--$-card-line)}
.$-card-head{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 10px}
.$-card-note{flex:1;min-width:0;color:var(--$-text-3);font-size:12px;line-height:18px}
.$-card-sub{margin:-8px 0 0;color:var(--$-text-2);font-size:13px;line-height:20px}
.$-stat{display:flex;flex-direction:column;gap:2px;min-width:0;padding:14px 16px;border-radius:var(--$-r-lg);background:var(--$-card);box-shadow:inset 0 0 0 .5px var(--$-card-line)}
.$-stat b{font-size:24px;line-height:32px;font-weight:500;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.$-seg{display:inline-flex;max-width:100%;gap:2px;padding:4px;border-radius:var(--$-r-md);background:var(--$-soft)}
.$-seg-stretch{display:flex;align-self:stretch}.$-seg-stretch button{flex:1}
.$-seg button{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:28px;padding:0 14px;border:0;border-radius:var(--$-r-sm);background:none;color:var(--$-text-2);font-size:13px;line-height:20px;font-weight:500;white-space:nowrap;cursor:pointer}
.$-seg button:disabled{opacity:.4;cursor:not-allowed}
.$-seg button[aria-pressed=true]{background:var(--$-bg);color:var(--$-text);box-shadow:var(--$-shadow-1)}
.$-seg button[aria-pressed=true][data-tone=success]{background:color-mix(in srgb,var(--$-success) 14%,var(--$-bg));color:var(--$-success)}
.$-seg button[aria-pressed=true][data-tone=warn]{background:color-mix(in srgb,var(--$-warn) 14%,var(--$-bg));color:var(--$-warn)}
.$-seg button[aria-pressed=true][data-tone=danger]{background:color-mix(in srgb,var(--$-danger) 12%,var(--$-bg));color:var(--$-danger)}
.$-tabs{display:flex;gap:20px;border-bottom:.5px solid var(--$-line)}
.$-tabs button{position:relative;height:38px;padding:0;border:0;background:none;color:var(--$-text-2);font-size:14px;white-space:nowrap;cursor:pointer}
.$-tabs button[aria-selected=true]{color:var(--$-text);font-weight:500}
.$-tabs button[aria-selected=true]::after{content:"";position:absolute;left:0;right:0;bottom:-.5px;height:2px;background:var(--$-text)}
.$-table-wrap{overflow-x:auto;margin:0 -4px}
.$-table{width:100%;border-collapse:collapse;font-size:13px;line-height:20px}
.$-table th{padding:8px 10px;border-bottom:.5px solid var(--$-line);color:var(--$-text-2);font-weight:500;text-align:left;white-space:nowrap}
.$-table td{padding:10px;border-bottom:.5px solid var(--$-line);vertical-align:top}
.$-table tr:last-child td{border-bottom:0}
.$-table .$-num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.$-table tr.$-click{cursor:pointer}
.$-steps{display:flex;gap:4px;min-width:0;overflow-x:auto;scrollbar-width:none}
.$-step{display:flex;align-items:center;gap:8px;height:34px;padding:0 12px;border:0;border-radius:var(--$-r-md);background:none;color:var(--$-text-2);font-size:13px;white-space:nowrap;cursor:pointer}
.$-step:disabled{cursor:not-allowed;opacity:.5}
.$-step i{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;corner-shape:round;box-shadow:inset 0 0 0 1px currentColor;font-style:normal;font-size:11px;line-height:1}
.$-step[data-state=todo]{color:var(--$-text-3)}
.$-step[data-state=done] i{box-shadow:none;background:color-mix(in srgb,var(--$-success) 14%,transparent);color:var(--$-success)}
.$-step[data-state=doing] i{box-shadow:none;background:var(--$-brand);color:var(--$-on-brand)}
.$-step[aria-current=step]{background:var(--$-soft);color:var(--$-text);font-weight:500}
.$-bars{display:flex;flex-direction:column;gap:8px}
.$-bars-row{display:grid;grid-template-columns:minmax(64px,120px) minmax(0,1fr) auto;align-items:center;gap:10px;font-size:13px;line-height:20px}
.$-bars-track{height:8px;border-radius:999px;corner-shape:round;background:var(--$-soft);overflow:hidden}
.$-bars-fill{display:block;height:100%;min-width:2px;border-radius:999px;corner-shape:round;background:var(--$-brand);opacity:.7}
.$-bars-fill[data-color]{opacity:1}
.$-swatch{display:inline-block;flex:none;width:12px;height:12px;border-radius:var(--$-r-xs)}
.$-bars-value{font-variant-numeric:tabular-nums;white-space:nowrap}
.$-alert{display:flex;align-items:flex-start;gap:8px;padding:8px 12px;border-radius:var(--$-r-md);background:var(--$-soft);font-size:13px;line-height:20px}
.$-alert>svg{flex:none;margin-top:2px}
.$-alert-action{flex:none;display:flex;align-items:center;gap:8px;margin:-4px -4px -4px 0}
.$-alert-warn{background:color-mix(in srgb,var(--$-warn) 10%,transparent)}.$-alert-warn>svg{color:var(--$-warn)}
.$-alert-danger{background:color-mix(in srgb,var(--$-danger) 8%,transparent)}.$-alert-danger>svg{color:var(--$-danger)}
.$-alert-success{background:color-mix(in srgb,var(--$-success) 9%,transparent)}.$-alert-success>svg{color:var(--$-success)}
.$-empty{display:flex;flex-direction:column;align-items:center;gap:4px;padding:40px 16px;text-align:center}
.$-empty-title{margin:0;font-size:15px;line-height:22px;font-weight:500}
.$-empty-body{margin:0;max-width:420px;color:var(--$-text-2);font-size:13px;line-height:20px}
.$-empty-action{margin-top:12px}
.$-center{display:flex;align-items:center;justify-content:center;gap:8px;min-height:160px;color:var(--$-text-3);font-size:13px}
.$-spin{display:inline-block;flex:none;width:16px;height:16px;border:2px solid var(--$-line-2);border-top-color:var(--$-text-2);border-radius:50%;corner-shape:round;vertical-align:-3px;animation:$-spin .8s linear infinite}
.$-spin-sm{width:11px;height:11px;border-width:1.5px;vertical-align:-1px}
@keyframes $-spin{to{transform:rotate(360deg)}}
.$-kv{display:grid;grid-template-columns:84px minmax(0,1fr);gap:8px 12px;margin:0;font-size:13px;line-height:20px}
.$-kv dt{color:var(--$-text-2)}.$-kv dd{margin:0;overflow-wrap:anywhere}
.$-drop{display:flex;flex-direction:column;align-items:center;gap:4px;padding:22px;border:1px dashed var(--$-line-2);border-radius:var(--$-r-xl);color:var(--$-text-2);font-size:13px;line-height:20px;text-align:center;cursor:pointer}
.$-drop b{color:var(--$-text);font-size:14px;line-height:22px;font-weight:500}
.$-drop[data-drag=true]{border-color:var(--$-accent);background:var(--$-soft)}
.$-thumbs{display:grid;grid-template-columns:repeat(auto-fill,minmax(var(--min,180px),1fr));gap:12px}
.$-thumb{display:flex;flex-direction:column;gap:6px;min-width:0;margin:0}
.$-thumb-img{position:relative;display:flex;align-items:center;justify-content:center;width:100%;aspect-ratio:var(--ratio,4/3);padding:0;border:0;border-radius:var(--$-r-lg);background:var(--$-soft);color:inherit;font:inherit;overflow:hidden}
.$-thumb-img img{width:100%;height:100%;object-fit:contain}
.$-thumb-click{cursor:pointer}
.$-thumb-badge{position:absolute;left:6px;top:6px;padding:1px 8px;border-radius:999px;corner-shape:round;background:var(--$-bg);font-size:11px;line-height:17px;font-weight:500}
.$-thumb-x{position:absolute;top:6px;right:6px;display:flex;align-items:center;justify-content:center;width:24px;height:24px;padding:0;border:0;border-radius:50%;corner-shape:round;background:var(--$-bg);color:var(--$-text-2);cursor:pointer}
.$-thumb-cap{display:flex;flex-direction:column;align-items:flex-start;gap:4px;min-width:0}
.$-thumb-name{max-width:100%;font-size:13px;line-height:20px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.$-stage{position:relative;flex:1;display:flex;align-items:center;justify-content:center;gap:8px;min-width:0;height:min(64vh,640px);padding:12px;border-radius:var(--$-r-xl);background:var(--$-stage-bg);color:var(--$-stage-text)}
.$-stage-fig{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;min-width:0;height:100%;margin:0}
.$-stage-fig img,.$-stage-fig video{max-width:100%;max-height:100%;min-height:0;object-fit:contain;border-radius:var(--$-r-sm)}
.$-stage-fig figcaption{flex:none;font-size:12px;line-height:18px;opacity:.8}
.$-stage-empty{padding:8px;font-size:12px;line-height:18px;text-align:center;opacity:.7}
.$-stage-badge{position:absolute;top:10px;left:10px;display:flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;corner-shape:round;background:var(--$-raised);box-shadow:var(--$-shadow-2);color:var(--$-text);font-size:12px;line-height:18px}
.$-stage-nav{position:absolute;top:50%;display:flex;align-items:center;justify-content:center;width:34px;height:54px;padding:0;border:0;border-radius:var(--$-r-md);background:var(--$-raised);box-shadow:var(--$-shadow-2);color:var(--$-text);cursor:pointer;opacity:0;transform:translateY(-50%);transition:opacity 120ms ease}
.$-stage-nav:disabled{cursor:default}
.$-stage:hover .$-stage-nav:not(:disabled),.$-stage-nav:focus-visible{opacity:1}
.$-stage-prev{left:10px}.$-stage-next{right:10px}
.$-strip{display:grid;grid-template-columns:repeat(var(--n,6),minmax(0,1fr));gap:8px}
.$-strip-cell{display:flex;flex-direction:column;gap:4px;min-width:0;padding:4px;border:0;border-radius:var(--$-r-md);background:none;color:var(--$-text-2);font-size:12px;line-height:18px;cursor:pointer}
.$-strip-cell[aria-current=true]{background:var(--$-soft);box-shadow:inset 0 0 0 1.5px var(--$-text);color:var(--$-text)}
.$-strip-thumb{display:flex;align-items:center;justify-content:center;height:84px;border-radius:var(--$-r-sm);background:var(--$-soft);overflow:hidden}
.$-strip-thumb img{width:100%;height:100%;object-fit:cover}
.$-strip-label{display:flex;align-items:center;justify-content:center;gap:6px}
.$-mask{position:absolute;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;padding:24px;background:var(--$-mask)}
.$-modal{display:flex;flex-direction:column;gap:16px;width:min(var(--w,440px),100%);max-height:100%;padding:24px 0;overflow:hidden;border-radius:var(--$-r-panel);background:var(--$-raised);box-shadow:var(--$-shadow-3);outline:none}
.$-modal-head{flex:none;display:flex;align-items:center;gap:8px;padding:0 24px}
.$-modal-title{flex:1;min-width:0;margin:0;font-size:16px;line-height:24px;font-weight:500}
.$-modal-body{flex:0 1 auto;display:flex;flex-direction:column;gap:16px;min-height:0;padding:2px 24px;overflow:auto}
.$-modal-foot{flex:none;display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px;padding:0 24px}
.$-modal-text{margin:0;color:var(--$-text-2);font-size:14px;line-height:22px;white-space:pre-line}
.$-drawer-mask{position:absolute;inset:0;z-index:19}
.$-drawer{position:absolute;top:12px;right:12px;bottom:12px;z-index:20;display:flex;flex-direction:column;width:min(var(--w,420px),calc(100% - 24px));border-radius:var(--$-r-panel);background:var(--$-raised);box-shadow:var(--$-shadow-3);outline:none}
.$-drawer-head{display:flex;align-items:center;gap:8px;padding:calc(16px + var(--dsh-frame-top-clearance,0px)) 12px 12px 20px;border-bottom:.5px solid var(--$-line)}
.$-drawer-head-own{align-items:flex-start}
.$-drawer-body{flex:1;min-height:0;overflow:auto;padding:16px 20px 24px;display:flex;flex-direction:column;gap:16px}
.$-menu{display:inline-flex;min-width:0;max-width:100%}
.$-menu-block{display:flex;width:100%}
.$-menu-btn{min-width:0;max-width:100%}
.$-menu-btn-2{height:auto;min-height:44px;padding:6px 8px 6px 10px}
.$-menu-text{flex:1;display:flex;flex-direction:column;min-width:0;text-align:left}
.$-menu-text b,.$-menu-text small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.$-menu-text b{font-weight:inherit}
.$-menu-btn-2 .$-menu-text b{font-size:14px;line-height:20px;font-weight:500}
.$-menu-text small{color:var(--$-text-3);font-size:12px;line-height:18px}
.$-menu-caret{flex:none;display:inline-flex;color:var(--$-text-3)}
.$-menu-panel{position:absolute;left:0;top:0;z-index:25;display:flex;flex-direction:column;gap:2px;width:var(--w,max-content);max-width:min(360px,calc(100% - 16px));max-height:min(60vh,420px);padding:6px;overflow:auto;border-radius:var(--$-r-lg);background:var(--$-raised);box-shadow:var(--$-shadow-3);visibility:hidden}
.$-menu-item{flex:none;display:flex;align-items:center;gap:8px;width:100%;min-height:32px;padding:5px 8px;border:0;border-radius:var(--$-r-sm);background:none;color:var(--$-text);font-size:13px;line-height:20px;text-align:left;cursor:pointer}
.$-menu-item:focus-visible{outline-offset:-2px}
.$-menu-item:disabled{opacity:.4;cursor:not-allowed}
.$-menu-item[data-danger=true]{color:var(--$-danger)}
.$-menu-item-text{flex:1;display:flex;flex-direction:column;min-width:0}
.$-menu-item-text small{color:var(--$-text-3);font-size:12px;line-height:18px}
.$-menu-sep{flex:none;height:.5px;margin:4px 0;background:var(--$-line)}
.$-menu-title{flex:none;padding:4px 8px 0;color:var(--$-text-3);font-size:12px;line-height:18px}
.$-pane{position:relative;flex:none;display:flex;flex-direction:column;width:var(--w,380px);max-width:50%;min-width:0;min-height:0;border-left:.5px solid var(--$-line);background:var(--$-bg)}
.$-pane[data-drag=true]{user-select:none}
.$-pane-grip{position:absolute;left:-4px;top:0;bottom:0;z-index:5;width:8px;cursor:col-resize;touch-action:none}
.$-pane[data-drag=true] .$-pane-grip{background:var(--$-soft)}
.$-pane-head{flex:none;display:flex;align-items:center;gap:4px;min-height:52px;padding:calc(8px + var(--dsh-frame-top-clearance,0px)) 8px 8px 16px;border-bottom:.5px solid var(--$-line)}
.$-pane-title{flex:1;min-width:0}
.$-pane-title b,.$-pane-title small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.$-pane-title b{font-size:14px;line-height:20px;font-weight:500}
.$-pane-title small{color:var(--$-text-3);font-size:12px;line-height:18px}
.$-pane-body{position:relative;flex:1;display:flex;flex-direction:column;min-width:0;min-height:0;--dsh-frame-top-clearance:0px}
.$-pane-body>*{flex:1;min-height:0}
.$-toasts{position:absolute;left:50%;bottom:24px;z-index:30;display:flex;flex-direction:column;align-items:center;gap:8px;transform:translateX(-50%);max-width:calc(100% - 32px);pointer-events:none}
.$-toast{padding:8px 14px;border-radius:var(--$-r-md);background:var(--$-toast-bg);color:var(--$-toast-text);font-size:13px;line-height:20px;box-shadow:var(--$-shadow-2)}
.$-notices{position:absolute;right:20px;bottom:20px;z-index:30;display:flex;flex-direction:column;gap:8px;width:min(420px,calc(100% - 40px))}
.$-notice{display:flex;align-items:flex-start;gap:8px;padding:10px 8px 10px 12px;border-radius:var(--$-r-lg);background:var(--$-raised);box-shadow:var(--$-shadow-3);font-size:13px;line-height:20px}
.$-notice>svg{flex:none;margin-top:6px;color:var(--$-text-2)}
.$-notice>span{padding:4px 0}
.$-notice[data-tone=danger]>svg{color:var(--$-danger)}
.$-notice[data-tone=warn]>svg{color:var(--$-warn)}
.$-notice[data-tone=success]>svg{color:var(--$-success)}
@media (hover:hover){
.$-nav-item:hover,.$-btn-default:hover:not(:disabled),.$-btn-ghost:hover:not(:disabled),.$-btn-danger:hover:not(:disabled),.$-step:hover:not(:disabled),.$-drop:hover,.$-strip-cell:hover,.$-menu-item:hover:not(:disabled),.$-pane-grip:hover{background:var(--$-soft)}
.$-btn-primary:hover:not(:disabled){background:var(--$-brand-hover)}
.$-table tr.$-click:hover td{background:var(--$-soft)}
.$-seg button:hover:not(:disabled),.$-tabs button:hover,.$-thumb-x:hover{color:var(--$-text)}
}
@media (prefers-reduced-motion:reduce){.$-spin{animation:none}.$-switch i,.$-stage-nav{transition:none}}
@container $-shell (max-width:1080px){
.$-bar-title~.$-bar-body{order:3;flex-basis:100%}
.$-bar-tools{margin-left:auto}
}
@container $-shell (max-width:900px){
.$-pane{position:absolute;top:0;right:0;bottom:0;z-index:18;width:min(var(--w,380px),100%);max-width:100%;box-shadow:var(--$-shadow-3)}
.$-pane-grip{display:none}
.$-bar .$-step{gap:6px;padding:0 8px}
.$-split{flex-direction:column}
.$-split-side{width:auto;min-width:0;max-width:none;height:42%;border-right:0;border-bottom:.5px solid var(--$-line)}
.$-stage{height:52vh}
}
@container $-shell (max-width:880px){
.$-nav{align-items:center;width:64px;padding-inline:10px}
.$-nav-title,.$-nav-label,.$-nav-badge,.$-nav-lock,.$-nav .$-btn-label,.$-nav .$-menu-text,.$-nav .$-menu-caret,.$-nav-head p,.$-nav-foot p{display:none}
.$-nav-item{justify-content:center;width:40px;padding:0}
.$-nav-head,.$-nav-foot{align-items:center}
.$-nav .$-btn{width:40px;height:40px;min-height:0;padding:0}
.$-nav .$-menu{width:auto}
.$-nav-group{align-self:stretch;height:.5px;margin:6px 4px;padding:0;background:var(--$-line);font-size:0;line-height:0;overflow:hidden}
.$-nav-group:first-child{display:none}
.$-grid{grid-template-columns:repeat(min(var(--cols,3),2),minmax(0,1fr))}
}
@container $-shell (max-width:560px){
.$-shell{flex-direction:column}
.$-nav{flex-direction:row;width:auto;padding:calc(6px + var(--dsh-frame-top-clearance,0px)) 12px 6px;border-right:0;border-bottom:.5px solid var(--$-line);overflow-x:auto}
.$-nav-list,.$-nav-head,.$-nav-foot{flex-direction:row}
.$-nav-foot{margin:0 0 0 auto}
.$-nav-group{display:none}
.$-page{padding-top:20px}
.$-grid{grid-template-columns:minmax(0,1fr)}
}
`

    // ---- 图标：h(Icon, { name: 'plus' })。要新图标，在这里加一行 SVG 路径（24×24 画布，描边）。
    //      一个图标要好几笔时写成数组：more: ['第一笔', '第二笔']。
    const ICONS = {
      home: 'M4 10.5 12 4l8 6.5V20H4zM9.5 20v-6h5v6',
      list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
      chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
      grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
      settings: 'M4 7h10M18 7h2M4 17h2M10 17h10M14 4.5v5M6 14.5v5',
      plus: 'M12 5v14M5 12h14',
      x: 'M6 6l12 12M18 6 6 18',
      check: 'M5 12.5 10 17.5 19 7',
      search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
      edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
      trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5',
      left: 'M15 6l-6 6 6 6',
      right: 'M9 6l6 6-6 6',
      down: 'M6 9l6 6 6-6',
      refresh: 'M20 12a8 8 0 1 1-2.6-5.9M20 4v4.5h-4.5',
      download: 'M12 4v11M7 11l5 5 5-5M5 20h14',
      upload: 'M12 16V5M7 9l5-5 5 5M5 20h14',
      info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v5M12 7.5v.5',
      warn: 'M12 4 2.5 20h19zM12 10v4.5M12 17v.5',
      user: 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 20c1-4 4-6 8-6s7 2 8 6',
      file: 'M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6',
      folder: 'M3 6h6l2 2h10v11H3z',
      film: 'M4 5h16v14H4zM4 9h16M8 5v4M16 5v4M10.5 12.5v4l3.5-2z',
      play: 'M8 5v14l11-7z',
      music: 'M9 18V6l10-2v12M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zM19 16a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z',
      spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7z',
      up: 'M6 15l6-6 6 6',
      more: ['M5 10.8a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4z', 'M12 10.8a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4z', 'M19 10.8a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4z'],
      lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
      bell: 'M6 17v-6a6 6 0 0 1 12 0v6l1.5 2h-15zM10 21.5h4',
      calendar: 'M4 6h16v14H4zM4 10h16M8 3.5v4M16 3.5v4',
      clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7.5V12l3 2',
      filter: 'M4 5h16l-6 7.5V19l-4-2v-4.5z',
      copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
      link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
      eye: 'M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
      star: 'M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z',
      send: 'M4 12 20 4l-5 16-3.5-6.5zM11.5 13.5 20 4',
      image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4',
      chat: 'M4 5h16v11H10l-4 4v-4H4z',
      mail: 'M4 6h16v12H4zM4 7l8 6 8-6',
      trend: 'M4 19h16M5 15l4.5-5 4 3L19 6',
      sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4',
      moon: 'M20 14.2A8 8 0 0 1 9.8 4a8 8 0 1 0 10.2 10.2z',
    }
    function Icon({ name, size = 16 }) {
      return h('svg', { viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
        [ICONS[name] ?? ICONS.info].flat().map((d, i) => h('path', { key: i, d })))
    }
    /** 转圈：h(Spin) 放在一行字前面表示「正在做」；h(Spin, { sm: true }) 是小号。 */
    const Spin = ({ sm }) => h('span', { className: cls('spin', sm && 'spin-sm'), 'aria-hidden': true })

    // ---- 按钮：h(Btn, { kind: 'primary' | 'default' | 'ghost' | 'danger', sm, icon, onClick }, '文字')
    //      busy: 正在做（转圈、不能点）      tip: 鼠标停上去的说明，常用来讲「为什么现在不能点」
    //      lg: 大一号（一页里最主要的那一步）      block: 撑满一行
    //      只有图标的按钮要写 label：h(Btn, { icon: 'x', label: '关闭', onClick })
    //      当下载链接用：h(Btn, { href, download: '成片.mp4', icon: 'download' }, '下载成片')
    function Btn({ kind = 'default', sm, lg, block, icon, label, tip, busy, disabled, href, download, onClick, children }) {
      const iconOnly = icon && (children === undefined || children === null)
      const className = cls('btn', `btn-${kind}`, sm && 'btn-sm', lg && 'btn-lg', block && 'btn-block', iconOnly && 'btn-icon')
      const inside = [busy ? h(Spin, { key: 'i', sm: true }) : icon ? h(Icon, { key: 'i', name: icon, size: sm ? 14 : 16 }) : null,
        iconOnly ? null : h('span', { key: 't', className: cls('btn-label') }, children)]
      if (href) return h('a', { className, href, download, title: tip ?? (iconOnly ? label : undefined), 'aria-label': iconOnly ? label : undefined }, inside)
      return h('button', { type: 'button', className, disabled: disabled || busy, onClick, title: tip ?? (iconOnly ? label : undefined), 'aria-label': iconOnly ? label : undefined, 'aria-busy': busy || undefined }, inside)
    }

    // ---- 输入类。onChange 直接拿到值：h(Input, { value, onChange: setValue, placeholder: '…' })
    //      只读（看得清但不能改）写 readOnly: true；要拿到输入框本身（比如让它聚焦）传 inputRef。
    const Input = ({ value, onChange, inputRef, ...rest }) => h('input', { ref: inputRef, className: cls('input'), value: value ?? '', onChange: e => onChange?.(e.target.value), ...rest })
    const Textarea = ({ value, onChange, inputRef, ...rest }) => h('textarea', { ref: inputRef, className: cls('input'), value: value ?? '', onChange: e => onChange?.(e.target.value), ...rest })
    /** options 可以是 ['甲', '乙']，也可以是 [{ value: 'a', label: '甲' }]。 */
    const norm = options => options.map(o => (typeof o === 'string' ? { value: o, label: o } : o))
    const Select = ({ value, onChange, options = [], inputRef, ...rest }) => h('select', { ref: inputRef, className: cls('input'), value: value ?? '', onChange: e => onChange?.(e.target.value), ...rest },
      norm(options).map(o => h('option', { key: o.value, value: o.value }, o.label)))
    const Check = ({ checked, onChange, children }) => h('label', { className: cls('check') }, h('input', { type: 'checkbox', checked: Boolean(checked), onChange: e => onChange?.(e.target.checked) }), children)
    /** 单选（一列里选一个）：h(Radios, { name: 'music', value, onChange, options: [{ value: '', label: '不要配乐' }, { value: 'a', label: 'a.mp3', extra: 旁边再放点东西 }] }) */
    const Radios = ({ name, value, onChange, options = [] }) => h('div', { className: cls('radios'), role: 'radiogroup' }, norm(options).map(o => h('label', { key: o.value, className: cls('check') },
      h('input', { type: 'radio', name, checked: o.value === value, onChange: () => onChange?.(o.value) }), o.label, o.extra)))
    const Switch = ({ checked, onChange, label }) => h('button', { type: 'button', role: 'switch', className: cls('switch'), 'aria-checked': Boolean(checked), 'aria-label': label, onClick: () => onChange?.(!checked) }, h('i'))
    /**
     * 一个表单项：上面是名字，中间放输入框，下面可以有说明或报错。
     * 里面放的是一组按钮（Seg、Radios、几个 Check）时写 group: true，不然点名字会等于点了第一个按钮。
     */
    const Field = ({ label, hint, error, group, children }) => h(group ? 'div' : 'label', { className: cls('field'), role: group ? 'group' : undefined, 'aria-label': group && typeof label === 'string' ? label : undefined },
      h('span', { className: cls('field-label') }, label), children,
      error ? h('span', { className: cls('field-error') }, error) : hint ? h('span', { className: cls('field-hint') }, hint) : null)
    /** 拖文件上传区（拖进来或点一下选）：h(DropZone, { onFiles: files => …, accept: '.jpg,.png', busy, title, hint }) */
    function DropZone({ onFiles, accept, multiple = true, busy, title = '把文件拖到这里', hint = '或点一下选择文件' }) {
      const [drag, setDrag] = useState(false)
      const fileRef = useRef(null)
      const pick = () => fileRef.current?.click()
      return h('div', {
        className: cls('drop'), 'data-drag': drag, role: 'button', tabIndex: 0, onClick: pick,
        onKeyDown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick() } },
        onDragOver: e => { e.preventDefault(); setDrag(true) }, onDragLeave: () => setDrag(false),
        onDrop: e => { e.preventDefault(); setDrag(false); if (e.dataTransfer?.files?.length) onFiles?.([...e.dataTransfer.files]) },
      },
      h('input', { ref: fileRef, type: 'file', multiple, hidden: true, accept, onClick: e => e.stopPropagation(), onChange: e => { const files = [...e.target.files]; e.target.value = ''; if (files.length) onFiles?.(files) } }),
      busy ? h('span', null, h(Spin), ' 正在放入…') : h(Fragment, null, h(Icon, { name: 'upload', size: 20 }), h('b', null, title), h('span', null, hint)))
    }

    /**
     * 搜索框（带放大镜；回车才搜；有字时右边出一个清空）：
     * h(SearchBox, { value, onChange: setValue, onEnter: 字 => 去搜, placeholder: '姓名、手机号', width: 320 })
     * 点清空会把字清掉；清空后还要做别的事（比如回到全部）就写 onClear。
     */
    const SearchBox = ({ value, onChange, onEnter, onClear, placeholder, disabled, width, label }) => h('label', { className: cls('search'), style: width ? { '--w': `${width}px` } : undefined },
      h(Icon, { name: 'search' }),
      h('input', { value: value ?? '', placeholder, disabled, 'aria-label': label ?? placeholder, onChange: e => onChange?.(e.target.value), onKeyDown: e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) onEnter?.(e.target.value) } }),
      value && !disabled ? h(Btn, { kind: 'ghost', sm: true, icon: 'x', label: '清空', onClick: e => { e.preventDefault(); onChange?.(''); onClear?.() } }) : null)

    // ---- 展示类
    /** 标签。tone: 不写（灰）| 'success' | 'warn' | 'danger' | 'info' | 'outline'；tip 是鼠标停上去的说明。 */
    const Tag = ({ tone, tip, children }) => h('span', { className: cls('tag', tone && `tag-${tone}`), title: tip }, children)
    /** 状态圆点：h(Dot, { tone: 'success' | 'warn' | 'danger' | 'muted', label: '通过' })；不写 tone 是空心的「还没有」。 */
    const Dot = ({ tone, label }) => h('span', { className: cls('dot', tone && `dot-${tone}`), title: label, role: label ? 'img' : undefined, 'aria-label': label })
    /** 卡片：title 标题，note 标题旁的小字，sub 标题下面的一行说明，action 右上角的按钮，里面放任何内容。要加自己的类名或样式用 className、style。 */
    const Card = ({ title, note, sub, action, className, style, children }) => h('section', { className: [cls('card'), className].filter(Boolean).join(' '), style },
      title || action ? h('div', { className: cls('card-head') }, title ? h('h2', { className: cls('h2') }, title) : null, h('span', { className: cls('card-note') }, note), action) : null,
      sub ? h('p', { className: cls('card-sub') }, sub) : null,
      children)
    /** 数字卡：h(Stat, { label: '总数', value: 128, note: '比上周多 3' }) */
    const Stat = ({ label, value, note }) => h('div', { className: cls('stat') }, h('span', { className: cls('muted') }, label), h('b', null, value), note ? h('span', { className: cls('faint') }, note) : null)
    /** 几列排开：h(Grid, { cols: 4 }, …)。窄的时候自动变两列、一列。 */
    const Grid = ({ cols = 3, children }) => h('div', { className: cls('grid'), style: { '--cols': cols } }, children)
    const Row = ({ children }) => h('div', { className: cls('row') }, children)
    const Stack = ({ children }) => h('div', { className: cls('stack') }, children)
    /** 提示条：tone 不写（普通）| 'warn' | 'danger' | 'success'；action 是右边的按钮：h(Alert, { tone: 'warn', action: h(Btn, { sm: true }, '去处理') }, '有 3 条没确认') */
    const Alert = ({ tone, action, children }) => h('div', { className: cls('alert', tone && `alert-${tone}`), role: tone === 'danger' ? 'alert' : undefined },
      h(Icon, { name: tone === 'success' ? 'check' : tone ? 'warn' : 'info' }), h('div', { className: cls('grow') }, children),
      action ? h('div', { className: cls('alert-action') }, action) : null)
    /** 没有内容时：h(Empty, { title: '还没有事项', body: '点右上角新增', action: h(Btn, …) }) */
    const Empty = ({ title, body, action }) => h('div', { className: cls('empty') }, h('p', { className: cls('empty-title') }, title), body ? h('p', { className: cls('empty-body') }, body) : null, action ? h('div', { className: cls('empty-action') }, action) : null)
    const Loading = ({ text = '正在加载…' }) => h('div', { className: cls('center') }, h(Spin), text)
    /** 出错时：显示原因和「重试」。 */
    const ErrorBox = ({ error, onRetry }) => h(Alert, { tone: 'danger' }, h(Row, null, h('span', { className: cls('grow') }, error?.message ?? String(error)), onRetry ? h(Btn, { sm: true, onClick: onRetry }, '重试') : null))
    /** 两列的「名字：值」清单：h(KV, { items: [['负责人', '小王'], ['状态', '进行中']] })，值是空的那行不显示。 */
    const KV = ({ items }) => h('dl', { className: cls('kv') }, items.filter(([, v]) => v !== null && v !== undefined && v !== '').map(([k, v]) => [h('dt', { key: `${k}-t` }, k), h('dd', { key: `${k}-d` }, v)]))

    // ---- 切换类。options 同 Select。
    /**
     * 几选一（两三个选项，像开关）：h(Seg, { value, onChange, options: ['近 7 天', '近 30 天'] })
     * 给结论上色（通过 / 要改）：options 里写 tone: 'success' | 'warn' | 'danger'，每项还能写 tip。
     * disabled 整组不能点（只禁用一项就在那一项里写 disabled: true）；stretch 占满一行、每项一样宽；label 是给读屏用的名字。
     */
    const Seg = ({ value, onChange, options = [], disabled, stretch, label }) => h('div', { className: cls('seg', stretch && 'seg-stretch'), role: 'group', 'aria-label': label }, norm(options).map(o => h('button', {
      key: o.value, type: 'button', 'aria-pressed': o.value === value, 'data-tone': o.tone, disabled: disabled || o.disabled, title: o.tip, onClick: () => onChange?.(o.value),
    }, o.label)))
    /** 页内标签（一页里分几块内容）：h(Tabs, { value, onChange, options }) */
    const Tabs = ({ value, onChange, options = [] }) => h('div', { className: cls('tabs'), role: 'tablist' }, norm(options).map(o => h('button', { key: o.value, type: 'button', role: 'tab', 'aria-selected': o.value === value, onClick: () => onChange?.(o.value) }, o.label)))
    /**
     * 步骤条。两种用法：
     *   简单：h(Steps, { steps: [{ key: 'a', label: '导入' }, …], current: 'b', onPick })
     *         current 之前的算做完，之后的算没到、不能点。
     *   每步自己带状态（做到第 5 步时可以回头看第 2 步）：
     *         steps: [{ key, label, state: 'todo' | 'doing' | 'done', note: '待审核', noteTone: 'warn', disabled, tip }]
     *         这时 current 只表示「正在看哪一步」。
     */
    function Steps({ steps, current, onPick, label }) {
      const explicit = steps.some(s => s.state)
      const at = steps.findIndex(s => s.key === current)
      const ref = useRef(null)
      // 步骤多、窗口窄时放不下：正在看的那一步自动滚到看得见的地方。
      useEffect(() => { ref.current?.querySelector('[aria-current=step]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' }) }, [current])
      return h('nav', { ref, className: cls('steps'), 'aria-label': label }, steps.map((s, i) => {
        const state = explicit ? s.state ?? 'todo' : i < at ? 'done' : i === at ? 'doing' : 'todo'
        const disabled = explicit ? s.disabled : state === 'todo' || !onPick
        return h('button', { key: s.key, type: 'button', className: cls('step'), 'data-state': state, 'aria-current': s.key === current ? 'step' : undefined, disabled, title: s.tip, onClick: () => onPick?.(s.key) },
          h('i', null, state === 'done' ? h(Icon, { name: 'check', size: 12 }) : i + 1), s.label, s.note ? h(Tag, { tone: s.noteTone }, s.note) : null)
      }))
    }

    // ---- 表格：h(Table, { columns: [{ key: 'title', title: '标题' }, { key: 'n', title: '数量', num: true, render: row => … }], rows, rowKey: 'id', onRowClick })
    //      没有行的时候显示 empty：可以是一句话，也可以是 h(Empty, …)。
    function Table({ columns, rows, rowKey = 'id', onRowClick, empty = '没有内容' }) {
      if (!rows?.length) return typeof empty === 'string' ? h('div', { className: cls('center') }, empty) : empty
      return h('div', { className: cls('table-wrap') }, h('table', { className: cls('table') },
        h('thead', null, h('tr', null, columns.map(col => h('th', { key: col.key, className: col.num ? cls('num') : undefined }, col.title)))),
        h('tbody', null, rows.map((row, i) => h('tr', { key: row[rowKey] ?? i, className: onRowClick ? cls('click') : undefined, onClick: onRowClick ? () => onRowClick(row) : undefined },
          columns.map(col => h('td', { key: col.key, className: col.num ? cls('num') : undefined }, col.render ? col.render(row) : row[col.key])))))))
    }

    // ---- 条形图：h(Bars, { rows: [{ label: '华东', value: 42 }, …], format: n => `${n} 人` })
    //      每行想用不同颜色就写 color: 1 到 9（图表配色里的第几种）。
    function Bars({ rows, format = n => String(n) }) {
      const max = Math.max(1, ...rows.map(r => r.value))
      return h('div', { className: cls('bars') }, rows.map(r => h('div', { key: r.label, className: cls('bars-row') },
        h('span', null, r.label), h('span', { className: cls('bars-track') }, h('span', { className: cls('bars-fill'), 'data-color': r.color, style: { width: `${(r.value / max) * 100}%`, background: r.color ? chart(r.color) : undefined } })), h('span', { className: cls('bars-value') }, format(r.value)))))
    }

    // ---- 图片和视频
    /**
     * 缩略图网格：h(Thumbs, { min: 180 }, h(Thumb, …), h(Thumb, …))，一格最窄 min 像素，自动排几列。
     * 一格：h(Thumb, { src, name: '文件名', meta: '1200×800 · 2 MB', badge: '参考图', onRemove, ratio: '4/3' }, 下面还想放的东西)
     * 不是图片就用 media 传内容；传 onClick 整张图可以点。
     */
    const Thumbs = ({ min, children }) => h('div', { className: cls('thumbs'), style: min ? { '--min': `${min}px` } : undefined }, children)
    function Thumb({ src, media, alt, ratio, name, meta, badge, onRemove, removing, onClick, children }) {
      const style = ratio ? { '--ratio': ratio } : undefined
      const pic = media ?? (src ? h('img', { src, alt: alt ?? (typeof name === 'string' ? name : ''), loading: 'lazy' }) : null)
      const tag = badge ? h('span', { className: cls('thumb-badge') }, badge) : null
      return h('figure', { className: cls('thumb') },
        onClick ? h('button', { type: 'button', className: cls('thumb-img', 'thumb-click'), style, onClick }, pic, tag)
          : h('div', { className: cls('thumb-img'), style }, pic, tag,
            onRemove ? h('button', { type: 'button', className: cls('thumb-x'), title: '删除', 'aria-label': '删除', disabled: removing, onClick: onRemove }, h(Icon, { name: 'x', size: 14 })) : null),
        h('figcaption', { className: cls('thumb-cap') },
          name ? h('div', { className: cls('thumb-name'), title: typeof name === 'string' ? name : undefined }, name) : null,
          meta ? h('div', { className: cls('faint') }, meta) : null, children))
    }
    /**
     * 大图舞台（深色底，看一张大图或一段视频，两边有上一个、下一个）：
     * h(Stage, { onPrev, onNext, badge: '新版本生成中…', caption: '生成的 v2', side: 左边对照的图, sideCaption: '参考图' }, h('img' 或 'video', …))
     * onPrev / onNext 不传就表示到头了。还没有内容时写 empty: '还没出图'，会在中间显示这句话。
     */
    function Stage({ onPrev, onNext, badge, caption, side, sideCaption, empty, children }) {
      return h('div', { className: cls('stage') },
        side ? h('figure', { className: cls('stage-fig') }, side, sideCaption ? h('figcaption', null, sideCaption) : null) : null,
        h('figure', { className: cls('stage-fig') }, children ?? (empty ? h('div', { className: cls('stage-empty') }, empty) : null), caption ? h('figcaption', null, caption) : null),
        badge ? h('div', { className: cls('stage-badge') }, badge) : null,
        h('button', { type: 'button', className: cls('stage-nav', 'stage-prev'), disabled: !onPrev, onClick: onPrev, 'aria-label': '上一个' }, h(Icon, { name: 'left', size: 20 })),
        h('button', { type: 'button', className: cls('stage-nav', 'stage-next'), disabled: !onNext, onClick: onNext, 'aria-label': '下一个' }, h(Icon, { name: 'right', size: 20 })))
    }
    /** 缩略条（舞台下面一排小图，点哪个看哪个）：h(Strip, { current, onPick, items: [{ key, thumb: h('img', …), label: '1' }] }) */
    const Strip = ({ items, current, onPick }) => h('div', { className: cls('strip'), style: { '--n': items.length } }, items.map(it => h('button', {
      key: it.key, type: 'button', className: cls('strip-cell'), 'aria-current': it.key === current, onClick: () => onPick?.(it.key),
    }, h('span', { className: cls('strip-thumb') }, it.thumb), h('span', { className: cls('strip-label') }, it.label))))

    // ---- 弹窗和抽屉：都画在插件自己的页面里（不盖住 DSH 别的地方），按 Esc 或点外面关掉。
    function useDismiss(onClose) {
      const ref = useRef(null)
      useEffect(() => {
        const before = document.activeElement
        // 里面已经有输入框拿到焦点（autoFocus）就不抢。
        if (!ref.current?.contains(document.activeElement)) ref.current?.focus()
        return () => before?.focus?.()
      }, [])
      const onKeyDown = e => { if (e.key === 'Escape') { e.stopPropagation(); onClose?.() } }
      return { ref, onKeyDown, tabIndex: -1 }
    }
    /** 弹窗：h(Modal, { title: '新增事项', onClose, width: 440, footer: [取消按钮, 确定按钮] }, 表单…)。内容太长时标题和底下的按钮不动，中间自己滚动。 */
    function Modal({ title, onClose, footer, width, children }) {
      const dismiss = useDismiss(onClose)
      return h('div', { className: cls('mask'), onClick: onClose },
        h('div', { className: cls('modal'), role: 'dialog', 'aria-modal': true, 'aria-label': title, style: width ? { '--w': `${width}px` } : undefined, onClick: e => e.stopPropagation(), ...dismiss },
          h('div', { className: cls('modal-head') }, h('h2', { className: cls('modal-title') }, title), h(Btn, { kind: 'ghost', sm: true, icon: 'x', label: '关闭', onClick: onClose })),
          h('div', { className: cls('modal-body') }, children),
          footer ? h('div', { className: cls('modal-foot') }, footer) : null))
    }
    /**
     * 抽屉（从右边出来，看一条的详情）：h(Drawer, { title: '详情', onClose, width: 420 }, 内容…)
     * 头部想放头像、两行字、一排标签时写 head: 你的内容（title 仍然要写，给读屏用）。
     */
    function Drawer({ title, head, onClose, width = 420, children }) {
      const dismiss = useDismiss(onClose)
      return h(Fragment, null,
        h('div', { className: cls('drawer-mask'), onClick: onClose }),
        h('aside', { className: cls('drawer'), role: 'dialog', 'aria-label': title, style: { '--w': `${width}px` }, ...dismiss },
          h('div', { className: cls('drawer-head', head && 'drawer-head-own') }, head ? h('div', { className: cls('grow') }, head) : h('h2', { className: cls('modal-title') }, title), h(Btn, { kind: 'ghost', sm: true, icon: 'x', label: '关闭', onClick: onClose })),
          h('div', { className: cls('drawer-body') }, children)))
    }

    /**
     * 下拉菜单（一个按钮，点开一列可选的；自己管开关，点别处、按 Esc 会关）：
     *   h(Menu, { label: '更多操作', items: [
     *     { key: 'copy', label: '复制', icon: 'copy', onClick: 复制 },
     *     { sep: true },                                                      // 分隔线
     *     { key: 'del', label: '删除', icon: 'trash', danger: true, onClick: 删除 },
     *   ] })
     * 当切换器用（显示现在是哪个，点开换一个）：
     *   h(Menu, { icon: 'folder', label: '高意向客户', sub: '30 位客户', block: true, items: 列表.map(x => ({ key: x.id, label: x.name, note: '第二行小字', current: x.id === 现在的, onClick: () => 切到(x.id) })) })
     * 按钮的样子：kind、sm、block 同 Btn；不写 label 只写 icon 就是一个图标按钮（这时 tip 必须写）；align: 'right' 让菜单靠右对齐；width 定菜单宽度。
     * 每一项还能写 disabled、tip；{ title: '小标题' } 是一行不能点的分组名。
     */
    function Menu({ label, sub, icon, tip, kind = 'default', sm, block, align = 'left', width, disabled, items = [] }) {
      const [open, setOpen] = useState(false)
      const boxRef = useRef(null)
      const btnRef = useRef(null)
      const panelRef = useRef(null)
      const close = useCallback(refocus => { setOpen(false); if (refocus) btnRef.current?.focus() }, [])
      // 菜单画在最近的外框里（不会被导航、卡片裁掉），位置按按钮算：下面放不下就放到上面。
      useLayoutEffect(() => {
        if (!open) return undefined
        const panel = panelRef.current
        const host = panel.offsetParent ?? panel.parentElement
        const b = btnRef.current.getBoundingClientRect()
        const r = host.getBoundingClientRect()
        panel.style.minWidth = `${Math.min(b.width, r.width - 16)}px`
        const w = panel.offsetWidth
        const ph = panel.offsetHeight
        const left = Math.max(8, Math.min((align === 'right' ? b.right - w : b.left) - r.left, r.width - w - 8))
        const below = b.bottom - r.top + 6
        const above = b.top - r.top - 6 - ph
        panel.style.left = `${left + host.scrollLeft}px`
        panel.style.top = `${(below + ph > r.height - 8 && above >= 8 ? above : below) + host.scrollTop}px`
        panel.style.visibility = 'visible'
        ;(panel.querySelector('[aria-current=true]') ?? panel.querySelector('button:not(:disabled)'))?.focus({ preventScroll: true })
        const outside = e => { if (!boxRef.current?.contains(e.target)) close() }
        const scrolled = e => { if (!panel.contains(e.target)) close() }
        const resized = () => close()
        document.addEventListener('pointerdown', outside, true)
        document.addEventListener('scroll', scrolled, true)
        window.addEventListener('resize', resized)
        return () => { document.removeEventListener('pointerdown', outside, true); document.removeEventListener('scroll', scrolled, true); window.removeEventListener('resize', resized) }
      }, [open, align, close])
      const onKeyDown = e => {
        if (!open) return
        if (e.key === 'Escape') { e.stopPropagation(); close(true); return }
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
        e.preventDefault()
        const list = [...panelRef.current.querySelectorAll('button:not(:disabled)')]
        const at = list.indexOf(document.activeElement)
        list[(at + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length]?.focus()
      }
      const iconOnly = icon && (label === undefined || label === null)
      return h('span', { ref: boxRef, className: cls('menu', block && 'menu-block'), onKeyDown },
        h('button', { ref: btnRef, type: 'button', className: cls('btn', `btn-${kind}`, sm && 'btn-sm', block && 'btn-block', iconOnly && 'btn-icon', 'menu-btn', sub && 'menu-btn-2'), disabled, title: tip, 'aria-label': iconOnly ? tip : undefined, 'aria-haspopup': 'menu', 'aria-expanded': open, onClick: () => setOpen(!open) },
          icon ? h(Icon, { name: icon, size: sub ? 18 : sm ? 14 : 16 }) : null,
          iconOnly ? null : h('span', { className: cls('menu-text') }, h('b', null, label), sub ? h('small', null, sub) : null),
          iconOnly ? null : h('span', { className: cls('menu-caret') }, h(Icon, { name: 'down', size: 14 }))),
        open ? h('div', { ref: panelRef, className: cls('menu-panel'), role: 'menu', tabIndex: -1, style: width ? { '--w': `${width}px` } : undefined }, items.filter(Boolean).map((it, i) => it.sep ? h('div', { key: `s${i}`, className: cls('menu-sep'), role: 'separator' })
          : it.title ? h('div', { key: `t${i}`, className: cls('menu-title') }, it.title)
            : h('button', { key: it.key ?? i, type: 'button', role: 'menuitem', className: cls('menu-item'), 'aria-current': it.current ? 'true' : undefined, 'data-danger': it.danger || undefined, disabled: it.disabled, title: it.tip, onClick: () => { close(true); it.onClick?.() } },
              it.icon ? h(Icon, { name: it.icon }) : null,
              h('span', { className: cls('menu-item-text') }, h('span', null, it.label), it.note ? h('small', null, it.note) : null),
              it.current ? h(Icon, { name: 'check', size: 14 }) : null))) : null)
    }

    /**
     * 右边能拉宽的一栏（放对话、放说明）。交给 Shell 的 side：
     *   h(SidePane, { title: 'AI 助手', sub: '只看得到统计', tools: [关闭按钮], width: 380, min: 320, max: 640 }, 这一栏的内容)
     * 用户拖左边那条边可以改宽度（最宽占到一半）。想记住宽度就传 width 和 onResize: 宽度 => 记下来；不传 onResize 它自己记（关掉再开会回到 width）。
     * 窗口窄的时候它会盖在页面上面，所以 tools 里要放一个能关掉它的按钮。
     */
    function SidePane({ width = 380, min = 320, max = 640, onResize, title, sub, tools, label, children }) {
      const [own, setOwn] = useState(width)
      const [drag, setDrag] = useState(null)
      const from = useRef(null)
      const base = onResize ? width : own
      const clamp = w => Math.min(max, Math.max(min, Math.round(w)))
      const commit = w => { setDrag(null); if (onResize) onResize(w); else setOwn(w) }
      const at = e => clamp(from.current.w + from.current.x - e.clientX)
      return h('aside', { className: cls('pane'), 'data-drag': drag !== null, 'aria-label': label ?? (typeof title === 'string' ? title : undefined), style: { '--w': `${drag ?? base}px` } },
        h('div', {
          className: cls('pane-grip'), role: 'separator', tabIndex: 0, title: '拖动调整宽度（也可以按左右方向键）', 'aria-label': '调整宽度', 'aria-orientation': 'vertical', 'aria-valuenow': drag ?? base, 'aria-valuemin': min, 'aria-valuemax': max,
          onPointerDown: e => { e.preventDefault(); try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* 抓不住指针也能拖，只是鼠标要留在这条边上 */ } from.current = { x: e.clientX, w: base }; setDrag(base) },
          onPointerMove: e => { if (from.current) setDrag(at(e)) },
          onPointerUp: e => { if (!from.current) return; const w = at(e); from.current = null; commit(w) },
          onPointerCancel: () => { from.current = null; setDrag(null) },
          onKeyDown: e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); commit(clamp(base + (e.key === 'ArrowLeft' ? 24 : -24))) } },
        }),
        title || tools ? h('div', { className: cls('pane-head') }, h('div', { className: cls('pane-title') }, h('b', null, title), sub ? h('small', null, sub) : null), tools) : null,
        h('div', { className: cls('pane-body') }, children))
    }

    // ---- 三种「跟用户说一声」，都不用自己管开关，写一行就行：
    //        toast('已保存')                                  → 底部一条小字，几秒后自己消失。成功、顺手的事用它。
    //        notify('没做成：Key 没填', { tone, action })      → 右下角一张卡，停得久、能关、能带一个按钮。出错和要用户处理的事用它。
    //        await ask({ title, text, ok })                   → 弹窗问一句，等用户点了再往下走。删除、花钱之前用它。
    function makeStore(initial) {
      let state = initial
      const listeners = new Set()
      return {
        get: () => state,
        set(next) { state = typeof next === 'function' ? next(state) : next; listeners.forEach(fn => fn()) },
        subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn) },
      }
    }
    const useStore = store => useSyncExternalStore(store.subscribe, store.get)

    const toasts = makeStore([])
    let seq = 0
    function toast(text, ms = 3000) {
      const id = ++seq
      toasts.set(list => [...list, { id, text }])
      setTimeout(() => toasts.set(list => list.filter(x => x.id !== id)), ms)
    }
    const Toasts = () => h('div', { className: cls('toasts'), role: 'status' }, useStore(toasts).map(x => h('div', { key: x.id, className: cls('toast') }, x.text)))

    /** tone: 'danger'（默认，停 9 秒）| 'warn' | 'success'（停 6 秒）；action: { label: '打开设置', onClick }；ms 自己定停多久。 */
    const notices = makeStore([])
    const dropNotice = id => notices.set(list => list.filter(x => x.id !== id))
    function notify(text, { tone = 'danger', action, ms } = {}) {
      const id = ++seq
      notices.set(list => [...list, { id, text, tone, action }])
      setTimeout(() => dropNotice(id), ms ?? (tone === 'danger' ? 9000 : 6000))
    }
    function Notices() {
      const list = useStore(notices)
      if (!list.length) return null
      return h('div', { className: cls('notices') }, list.map(x => h('div', { key: x.id, className: cls('notice'), 'data-tone': x.tone, role: x.tone === 'danger' ? 'alert' : 'status' },
        h(Icon, { name: x.tone === 'success' ? 'check' : 'warn' }), h('span', { className: cls('grow') }, x.text),
        x.action ? h(Btn, { sm: true, onClick: () => { x.action.onClick(); dropNotice(x.id) } }, x.action.label) : null,
        h(Btn, { kind: 'ghost', sm: true, icon: 'x', label: '关闭', onClick: () => dropNotice(x.id) }))))
    }

    /**
     * 问一句再做：
     *   if (!(await ask({ title: '删除这一条？', text: '删了找不回来。', ok: '删除', danger: true }))) return     → 确定是 true，取消是 false
     *   const name = await ask({ title: '新建项目', text: '叫什么？', input: { placeholder: '…', value: '默认值' } })   → 返回填的字，取消是 null
     */
    const asks = makeStore(null)
    function ask({ title, text, input, ok = '确定', cancel = '取消', danger = false }) {
      return new Promise(resolve => asks.set({ title, text, input, ok, cancel, danger, resolve }))
    }
    function AskHost() {
      const dialog = useStore(asks)
      const [value, setValue] = useState('')
      useEffect(() => { setValue(dialog?.input?.value ?? '') }, [dialog])
      if (!dialog) return null
      const close = result => { asks.set(null); dialog.resolve(result) }
      const yes = () => close(dialog.input ? value : true)
      const no = () => close(dialog.input ? null : false)
      return h(Modal, { title: dialog.title ?? '确认', onClose: no, footer: [h(Btn, { key: 'no', onClick: no }, dialog.cancel), h(Btn, { key: 'ok', kind: dialog.danger ? 'danger' : 'primary', onClick: yes }, dialog.ok)] },
        dialog.text ? h('p', { className: cls('modal-text') }, dialog.text) : null,
        dialog.input ? h(Input, { value, onChange: setValue, placeholder: dialog.input.placeholder ?? '', autoFocus: true, onKeyDown: e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) yes() } }) : null)
    }

    // ---- 页面骨架。两种外框任选一种，里面都已经带好 toast / notify / ask 的显示位置。
    /**
     * 最外层的框。一般不直接用，用下面的 Shell；要「顶栏 + 左右分栏」这种布局时用它：h(Root, null, h(TopBar, …), h(Split, …))
     * 要加自己的类名、或者接住整个页面的点击，写 className、onClick。
     */
    /**
     * 插件外框以外的地方（比如画在 DSH 对话区里的卡片）也想用「外观」段的颜色和底座的组件，就在最外面包一层：
     * h(Embed, null, h(Card, { title: '名单已生成' }, …))
     */
    const Embed = ({ className, children }) => h('div', { className: [cls('embed'), className].filter(Boolean).join(' ') }, children)
    const Root = ({ className, onClick, theme, children }) => h('div', { className: [cls('root'), className].filter(Boolean).join(' '), onClick, 'data-theme': theme, style: theme ? { colorScheme: theme } : undefined }, children, h(Toasts), h(Notices), h(AskHost))
    /**
     * 外框一：左边一列导航，右边是当前页面（页面自己滚动）。
     * h(Shell, { title: '我的插件', nav: [{ key: 'home', label: '首页', icon: 'home', badge: 3 }], current, onNav }, 当前页面)
     * 只有一个页面时不传 nav，就没有左边那一列。
     *
     * 导航里的一项还能写：badgeTone: 'danger'（数字变红）、tip（鼠标停上去的说明）、
     *                    locked: true（变淡带一把锁；点了照样会调 onNav，由你决定显示什么）。
     * 导航分组：在 nav 里插一行 { group: '工作台' }，它后面的几项就归这一组。
     * 另外四个位置（都可以不写）：
     *   navHead  导航上方，放切换器（Menu）或几个小数字
     *   navFoot  导航底部，放一个按钮和一句说明。窄的时候导航缩成一列图标，这里的按钮要带 icon，文字说明用 h('p', …)
     *   top      页面上方的顶栏，放 h(TopBar, { tools: […] }, h(SearchBox, …))
     *   side     最右边的一栏，放 h(SidePane, …)，不显示时传 null
     */
    function Shell({ title, nav, current, onNav, navHead, navFoot, top, side, children }) {
      const items = nav?.filter(Boolean) ?? []
      return h(Root, null, h('div', { className: cls('shell') },
        items.length || navHead || navFoot ? h('nav', { className: cls('nav'), 'aria-label': title },
          title ? h('div', { className: cls('nav-title') }, title) : null,
          navHead ? h('div', { className: cls('nav-head') }, navHead) : null,
          h('div', { className: cls('nav-list') }, items.map((item, i) => item.group
            ? h('div', { key: `g${i}`, className: cls('nav-group') }, item.group)
            : h('button', { key: item.key, type: 'button', className: cls('nav-item'), 'aria-current': item.key === current ? 'page' : undefined, 'data-locked': item.locked || undefined, title: item.tip ?? item.label, onClick: () => onNav?.(item.key) },
              h(Icon, { name: item.icon ?? 'file', size: 18 }), h('span', { className: cls('nav-label') }, item.label),
              item.badge ? h('span', { className: cls('nav-badge', item.badgeTone === 'danger' && 'nav-badge-danger') }, item.badge) : null,
              item.locked ? h('span', { className: cls('nav-lock') }, h(Icon, { name: 'lock', size: 14 })) : null))),
          navFoot ? h('div', { className: cls('nav-foot') }, navFoot) : null) : null,
        h('div', { className: cls('main') }, top, h('div', { className: cls('scroll') }, children)),
        side))
    }
    /**
     * 外框二的上半：顶栏（左边图标和名字，中间放选择器、步骤条，右边放小工具；窄了自动变两行）。
     * h(TopBar, { icon: 'film', title: '宣传片工坊', tools: [花费, 设置按钮] }, 中间的内容…)
     * 放在 Shell 的 top 里时一般不写 icon 和 title（名字已经在导航上了）。
     */
    const TopBar = ({ icon, title, tools, children }) => h('header', { className: cls('bar') },
      icon || title ? h('div', { className: cls('bar-title') }, icon ? h(Icon, { name: icon, size: 18 }) : null, title) : null,
      h('div', { className: cls('bar-body') }, children),
      tools ? h('div', { className: cls('bar-tools') }, tools) : null)
    /**
     * 外框二的下半：左右分栏（左边一栏固定宽，比如对话；右边是工作区，自己滚动；窄的时候变成上下）。
     * h(Split, { sideTitle: '助手', sideAction: h(Btn, …), side: 左边的内容, mainKey: 当前页面的名字 }, 右边的内容)
     * mainKey 变了（换了页面），右边会回到顶部。
     */
    const Split = ({ side, sideTitle, sideAction, mainKey, children }) => h('div', { className: cls('split') },
      h('aside', { className: cls('split-side'), 'aria-label': sideTitle },
        sideTitle || sideAction ? h('div', { className: cls('split-head') }, h('span', { className: cls('grow') }, sideTitle), sideAction) : null,
        h('div', { className: cls('split-body') }, side)),
      h('main', { key: mainKey, className: cls('split-main') }, children))
    /**
     * 一个页面：上面是标题、一句说明和右上角的按钮，下面放内容。
     * crumb 是标题上方的一行小字（比如「名单 / 第 3 批」）。默认最宽 1080，表格多的页面写 width: 1280，要铺满写 wide: true。
     */
    const Page = ({ title, sub, crumb, actions, wide, width, children }) => h('div', { className: cls('page', wide && 'page-wide'), style: width && !wide ? { maxWidth: width } : undefined },
      title ? h('header', { className: cls('head') }, h('div', { className: cls('head-text') }, crumb ? h('p', { className: cls('crumb') }, crumb) : null, h('h1', { className: cls('h1') }, title), sub ? h('p', { className: cls('sub') }, sub) : null), actions ? h(Row, null, actions) : null) : null,
      children)

    // ---- 调后台和取数据
    /**
     * 调后台：await api('list') 或 await api('add', { title: '…' })。失败会抛错，错误的 message 可以直接给用户看。
     * 它在第 4 段挂载时接上 index.js 里的 ROUTE。后台地址或协议不一样的插件，在第 4 段把 api 换成自己的函数就行。
     */
    let api = async () => { throw new Error('页面还没接上后台') }
    /**
     * 取数据并管好「加载中 / 出错 / 有数据」三种情况：
     *   const items = useData(() => api('list'), [])
     *   items.loading / items.error / items.data / items.reload()
     */
    function useData(load, deps) {
      const [state, setState] = useState({ loading: true, error: null, data: null })
      const [tick, setTick] = useState(0)
      useEffect(() => {
        let alive = true
        setState(s => ({ ...s, loading: true, error: null }))
        load().then(data => alive && setState({ loading: false, error: null, data }), error => alive && setState(s => ({ ...s, loading: false, error })))
        return () => { alive = false }
      }, [...deps, tick])
      const reload = useCallback(() => setTick(n => n + 1), [])
      return { ...state, reload }
    }
    /**
     * 做一件会改数据的事，并管好「正在做 / 出错」：
     *   const { busy, error, run } = useAction()
     *   run(async () => { await api('add', { title }); toast('已新增'); items.reload() })
     * 按钮上写 busy，出错的话 error.message 可以直接显示，或者 notify(error.message)。
     */
    function useAction() {
      const [busy, setBusy] = useState(false)
      const [error, setError] = useState(null)
      const run = useCallback(async fn => {
        setBusy(true); setError(null)
        try { return await fn() } catch (e) { setError(e); return undefined } finally { setBusy(false) }
      }, [])
      return { busy, error, run }
    }

    // ================================================================== 2b. 底座里还没有、自媒体自己补的通用组件
    //
    // 规矩和底座一样：颜色、圆角都从第 1 段「外观」的变量里取（var(--$-soft)、var(--$-r-md) 这类），不写色值；类名写 $-xxx（会换成前缀）。
    // 标了 [底座候选] 的，别的插件也用得上，以后可以收进底座。
    // 图表的颜色从外观段的图表配色里取：样式里写 var(--$-chart-1)，代码里写 chart(1)。

    /** 这个插件自己的样式都攒在这里；第 4 段挂载时和外观、底座的样式拼在一起放进页面。 */
    let PAGE_STYLES = ''
    /** 加一段样式：addStyles(`.$-xxx{…}`)。哪一块页面的样式，就写在那一块页面的代码上面。 */
    const addStyles = css => { PAGE_STYLES += css }

    // ---- 多加的图标（24×24 画布，描边），用法还是 h(Icon, { name: 'more' })
    Object.assign(ICONS, {
      globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9s1.3-6.5 3.8-9z',
      out: 'M8 7h9v9M17 7 7 17',
      shrink: 'M3 5h18v14H3zM12 12h7v5h-7z',
      expand: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
      sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5',
      users: 'M9 5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM2.5 20c.8-3.5 3.2-5 6.5-5s5.7 1.5 6.5 5M16 5.2a3.5 3.5 0 0 1 0 6.6M18.5 15.5c1.7.7 2.7 2.2 3 4.5',
      gauge: 'M4 18a9 9 0 1 1 16 0M12 14l4-5',
    })

    addStyles(`
.$-link{display:inline-flex;align-items:center;gap:2px;padding:0;border:0;background:none;color:var(--$-accent);font:inherit;font-size:13px;line-height:20px;text-decoration:none;cursor:pointer}
.$-plain{padding:0;border:0;background:none;color:inherit;font:inherit;text-align:left;cursor:pointer}
.$-line{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;margin:0;color:var(--$-text-2);font-size:13px;line-height:20px}
.$-list{display:flex;flex-direction:column;margin:0;padding:0;list-style:none}
.$-item{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;padding:10px 0;border-top:.5px solid var(--$-line)}
.$-item:first-child{border-top:0;padding-top:0}
.$-item:last-child{padding-bottom:0}
.$-item-main{flex:1 1 240px;min-width:0;display:flex;flex-direction:column;gap:2px}
.$-item-title{font-size:14px;line-height:22px;font-weight:500;overflow-wrap:anywhere}
.$-two{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;align-items:start}
.$-clip{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.$-tnum{font-variant-numeric:tabular-nums;white-space:nowrap}
.$-up{color:var(--$-success)}
.$-down{color:var(--$-danger)}
.$-ul{display:flex;flex-direction:column;gap:4px;margin:0;padding-left:18px;font-size:13px;line-height:20px}
.$-box{padding:10px 12px;border-radius:var(--$-r-md);background:var(--$-soft);color:var(--$-text-2);font-size:12px;line-height:18px}
.$-box p{margin:2px 0 0;color:var(--$-text);font-size:14px;line-height:22px}
.$-strong{color:var(--$-text);font-weight:500}
.$-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.$-cover{flex:none;width:44px;height:58px;border-radius:var(--$-r-sm);object-fit:cover;background:var(--$-soft)}
.$-spark{flex:none;width:96px;height:28px;fill:none;stroke:var(--$-chart-1);stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
.$-chart{position:relative;margin:0;min-width:0}
.$-chart svg{display:block;width:100%}
.$-chart-grid{stroke:var(--$-line);stroke-width:1}
.$-chart-zero{stroke:var(--$-line-2);stroke-width:1}
.$-chart-guide{stroke:var(--$-line-2);stroke-width:1;stroke-dasharray:3 3}
.$-chart-axis{fill:var(--$-text-3);font-size:11px}
.$-chart-area{fill:var(--$-chart-1);opacity:.08}
.$-chart-line{fill:none;stroke:var(--$-chart-1);stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.$-chart-dot{fill:var(--$-bg);stroke:var(--$-chart-1);stroke-width:1.5}
.$-chart-dot[data-on=true]{fill:var(--$-chart-1)}
.$-chart-bar{fill:var(--$-chart-1);opacity:.65}
.$-chart-bar[data-neg=true]{fill:var(--$-chart-5)}
.$-chart-bar[data-on=true]{opacity:1}
.$-chart-hit{fill:transparent}
.$-chart-tip{position:absolute;top:0;left:var(--tip-left,50%);z-index:2;display:flex;flex-direction:column;gap:2px;max-width:260px;padding:6px 10px;border-radius:var(--$-r-md);background:var(--$-raised);box-shadow:var(--$-shadow-2);color:var(--$-text-2);font-size:12px;line-height:18px;white-space:nowrap;transform:translateX(-50%);pointer-events:none}
.$-chart-tip b{overflow:hidden;color:var(--$-text);font-size:13px;font-weight:500;text-overflow:ellipsis}
.$-chart-ends{display:flex;justify-content:space-between;color:var(--$-text-3);font-size:11px;line-height:16px}
.$-chart-empty{display:flex;align-items:center;justify-content:center;min-height:160px;color:var(--$-text-3);font-size:13px}
@media (hover:hover){
.$-link:hover,.$-plain:hover{text-decoration:underline}
}
@container $-shell (max-width:900px){
.$-two{grid-template-columns:minmax(0,1fr)}
}
`)

    /** [底座候选] 一句小字前面带转圈，表示「后台正在做，要等一会儿」：h(Working, null, '正在生成选题…') */
    const Working = ({ children }) => h('p', { className: cls('line'), role: 'status' }, h(Spin, { sm: true }), children)

    /** [底座候选] 长得像链接的按钮：h(LinkBtn, { onClick }, '查看全部')；传 href 就是真的链接，在新窗口打开。 */
    const LinkBtn = ({ onClick, href, icon, children, ...rest }) => href
      ? h('a', { className: cls('link'), href, target: '_blank', rel: 'noreferrer', ...rest }, children, icon ? h(Icon, { name: icon, size: 12 }) : null)
      : h('button', { type: 'button', className: cls('link'), onClick, ...rest }, children, icon ? h(Icon, { name: icon, size: 12 }) : null)

    /** [底座候选] 封面小图；地址没有或者加载失败时，显示一块灰底。 */
    function Cover({ url }) {
      const [failed, setFailed] = useState(false)
      if (!url || failed) return h('span', { className: cls('cover'), 'aria-hidden': true })
      // 平台的图片服务器会查来源；不带来源去取，和直接打开图片一样。
      return h('img', { className: cls('cover'), src: url, alt: '', loading: 'lazy', referrerPolicy: 'no-referrer', onError: () => setFailed(true) })
    }

    /** [底座候选] 复制一段字：const { copied, copy } = useCopy(text)；copied 会亮两秒。 */
    function useCopy(text) {
      const [copied, setCopied] = useState(false)
      const copy = () => { navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }, () => {}) }
      return { copied, copy }
    }

    /** [底座候选] 量一个元素现在多宽（图表要按宽度画）：const [ref, width] = useWidth() */
    function useWidth(fallback = 640) {
      const ref = useRef(null)
      const [width, setWidth] = useState(fallback)
      useEffect(() => {
        if (!ref.current || typeof ResizeObserver === 'undefined') return undefined
        const observer = new ResizeObserver(entries => { const next = entries[0]?.contentRect.width; if (next > 0) setWidth(Math.round(next)) })
        observer.observe(ref.current)
        return () => observer.disconnect()
      }, [])
      return [ref, width]
    }

    /** [底座候选] 迷你折线（放在数字旁边看走势）：h(Spark, { points: [{ day: '2026-11-01', value: 12 }, …] }) */
    function Spark({ points }) {
      const first = points[0]
      const last = points.at(-1)
      if (points.length < 2 || !first || !last) return null
      const width = 96
      const height = 28
      const values = points.map(p => p.value)
      const min = Math.min(...values)
      const max = Math.max(...values)
      const span = Math.max(1, dayOffset(first.day, last.day))
      const d = points.map((p, i) => {
        const x = (dayOffset(first.day, p.day) / span) * width
        const y = max === min ? height / 2 : 2 + (1 - (p.value - min) / (max - min)) * (height - 4)
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`
      }).join(' ')
      return h('svg', { className: cls('spark'), viewBox: `0 0 ${width} ${height}`, preserveAspectRatio: 'none', 'aria-hidden': true }, h('path', { d, vectorEffect: 'non-scaling-stroke' }))
    }

    /**
     * [底座候选] 按天的趋势图。kind: 'total' 画折线（累计值，比如粉丝数），'daily' 画柱子（每天的量，比如播放）。
     *   h(DayChart, { points: [{ day, value }], kind: 'total', copy: { label: '读屏用的名字', metric: '粉丝', empty: '还没有数据', change: 差值 => `较前一天 ${差值}` } })
     * 鼠标移上去或按左右键，看某一天的数。
     */
    function DayChart({ points, kind, copy }) {
      const [ref, width] = useWidth()
      const [active, setActive] = useState(undefined)
      const first = points[0]
      const last = points.at(-1)
      if (!first || !last) return h('div', { className: cls('chart-empty') }, copy.empty)
      const HEIGHT = 220
      const TOP = 12
      const BOTTOM = 26
      const RIGHT = 8
      const scale = niceScale(points.map(p => p.value), kind)
      const labels = scale.ticks.map(formatCount)
      const left = Math.max(28, Math.max(...labels.map(l => l.length)) * 7 + 10)
      const plotW = Math.max(1, width - left - RIGHT)
      const plotH = HEIGHT - TOP - BOTTOM
      const span = Math.max(1, dayOffset(first.day, last.day))
      // 柱子一天占一格；折线从最左画到最右。
      const slot = kind === 'daily' ? plotW / (span + 1) : plotW / span
      const xOf = day => left + (kind === 'daily' ? (dayOffset(first.day, day) + 0.5) * slot : dayOffset(first.day, day) * slot)
      const yOf = value => TOP + (1 - (value - scale.lo) / (scale.hi - scale.lo)) * plotH
      const zeroY = yOf(Math.max(scale.lo, Math.min(scale.hi, 0)))
      const xs = points.map(p => xOf(p.day))
      const barW = Math.max(2, Math.min(28, slot * 0.62))
      const step = Math.max(1, Math.ceil(points.length / 7))
      const lastIndex = points.length - 1
      const axis = points.map((point, index) => ({ point, index }))
        .filter(({ index }) => index % step === 0 || index === lastIndex)
        // 最后一天一定留着；它前面那个如果挨得太近就不画。
        .filter(({ index }, pos, list) => index === lastIndex || pos !== list.length - 2 || lastIndex - index >= step / 2 + 0.5)
      const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xs[i]} ${yOf(p.value)}`).join(' ')
      const area = `${line} L${xs.at(-1)} ${TOP + plotH} L${xs[0]} ${TOP + plotH} Z`
      const nearest = (clientX, target) => {
        const box = target.getBoundingClientRect()
        const x = ((clientX - box.left) / Math.max(1, box.width)) * width
        let best = 0
        for (let i = 1; i < xs.length; i++) if (Math.abs(xs[i] - x) < Math.abs(xs[best] - x)) best = i
        return best
      }
      const onKeyDown = e => {
        const move = { ArrowLeft: i => Math.max(0, i - 1), ArrowRight: i => Math.min(lastIndex, i + 1), Home: () => 0, End: () => lastIndex }[e.key]
        if (!move) return
        e.preventDefault()
        setActive(i => move(i ?? lastIndex))
      }
      const shown = active === undefined ? undefined : points[active]
      const before = active ? points[active - 1] : undefined
      const shownX = active === undefined ? 0 : xs[active]
      return h('figure', { className: cls('chart'), ref },
        h('svg', { width, height: HEIGHT, viewBox: `0 0 ${width} ${HEIGHT}`, role: 'img', 'aria-label': copy.label, tabIndex: 0, onPointerMove: e => setActive(nearest(e.clientX, e.currentTarget)), onPointerLeave: () => setActive(undefined), onBlur: () => setActive(undefined), onKeyDown },
          scale.ticks.map((tick, i) => h('g', { key: tick },
            h('line', { className: cls('chart-grid'), x1: left, x2: width - RIGHT, y1: yOf(tick), y2: yOf(tick) }),
            h('text', { className: cls('chart-axis'), x: left - 8, y: yOf(tick), textAnchor: 'end', dominantBaseline: 'middle' }, labels[i]))),
          kind === 'daily' && scale.lo < 0 ? h('line', { className: cls('chart-zero'), x1: left, x2: width - RIGHT, y1: zeroY, y2: zeroY }) : null,
          kind === 'total'
            ? h(Fragment, null,
              h('path', { className: cls('chart-area'), d: area }),
              h('path', { className: cls('chart-line'), d: line }),
              points.length <= 45 ? points.map((p, i) => h('circle', { key: p.day, className: cls('chart-dot'), 'data-on': active === i, cx: xs[i], cy: yOf(p.value), r: active === i ? 4 : 2.5 })) : null)
            : points.map((p, i) => {
              const y = yOf(p.value)
              return h('rect', { key: p.day, className: cls('chart-bar'), 'data-neg': p.value < 0, 'data-on': active === i, x: xs[i] - barW / 2, y: Math.min(y, zeroY), width: barW, height: Math.max(p.value === 0 ? 0 : 1, Math.abs(zeroY - y)), rx: Math.min(3, barW / 4) })
            }),
          shown ? h('line', { className: cls('chart-guide'), x1: shownX, x2: shownX, y1: TOP, y2: TOP + plotH }) : null,
          axis.map(({ point, index }) => h('text', { key: point.day, className: cls('chart-axis'), x: xs[index], y: HEIGHT - 8, textAnchor: kind === 'total' && points.length > 1 && index === 0 ? 'start' : kind === 'total' && index === lastIndex ? 'end' : 'middle' }, formatAxisDay(point.day)))),
        shown ? h('div', { className: cls('chart-tip'), style: { '--tip-left': `${Math.min(Math.max(shownX, 80), width - 80)}px` }, 'aria-hidden': true },
          h('span', null, formatDay(shown.day)),
          h('b', null, copy.metric, ' ', formatCount(shown.value)),
          kind === 'total' && before && dayOffset(before.day, shown.day) === 1 ? h('span', null, copy.change(formatDelta(shown.value - before.value) ?? '0')) : null) : null,
        shown ? h('span', { className: cls('sr'), role: 'status' }, `${formatDay(shown.day)} ${copy.metric} ${formatCount(shown.value)}`) : null)
    }


    // ================================================================== 3. 自媒体的页面
    //
    // 这一段分几块：3.1 调后台  3.2 数据怎么算、怎么存（没有界面）  3.3 各页共用的小块
    //              3.8 登录用的小浏览器  3V 看板（左边一列、总览、账号看板、作品弹窗、AI 助手、整个页面）  3.11 文案

    // ---- 3.1 调后台
    //
    // 自媒体的后台在同一个包里（lib/index.js，id: media-suite），这里直接调它的接口：
    //   const result = await remote.overview(账号id, 30)
    //   result 是 { ok: true, value } 或 { ok: false, error: { code, message } }，不会抛错，所以每次都要看 ok。
    // 后台有哪些接口、每个接口的参数叫什么，都列在下面的 METHODS 里（名字要和后台方法的参数名一样）。

    /** 真正发请求的函数，第 4 段挂载时接上。 */
    let rpc = async () => ({ ok: false, error: { code: 'transport', message: '' } })
    const METHODS = {
      // 账号
      platforms: [], accounts: [], saveAccount: ['draft', 'view'], deleteAccount: ['id'], loadDemo: [], clearDemo: [], uiSettings: [],
      // 数据：看板用 summary（总览）、dashboard（一个账号）、postDetail（一条作品）
      summary: [], dashboard: ['id', 'days'], postDetail: ['id', 'postId'],
      // 总览：全网数据（network）和今日简报（brief 读最新一份和正在写的几行，startBrief 现在写一份）
      network: ['days'], brief: [], startBrief: [],
      overview: ['id', 'days'], posts: ['id', 'limit'], refresh: ['id'], importFile: ['id', 'fileName', 'base64'],
      // AI：选题和诊断
      generateTopics: ['id'], generateTopicsAbout: ['id', 'direction'], topicReports: ['id'], findRelated: ['id'],
      // 待发布
      drafts: [], markDraftPublished: ['id', 'url'], removeDraft: ['id'], revealDraft: ['id'],
      // 登录用的小浏览器
      loginState: ['platform', 'account'], browserOpen: ['platform', 'url', 'account', 'fresh'], browserInput: ['id', 'input'], browserClose: ['id'], identify: ['id'],
    }
    async function call(method, values) {
      // 后台要的是「参数名: 值」；没传的参数不带。
      const args = {}
      METHODS[method].forEach((name, i) => { if (values[i] !== undefined) args[name] = values[i] })
      const result = await rpc(`mediaSuite/${method}`, { args })
      return result.ok ? { ok: true, value: result.value ?? undefined } : result
    }
    const remote = Object.fromEntries(Object.keys(METHODS).map(name => [name, (...values) => call(name, values)]))

    /**
     * 登录小浏览器的画面。后台是一张一张往外推的，这里改成隔一会儿去问一次（index.js 里的 frames 替页面接着）。
     * 用法：for await (const frame of remote.browserFrames(id)) { … }；不看了就调返回值的 dispose()。
     */
    remote.browserFrames = id => {
      let stopped = false
      const ask = (action, more = {}) => rpc(BRIDGE, { action, id, ...more })
      return {
        dispose() { stopped = true; ask('stopFrames').catch(() => {}) },
        async * [Symbol.asyncIterator]() {
          let cursor = 0
          while (!stopped) {
            const result = await ask('frames', { after: cursor })
            if (stopped) return
            if (!result.ok) throw new Error(result.error?.message ?? '')
            cursor = result.value.cursor
            for (const frame of result.value.frames) yield frame
            if (result.value.ended) {
              if (result.value.error) throw new Error(result.value.error.message)
              return
            }
          }
        },
      }
    }

    // ---- 3.2 数据怎么算、怎么存（没有界面）
    //
    // 这一块是从原来的界面里原样搬过来的，只去掉了类型标注，所以写法（带分号、英文注释）和别处不一样。
    // 里面没有任何界面：数字怎么格式化、趋势怎么算、「今天」的待办怎么判断、几份数据怎么取和缓存。
    // 一般不用改。几个「数据源」的用法见 3.10 和第 4 段：createSuiteSource（账号和各种数据）、
    // createBrowserSource（登录小浏览器）。

    // ---- 来自 observable
    // 做一个「数据格子」：存一份数据，谁订阅了，数据一变就通知谁。
    // 第一个订阅的人来了才执行 onActive，最后一个人走了就执行它返回的收尾函数。
    function createCell(initial, onActive) {
        let value = initial;
        const listeners = new Set();
        let deactivate;
        return {
            observable: {
                getSnapshot: () => value,
                subscribe(listener) {
                    listeners.add(listener);
                    if (listeners.size === 1 && onActive !== undefined)
                        deactivate = onActive();
                    return () => {
                        listeners.delete(listener);
                        if (listeners.size !== 0)
                            return;
                        deactivate?.();
                        deactivate = undefined;
                    };
                },
            },
            get: () => value,
            set: (next) => {
                if (Object.is(next, value))
                    return;
                value = next;
                for (const listener of [...listeners])
                    listener();
            },
        };
    }

    // ---- 来自 errors
    const KEYS = {
        'media/not-found': 'error.notFound',
        'media/invalid': 'error.invalid',
        'media/busy': 'error.busy',
        'media/login-required': 'error.loginRequired',
        'login-required': 'error.loginRequired',
        'media/browser-unavailable': 'error.browserUnavailable',
        'browser-unavailable': 'error.browserUnavailable',
        'media/llm-failed': 'error.llmFailed',
        'llm-failed': 'error.llmFailed',
        'media/import-failed': 'error.importFailed',
        'import-failed': 'error.importFailed',
        'parse-failed': 'error.parseFailed',
        'scrape-failed': 'error.scrapeFailed',
        'unsupported': 'error.unsupported',
        'invalid-profile': 'error.invalidProfile',
        'transport': 'error.transport',
    };
    // 出错代号 → 该显示哪条文案。不认识的代号统一用「通用原因」。
    function errorKey(code) {
        return (code === undefined ? undefined : KEYS[code]) ?? 'error.unknown';
    }

    // ---- 来自 file-encoding
    // ---- 导入文件：读平台导出的表格
    // 后台认得的文件类型。
    const IMPORT_ACCEPT = '.xlsx,.xls,.csv';
    // 最大能传多大（字节）。平台导出的文件远小于这个数。
    const IMPORT_MAX_BYTES = 20 * 1024 * 1024;
    // 把文件内容转成 base64 文本（分段转，文件大也不卡）。
    function base64Of(bytes) {
        let binary = '';
        const chunk = 0x8000;
        for (let offset = 0; offset < bytes.length; offset += chunk) {
            binary += String.fromCharCode(...bytes.subarray(offset, offset + chunk));
        }
        return btoa(binary);
    }
    // 读用户选的文件，返回文件名和 base64 内容；超过上限返回 too-large。
    async function readImportFile(file) {
        if (file.size > IMPORT_MAX_BYTES)
            return 'too-large';
        return { fileName: file.name, base64: base64Of(new Uint8Array(await file.arrayBuffer())) };
    }

    // ---- 来自 mini-position
    // ---- 登录小窗口的位置：拖动时不让它跑出窗口，也不让它盖住顶上的标题栏
    // 小窗口和窗口边缘至少留多少像素。
    const MINI_MARGIN = 16;
    // 把拖到的位置收回到允许的范围里。窗口比小窗口还小时，贴在左上角。
    function clampMini(position, bounds) {
        const minTop = MINI_MARGIN + bounds.topClearance;
        const maxLeft = Math.max(MINI_MARGIN, bounds.viewportWidth - bounds.width - MINI_MARGIN);
        const maxTop = Math.max(minTop, bounds.viewportHeight - bounds.height - MINI_MARGIN);
        return {
            left: Math.min(maxLeft, Math.max(MINI_MARGIN, position.left)),
            top: Math.min(maxTop, Math.max(minTop, position.top)),
        };
    }
    // 把 `28px` 这样的文字读成数字；空的或读不出来算 0。
    function pixels(value) {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    // ---- 来自 browser-input
    // 鼠标点在画面上的位置 → 对应到远端浏览器里的坐标（画面是等比缩放、四周可能留黑边）。
    // 点在黑边上返回 undefined；clamp 为真时改成贴到最近的画面边缘（拖动拖出画面时要用）。
    function viewportPoint(clientX, clientY, box, viewport, clamp = false) {
        if (box.width <= 0 || box.height <= 0 || viewport.width <= 0 || viewport.height <= 0)
            return undefined;
        const scale = Math.min(box.width / viewport.width, box.height / viewport.height);
        const drawnWidth = viewport.width * scale;
        const drawnHeight = viewport.height * scale;
        const left = box.left + (box.width - drawnWidth) / 2;
        const top = box.top + (box.height - drawnHeight) / 2;
        const x = (clientX - left) / scale;
        const y = (clientY - top) / scale;
        if (!clamp && (x < 0 || y < 0 || x > viewport.width || y > viewport.height))
            return undefined;
        return {
            x: Math.max(0, Math.min(viewport.width - 1, Math.floor(x))),
            y: Math.max(0, Math.min(viewport.height - 1, Math.floor(y))),
        };
    }
    // 按住鼠标拖动时，最快多少毫秒发一次位置。拖动要顺，所以间隔短。
    const DRAG_MOVE_INTERVAL_MS = 30;
    // 没按鼠标、只是移动时，最快多少毫秒发一次位置。
    const HOVER_MOVE_INTERVAL_MS = 80;
    // 鼠标的第几个键 → 后台认的键名（0 是左键，2 是右键）。别的键不管，返回 undefined。
    function pointerButton(button) {
        return button === 0 ? 'left' : button === 2 ? 'right' : undefined;
    }
    // 这次鼠标移动要不要发给后台：离上次发送够久了才发。
    function moveDue(now, lastSentAt, pressed) {
        return now - lastSentAt >= (pressed ? DRAG_MOVE_INTERVAL_MS : HOVER_MOVE_INTERVAL_MS);
    }
    // 松开鼠标时要发的动作：先补发最后的位置（如果和上次发的不一样），再发「松开」。
    // 这样即使中间漏发了几次，拖动也停在鼠标真正停下的地方。
    function releaseInputs(button, sent, release) {
        const at = release ?? sent;
        const move = sent.x === at.x && sent.y === at.y ? [] : [{ kind: 'move', x: at.x, y: at.y }];
        return [...move, { kind: 'up', x: at.x, y: at.y, button }];
    }
    // 这些键按键名发给后台；能打出字的键走「输入文字」那条路。
    const NAMED_KEYS = new Set([
        'Enter', 'Backspace', 'Tab', 'Escape', 'Delete', 'Insert', 'Home', 'End', 'PageUp', 'PageDown',
        'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
    ]);
    // 一次按键 → 要发给后台的动作。普通字符（没按 Ctrl / Cmd）返回 undefined，
    // 因为它们会走「输入文字」，输入法打出来的字也是从那边来。
    function keyInput(event) {
        if (event.isComposing || event.key === 'Process' || event.key === 'Dead' || event.key === 'Unidentified')
            return undefined;
        const command = event.ctrlKey || event.metaKey;
        const named = NAMED_KEYS.has(event.key) || /^F\d{1,2}$/.test(event.key);
        if (!named && !(command && /^[A-Za-z0-9]$/.test(event.key)))
            return undefined;
        const modifiers = [
            ...event.ctrlKey ? ['Control'] : [],
            ...event.metaKey ? ['Meta'] : [],
            ...event.altKey ? ['Alt'] : [],
            ...event.shiftKey && named ? ['Shift'] : [],
        ];
        return { kind: 'key', key: [...modifiers, event.key].join('+') };
    }
    // 滚轮按「行」报数时，一行算多少像素。
    const LINE_PIXELS = 16;
    // 把滚轮滚动量统一成像素。mode：0 已是像素，1 是行，2 是整页。
    function wheelPixels(delta, mode, page) {
        const scale = mode === 1 ? LINE_PIXELS : mode === 2 ? page : 1;
        return Math.round(delta * scale);
    }
    // 整理用户输入的网址：没写 https:// 的自动补上；空的返回 undefined。
    function addressUrl(text) {
        const trimmed = text.trim();
        if (trimmed === '')
            return undefined;
        return /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
    }

    // ---- 来自 metrics
    // 界面现在用的语言。数字和日期按界面语言显示，不跟浏览器的语言走。
    function uiLocale() {
        if (typeof document === 'undefined')
            return undefined;
        const lang = document.documentElement.lang;
        return lang === '' ? undefined : lang;
    }
    // 大数字写短一点，比如 `1.2万`、`12K`（跟界面语言走）；没有值显示「—」。
    function formatCount(value) {
        if (value === undefined || !Number.isFinite(value))
            return '—';
        const compact = Math.abs(value) >= 10_000;
        // 留三位有效数字：10,331 显示成 `1.03万` 或 `10.3K`，不会被抹成 `1万`。
        return new Intl.NumberFormat(uiLocale(), compact ? { notation: 'compact', maximumSignificantDigits: 3 } : { maximumFractionDigits: 1 }).format(value);
    }
    // 变化量前面带正负号，比如 `+120`、`-3`；没有值返回 undefined。
    function formatDelta(value) {
        if (value === undefined || !Number.isFinite(value))
            return undefined;
        const text = formatCount(Math.abs(value));
        return value > 0 ? `+${text}` : value < 0 ? `-${text}` : '0';
    }
    // 变化是涨、跌还是没变；没有值返回 undefined。
    function deltaTone(value) {
        if (value === undefined || !Number.isFinite(value))
            return undefined;
        return value > 0 ? 'up' : value < 0 ? 'down' : 'flat';
    }
    // 时间 → 短的「月/日」，比如 `11/7`；没有或不合法显示「—」。
    function formatShortDate(iso) {
        if (iso === undefined)
            return '—';
        const time = Date.parse(iso);
        if (Number.isNaN(time))
            return '—';
        return new Intl.DateTimeFormat(uiLocale(), { month: 'numeric', day: 'numeric' }).format(time);
    }
    // 时间 → 短的「日期 + 时间」；没有或不合法显示「—」。
    function formatInstant(iso) {
        if (iso === undefined)
            return '—';
        const time = Date.parse(iso);
        if (Number.isNaN(time))
            return '—';
        return new Intl.DateTimeFormat(uiLocale(), { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(time);
    }
    // 一条作品的互动总数：赞 + 评 + 藏 + 转，缺的算 0。
    function interactions(post) {
        return (post.likes ?? 0) + (post.comments ?? 0) + (post.collects ?? 0) + (post.shares ?? 0);
    }
    // 中位数；空列表返回 undefined。
    function median(values) {
        if (values.length === 0)
            return undefined;
        const sorted = values.toSorted((left, right) => left - right);
        // 个数是单数取中间那一个，双数取中间两个的平均。
        const middle = sorted.slice(Math.ceil(sorted.length / 2) - 1, Math.floor(sorted.length / 2) + 1);
        return middle.reduce((sum, value) => sum + value, 0) / middle.length;
    }
    // 作品按什么比高低：一半以上的作品有播放 / 阅读数就比播放（它说明平台推了多远），
    // 否则比互动总数。
    function standingScore(posts) {
        const byViews = posts.length > 0 && posts.filter(post => post.views !== undefined).length * 2 >= posts.length;
        return { byViews, score: post => byViews ? post.views : interactions(post) };
    }
    // 作品排先后用的时间：有发布时间用发布时间，没有或不合法就用最后一次写入的时间。
    function postTime(post) {
        const published = post.publishedAt === undefined ? Number.NaN : Date.parse(post.publishedAt);
        return Number.isNaN(published) ? Date.parse(post.updatedAt) : published;
    }
    // 最近的 count 条作品，新的在前。
    function recentPosts(posts, count) {
        return posts.toSorted((left, right) => postTime(right) - postTime(left)).slice(0, count);
    }
    function dayDate(day) {
        const [year = 0, month = 1, date = 1] = day.split('-').map(Number);
        return new Date(year, month - 1, date);
    }
    // 日期 `YYYY-MM-DD` → 带星期的写法，比如 `11月3日周二`。
    function formatDay(day) {
        return new Intl.DateTimeFormat(uiLocale(), { month: 'short', day: 'numeric', weekday: 'short' }).format(dayDate(day));
    }
    // 日期 `YYYY-MM-DD` → 坐标轴上用的短写法，比如 `11/3`。
    function formatAxisDay(day) {
        return new Intl.DateTimeFormat(uiLocale(), { month: 'numeric', day: 'numeric' }).format(dayDate(day));
    }
    const DAY_MS = 86_400_000;
    // 北京时间和标准时间差几毫秒。这几个平台的每日数据都按北京时间算天。
    const CHINA_OFFSET_MS = 8 * 3_600_000;
    // 一个时间点算北京时间的哪一天。
    // 平台按北京时间分天，如果按看的人所在时区分，日期会错位，甚至两天并成一天。
    function platformDay(time) {
        return new Date(time + CHINA_OFFSET_MS).toISOString().slice(0, 10);
    }
    // 两个日期之间隔了几天。
    function dayOffset(from, to) {
        const parse = (day) => {
            const [year = 0, month = 1, date = 1] = day.split('-').map(Number);
            return Date.UTC(year, month - 1, date);
        };
        return Math.round((parse(to) - parse(from)) / DAY_MS);
    }
    // 每天取一个值：用当天最后一次抓到、并且带这个指标的那条记录。
    // 「净增粉丝」没有时，用粉丝总数和前一天的差来补。
    function dailyPoints(series, metric) {
        const days = new Map();
        for (const point of series) {
            const value = point[metric];
            const time = Date.parse(point.at);
            if (value === undefined || !Number.isFinite(value) || Number.isNaN(time))
                continue;
            days.set(platformDay(time), value);
        }
        const points = [...days].sort(([a], [b]) => a.localeCompare(b)).map(([day, value]) => ({ day, value }));
        if (metric !== 'fansNet' || points.length > 0)
            return points;
        const totals = dailyPoints(series, 'followers');
        return totals.slice(1).flatMap((point, index) => {
            const previous = totals[index];
            if (previous === undefined || dayOffset(previous.day, point.day) !== 1)
                return [];
            return [{ day: point.day, value: point.value - previous.value }];
        });
    }
    // 把每日指标加起来；一天都没有返回 undefined。
    function sumPoints(points) {
        return points.length === 0 ? undefined : points.reduce((sum, point) => sum + point.value, 0);
    }
    function niceStep(raw) {
        const exponent = Math.floor(Math.log10(raw));
        const fraction = raw / 10 ** exponent;
        const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
        // 这些指标都是整数，刻度间隔不能小于 1，不然会标出小数。
        return Math.max(1, nice * 10 ** exponent);
    }
    // 给纵轴挑一组整齐的刻度。
    // 累计类：上下留一点余量，免得涨几个粉丝就画成悬崖；当天类：一定从 0 开始，柱子才有底线。
    function niceScale(values, kind, tickCount = 4) {
        const finite = values.filter(value => Number.isFinite(value));
        let min = finite.length === 0 ? 0 : Math.min(...finite);
        let max = finite.length === 0 ? 0 : Math.max(...finite);
        if (kind === 'daily') {
            min = Math.min(0, min);
            max = Math.max(0, max);
            if (min === max)
                max = 1;
        }
        else {
            const pad = max === min ? Math.max(1, Math.abs(max) * 0.02) : (max - min) * 0.25;
            const floor = min >= 0 ? 0 : Number.NEGATIVE_INFINITY;
            min = Math.max(floor, min - pad);
            max += pad;
        }
        const step = niceStep((max - min) / Math.max(1, tickCount - 1));
        const lo = Math.floor(min / step) * step;
        const hi = Math.max(lo + step, Math.ceil(max / step) * step);
        const ticks = [];
        for (let value = lo; value <= hi + step / 2; value += step)
            ticks.push(Math.round(value * 1000) / 1000);
        return { lo, hi, ticks };
    }
    // 把标题里的 #话题 和正文分开：正文在前，话题单独当标签显示（去掉 #、去掉重复）。
    function splitTitle(title) {
        const tags = [];
        const text = title.replace(/#([^\s#]+)/gu, (_match, tag) => {
            if (!tags.includes(tag))
                tags.push(tag);
            return ' ';
        }).replace(/\s+/g, ' ').trim();
        return { text, tags };
    }

    // ---- 来自 today
    // 数据超过多少小时没更新算「过时」。
    const STALE_HOURS = 24;
    // 选题报告超过多少天算「旧了」。
    const TOPICS_OLD_DAYS = 7;
    // 「今天」页的待办，最急的在前：登录失效、没有数据 → 数据过时 → 选题 → 对标。
    // 没有要处理的就返回空列表。
    function todayTodos(input) {
        const { overview, platform, topics, now } = input;
        const todos = [];
        if (overview === undefined)
            return todos;
        const canFetch = platform?.scrape === true;
        // 演示账号不会真的去抓数据，所以不提示登录和数据过时。
        const demo = overview.account.demo === true;
        if (canFetch && !demo && overview.login === 'logged-out')
            todos.push({ kind: 'login', platform: platform.displayName });
        const latest = overview.latest;
        if (!demo && latest === undefined) {
            todos.push({ kind: 'noData', canFetch: canFetch && overview.login !== 'logged-out', canImport: platform?.import !== false });
        }
        else if (!demo && overview.lastRun?.ok === false) {
            todos.push({ kind: 'runFailed', errorCode: overview.lastRun.errorCode });
        }
        else if (!demo && latest !== undefined) {
            const age = now - Date.parse(latest.capturedAt);
            if (age > STALE_HOURS * 60 * 60 * 1000)
                todos.push({ kind: 'stale', days: Math.floor(age / DAY_MS) });
        }
        if (topics !== undefined && !input.generating) {
            const newest = topics[0];
            if (newest === undefined)
                todos.push({ kind: 'noTopics' });
            else {
                const days = Math.floor((now - Date.parse(newest.createdAt)) / DAY_MS);
                if (days >= TOPICS_OLD_DAYS)
                    todos.push({ kind: 'oldTopics', days });
            }
        }
        if (overview.account.role === 'own' && input.benchmarkCount === 0)
            todos.push({ kind: 'noBenchmark' });
        return todos;
    }
    // 拿最近多少条作品的中位数当「平时水平」。
    const BASELINE_POSTS = 20;
    // 至少几条能比的作品，中位数才能用。
    const MIN_BASELINE = 4;
    // 最新的 count 条作品，各自和「平时水平」比是高还是低。
    function recentPerformance(posts, count) {
        const baseline = recentPosts(posts, BASELINE_POSTS);
        const { byViews, score } = standingScore(baseline);
        const scores = baseline.flatMap((post) => {
            const value = score(post);
            return value === undefined ? [] : [value];
        });
        const middle = scores.length >= MIN_BASELINE ? median(scores) : undefined;
        const usable = middle !== undefined && middle > 0 ? middle : undefined;
        const rows = baseline.slice(0, count).map((post) => {
            const value = score(post);
            return { post, score: value, ratio: value === undefined || usable === undefined ? undefined : value / usable };
        });
        return { rows, median: usable, byViews };
    }
    // 同行的作品多少天内算「近期」。
    const PEER_RECENT_DAYS = 60;
    // 同行最近的爆款：对标账号的作品 + 最新一份选题报告搜到的作品，按点赞从高到低，去掉重复。
    // 超过 PEER_RECENT_DAYS 天的旧作品，只有近期的不够数时才补上。
    function peerPosts(input) {
        const names = new Map(input.accounts.map(account => [account.id, account.name]));
        const found = new Map();
        const add = (post) => {
            const key = post.url ?? post.key;
            const known = found.get(key);
            if (known === undefined || (post.likes ?? 0) > (known.likes ?? 0))
                found.set(key, post);
        };
        for (const post of input.benchmarkPosts) {
            const name = names.get(post.accountId) ?? '';
            add({
                key: `${post.accountId}:${post.postId}`, title: post.title, url: post.url, author: name, coverUrl: undefined, format: post.format,
                publishedAt: post.publishedAt, likes: post.likes, views: post.views, comments: post.comments, collects: post.collects,
                source: { kind: 'benchmark', name },
            });
        }
        const searched = (keyword, related) => {
            for (const post of related) {
                add({
                    key: `search:${post.postId}`, title: post.title, url: post.url, author: post.author, coverUrl: post.coverUrl, format: post.format,
                    publishedAt: post.publishedAt, likes: post.likes, views: post.views, comments: post.comments, collects: post.collects,
                    source: { kind: 'search', keyword },
                });
            }
        };
        for (const search of input.report?.research?.searches ?? [])
            searched(search.keyword, search.posts);
        for (const suggestion of input.report?.suggestions ?? [])
            searched(suggestion.keywords[0] ?? suggestion.title, suggestion.related);
        const all = [...found.values()].toSorted((left, right) => (right.likes ?? 0) - (left.likes ?? 0));
        const cutoff = input.now - PEER_RECENT_DAYS * DAY_MS;
        const isRecent = (post) => {
            const time = post.publishedAt === undefined ? Number.NaN : Date.parse(post.publishedAt);
            return Number.isNaN(time) || time >= cutoff;
        };
        const recent = all.filter(isRecent);
        return (recent.length >= input.count ? recent : [...recent, ...all.filter(post => !isRecent(post))]).slice(0, input.count);
    }
    // 先写哪几个选题：优先级高的在前，同级按报告里的顺序。
    function topSuggestions(report, count) {
        const order = { high: 0, medium: 1, low: 2 };
        return (report?.suggestions ?? [])
            .map((suggestion, index) => ({ index, suggestion }))
            .toSorted((left, right) => order[left.suggestion.priority] - order[right.suggestion.priority] || left.index - right.index)
            .slice(0, count);
    }
    // 离某个时间过去了多久，用来显示「3 小时前更新」；没有或不合法返回 undefined。
    function elapsed(iso, now) {
        const time = iso === undefined ? Number.NaN : Date.parse(iso);
        if (Number.isNaN(time))
            return undefined;
        const minutes = Math.max(0, Math.floor((now - time) / 60_000));
        return { minutes, hours: Math.floor(minutes / 60), days: Math.floor(minutes / (60 * 24)) };
    }

    // ---- 来自 remote-face
    // 调一次后台并把结果收拾整齐：成功给值，失败给出错代号；连不上后台算 transport。
    async function settle(call) {
        let result;
        try {
            result = await call();
        }
        catch (_error) {
            // 请求没发成功就不知道后台到底做没做，按「连不上」处理。
            return { ok: false, code: 'transport', message: '' };
        }
        return result.ok ? { ok: true, value: result.value } : { ok: false, code: result.error.code, message: result.error.message };
    }

    // ---- 来自 notice-source
    // ---- 右上角提示消息的存放处
    function createNoticeSource() {
        const cell = createCell(null);
        let seq = 0;
        return {
            hooks: { notice: cell.observable },
            report: (key, options = {}) => {
                cell.set({ key, params: options.params ?? {}, reason: options.reason, tone: options.tone ?? 'success', seq: ++seq });
            },
            dismiss: () => { cell.set(null); },
        };
    }

    // ---- 来自 browser-source
    // 登录后先等后台自己认出是哪个账号（最长约 20 秒），等不到再主动去问。
    const IDENTIFY_FALLBACK_MS = 25_000;
    const NO_IDENTITY = { status: 'none' };
    const HIDDEN = {
        mode: 'browse', minimized: false, platformName: undefined, status: 'hidden', platform: undefined, view: undefined,
        picture: undefined, qr: undefined, login: 'unknown', reason: undefined, identity: NO_IDENTITY,
    };
    // ---- 登录小浏览器的状态：画面、网址、认出的账号
    function createBrowserSource(deps) {
        const { remote } = deps;
        const cell = createCell(HIDDEN);
        let generation = 0;
        let stream;
        let lastUrl;
        let lastMode = 'browse';
        let lastAccount;
        let fallback;
        const cancelFallback = () => {
            clearTimeout(fallback);
            fallback = undefined;
        };
        const patch = (current, next) => {
            if (current === generation)
                cell.set({ ...cell.get(), ...next });
        };
        const stopStream = () => {
            const stopped = stream;
            stream = undefined;
            stopped?.dispose();
        };
        const closeView = (view) => {
            // 画面流断了后台也会自己关掉；这里关失败也没关系，界面上已经没有东西要显示了。
            if (view !== undefined)
                void settle(() => remote.browserClose(view.id));
        };
        const identify = async (current, view) => {
            patch(current, { identity: { status: 'identifying' } });
            const result = await settle(() => remote.identify(view.id));
            // 这期间后台已经把账号认出来了，就不用再问。
            if (current !== generation || cell.get().identity.status === 'identified')
                return;
            patch(current, {
                identity: result.ok
                    ? { status: 'identified', identity: result.value }
                    : { status: 'failed', reason: errorKey(result.code), message: result.code === 'media/invalid' ? result.message : undefined },
            });
        };
        const follow = async (current, view) => {
            const opened = remote.browserFrames(view.id);
            stream = opened;
            try {
                for await (const frame of opened) {
                    if (current !== generation)
                        return;
                    switch (frame.kind) {
                        case 'frame': {
                            const { data, width, height, url, title, loading } = frame;
                            patch(current, { status: 'open', picture: { data, width, height, url, title, loading: loading === true } });
                            break;
                        }
                        case 'login': {
                            const { login: before, mode, identity } = cell.get();
                            patch(current, { login: frame.state });
                            // 又回到未登录（比如网站先显示后台地址、再跳去登录页）：之前的「正在识别 / 无法识别」不算数了。
                            if (frame.state === 'logged-out' && mode === 'connect' && identity.status !== 'none') {
                                cancelFallback();
                                patch(current, { identity: NO_IDENTITY });
                            }
                            if (frame.state === 'logged-in' && before !== 'logged-in')
                                deps.onLoggedIn(view.platform);
                            if (frame.state === 'logged-in' && mode === 'connect' && identity.status === 'none') {
                                // 登录成功后后台会接着告诉我们是哪个账号；等一会儿还没消息再去问，问不到才算认不出。
                                patch(current, { identity: { status: 'identifying' } });
                                cancelFallback();
                                // 不管怎么结束等待（认出来了、手动重试、重新打开、关闭），都会取消这个定时器。
                                fallback = setTimeout(() => {
                                    fallback = undefined;
                                    void identify(current, view);
                                }, deps.identifyFallbackMs);
                            }
                            break;
                        }
                        case 'qr': {
                            const { data, width, height } = frame;
                            patch(current, { qr: data === undefined ? undefined : { data, width, height } });
                            break;
                        }
                        case 'identity':
                            cancelFallback();
                            patch(current, { identity: { status: 'identified', identity: frame.identity } });
                            break;
                        case 'closed':
                            cancelFallback();
                            patch(current, { status: 'ended', reason: 'browser.closedByHost' });
                            stopStream();
                            return;
                        // 不会走到这里，只是把所有情况写全。
                        default: {
                            const unexpected = frame;
                            return unexpected;
                        }
                    }
                }
            }
            catch (_error) {
                // 画面流出错后这个小浏览器就不能用了，界面会让用户重新打开。
                cancelFallback();
                patch(current, { status: 'ended', reason: 'browser.streamLost' });
                return;
            }
            cancelFallback();
            patch(current, { status: 'ended', reason: 'browser.streamLost' });
        };
        // account：这次是替哪个账号开的（去登录、看它的作品），后台就用那个账号自己的登录。
        // mode 是 'connect'（扫码添加账号）时不带账号：后台会开一份全新的、没登录过的浏览器，
        // 这样再加一个同平台的账号，不会把已经登录的那个顶掉。
        const open = async (platform, url, mode = 'browse', account) => {
            const previous = cell.get().view;
            const current = ++generation;
            stopStream();
            closeView(previous);
            lastUrl = url;
            lastMode = mode;
            lastAccount = account;
            const connecting = mode === 'connect';
            cancelFallback();
            cell.set({ ...HIDDEN, mode, status: 'opening', platform, platformName: deps.platformName(platform) ?? platform, startedAt: Date.now() });
            outbox.length = 0;
            held = false;
            const [opened, login] = await Promise.all([
                settle(() => remote.browserOpen(platform, url, connecting ? undefined : account, connecting ? true : undefined)),
                connecting ? { ok: true, value: 'logged-out' } : settle(() => remote.loginState(platform, account)),
            ]);
            if (current !== generation) {
                if (opened.ok)
                    closeView(opened.value);
                return;
            }
            if (login.ok)
                patch(current, { login: login.value });
            if (!opened.ok) {
                patch(current, { status: 'failed', reason: errorKey(opened.code) });
                return;
            }
            patch(current, { view: opened.value, status: 'open' });
            void follow(current, opened.value);
        };
        // 操作一条一条按顺序发（一起发的话浏览器每个网址最多同时 6 个请求，后面的要排队，还可能乱序，拖动就会错）。
        // 还没发出去的鼠标移动（没按着键）直接换成最新的位置，所以移动再多也不会堆起来挡住后面的点击。
        // 按着键拖动时每一步都发，滑块验证要完整的轨迹。不等结果：有没有生效看下一帧画面。
        const outbox = [];
        let sending = false;
        let held = false;
        const pump = async () => {
            if (sending)
                return;
            sending = true;
            while (outbox.length > 0) {
                const next = outbox.shift();
                if (next.viewId !== cell.get().view?.id)
                    continue;
                await settle(() => remote.browserInput(next.viewId, next.input));
            }
            sending = false;
        };
        const sendInput = (viewId, input) => {
            if (input.kind === 'down')
                held = true;
            if (input.kind === 'up')
                held = false;
            const last = outbox.at(-1);
            if (input.kind === 'move' && !held && last !== undefined && last.hover && last.viewId === viewId) {
                last.input = input;
                return;
            }
            outbox.push({ viewId, input, hover: input.kind === 'move' && !held });
            void pump();
        };
        return {
            hooks: { browser: cell.observable },
            actions: {
                open,
                input: (input) => {
                    const { view, status } = cell.get();
                    if (view === undefined || status !== 'open')
                        return;
                    sendInput(view.id, input);
                },
                retry: async () => {
                    const { platform } = cell.get();
                    if (platform !== undefined)
                        await open(platform, lastUrl, lastMode, lastAccount);
                },
                minimize: () => {
                    if (cell.get().status !== 'hidden')
                        cell.set({ ...cell.get(), minimized: true });
                },
                expand: () => { cell.set({ ...cell.get(), minimized: false }); },
                identify: async () => {
                    cancelFallback();
                    const { view } = cell.get();
                    if (view !== undefined)
                        await identify(generation, view);
                },
                close: async () => {
                    const { view } = cell.get();
                    generation++;
                    cancelFallback();
                    stopStream();
                    cell.set(HIDDEN);
                    if (view !== undefined)
                        await settle(() => remote.browserClose(view.id));
                },
            },
            dispose: async () => {
                const { view } = cell.get();
                generation++;
                cancelFallback();
                stopStream();
                if (view !== undefined)
                    await settle(() => remote.browserClose(view.id));
            },
        };
    }

    // ---- 3.3 各页共用的小块

    let t = key => TEXT.zh[key] ?? key
    /** 读一个数据源现在的值，值变了页面会跟着重画：const suite = useSource(sources.suite) */
    const useSource = observable => useSyncExternalStore(observable.subscribe, observable.getSnapshot)

    addStyles(`
.$-summary{display:flex;flex-direction:column;gap:8px}
.$-summary-lead{margin:0;font-size:15px;line-height:24px;font-weight:500}
.$-summary-text{display:flex;flex-direction:column;gap:6px;color:var(--$-text-2);font-size:13px;line-height:21px}
.$-summary-text p{margin:0}
.$-summary-text[data-collapsed=true]{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden}
.$-headline{display:flex;align-items:center;gap:8px;padding:6px 6px 6px 12px;border-radius:var(--$-r-md);background:var(--$-soft);font-size:13px;line-height:20px}
.$-todo{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;padding:12px 14px;border-radius:var(--$-r-lg);background:var(--$-soft)}
.$-todo[data-tone=warn]{background:color-mix(in srgb,var(--$-warn) 10%,transparent)}
.$-todo[data-tone=warn]>svg{color:var(--$-warn)}
.$-todo>svg,.$-todo>.$-dot{flex:none}
`)

    /** 后台的语气名字换成底座 Tag 的 tone。 */
    const TONE = { success: 'success', warning: 'warn', danger: 'danger', info: 'info', outline: 'outline' }
    const Chip = ({ tone, children }) => h(Tag, { tone: TONE[tone] }, children)
    /** 登录状态和优先级各自用什么颜色、哪句话。 */
    const LOGIN_TAGS = { 'logged-in': ['success', 'login.in'], 'logged-out': ['warning', 'login.out'], unknown: [undefined, 'login.unknown'] }
    const PRIORITY_TAGS = { high: ['danger', 'priority.high'], medium: ['warning', 'priority.medium'], low: [undefined, 'priority.low'] }
    const LoginTag = ({ state }) => h(Chip, { tone: LOGIN_TAGS[state][0] }, t(LOGIN_TAGS[state][1]))
    const PriorityTag = ({ priority }) => h(Chip, { tone: PRIORITY_TAGS[priority][0] }, t(PRIORITY_TAGS[priority][1]))

    /** 取数据失败时：一句原因加「重试」。reason 是字典里的一条（比如 error.unknown）。 */
    const LoadError = ({ reason, onRetry }) => h(Alert, { tone: 'danger', action: onRetry ? h(Btn, { sm: true, onClick: onRetry }, t('action.retry')) : undefined },
      t('state.loadFailed', { reason: t(reason ?? 'error.unknown') }))
    const Waiting = () => h(Loading, { text: t('state.loading') })

    /** 多久以前：刚刚、几分钟前、几小时前、几天前。 */
    function agoText(iso, now) {
      const since = elapsed(iso, now)
      if (since === undefined) return formatInstant(iso)
      if (since.minutes < 1) return t('time.justNow')
      if (since.hours < 1) return t('time.minutesAgo', { count: since.minutes })
      if (since.days < 1) return t('time.hoursAgo', { count: since.hours })
      return t('time.daysAgo', { count: since.days })
    }

    /** 页面标题下面那一行：登录状态、多久前更新、上次有没有失败、下次什么时候自动抓。 */
    function AccountStatus({ overview, now }) {
      const { lastRun, latest, nextRunAt } = overview
      // 演示账号不会去抓，登录状态和抓取时间对它没有意义。
      if (overview.account.demo === true) return h('span', { className: cls('line') }, h(Tag, { tone: 'info' }, t('demo.tag')), h('span', null, t('demo.status')))
      return h('span', { className: cls('line') },
        h(LoginTag, { state: overview.login }),
        h('span', null, latest === undefined ? t('status.noData') : t('status.updated', { ago: agoText(latest.capturedAt, now) })),
        lastRun?.ok === false ? h('span', { className: cls('down') }, t('status.lastFailed', { reason: t(errorKey(lastRun.errorCode)) })) : null,
        h('span', null, nextRunAt === undefined ? t('overview.monitorOff') : t('overview.nextRunAt', { time: formatInstant(nextRunAt) })))
    }

    /**
     * 取一份后台数据，并管好「加载中 / 出错 / 有数据」三种情况（remote 的调用不抛错，所以和底座的 useData 写法不一样）：
     *   const x = useRemote(() => remote.posts(id, 60), [id])      x.loading / x.reason / x.data / x.reload()
     * 要一次取好几份，就在函数里自己 await，最后 return { ok: true, value: 整理好的东西 }。
     */
    function useRemote(load, deps) {
      const [state, setState] = useState({ loading: true, reason: null, data: null })
      const [tick, setTick] = useState(0)
      useEffect(() => {
        let alive = true
        setState(now => ({ ...now, loading: true, reason: null }))
        settle(load).then(result => { if (alive) setState(now => (result.ok ? { loading: false, reason: null, data: result.value } : { ...now, loading: false, reason: errorKey(result.code) })) })
        return () => { alive = false }
      }, [...deps, tick])
      return { ...state, reload: () => setTick(n => n + 1) }
    }

    /** [底座候选] 把几行数据存成表格文件让用户下载（CSV，Excel 和 WPS 能直接打开）：downloadCsv('作品.csv', ['标题', '点赞'], [['第一条', 12]]) */
    function downloadCsv(name, header, rows) {
      const cell = value => { const text = value === undefined || value === null ? '' : String(value); return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text }
      // 开头那个看不见的字符是告诉 Excel「这是 UTF-8」，不然中文会乱码。
      const text = `\ufeff${[header, ...rows].map(row => row.map(cell).join(',')).join('\r\n')}`
      const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
      const link = document.createElement('a')
      link.href = url
      link.download = name
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    }

    /** 卡片右上角的「查看全部 ›」。 */
    const More = ({ label, onClick }) => label && onClick ? h(LinkBtn, { onClick, icon: 'right' }, label) : null

    // ---- 3.8 登录用的小浏览器
    //
    // 后台开着一个真的浏览器，把画面一张张传过来；这里把画面显示出来，再把鼠标、键盘的动作传回去。
    // 有两种样子：大窗（盖住整个插件页面）和缩小后的小窗（右下角，可以拖）。都画在插件自己的区域里。

    addStyles(`
.$-bw{position:absolute;inset:calc(12px + var(--dsh-frame-top-clearance,0px)) 12px 12px;z-index:16;display:flex;flex-direction:column;overflow:hidden;border-radius:var(--$-r-panel);background:var(--$-raised);box-shadow:var(--$-shadow-3)}
.$-bw-bar{display:flex;align-items:center;gap:6px;padding:8px 10px;border-bottom:.5px solid var(--$-line)}
.$-bw-bar form{flex:1;min-width:0}
.$-bw-connect{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;padding:8px 12px;border-bottom:.5px solid var(--$-line);background:var(--$-soft);font-size:13px;line-height:20px}
.$-bw-stage{position:relative;flex:1;display:flex;align-items:center;justify-content:center;min-height:0;overflow:hidden;background:var(--$-soft)}
.$-bw-progress{position:absolute;left:0;right:0;top:0;z-index:2;height:2px;overflow:hidden;pointer-events:none}
.$-bw-progress::after{content:'';position:absolute;top:0;bottom:0;left:-30%;width:30%;background:var(--$-accent);animation:$-bw-progress 1.1s ease-in-out infinite}
@keyframes $-bw-progress{from{left:-30%}to{left:100%}}
.$-bw-mark{position:absolute;z-index:3;width:30px;height:30px;margin:-15px 0 0 -15px;border:2px solid var(--$-accent);border-radius:50%;pointer-events:none;animation:$-bw-mark .5s ease-out forwards}
@keyframes $-bw-mark{from{transform:scale(.35);opacity:.95}to{transform:scale(1.3);opacity:0}}
@media (prefers-reduced-motion:reduce){.$-bw-progress::after{left:0;width:100%;opacity:.5;animation:none}.$-bw-mark{animation:none;opacity:.6}}
.$-bw-secs{margin-left:6px;color:var(--$-text-3);font-variant-numeric:tabular-nums}
.$-bw-slow{margin-left:6px;color:var(--$-text-3)}
.$-bw-pic{display:block;max-width:100%;max-height:100%;user-select:none;-webkit-user-drag:none;touch-action:none}
.$-bw-keys{position:absolute;left:0;top:0;width:1px;height:1px;padding:0;border:0;opacity:0;resize:none}
.$-bw-over{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:24px;background:var(--$-mask);text-align:center}
.$-bw-over p{margin:0;max-width:420px;padding:10px 14px;border-radius:var(--$-r-md);background:var(--$-raised);font-size:13px;line-height:20px}
.$-bw-foot{display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px 16px;padding:6px 12px;border-top:.5px solid var(--$-line);color:var(--$-text-3);font-size:12px;line-height:18px}
.$-mini{position:absolute;right:16px;bottom:16px;z-index:17;display:flex;flex-direction:column;width:260px;max-width:calc(100% - 32px);overflow:hidden;border-radius:var(--$-r-lg);background:var(--$-raised);box-shadow:var(--$-shadow-3)}
.$-mini[data-placed=true]{right:auto;bottom:auto;left:var(--mini-left);top:var(--mini-top)}
.$-mini-bar{display:flex;align-items:center;gap:6px;padding:6px 6px 6px 12px;font-size:13px;line-height:20px;font-weight:500;cursor:grab;touch-action:none}
.$-mini-frame{display:flex;align-items:center;justify-content:center;width:100%;aspect-ratio:var(--mini-aspect,4/3);padding:0;border:0;background:var(--$-soft);cursor:pointer}
.$-mini-frame img{display:block;width:100%;height:100%;object-fit:contain}
.$-mini-qr{display:flex;flex-direction:column;align-items:center;gap:8px;padding:12px}
.$-mini-qr img{width:176px;max-width:100%;aspect-ratio:var(--qr-aspect,1);border-radius:var(--$-r-sm)}
.$-mini-status{display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px;padding:8px 12px;border-top:.5px solid var(--$-line);font-size:12px;line-height:18px}
`)

    /** 认出登录的是哪个账号以后，让用户补一句「做什么领域」，然后加进来。 */
    function ConfirmIdentity({ identity, onConnect }) {
      const [niche, setNiche] = useState('')
      const [saving, setSaving] = useState(false)
      const [problem, setProblem] = useState(undefined)
      const submit = async () => {
        setSaving(true)
        setProblem(undefined)
        const outcome = await onConnect(identity, niche)
        setSaving(false)
        if (!outcome.ok) setProblem(outcome.reason)
      }
      return h(Fragment, null,
        h('span', { className: cls('strong') }, t('connect.identified', { name: identity.name })),
        h('span', { className: cls('mid') }, h(Input, { value: niche, onChange: setNiche, disabled: saving, 'aria-label': t('connect.niche'), placeholder: t('connect.nichePlaceholder'), onKeyDown: e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) submit() } })),
        h(Btn, { kind: 'primary', sm: true, busy: saving, onClick: submit }, t(saving ? 'connect.saving' : identity.existingAccountId !== undefined ? 'connect.update' : 'connect.add')),
        problem !== undefined ? h('span', { className: cls('down'), role: 'alert' }, t('connect.failed', { reason: t(problem) })) : null)
    }
    /** 大窗里地址栏下面那一条：还没登录时提示扫码，登录后显示认出的账号。 */
    /** 二维码出来之前现在到哪一步：启动浏览器 → 连上平台 → 登录页加载中。 */
    function loadingStage(browser) {
      if (browser.status === 'opening') return 'launch'
      const url = browser.picture?.url ?? ''
      return url === '' || url === 'about:blank' ? 'connect' : 'load'
    }
    // 过了这么多秒还没出二维码，就说明是网慢，不是卡住了。
    const SLOW_STAGE_SECONDS = 8

    function ConnectBar({ identity, qr, platformName, stage, startedAt, loading, onIdentify, onConnect }) {
      // 新开的登录页要先启动浏览器、再加载网页，网慢时要二三十秒；二维码出来之前每秒告诉用户到哪一步、过了几秒，
      // 页面一直在动，不会像卡住。二维码出现过、或网页已经加载完（比如改用密码登录），就不再计时，只留扫码提示。
      const [now, setNow] = useState(() => Date.now())
      const [seenQr, setSeenQr] = useState(false)
      useEffect(() => { if (qr) setSeenQr(true) }, [qr])
      const waiting = identity.status === 'none' && !qr && !seenQr && (stage !== 'load' || loading)
      useEffect(() => {
        if (!waiting) return undefined
        const timer = setInterval(() => setNow(Date.now()), 1000)
        return () => clearInterval(timer)
      }, [waiting])
      const seconds = Math.max(0, Math.floor((now - (startedAt ?? now)) / 1000))
      const platform = platformName ?? ''
      const body = {
        none: () => !waiting ? h('span', null, t('connect.hint')) : h(Working, null,
          t(`connect.stage.${stage}`, { platform }), h('span', { className: cls('bw-secs'), 'aria-hidden': true }, t('connect.seconds', { s: seconds })),
          seconds >= SLOW_STAGE_SECONDS ? h('span', { className: cls('bw-slow') }, t('connect.slow', { platform })) : null),
        identifying: () => h(Working, null, t('connect.identifying')),
        failed: () => h(Fragment, null, h('span', { className: cls('down'), role: 'alert' }, identity.message ?? t('connect.identifyFailed', { reason: t(identity.reason) })), h(Btn, { sm: true, onClick: onIdentify }, t('connect.retry'))),
        identified: () => h(ConfirmIdentity, { key: identity.identity.profileUrl, identity: identity.identity, onConnect }),
      }[identity.status]
      return h('div', { className: cls('bw-connect') }, body())
    }

    /** 画面上的鼠标动作怎么传给后台：按下、移动、松开、滚轮。位置都换算成后台那个浏览器里的像素。 */
    function pointerHandlers(size, onInput, track, focusKeys, onMark) {
      const point = (e, clamp) => viewportPoint(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect(), size, clamp)
      const release = e => {
        const { press } = track.current
        if (press === undefined) return
        track.current.press = undefined
        if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
        for (const input of releaseInputs(press.button, press.sent, point(e, true))) onInput(input)
      }
      return {
        onPointerDown: e => {
          const button = pointerButton(e.button)
          const at = point(e, false)
          if (button === undefined || at === undefined || track.current.press !== undefined) return
          e.preventDefault()
          e.currentTarget.setPointerCapture(e.pointerId)
          track.current.press = { button, sent: at }
          track.current.sentAt = e.timeStamp
          onMark?.(e)
          onInput({ kind: 'down', button, ...at })
          focusKeys()
        },
        onPointerMove: e => {
          const { press } = track.current
          // 移动的消息很多，隔一小会儿才发一次。
          if (!moveDue(e.timeStamp, track.current.sentAt, press !== undefined)) return
          const at = point(e, press !== undefined)
          if (at === undefined) return
          track.current.sentAt = e.timeStamp
          if (press !== undefined) press.sent = at
          onInput({ kind: 'move', ...at })
        },
        onPointerUp: release,
        onPointerCancel: release,
        onContextMenu: e => e.preventDefault(),
        onWheel: e => {
          const at = point(e, false)
          if (at !== undefined) onInput({ kind: 'wheel', ...at, deltaX: wheelPixels(e.deltaX, e.deltaMode, size.width), deltaY: wheelPixels(e.deltaY, e.deltaMode, size.height) })
        },
      }
    }

    function BrowserPanel({ browser, platform, onInput, onRetry, onClose, onIdentify, onConnect, onMinimize }) {
      const picture = browser.picture
      const keysRef = useRef(null)
      const track = useRef({ sentAt: Number.NEGATIVE_INFINITY, press: undefined })
      const composing = useRef(false)
      const [address, setAddress] = useState(undefined)
      const [focused, setFocused] = useState(false)
      // 按下的那一刻就在点的位置画一个圈，不等远端网页的下一帧：点到了没有，当场看得见。
      const stageRef = useRef(null)
      const [marks, setMarks] = useState([])
      const markSeq = useRef(0)
      const mark = e => {
        const box = stageRef.current?.getBoundingClientRect()
        if (box === undefined) return
        const id = ++markSeq.current
        setMarks(list => [...list.slice(-3), { id, x: e.clientX - box.left, y: e.clientY - box.top }])
        setTimeout(() => setMarks(list => list.filter(item => item.id !== id)), 600)
      }
      if (browser.status === 'hidden' || browser.minimized) return null
      const interactive = browser.status === 'open' && picture !== undefined
      const addressText = address ?? picture?.url ?? ''
      const focusKeys = () => keysRef.current?.focus({ preventScroll: true })
      // 键盘：按键直接传过去；打字（包括中文输入法）等字出来了再传。接键盘的是一个看不见的输入框。
      const onKeyDown = e => {
        const input = keyInput({ key: e.key, ctrlKey: e.ctrlKey, metaKey: e.metaKey, altKey: e.altKey, shiftKey: e.shiftKey, isComposing: e.nativeEvent.isComposing || composing.current })
        if (input === undefined) return
        e.preventDefault()
        e.stopPropagation()
        onInput(input)
      }
      const sendText = (target, text) => { target.value = ''; if (text !== '') onInput({ kind: 'text', text }) }
      const go = e => {
        e.preventDefault()
        const url = addressUrl(addressText)
        if (url === undefined) return
        onInput({ kind: 'navigate', url })
        setAddress(undefined)
        focusKeys()
      }
      return h('section', { className: cls('bw'), role: 'dialog', 'aria-label': t('browser.title', { platform: platform?.displayName ?? browser.platform }) },
        h('header', { className: cls('bw-bar') },
          h(Btn, { kind: 'ghost', sm: true, icon: 'left', label: t('browser.back'), disabled: !interactive, onClick: () => onInput({ kind: 'back' }) }),
          h(Btn, { kind: 'ghost', sm: true, icon: 'refresh', label: t('browser.reload'), disabled: !interactive, onClick: () => onInput({ kind: 'reload' }) }),
          h('form', { onSubmit: go }, h(Input, { value: addressText, disabled: !interactive, 'aria-label': t('browser.address'), placeholder: t('browser.addressPlaceholder'), onChange: setAddress, onBlur: () => { if (address !== undefined && address.trim() === '') setAddress(undefined) } })),
          h(LoginTag, { state: browser.login }),
          h(Btn, { kind: 'ghost', sm: true, icon: 'shrink', label: t('browser.minimize'), onClick: onMinimize }),
          h(Btn, { kind: 'ghost', sm: true, icon: 'x', label: t('browser.close'), onClick: onClose })),
        browser.mode === 'connect' ? h(ConnectBar, { key: browser.view?.id, identity: browser.identity, qr: browser.qr !== undefined, platformName: browser.platformName, stage: loadingStage(browser), startedAt: browser.startedAt, loading: browser.picture?.loading !== false, onIdentify, onConnect }) : null,
        h('div', { ref: stageRef, className: cls('bw-stage') },
          // 网页还在加载时顶上一条细进度条（和普通浏览器一样）。
          browser.status === 'opening' || picture?.loading ? h('span', { className: cls('bw-progress'), role: 'progressbar', 'aria-label': t('browser.loading') }) : null,
          picture !== undefined ? h('img', { className: cls('bw-pic'), src: `data:image/jpeg;base64,${picture.data}`, alt: picture.title || t('browser.pictureAlt'), draggable: false, ...(interactive ? pointerHandlers(picture, onInput, track, focusKeys, mark) : {}) }) : null,
          marks.map(item => h('span', { key: item.id, className: cls('bw-mark'), style: { left: item.x, top: item.y }, 'aria-hidden': true })),
          interactive ? h('textarea', { ref: keysRef, className: cls('bw-keys'), 'aria-label': t('browser.keyboard'), autoCapitalize: 'off', autoComplete: 'off', spellCheck: false, onKeyDown,
            onInput: e => { if (!composing.current) sendText(e.currentTarget, e.currentTarget.value) },
            onCompositionStart: () => { composing.current = true },
            onCompositionEnd: e => { composing.current = false; sendText(e.currentTarget, e.data) },
            onPaste: e => { e.preventDefault(); sendText(e.currentTarget, e.clipboardData.getData('text/plain')) },
            onFocus: () => setFocused(true), onBlur: () => setFocused(false) }) : null,
          browser.status === 'opening' ? h('div', { className: cls('bw-over'), role: 'status', 'aria-label': t('browser.opening') }, h(Spin)) : null,
          browser.status === 'ended' || browser.status === 'failed' ? h('div', { className: cls('bw-over'), role: 'alert' },
            h('p', null, t(browser.reason ?? 'error.unknown')),
            h(Row, null, h(Btn, { kind: 'primary', sm: true, onClick: onRetry }, t('browser.reopen')), h(Btn, { sm: true, onClick: onClose }, t('action.close')))) : null),
        h('footer', { className: cls('bw-foot') }, h('span', null, t(focused ? 'browser.keyboardOn' : 'browser.keyboardOff')), h('span', null, t('browser.loginHint'))))
    }

    /** 小窗最下面那一行：现在到哪一步了。 */
    function MiniStatus({ browser, retry, identify, connect, expand }) {
      const [saving, setSaving] = useState(false)
      const [problem, setProblem] = useState(undefined)
      const line = (...children) => h('div', { className: cls('mini-status') }, children)
      if (browser.status === 'ended' || browser.status === 'failed') return line(h('span', { key: 't', className: cls('grow') }, t(browser.reason ?? 'error.unknown')), h(Btn, { key: 'b', sm: true, onClick: retry }, t('browser.reopen')))
      if (browser.mode !== 'connect') return null
      const { identity } = browser
      if (identity.status === 'none') return line(t('mini.waiting'))
      if (identity.status === 'identifying') return line(h(Spin, { key: 's', sm: true }), t('connect.identifying'))
      if (identity.status === 'failed') return line(h('span', { key: 't', className: cls('down', 'grow'), role: 'alert' }, t('mini.failed')), h(Btn, { key: 'b', sm: true, onClick: identify }, t('action.retry')))
      const confirm = async () => {
        setSaving(true)
        setProblem(undefined)
        const outcome = await connect(identity.identity, '')
        setSaving(false)
        if (!outcome.ok) setProblem(outcome.reason)
      }
      return line(
        h('span', { key: 't', className: cls('grow') }, t('mini.identified', { name: identity.identity.name })),
        h(Btn, { key: 'a', kind: 'primary', sm: true, busy: saving, onClick: confirm }, t(saving ? 'connect.saving' : identity.identity.existingAccountId === undefined ? 'connect.add' : 'connect.update')),
        h(Btn, { key: 'e', kind: 'ghost', sm: true, onClick: expand }, t('browser.expand')),
        problem !== undefined ? h('span', { key: 'p', className: cls('down'), role: 'alert' }, t('connect.failed', { reason: t(problem) })) : null)
    }

    function MiniBrowser({ browser, expand, close, retry, identify, connect }) {
      const [position, setPosition] = useState(undefined)
      const drag = useRef(undefined)
      // 缩小后的页面太小，二维码扫不了，所以没登录时单独放大显示二维码；想看整页可以切回去。
      const [showPage, setShowPage] = useState(false)
      if (browser.status === 'hidden' || !browser.minimized) return null
      const picture = browser.picture
      const qr = browser.login === 'logged-in' ? undefined : browser.qr
      // 只有标题那一条能拖，上面的按钮照常能点。位置限制在插件自己的区域里。
      const frameOf = el => el.offsetParent.getBoundingClientRect()
      const onPointerDown = e => {
        if (e.target.closest('[data-handle]') === null || e.target.closest('button') !== null) return
        const box = e.currentTarget.getBoundingClientRect()
        const frame = frameOf(e.currentTarget)
        e.preventDefault()
        e.currentTarget.setPointerCapture(e.pointerId)
        drag.current = { x: e.clientX, y: e.clientY, left: box.left - frame.left, top: box.top - frame.top }
      }
      const onPointerMove = e => {
        const start = drag.current
        if (start === undefined) return
        const box = e.currentTarget.getBoundingClientRect()
        const frame = frameOf(e.currentTarget)
        setPosition(clampMini({ left: start.left + e.clientX - start.x, top: start.top + e.clientY - start.y }, { width: box.width, height: box.height, viewportWidth: frame.width, viewportHeight: frame.height, topClearance: 0 }))
      }
      const onPointerEnd = e => {
        drag.current = undefined
        if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
      }
      const style = {
        ...(position === undefined ? {} : { '--mini-left': `${position.left}px`, '--mini-top': `${position.top}px` }),
        ...(picture === undefined ? {} : { '--mini-aspect': `${picture.width} / ${picture.height}` }),
      }
      return h('section', { className: cls('mini'), 'data-placed': position !== undefined, style, role: 'dialog', 'aria-label': t('browser.title', { platform: browser.platformName }), onPointerDown, onPointerMove, onPointerUp: onPointerEnd, onPointerCancel: onPointerEnd },
        h('header', { className: cls('mini-bar'), 'data-handle': '' },
          h('span', { className: cls('clip') }, browser.platformName), h(LoginTag, { state: browser.login }), h('span', { className: cls('grow') }),
          h(Btn, { kind: 'ghost', sm: true, icon: 'expand', label: t('browser.expand'), onClick: expand }),
          h(Btn, { kind: 'ghost', sm: true, icon: 'x', label: t('browser.close'), onClick: close })),
        qr !== undefined && !showPage
          ? h('div', { className: cls('mini-qr') },
            h('img', { src: `data:image/png;base64,${qr.data}`, alt: t('mini.qrAlt', { platform: browser.platformName }), style: { '--qr-aspect': `${qr.width} / ${qr.height}` }, draggable: false }),
            h('span', { className: cls('faint') }, t('mini.qrCaption', { platform: browser.platformName })))
          : h('button', { type: 'button', className: cls('mini-frame'), 'aria-label': t('browser.expand'), onClick: expand },
            picture === undefined ? h(Spin) : h('img', { src: `data:image/jpeg;base64,${picture.data}`, alt: '', draggable: false })),
        qr !== undefined ? h('div', { className: cls('mini-status') }, h(LinkBtn, { onClick: () => setShowPage(v => !v) }, t(showPage ? 'mini.qrOnly' : 'mini.fullPage'))) : null,
        h(MiniStatus, { browser, retry, identify, connect, expand }))
    }

    // ================================================================== 3V. 看板（照抖音创作者中心「数据中心」1:1 做的，所有平台用同一套）
    //
    // 结构：左边一列「总览 + 各平台的账号」｜中间看板｜右边可以拉出 AI 助手（DSH 自己的对话），右边缘两个竖条按钮：AI 助手、指标说明。
    //   3V.1 页面的数据   3V.2 设计系统（字、颜色、按钮、分段、卡片、指标卡、折线图、雷达图、平台 logo）
    //   3V.3 左边一列   3V.4 第一次打开   3V.5 总览   3V.6 账号看板   3V.7 作品详情弹窗   3V.8 加平台、指标说明
    //   3V.9 AI 助手   3V.10 整个页面
    //
    // 只画平台报告的数字：后台（dashboard / summary / postDetail）只给平台报告的，平台没有的指标整张卡不出现，不自己估。
    // 颜色、字号都在 THEME 和下面的 DY_STYLES 里，类名前缀 dy-。

    // ---- 3V.1 页面的数据：账号、总览、选中的是谁、谁在更新、AI 助手开没开

    /** 扫码加进来的账号，默认每隔多少分钟自动更新一次。 */
    const CONNECTED_INTERVAL_MINUTES = 360
    /** 每个平台最多几个账号。后台也会拦（maxAccountsPerPlatform），这里只是先把按钮藏起来。 */
    const MAX_ACCOUNTS = 3
    /** 多久重读一次总览：后台定时更新、登录失效这些变化，不用手动刷新也能出现在左边一列。 */
    const SUMMARY_POLL_MS = 5 * 60_000
    const SAVE_KEY = 'dsh-media.v2'
    /** 开发时用的演示数据入口：在浏览器控制台运行 localStorage.setItem('dsh-media.dev', '1') 再刷新。正式用户看不到。 */
    const DEV = (() => { try { return window.localStorage.getItem('dsh-media.dev') === '1' } catch { return false } })()
    KEYS['media/limit'] = 'v2.error.limit'

    function readSaved() {
      try { return JSON.parse(window.localStorage.getItem(SAVE_KEY) ?? '{}') ?? {} } catch { return {} }
    }
    function writeSaved(change) {
      try { window.localStorage.setItem(SAVE_KEY, JSON.stringify({ ...readSaved(), ...change })) } catch { /* 隐私模式存不了，只是下次打开不记得 */ }
    }

    /**
     * DSH 的颜色变量（--dsw-*）写在 body 上：浅色一份、body[data-ds-dark-theme] 一份。把这两份抄到插件根节点的
     * data-theme=light / dark 上，插件里用到 DSH 颜色的地方（弹窗、AI 助手那一栏）也跟着插件自己的日间/夜间走。
     * 读不到 DSH 的样式表时什么也不做，那些地方就照旧跟着 DSH。
     */
    function bridgeDshTheme() {
      const id = `${P}-theme-bridge`
      if (document.getElementById(id) !== null) return
      const blocks = { light: '', dark: '' }
      for (const sheet of document.styleSheets) {
        let rules
        try { rules = sheet.cssRules } catch { continue }
        for (const rule of rules ?? []) {
          const which = rule.selectorText === 'body' ? 'light' : rule.selectorText === 'body[data-ds-dark-theme]' ? 'dark' : undefined
          if (which === undefined) continue
          for (let i = 0; i < rule.style.length; i++) {
            const name = rule.style[i]
            if (name.startsWith('--dsw-')) blocks[which] += `${name}:${rule.style.getPropertyValue(name)};`
          }
        }
      }
      if (blocks.light === '' || blocks.dark === '') return
      const style = document.createElement('style')
      style.id = id
      style.textContent = `.${P}-root[data-theme=light]{${blocks.light}}.${P}-root[data-theme=dark]{${blocks.dark}}`
      document.head.appendChild(style)
    }

    /** 日间 / 夜间：默认日间，记在本机。 */
    function usePageTheme() {
      const [theme, setTheme] = useState(() => readSaved().theme === 'dark' ? 'dark' : 'light')
      useEffect(() => { bridgeDshTheme() }, [])
      const change = useCallback(next => { setTheme(next); writeSaved({ theme: next }) }, [])
      return [theme, change]
    }

    /** 左上角「自媒体」右边的胶囊：太阳是日间，月亮是夜间。 */
    function ThemeSwitch({ theme, onChange }) {
      return h('div', { className: cls('dy-theme'), role: 'radiogroup', 'aria-label': t('v2.theme.label') },
        ['light', 'dark'].map(value => h('button', {
          key: value, type: 'button', role: 'radio', 'aria-checked': theme === value, title: t(`v2.theme.${value}`), 'aria-label': t(`v2.theme.${value}`),
          className: cls('dy-theme-item'), onClick: () => onChange(value),
        }, h(Icon, { name: value === 'light' ? 'sun' : 'moon', size: 14 }))))
    }

    /**
     * 整个页面的数据都在这一个格子里：平台、账号、总览、选中哪个、谁在更新、AI 助手的开关和宽度。
     * version 每次数据可能变了（更新完、删了账号、加了演示数据）就加 1，看板按它重新取数。
     */
    function createMediaStore({ remote, report }) {
      const saved = readSaved()
      const cell = createCell({
        status: 'idle', reason: undefined, platforms: [], accounts: [], summary: undefined,
        view: saved.view?.kind === 'account' ? saved.view : { kind: 'overview' },
        busy: {}, version: 0,
        chat: { open: saved.chat?.open === true, width: Number(saved.chat?.width) || 420, pending: false, error: undefined },
      }, () => {
        if (cell.get().status === 'idle') void load()
        const timer = setInterval(() => { void loadSummary() }, SUMMARY_POLL_MS)
        return () => clearInterval(timer)
      })
      const get = cell.get
      const patch = next => cell.set({ ...get(), ...next })
      async function loadSummary() {
        const result = await settle(() => remote.summary())
        if (result.ok) patch({ summary: result.value, version: get().version + 1 })
      }
      async function load() {
        if (get().status !== 'ready') patch({ status: 'loading' })
        const [platforms, accounts, summary] = await Promise.all([settle(() => remote.platforms()), settle(() => remote.accounts()), settle(() => remote.summary())])
        const bad = [platforms, accounts, summary].find(result => !result.ok)
        if (bad !== undefined) { patch({ status: 'error', reason: errorKey(bad.code) }); return }
        const own = accounts.value.filter(account => account.role === 'own')
        const view = get().view
        // 选中的账号已经被删了，回到总览。
        const kept = view.kind === 'account' && !own.some(account => account.id === view.id) ? { kind: 'overview' } : view
        patch({ status: 'ready', reason: undefined, platforms: platforms.value, accounts: own, summary: summary.value, view: kept, version: get().version + 1 })
      }
      const setBusy = (id, on) => {
        const { [id]: _was, ...rest } = get().busy
        patch({ busy: on ? { ...rest, [id]: true } : rest })
      }
      const actions = {
        reload: load,
        reloadSummary: loadSummary,
        select: view => { patch({ view }); writeSaved({ view }) },
        refresh: async id => {
          if (get().busy[id]) return
          setBusy(id, true)
          const result = await settle(() => remote.refresh(id))
          setBusy(id, false)
          if (!result.ok) report(t('v2.notice.refreshFailed', { reason: t(errorKey(result.code)) }), 'danger')
          else if (!result.value.ok) report(t('v2.notice.refreshFailed', { reason: result.value.message ?? t(errorKey(result.value.errorCode)) }), 'danger')
          else report(t('v2.notice.refreshed'))
          // 整个重读：更新也可能换了账号的头像、名字。
          await load()
        },
        remove: async id => {
          const result = await settle(() => remote.deleteAccount(id))
          if (!result.ok) { report(t('v2.notice.deleteFailed', { reason: t(errorKey(result.code)) }), 'danger'); return }
          report(t('v2.notice.deleted'))
          await load()
        },
        /** 扫码认出账号以后加进来（重新登录已有账号时，备注和监控设置都留着），然后马上更新一次。 */
        connect: async (identity, niche, viewId) => {
          const existing = get().accounts.find(account => account.id === identity.existingAccountId)
          const typed = niche.trim()
          const draft = existing === undefined
            ? { platform: identity.platform, role: 'own', name: identity.name, profileUrl: identity.profileUrl, avatarUrl: identity.avatarUrl, niche: typed, notes: '', monitor: { enabled: true, intervalMinutes: CONNECTED_INTERVAL_MINUTES } }
            : { id: existing.id, platform: existing.platform, role: 'own', name: identity.name, profileUrl: identity.profileUrl, avatarUrl: identity.avatarUrl ?? existing.avatarUrl, niche: typed === '' ? existing.niche : typed, notes: existing.notes, monitor: existing.monitor }
          const result = await settle(() => remote.saveAccount(draft, viewId))
          if (!result.ok) return { ok: false, reason: errorKey(result.code) }
          await load()
          actions.select({ kind: 'account', id: result.value.id })
          void actions.refresh(result.value.id)
          return { ok: true, account: result.value }
        },
        loadDemo: async () => {
          const result = await settle(() => remote.loadDemo())
          if (!result.ok) { report(t('v2.notice.demoFailed', { reason: t(errorKey(result.code)) }), 'danger'); return }
          report(t('v2.notice.demoLoaded'))
          await load()
        },
        clearDemo: async () => {
          const result = await settle(() => remote.clearDemo())
          if (!result.ok) { report(t('v2.notice.demoFailed', { reason: t(errorKey(result.code)) }), 'danger'); return }
          report(t('v2.notice.demoCleared'))
          await load()
        },
        setChat: change => {
          const chat = { ...get().chat, ...change }
          patch({ chat })
          writeSaved({ chat: { open: chat.open, width: chat.width } })
        },
      }
      return { observable: cell.observable, get, actions }
    }

    /** 同一个账号、同样的天数，同一版数据只取一次（几块卡片同时要时共用一个请求）。 */
    const dashboardCache = new Map()
    function loadDashboard(id, days, version) {
      const key = `${id}:${days}:${version}`
      if (!dashboardCache.has(key)) {
        dashboardCache.set(key, settle(() => remote.dashboard(id, days)))
        if (dashboardCache.size > 40) dashboardCache.delete(dashboardCache.keys().next().value)
      }
      return dashboardCache.get(key)
    }
    /** 取一个账号的看板。换了天数或者数据有新版时重新取；取的过程中先留着上一份，不闪白。 */
    function useDashboard(id, days, version) {
      const [state, setState] = useState({ data: undefined, reason: undefined, loading: true })
      useEffect(() => {
        if (!id) return undefined
        let alive = true
        setState(now => ({ ...now, loading: true }))
        loadDashboard(id, days, version).then(result => {
          if (alive) setState(now => result.ok ? { data: result.value, reason: undefined, loading: false } : { ...now, reason: errorKey(result.code), loading: false })
        })
        return () => { alive = false }
      }, [id, days, version])
      return state
    }

    // ---- 3V.2 设计系统

    /** 各种状态用什么颜色、多要紧（数字小的排前面）。 */
    const HEALTH = {
      'login-required': { tone: 'danger', rank: 0 },
      failing: { tone: 'danger', rank: 1 },
      stale: { tone: 'warn', rank: 2 },
      pending: { tone: 'muted', rank: 3 },
      ok: { tone: 'ok', rank: 4 },
    }
    const healthOf = (summary, id) => summary?.accounts.find(item => item.account.id === id)?.health
    const needsAttention = health => health !== undefined && HEALTH[health.state].rank <= 2
    const worstHealth = list => list.filter(Boolean).sort((a, b) => HEALTH[a.state].rank - HEALTH[b.state].rank)[0]

    /** 指标的配色（照抖音：每个指标一个颜色，指标卡下划线、折线同色）。 */
    const DY_COLORS = ['#3D6CF5', '#FF7D00', '#14C9C9', '#F7BA1E', '#722ED1', '#F5319D', '#00B42A', '#3491FA', '#86909C']
    const dyColor = index => `var(--${P}-dy-c${index % DY_COLORS.length + 1})`
    const zhLocale = () => (uiLocale() ?? 'zh').toLowerCase().startsWith('zh')

    /** 大数字照抖音写：中文界面 6.81万、1.2亿；英文界面 68.1K。 */
    function dyNum(value) {
      if (value === undefined || value === null || !Number.isFinite(value)) return '—'
      const abs = Math.abs(value)
      if (!zhLocale()) return new Intl.NumberFormat('en', { notation: abs >= 10_000 ? 'compact' : 'standard', maximumFractionDigits: abs >= 10_000 ? 1 : 0 }).format(value)
      if (abs >= 1e8) return `${(value / 1e8).toFixed(2).replace(/\.?0+$/, '')}亿`
      if (abs >= 1e4) return `${(value / 1e4).toFixed(2).replace(/\.?0+$/, '')}万`
      return new Intl.NumberFormat('zh-CN').format(Math.round(value))
    }
    /** 指标按单位写：百分比带一到两位小数，时长写秒。 */
    function dyValue(value, unit) {
      if (value === undefined || value === null || !Number.isFinite(value)) return '—'
      if (unit === 'percent') return `${(value * 100).toFixed(Math.abs(value) < 0.1 ? 2 : 1)}%`
      if (unit === 'seconds') return t('v2.unit.seconds', { value: value.toFixed(1) })
      return dyNum(value)
    }
    /** 图上停住时显示的完整数字。 */
    function dyFull(value, unit) {
      if (unit !== 'count') return dyValue(value, unit)
      return new Intl.NumberFormat(zhLocale() ? 'zh-CN' : 'en').format(Math.round(value))
    }
    const dotDay = day => `${day.slice(5, 7)}-${day.slice(8, 10)}`
    const rangeText = (from, to) => from === to ? from.slice(5).replace('-', '.') : `${from.slice(5).replace('-', '.')}-${to.slice(5).replace('-', '.')}`

    /** 比上一周期涨了还是跌了：绿色↑、红色↓。 */
    function Change({ change, label }) {
      if (change === undefined || change === null || !Number.isFinite(change)) return h('span', { className: cls('dy-change') }, label ? `${label} —` : '')
      // 四舍五入后是 0.0% 的不标涨跌，写「持平」。
      if (Math.abs(change) < 0.0005) return h('span', { className: cls('dy-change') }, label ? `${label} ` : '', t('v2.compare.flat'))
      const up = change >= 0
      return h('span', { className: cls('dy-change', up ? 'dy-up' : 'dy-down') }, label ? `${label} ` : '', `${up ? '↑' : '↓'}${Math.abs(change * 100).toFixed(Math.abs(change) < 0.1 ? 1 : 0)}%`)
    }

    /** 名字旁的 ⓘ：停上去出黑底说明（照抖音）。 */
    const Tip = ({ text }) => text ? h('span', { className: cls('dy-tip'), 'data-tip': text, tabIndex: 0, 'aria-label': text }, h(Icon, { name: 'info', size: 13 })) : null

    /** 按钮：primary 黑底白字（照抖音「作品发布」）、secondary 灰底（「导出数据」）、text 只有字。 */
    function DyBtn({ kind = 'secondary', icon, busy, disabled, onClick, title, children }) {
      return h('button', { type: 'button', className: cls('dy-btn', `dy-btn-${kind}`), disabled: disabled || busy, onClick, title, 'aria-busy': busy || undefined },
        busy ? h(Spin, { sm: true }) : icon ? h(Icon, { name: icon, size: 15 }) : null, children)
    }

    /** 分段选择（照抖音「昨天 | 近7天 | 近30天」：灰底、选中白底）。 */
    function DySeg({ value, options, onChange, label }) {
      return h('div', { className: cls('dy-seg'), role: 'group', 'aria-label': label }, options.map(option => h('button', {
        key: option.value, type: 'button', className: cls('dy-seg-item'), 'aria-pressed': option.value === value, onClick: () => onChange(option.value),
      }, option.label)))
    }

    /** 一张白卡片：标题（带 ⓘ）、统计周期小字、右上角的控件。 */
    function DyCard({ title, tip, note, tools, id, children }) {
      return h('section', { className: cls('dy-card'), id },
        title ? h('header', { className: cls('dy-card-head') },
          h('h2', { className: cls('dy-card-title') }, title, h(Tip, { text: tip })),
          note ? h('span', { className: cls('dy-card-note') }, note) : null,
          h('span', { className: cls('grow') }),
          tools ? h('div', { className: cls('dy-card-tools') }, tools) : null) : null,
        children)
    }

    /** 平台 logo（左边一列、账号卡片、看板标题用）。画的是各平台图标的简化版，颜色在 THEME 里。 */
    function PlatformLogo({ platform, size = 20 }) {
      const id = platform?.id ?? platform
      const box = { width: size, height: size, display: 'block', flex: 'none' }
      const tile = fill => h('rect', { width: 24, height: 24, rx: 6, fill })
      if (id === 'douyin') {
        const note = 'M13.2 4.5v10.3a3.2 3.2 0 1 1-3.2-3.2M13.2 4.5c.4 2.3 2.2 3.9 4.6 4'
        const stroke = (color, dx, dy) => h('path', { d: note, fill: 'none', stroke: color, strokeWidth: 2.3, strokeLinecap: 'round', strokeLinejoin: 'round', transform: `translate(${dx} ${dy})` })
        return h('svg', { viewBox: '0 0 24 24', style: box, 'aria-hidden': true }, tile(`var(--${P}-logo-douyin)`), stroke('#25F4EE', -0.7, -0.6), stroke('#FE2C55', 0.7, 0.6), stroke('#FFFFFF', 0, 0))
      }
      if (id === 'xiaohongshu') {
        return h('svg', { viewBox: '0 0 24 24', style: box, 'aria-hidden': true }, tile(`var(--${P}-p-xiaohongshu)`),
          h('text', { x: 12, y: 14.6, textAnchor: 'middle', fontSize: 6.6, fontWeight: 800, fill: '#fff', fontFamily: 'PingFang SC,sans-serif', letterSpacing: '-0.2' }, '小红书'))
      }
      if (id === 'wechat-mp') {
        return h('svg', { viewBox: '0 0 24 24', style: box, 'aria-hidden': true }, tile(`var(--${P}-p-wechat-mp)`),
          h('path', { d: 'M9.6 6.3c-3 0-5.4 2-5.4 4.4 0 1.4.8 2.6 2 3.4l-.5 1.6 1.9-1c.6.2 1.3.3 2 .3h.4a3.6 3.6 0 0 1-.2-1.1c0-2.3 2.2-4.1 5-4.1h.3c-.5-2-2.8-3.5-5.5-3.5Z', fill: '#fff' }),
          h('path', { d: 'M19.8 13.9c0-2-1.9-3.5-4.3-3.5s-4.3 1.6-4.3 3.5 1.9 3.5 4.3 3.5c.5 0 1-.1 1.5-.2l1.5.8-.4-1.3c1-.7 1.7-1.7 1.7-2.8Z', fill: '#fff', opacity: 0.92 }))
      }
      if (id === 'wechat-channels') {
        return h('svg', { viewBox: '0 0 24 24', style: box, 'aria-hidden': true }, tile(`var(--${P}-p-wechat-channels)`),
          h('path', { d: 'M4.6 12c0-2.6 1.5-4.4 3.3-3.2L12 12l4.1-3.2c1.8-1.2 3.3.6 3.3 3.2s-1.5 4.4-3.3 3.2L12 12l-4.1 3.2c-1.8 1.2-3.3-.6-3.3-3.2Z', fill: 'none', stroke: '#fff', strokeWidth: 1.9, strokeLinejoin: 'round' }))
      }
      // 以后接入的平台（少数派、X……）没有画好的 logo：用它自己的品牌色做底，写平台名的第一个字。
      return h('svg', { viewBox: '0 0 24 24', style: box, 'aria-hidden': true }, tile(platform?.color ?? `var(--${P}-p-other)`),
        h('text', { x: 12, y: 16, textAnchor: 'middle', fontSize: 11, fontWeight: 700, fill: '#fff' }, String(platform?.displayName ?? id ?? '?').slice(0, 1)))
    }

    /** 账号头像：平台上的头像图，没有或加载失败时显示名字的第一个字；badge 时右下角带平台小 logo。 */
    function AccountAvatar({ account, platform, size = 20, badge = false }) {
      const [broken, setBroken] = useState(false)
      const initial = account.name.replace(/^演示\s*·\s*/, '').slice(0, 1)
      return h('span', { className: cls('dy-avatar'), style: { width: size, height: size, fontSize: Math.round(size * 0.5) } },
        account.avatarUrl && !broken ? h('img', { src: account.avatarUrl, alt: '', referrerPolicy: 'no-referrer', loading: 'lazy', draggable: false, onError: () => setBroken(true) }) : initial,
        badge && platform ? h('span', { className: cls('dy-avatar-badge') }, h(PlatformLogo, { platform, size: Math.max(12, Math.round(size * 0.38)) })) : null)
    }

    /** 账号状态的小圆点（正常时不画）。 */
    function HealthDot({ health }) {
      if (health === undefined || health.state === 'ok') return null
      return h('span', { className: cls('dy-dot', `dy-dot-${HEALTH[health.state].tone}`), title: t(`v2.health.${health.state}`), role: 'img', 'aria-label': t(`v2.health.${health.state}`) })
    }
    function HealthTag({ health }) {
      if (health === undefined || health.state === 'ok') return null
      return h('span', { className: cls('dy-tag', `dy-tag-${HEALTH[health.state].tone}`) }, t(`v2.health.${health.state}`))
    }

    /** 数据是什么时候的、下次什么时候更新。 */
    function freshness(health, now) {
      if (health === undefined) return ''
      const parts = [health.updatedAt === undefined ? t('v2.fresh.never') : t('v2.fresh.updated', { ago: agoText(health.updatedAt, now) })]
      if (health.monitored && health.nextRunAt !== undefined) parts.push(t('v2.fresh.next', { at: formatInstant(health.nextRunAt) }))
      if (!health.monitored) parts.push(t('v2.fresh.manual'))
      return parts.join(' · ')
    }

    /** 作品封面（3:4）。没有封面或者加载失败时，画一块灰底和作品类型图标。 */
    function PostCover({ post, width = 48 }) {
      const [broken, setBroken] = useState(false)
      const style = { width, height: Math.round(width * 4 / 3) }
      if (post.coverUrl && !broken) return h('img', { className: cls('dy-cover'), style, src: post.coverUrl, alt: '', referrerPolicy: 'no-referrer', loading: 'lazy', onError: () => setBroken(true) })
      return h('span', { className: cls('dy-cover', 'dy-cover-blank'), style }, h(Icon, { name: post.format === 'article' ? 'file' : post.format === 'image' ? 'image' : 'play', size: Math.max(14, Math.round(width / 3)) }))
    }

    /** 坐标轴：分四格、刻度取整齐的数。zero 为 false 时贴着数据画（累计值用），integer 时刻度只取整数。 */
    function axisOf(values, { zero = true, integer = false } = {}) {
      const max = zero ? Math.max(0, ...values) : Math.max(...values)
      const min = zero ? Math.min(0, ...values) : Math.min(...values)
      const span = max - min || Math.abs(max) || 1
      const raw = span / 4
      const power = 10 ** Math.floor(Math.log10(raw))
      const nice = [1, 2, 2.5, 5, 10].map(m => m * power).find(m => m >= raw) ?? raw
      const step = integer ? Math.max(1, Math.ceil(nice)) : nice
      const lo = Math.floor(min / step) * step
      const hi = Math.max(lo + step, Math.ceil(max / step) * step)
      const ticks = []
      for (let v = lo; v <= hi + step / 2; v += step) ticks.push(v)
      return { lo, hi, ticks }
    }

    /**
     * 折线图（照抖音：单条线、渐变面积、横向虚线网格、鼠标移上去出十字线和白底浮层）。
     *   h(DyLine, { points: [{ day, value }], unit, label, color: 0 })
     */
    function DyLine({ points, unit = 'count', label, color = 0, height = 320, zero = true }) {
      const [ref, width] = useWidth()
      const [hover, setHover] = useState(undefined)
      const gradient = useRef(`dyg-${Math.random().toString(36).slice(2, 8)}`).current
      if (points.length === 0) return h('div', { ref, className: cls('dy-chart-empty'), style: { height } }, h(Icon, { name: 'chart', size: 28 }), t('v2.chart.empty'))
      const W = Math.max(width, 280)
      const H = height
      const pad = { l: 56, r: 20, t: 16, b: 32 }
      const { lo, hi, ticks } = axisOf(points.map(p => p.value), { zero, integer: unit === 'count' })
      const x = i => points.length === 1 ? pad.l + (W - pad.l - pad.r) / 2 : pad.l + i * (W - pad.l - pad.r) / (points.length - 1)
      const y = v => pad.t + (H - pad.t - pad.b) * (1 - (v - lo) / (hi - lo))
      const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join('')
      const base = y(zero ? Math.max(lo, 0) : lo)
      const area = `${line}L${x(points.length - 1).toFixed(1)},${base.toFixed(1)}L${x(0).toFixed(1)},${base.toFixed(1)}Z`
      const every = Math.max(1, Math.ceil(points.length / 8))
      const stroke = dyColor(color)
      const onMove = e => {
        const box = e.currentTarget.getBoundingClientRect()
        const px = (e.clientX - box.left) * (W / box.width)
        const i = points.length === 1 ? 0 : Math.round((px - pad.l) / ((W - pad.l - pad.r) / (points.length - 1)))
        setHover(Math.max(0, Math.min(points.length - 1, i)))
      }
      const at = hover === undefined ? undefined : points[hover]
      return h('div', { ref, className: cls('dy-chart') },
        h('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': label, onPointerMove: onMove, onPointerLeave: () => setHover(undefined) },
          h('defs', null, h('linearGradient', { id: gradient, x1: 0, y1: 0, x2: 0, y2: 1 },
            h('stop', { offset: '0%', stopColor: stroke, stopOpacity: 0.18 }), h('stop', { offset: '100%', stopColor: stroke, stopOpacity: 0 }))),
          ticks.map(v => h('g', { key: v },
            h('line', { x1: pad.l, x2: W - pad.r, y1: y(v), y2: y(v), className: cls('dy-grid') }),
            h('text', { x: pad.l - 10, y: y(v) + 4, textAnchor: 'end', className: cls('dy-axis') }, dyValue(v, unit === 'seconds' ? 'count' : unit)))),
          points.map((p, i) => i % every === 0 || i === points.length - 1
            ? h('text', { key: p.day, x: x(i), y: H - 8, textAnchor: 'middle', className: cls('dy-axis') }, dotDay(p.day)) : null),
          points.length > 1 ? h('path', { d: area, fill: `url(#${gradient})` }) : null,
          points.length > 1 ? h('path', { d: line, fill: 'none', stroke, strokeWidth: 2, strokeLinejoin: 'round', strokeLinecap: 'round' }) : null,
          points.length === 1 ? h('circle', { cx: x(0), cy: y(points[0].value), r: 4, fill: stroke }) : null,
          at !== undefined ? h(Fragment, null,
            h('line', { x1: x(hover), x2: x(hover), y1: pad.t, y2: H - pad.b, className: cls('dy-guide') }),
            h('circle', { cx: x(hover), cy: y(at.value), r: 4.5, fill: `var(--${P}-dy-card)`, stroke, strokeWidth: 2 })) : null),
        at !== undefined ? h('div', { className: cls('dy-pop'), style: { left: `${(x(hover) / W) * 100}%`, transform: `translateX(${x(hover) / W > 0.7 ? '-105%' : '8%'})` } },
          h('span', { className: cls('dy-pop-day') }, at.day),
          h('span', { className: cls('dy-pop-row') }, h('i', { style: { background: stroke } }), label, h('b', null, dyFull(at.value, unit)))) : null)
    }

    /**
     * 一排指标卡（照抖音：130×94、浅灰底，点哪张下面的图就画哪个，选中的底部一条指标色）。
     * 名字旁的 ⓘ 是这个数怎么算的；下面一行比上一周期。
     */
    function MetricCards({ kpis, value, onChange }) {
      return h('div', { className: cls('dy-metrics'), role: 'tablist' }, kpis.map((kpi, index) => h('button', {
        key: kpi.key, type: 'button', role: 'tab', className: cls('dy-metric'), 'aria-selected': kpi.key === value,
        style: { '--dy-metric-color': dyColor(index) }, onClick: () => onChange(kpi.key),
      },
      h('span', { className: cls('dy-metric-label') }, kpi.label, h(Tip, { text: kpi.hint })),
      h('b', { className: cls('dy-num', 'dy-metric-value') }, dyValue(kpi.value, kpi.unit)),
      h(Change, { change: kpi.change, label: t('v2.compare.short') }))))
    }

    /**
     * 雷达图（照抖音「数据总览」：中间五边形网 + 两层多边形，四周是每个维度的方框）。
     * 抖音的第二层是「同类作者」；平台不给同类作者的数，这里第二层画「前7天」的自己，看的是这周比上周。
     * 每个维度按两期里较大的那个归一（较大的那个碰到 90% 的圈）。
     */
    const RADAR_FRAC = 0.58
    const RADAR_ASPECT = 1.5
    function DyRadar({ kpis, selected, onSelect }) {
      const [show, setShow] = useState({ current: true, previous: true })
      const stageRef = useRef(null)
      // 窄的时候外圈方框可能超出卡片：量一下，超出多少往里挪多少。
      useLayoutEffect(() => {
        const stage = stageRef.current
        if (stage === null) return undefined
        const fit = () => {
          const frame = stage.getBoundingClientRect()
          for (const box of stage.querySelectorAll('[data-radar-box]')) {
            box.style.marginLeft = '0px'
            const r = box.getBoundingClientRect()
            box.style.marginLeft = `${r.left < frame.left ? frame.left - r.left : r.right > frame.right ? frame.right - r.right : 0}px`
          }
        }
        fit()
        const watch = new ResizeObserver(fit)
        watch.observe(stage)
        return () => watch.disconnect()
      })
      const size = 260
      const c = size / 2
      const r = 104
      const n = kpis.length
      const angle = i => -Math.PI / 2 + (i * 2 * Math.PI) / n
      const point = (i, f) => [c + Math.cos(angle(i)) * r * f, c + Math.sin(angle(i)) * r * f]
      const ratio = (kpi, which) => {
        const top = Math.max(Math.abs(kpi.value ?? 0), Math.abs(kpi.previous ?? 0))
        const v = which === 'current' ? kpi.value : kpi.previous
        return top === 0 || v === undefined ? 0.04 : Math.max(0.04, (Math.abs(v) / top) * 0.9)
      }
      const polygon = which => kpis.map((kpi, i) => point(i, ratio(kpi, which)).map(v => v.toFixed(1)).join(',')).join(' ')
      // 方框放在每个顶点外侧：上中、右、右下、左下、左（按维度数自动排）。图占舞台宽度的 RADAR_FRAC，舞台宽高比 RADAR_ASPECT。
      // 方框贴着顶点往外放：右边的顶点方框往右，左边的往左，上面的往上，下面的往下。
      const labelPos = i => {
        const [px, py] = point(i, 1.1)
        const dx = Math.cos(angle(i))
        const dy = Math.sin(angle(i))
        const tx = dx > 0.3 ? '0%' : dx < -0.3 ? '-100%' : '-50%'
        const ty = dy < -0.5 ? '-100%' : dy > 0.5 ? '0%' : '-50%'
        return { left: `${(0.5 + RADAR_FRAC * (px / size - 0.5)) * 100}%`, top: `${(0.5 + RADAR_FRAC * RADAR_ASPECT * (py / size - 0.5)) * 100}%`, transform: `translate(${tx},${ty})` }
      }
      return h('div', { className: cls('dy-radar') },
        h('div', { ref: stageRef, className: cls('dy-radar-stage') },
          h('svg', { viewBox: `0 0 ${size} ${size}`, className: cls('dy-radar-svg'), role: 'img', 'aria-label': t('v2.radar.label') },
            [1, 0.75, 0.5, 0.25].map(f => h('polygon', { key: f, points: kpis.map((_, i) => point(i, f).join(',')).join(' '), className: cls('dy-radar-ring') })),
            kpis.map((_, i) => { const [px, py] = point(i, 1); return h('line', { key: i, x1: c, y1: c, x2: px, y2: py, className: cls('dy-radar-axis') }) }),
            show.previous ? h('polygon', { points: polygon('previous'), className: cls('dy-radar-prev') }) : null,
            show.current ? h('polygon', { points: polygon('current'), className: cls('dy-radar-cur') }) : null,
            show.current ? kpis.map((kpi, i) => { const [px, py] = point(i, ratio(kpi, 'current')); return h('circle', { key: kpi.key, cx: px, cy: py, r: 3.2, className: cls('dy-radar-dot') }) }) : null),
          kpis.map((kpi, i) => h('button', {
            key: kpi.key, type: 'button', className: cls('dy-radar-box'), 'data-radar-box': true, 'aria-pressed': kpi.key === selected, style: labelPos(i), onClick: () => onSelect(kpi.key),
          },
          h('span', { className: cls('dy-radar-box-top') }, h('span', null, kpi.label), trendTag(kpi.change)),
          h('span', { className: cls('dy-radar-box-val') }, h('b', { className: cls('dy-num') }, dyValue(kpi.value, kpi.unit)), h(Change, { change: kpi.change }))))),
        h('div', { className: cls('dy-legend') },
          h('button', { type: 'button', 'aria-pressed': show.current, onClick: () => setShow(s => ({ ...s, current: !s.current })) }, h('i', { className: cls('dy-legend-cur') }), t('v2.radar.current')),
          h('button', { type: 'button', 'aria-pressed': show.previous, onClick: () => setShow(s => ({ ...s, previous: !s.previous })) }, h('i', { className: cls('dy-legend-prev') }), t('v2.radar.previous'))))
    }
    /** 方框里的小标签（照抖音「优秀」）：比前 7 天涨三成以上是「明显提升」，跌三成以上是「明显下降」。 */
    function trendTag(change) {
      if (change === undefined || Math.abs(change) < 0.3) return null
      return h('span', { className: cls('dy-tag', change > 0 ? 'dy-tag-good' : 'dy-tag-danger') }, t(change > 0 ? 'v2.radar.tagUp' : 'v2.radar.tagDown'))
    }

    /** 一条作品有哪些数（按平台的叫法，平台没有的不列）。 */
    const DEFAULT_COUNTER_LABELS = { views: '播放', likes: '点赞', comments: '评论', shares: '分享', collects: '收藏' }
    function postNumbers(post, platform) {
      const labels = platform?.metrics ?? DEFAULT_COUNTER_LABELS
      return ['views', 'likes', 'comments', 'shares', 'collects'].flatMap(key => labels[key] !== undefined && post[key] !== undefined ? [[labels[key], post[key], key]] : [])
    }

    /** 把几行数据存成表格下载（Excel、WPS 能直接打开）。 */
    function exportKpis(name, kpis) {
      const days = [...new Set(kpis.flatMap(kpi => kpi.daily.map(item => item.day)))].sort()
      const header = [t('v2.export.day'), ...kpis.map(kpi => kpi.label)]
      const rows = days.map(day => [day, ...kpis.map(kpi => {
        const item = kpi.daily.find(point => point.day === day)
        return item === undefined ? '' : kpi.unit === 'percent' ? `${(item.value * 100).toFixed(2)}%` : kpi.unit === 'seconds' ? item.value.toFixed(1) : item.value
      })])
      downloadCsv(`${name}.csv`, header, rows)
    }
    /** 表格里的时间写全：2026-11-08 19:48（本机时区）。 */
    function sheetTime(iso) {
      const d = new Date(iso)
      const two = n => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())} ${two(d.getHours())}:${two(d.getMinutes())}`
    }
    function exportPosts(name, posts, platform) {
      const labels = platform?.metrics ?? DEFAULT_COUNTER_LABELS
      const keys = ['views', 'likes', 'comments', 'shares', 'collects'].filter(key => labels[key] !== undefined)
      downloadCsv(`${name}.csv`, [t('v2.export.title'), t('v2.export.published'), ...keys.map(key => labels[key]), t('v2.export.link')],
        posts.map(post => [post.title, post.publishedAt ? sheetTime(post.publishedAt) : '', ...keys.map(key => post[key] ?? ''), post.url ?? '']))
    }

    // ---- 3V.3 左边一列：总览、各平台和账号、添加平台
    //
    // 只显示已经加了账号的平台。平台名停上去出现「添加账号」（满 3 个就不出现），账号名停上去出现删除。
    // 账号登录失效、更新失败、数据过期时，名字右边一个红点或黄点，「总览」上也带最严重的那个。

    function MediaNav({ store, onAddAccount, onAddPlatform, onRemove, theme, onTheme }) {
      const { platforms, accounts, summary, view, busy } = store
      const groups = platforms.map(platform => ({ platform, items: accounts.filter(account => account.platform === platform.id) })).filter(group => group.items.length > 0)
      const demo = accounts.some(account => account.demo === true)
      return h('nav', { className: cls('dy-nav'), 'aria-label': t('v2.nav.label') },
        h('div', { className: cls('dy-nav-brand') }, h(Icon, { name: 'chart', size: 18 }), h('span', { className: cls('dy-nav-label') }, t('page.title')), h(ThemeSwitch, { theme, onChange: onTheme })),
        h('button', { type: 'button', className: cls('dy-nav-item'), 'aria-current': view.kind === 'overview' ? 'page' : undefined, onClick: () => face.select({ kind: 'overview' }) },
          h(Icon, { name: 'home', size: 18 }), h('span', { className: cls('dy-nav-label') }, t('v2.nav.overview')),
          h(HealthDot, { health: worstHealth(accounts.map(account => healthOf(summary, account.id))) })),
        groups.map(({ platform, items }) => h('div', { key: platform.id, className: cls('dy-nav-group') },
          h('div', { className: cls('dy-nav-head') },
            h(PlatformLogo, { platform, size: 18 }),
            h('span', { className: cls('dy-nav-label') }, platform.displayName, platform.beta ? h('span', { className: cls('dy-beta') }, t('v2.beta')) : null),
            items.length < MAX_ACCOUNTS
              ? h('button', { type: 'button', className: cls('dy-nav-act'), title: t('v2.nav.addAccount', { platform: platform.displayName }), onClick: () => onAddAccount(platform) }, h(Icon, { name: 'plus', size: 13 }), t('v2.nav.add'))
              : null),
          items.map(account => {
            const health = healthOf(summary, account.id)
            const current = view.kind === 'account' && view.id === account.id
            return h('div', { key: account.id, className: cls('dy-nav-row'), 'data-current': current },
              h('button', { type: 'button', className: cls('dy-nav-item', 'dy-nav-child'), 'aria-current': current ? 'page' : undefined, title: health && health.state !== 'ok' ? t(`v2.health.${health.state}`) : account.name, onClick: () => face.select({ kind: 'account', id: account.id }) },
                h(AccountAvatar, { account, size: 22 }),
                h('span', { className: cls('dy-nav-label') }, account.name),
                busy[account.id] ? h(Spin, { sm: true }) : h(HealthDot, { health })),
              h('button', { type: 'button', className: cls('dy-nav-del'), title: t('v2.nav.remove', { name: account.name }), 'aria-label': t('v2.nav.remove', { name: account.name }), onClick: () => onRemove(account) }, h(Icon, { name: 'trash', size: 14 })))
          }))),
        h('button', { type: 'button', className: cls('dy-nav-plus'), onClick: onAddPlatform }, h(Icon, { name: 'plus', size: 16 }), t('v2.nav.addPlatform')),
        h('div', { className: cls('dy-nav-foot') },
          demo ? h('p', null, t('v2.demo.note'), ' ', h('button', { type: 'button', className: cls('dy-link'), onClick: face.clearDemo }, t('v2.demo.clear'))) : null))
    }

    // ---- 3V.4 第一次打开：还没有账号时，整个中间只让用户添加账号；加了第一个以后才出现看板

    function FirstRun({ platforms, onPick }) {
      const usable = platforms.filter(platform => platform.scrape)
      return h('div', { className: cls('dy-first') },
        h('div', { className: cls('dy-first-logos') }, usable.map(platform => h(PlatformLogo, { key: platform.id, platform, size: 40 }))),
        h('h1', { className: cls('dy-first-title') }, t('v2.first.title')),
        h('p', { className: cls('dy-first-body') }, t('v2.first.body')),
        h('div', { className: cls('dy-pick') }, usable.map(platform => h('button', { key: platform.id, type: 'button', className: cls('dy-pick-item'), onClick: () => onPick(platform) },
          h(PlatformLogo, { platform, size: 36 }),
          h('span', { className: cls('dy-pick-name') }, platform.displayName, platform.beta ? h('span', { className: cls('dy-beta') }, t('v2.beta')) : null),
          h('span', { className: cls('dy-pick-sub') }, t('v2.add.scan'))))),
        h('p', { className: cls('dy-first-note') }, t('v2.first.note')),
        DEV ? h('button', { type: 'button', className: cls('dy-link'), onClick: face.loadDemo }, t('v2.demo.load')) : null)
    }

    // ---- 3V.5 总览：AI 概述 → 全网数据 → 各账号数据（便当盒）→ 最新作品（瀑布流）
    //
    // 数都来自后台的 network(days)：每个账号按自己平台的统计周期，全网是直接相加（不去重）。
    // 周期（昨天 / 近7天 / 近30天）管全网数据和各账号数据；AI 概述固定看近 7 天。

    function Attention({ items, onAction }) {
      if (items.length === 0) return null
      return h('div', { className: cls('dy-alerts') }, items.map(({ account, platform, health }) => h('div', { key: account.id, className: cls('dy-alert', `dy-alert-${HEALTH[health.state].tone}`), role: 'alert' },
        h(Icon, { name: 'warn', size: 16 }),
        h(PlatformLogo, { platform, size: 16 }),
        h('span', { className: cls('grow') }, h('b', null, `${platform.displayName} · ${account.name}`), ' ', t(`v2.health.${health.state}.long`), health.message ? `（${health.message}）` : ''),
        h(DyBtn, { kind: health.state === 'login-required' ? 'primary' : 'secondary', onClick: () => onAction(account, health) }, t(`v2.fix.${health.state}`)))))
    }

    /** 同一个周期、同一版数据只取一次（几块同时要时共用一个请求）。 */
    const networkCache = new Map()
    function useNetwork(days, version) {
      const [state, setState] = useState({ data: undefined, reason: undefined })
      useEffect(() => {
        let alive = true
        const key = `${days}:${version}`
        if (!networkCache.has(key)) {
          networkCache.set(key, settle(() => remote.network(days)))
          if (networkCache.size > 12) networkCache.delete(networkCache.keys().next().value)
        }
        networkCache.get(key).then(result => {
          if (alive) setState(now => result.ok ? { data: result.value, reason: undefined } : { ...now, reason: errorKey(result.code) })
        })
        return () => { alive = false }
      }, [days, version])
      return state
    }

    const chinaDate = iso => new Date(new Date(iso).getTime() + 8 * 3_600_000).toISOString().slice(0, 10)
    /** 一次打开页面最多补写一次今日简报（每天定时那一刻没开 DSH 时）：用的是用户的模型额度。 */
    let briefStarted = false

    /**
     * 今日简报：每天定时（默认 9 点）后台写一份；打开总览时今天还没有，就现在写。写的时候每隔一会儿去问一次，
     * 写好一行就显示一行（信息流）。
     */
    function useBrief(hasReal) {
      const [state, setState] = useState({ loaded: false, brief: undefined, running: false, partial: [], problem: undefined, scheduleAt: '09:00' })
      const alive = useRef(true)
      const timer = useRef(undefined)
      const poll = useCallback(async () => {
        const result = await settle(() => remote.brief())
        if (!alive.current) return
        if (!result.ok) { setState(now => ({ ...now, loaded: true, problem: t(errorKey(result.code)) })); return }
        setState({ loaded: true, ...result.value })
        if (result.value.running) timer.current = setTimeout(poll, 600)
      }, [])
      const start = useCallback(async () => {
        setState(now => ({ ...now, running: true, partial: [], problem: undefined }))
        const result = await settle(() => remote.startBrief())
        if (!alive.current) return
        if (!result.ok) { setState(now => ({ ...now, running: false, problem: result.message ?? t(errorKey(result.code)) })); return }
        setState({ loaded: true, ...result.value })
        clearTimeout(timer.current)
        timer.current = setTimeout(poll, 600)
      }, [poll])
      useEffect(() => {
        alive.current = true
        settle(() => remote.brief()).then(result => {
          if (!alive.current) return
          if (!result.ok) { setState(now => ({ ...now, loaded: true, problem: t(errorKey(result.code)) })); return }
          const value = result.value
          if (!value.running && value.brief?.day !== chinaDate(new Date().toISOString()) && hasReal && !briefStarted) {
            briefStarted = true
            void start()
            return
          }
          setState({ loaded: true, ...value })
          if (value.running) timer.current = setTimeout(poll, 600)
        })
        return () => { alive.current = false; clearTimeout(timer.current) }
      }, [])
      return { ...state, start }
    }

    const BRIEF_KINDS = ['alert', 'fact', 'action', 'topic']
    /** 数字（含万、%、k）加粗，一眼看到关键数。 */
    function emphasize(text) {
      const parts = String(text).split(/(\d[\d,.]*\s*(?:万|亿|%|k|K|w|W)?)/)
      return parts.map((part, index) => index % 2 === 1 ? h('b', { key: index }, part) : part)
    }

    function BriefRow({ item, index, store, onOpen }) {
      const account = item.accountId ? store.accounts.find(entry => entry.id === item.accountId) : undefined
      const platform = account ? store.platforms.find(entry => entry.id === account.platform) : platformByName(store.platforms, item.platform)
      return h('button', { type: 'button', className: cls('dy-brief-row'), style: { animationDelay: `${Math.min(index, 8) * 70}ms` }, onClick: () => onOpen(index) },
        h('span', { className: cls('dy-brief-tag', `dy-brief-${item.kind}`) }, t(`v2.brief.${item.kind}`)),
        h('span', { className: cls('dy-brief-text') }, emphasize(item.text)),
        account ? h(AccountAvatar, { account, platform, size: 18, badge: false }) : platform ? h(PlatformLogo, { platform, size: 16 }) : null,
        h(Icon, { name: 'right', size: 12 }))
    }

    /** 简报一行说的是哪几个账号：指名的那个；只写了平台的，就是那个平台的号。 */
    function briefAccounts(item, store, net) {
      if (!net) return []
      if (item.accountId) return net.accounts.filter(entry => entry.account.id === item.accountId)
      const platform = platformByName(store.platforms, item.platform)
      return platform ? net.accounts.filter(entry => entry.platform.id === platform.id) : []
    }

    const BRIEF_SIDE_KPIS = ['views', 'fansNet', 'followers', 'engagement', 'likes', 'comments', 'shares']

    /** 一个账号在这一条上的数（都是平台报的）：主数 + 走势，旁边几个次要的数。 */
    function BriefAccountFacts({ entry, metric }) {
      const mainKey = bentoValue(entry, metric) ? metric : 'views'
      const main = bentoValue(entry, mainKey)
      const others = BRIEF_SIDE_KPIS.filter(key => key !== mainKey).map(key => [key, bentoValue(entry, key)]).filter(([, value]) => value !== undefined && value.value !== undefined).slice(0, 3)
      const color = entry.platform.color ?? dyColor(0)
      return h('div', { className: cls('dy-bd-acct') },
        h('div', { className: cls('dy-bd-who') },
          h(AccountAvatar, { account: entry.account, platform: entry.platform, size: 22 }),
          h('span', { className: cls('dy-ellipsis') }, entry.account.name),
          h('span', { className: cls('dy-bd-plat') }, entry.platform.displayName),
          h('span', { className: cls('dy-bd-range') }, rangeText(entry.from, entry.to))),
        main ? h('div', { className: cls('dy-bd-main') },
          h('div', { className: cls('dy-bd-figure') },
            h('span', { className: cls('dy-bd-k') }, main.label),
            h('b', { className: cls('dy-num', 'dy-bd-v') }, dyFull(main.value, main.unit)),
            h(Change, { change: main.change, label: t('v2.compare.short') })),
          h(TrendSpark, { points: main.daily ?? [], color, height: 44 })) : null,
        others.length > 0 ? h('div', { className: cls('dy-bd-chips') }, others.map(([key, value]) => h('span', { key, className: cls('dy-bd-chip') },
          value.label, h('b', { className: cls('dy-num') }, dyFull(value.value, value.unit)), h(Change, { change: value.change })))) : null)
    }

    /** 没指名账号的一条：看全网合计。 */
    function BriefTotalFact({ total, net }) {
      return h('div', { className: cls('dy-bd-acct') },
        h('div', { className: cls('dy-bd-main') },
          h('div', { className: cls('dy-bd-figure') },
            h('span', { className: cls('dy-bd-k') }, t('v2.brief.network', { label: total.label })),
            h('b', { className: cls('dy-num', 'dy-bd-v') }, dyFull(total.value, total.unit)),
            h(Change, { change: total.change, label: t('v2.compare.short') })),
          h(TrendSpark, { points: (total.daily ?? []).map(day => ({ day: day.day, value: day.total })), color: dyColor(0), height: 44 })),
        h(ShareBar, { total, net }))
    }

    /** 相关作品的一行：点开是作品详情弹窗，还在总览里。 */
    function BriefWork({ post, net, onOpen }) {
      const item = net.accounts.find(entry => entry.account.id === post.accountId)
      const labels = item?.platform.metrics ?? DEFAULT_COUNTER_LABELS
      const counters = ['views', 'likes', 'comments', 'shares'].filter(key => post[key] !== undefined).slice(0, 3)
      return h('button', { type: 'button', className: cls('dy-bd-work'), onClick: () => onOpen(post) },
        h(PostCover, { post, width: 40 }),
        h('span', { className: cls('dy-bd-work-main') },
          h('span', { className: cls('dy-wl-title') }, post.title),
          h('span', { className: cls('dy-wl-meta') }, h(PlatformLogo, { platform: item?.platform, size: 14 }), h('span', { className: cls('dy-ellipsis') }, item?.account.name ?? ''),
            post.publishedAt ? h('span', { className: cls('dy-wl-kind') }, formatInstant(post.publishedAt)) : null)),
        h('span', { className: cls('dy-bd-work-nums') }, counters.map(key => h('span', { key }, h('small', null, labels[key] ?? t(`v2.list.${key}`)), h('b', { className: cls('dy-num') }, dyNum(post[key]))))))
    }

    /** 打开的一条：说明（为什么、怎么做）→ 依据的数 → 相关作品 → 下一步。 */
    function BriefDetail({ item, store, net, days, onOpenPost, onAsk }) {
      const entries = briefAccounts(item, store, net)
      const metric = item.metric ?? 'views'
      const post = item.post && net ? net.posts.find(entry => entry.accountId === item.post.accountId && entry.postId === item.post.postId) : undefined
      const recent = post || !net ? [] : net.posts.filter(entry => entries.some(one => one.account.id === entry.accountId)).slice(0, 3)
      const total = entries.length === 0 && net ? net.totals.find(entry => entry.key === metric) ?? net.totals.find(entry => entry.key === 'views') : undefined
      const single = entries.length === 1 ? entries[0] : undefined
      return h('article', { className: cls('dy-bd') },
        h('div', { className: cls('dy-bd-body') },
        h('div', { className: cls('dy-bd-head') },
          h('span', { className: cls('dy-brief-tag', `dy-brief-${item.kind}`) }, t(`v2.brief.${item.kind}`)),
          h('h3', { className: cls('dy-bd-title') }, emphasize(item.text))),
        item.detail ? h('p', { className: cls('dy-bd-text') }, emphasize(item.detail)) : h('p', { className: cls('dy-bd-text', 'dy-bd-old') }, t('v2.brief.noDetail')),
        entries.length > 0 || total ? h('section', { className: cls('dy-bd-sec') },
          h('h4', { className: cls('dy-bd-label') }, t('v2.brief.evidence', { days })),
          entries.slice(0, 3).map(entry => h(BriefAccountFacts, { key: entry.account.id, entry, metric })),
          total ? h(BriefTotalFact, { total, net }) : null) : null,
        post || recent.length > 0 ? h('section', { className: cls('dy-bd-sec') },
          h('h4', { className: cls('dy-bd-label') }, t(post ? 'v2.brief.work' : 'v2.brief.recent')),
          h('div', { className: cls('dy-bd-works') }, (post ? [post] : recent).map(entry => h(BriefWork, { key: `${entry.accountId}:${entry.postId}`, post: entry, net, onOpen: onOpenPost })))) : null),
        h('div', { className: cls('dy-bd-actions') },
          h(DyBtn, { kind: 'primary', icon: 'spark', onClick: () => onAsk(item) }, t(item.kind === 'topic' ? 'v2.brief.askTopic' : 'v2.brief.askMore')),
          single ? h(DyBtn, { onClick: () => face.select({ kind: 'account', id: single.account.id }) }, t('v2.brief.openAccount', { name: single.account.name })) : null))
    }

    const editableTarget = target => target instanceof Element && (target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]') !== null)

    function DailyBrief({ state, store, net, days, onOpenPost, onAsk }) {
      const { loaded, brief, running, partial, problem, scheduleAt, start } = state
      const items = running ? partial : brief?.items ?? []
      const [open, setOpen] = useState(-1)
      const card = useRef(null)
      const list = useRef(null)
      const after = useRef({ focus: false, scroll: false })
      const shown = open >= 0 && open < items.length && !running ? open : -1
      useEffect(() => { if (running) setOpen(-1) }, [running])
      // 换了一条以后：焦点在右边那一列里的话跟着选中的走；刚展开时把卡片滚进视野。
      useEffect(() => {
        if (shown < 0) return
        const selected = list.current?.querySelector('[aria-selected="true"]')
        selected?.scrollIntoView?.({ block: 'nearest' })
        if (after.current.focus) selected?.focus()
        if (after.current.scroll) card.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
        after.current = { focus: false, scroll: false }
      }, [shown])
      // 展开时：Esc 收起，↑↓ 换一条；正在输入的时候不抢键。
      useEffect(() => {
        if (shown < 0) return undefined
        const onKey = event => {
          if (editableTarget(event.target)) return
          if (event.key === 'Escape') setOpen(-1)
          else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            after.current.focus = list.current?.contains(document.activeElement) === true
            setOpen(now => Math.max(0, Math.min(items.length - 1, now + (event.key === 'ArrowDown' ? 1 : -1))))
          }
        }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
      }, [shown, items.length])
      const openAt = index => {
        after.current.scroll = true
        setOpen(index)
      }
      const today = chinaDate(new Date().toISOString())
      const meta = running
        ? t('v2.brief.writing')
        : brief
          ? t(brief.day === today ? 'v2.brief.metaToday' : 'v2.brief.metaDay', { day: brief.day.slice(5).replace('-', '/'), time: formatInstant(brief.createdAt).split(' ').at(-1) })
          : t('v2.brief.scheduled', { at: scheduleAt })
      let body
      if (!loaded) body = h('div', { className: cls('dy-brief-grid') }, [0, 1, 2, 3].map(index => h('span', { key: index, className: cls('dy-brief-ghost') })))
      else if (items.length === 0 && !running) body = h('p', { className: cls('dy-muted') }, t('v2.brief.empty', { at: scheduleAt }))
      else if (shown >= 0) {
        body = h('div', { className: cls('dy-brief-split') },
          h(BriefDetail, { key: shown, item: items[shown], store, net, days, onOpenPost, onAsk }),
          h('div', { ref: list, className: cls('dy-bd-list'), role: 'listbox', 'aria-label': t('v2.brief.title') },
            items.map((item, index) => {
              const account = item.accountId ? store.accounts.find(entry => entry.id === item.accountId) : undefined
              const platform = account ? store.platforms.find(entry => entry.id === account.platform) : platformByName(store.platforms, item.platform)
              return h('button', { key: `${index}:${item.text}`, type: 'button', role: 'option', 'aria-selected': index === shown, className: cls('dy-bd-item'), onClick: () => setOpen(index) },
                h('span', { className: cls('dy-brief-tag', `dy-brief-${item.kind}`) }, t(`v2.brief.${item.kind}`)),
                h('span', { className: cls('dy-bd-item-text') }, emphasize(item.text)),
                account ? h(AccountAvatar, { account, platform, size: 16, badge: false }) : platform ? h(PlatformLogo, { platform, size: 14 }) : null)
            })))
      } else {
        body = h('div', { className: cls('dy-brief-grid') },
          items.map((item, index) => h(BriefRow, { key: `${index}:${item.text}`, item, index, store, onOpen: openAt })),
          running ? h('span', { className: cls('dy-brief-typing') }, h(Spin, { sm: true }), t(items.length === 0 ? 'v2.brief.reading' : 'v2.brief.more')) : null)
      }
      return h('section', { ref: card, className: cls('dy-card', 'dy-brief'), 'data-open': shown >= 0 || undefined },
        h('header', { className: cls('dy-card-head') },
          h('h2', { className: cls('dy-card-title') }, t('v2.brief.title'), h(Tip, { text: t('v2.brief.tip', { at: scheduleAt }) })),
          h('span', { className: cls('dy-card-note') }, meta),
          h('span', { className: cls('grow') }),
          h('div', { className: cls('dy-card-tools') },
            shown >= 0 ? h(DyBtn, { kind: 'text', icon: 'up', onClick: () => setOpen(-1), title: t('v2.brief.collapseTip') }, t('v2.brief.collapse')) : null,
            h(DyBtn, { kind: 'text', icon: 'refresh', busy: running, disabled: !loaded, onClick: start, title: t('v2.brief.rewrite') }, t('v2.brief.rewrite')))),
        problem && !running ? h('p', { className: cls('dy-brief-problem') }, t('v2.brief.failed', { reason: problem })) : null,
        body)
    }

    /** 名字里带着平台名（「视频号」「抖音」）的，找到对应平台，画它的 logo。 */
    const platformByName = (platforms, name) => platforms.find(platform => name && (name === platform.displayName || name.includes(platform.displayName) || platform.displayName.includes(name)))

    /** 每个账号在图上用的颜色：按账号在总览里的顺序取指标色。 */
    const accountColor = (net, id) => dyColor(Math.max(0, net.accounts.findIndex(item => item.account.id === id)))

    /** 一条横条：各账号占多少，停上去看每一段。 */
    function ShareBar({ total, net }) {
      const sum = total.parts.reduce((all, part) => all + Math.max(0, part.value), 0)
      if (sum <= 0 || total.parts.length < 2) return null
      return h('span', { className: cls('dy-share'), 'aria-hidden': true }, total.parts.map(part => {
        const item = net.accounts.find(entry => entry.account.id === part.accountId)
        const share = Math.max(0, part.value) / sum
        return h('i', { key: part.accountId, style: { width: `${share * 100}%`, background: accountColor(net, part.accountId) }, title: `${item?.platform.displayName ?? ''} · ${item?.account.name ?? ''}  ${dyFull(part.value, total.unit)}（${Math.round(share * 100)}%）` })
      }))
    }

    /** 图上的系列：按账号（每个账号一层）或按平台（同平台的账号合成一层）。 */
    function chartSeries(net, group) {
      if (group === 'platform') {
        const platforms = [...new Map(net.accounts.map(item => [item.platform.id, item.platform])).values()]
        return platforms.map((platform, index) => ({ key: platform.id, label: platform.displayName, platform, color: dyColor(index), ids: net.accounts.filter(item => item.platform.id === platform.id).map(item => item.account.id) }))
      }
      return net.accounts.map(item => ({ key: item.account.id, label: `${item.platform.displayName} · ${item.account.name}`, platform: item.platform, account: item.account, color: accountColor(net, item.account.id), ids: [item.account.id] }))
    }
    const addDay = (day, n) => { const date = new Date(`${day}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + n); return date.toISOString().slice(0, 10) }

    /**
     * 可以左右拖的走势图：最多 90 天，横轴一直画到今天（平台还没出数的那几天空着），一屏看 visible 天。
     * 鼠标拖、触控板左右滑、触屏滑都能翻；打开时停在最新。选中的统计周期画一条淡底。
     */
    function PanChart({ total, net, group, visible, window: band, height = 260 }) {
      const [ref, width] = useWidth()
      const scroller = useRef(null)
      const drag = useRef(undefined)
      const [hover, setHover] = useState(undefined)
      const series = chartSeries(net, group)
      const trend = total.trend ?? []
      const today = chinaDate(new Date().toISOString())
      const first = trend[0]?.day ?? addDay(today, -(visible - 1))
      const days = []
      for (let day = first; day <= today && days.length < 400; day = addDay(day, 1)) days.push(day)
      const byDay = new Map(trend.map(entry => [entry.day, entry]))
      const valueOf = (entry, item) => {
        const present = item.ids.filter(id => entry?.parts[id] !== undefined)
        return present.length === 0 ? undefined : present.reduce((sum, id) => sum + entry.parts[id], 0)
      }
      const axisW = 52
      const viewW = Math.max(width - axisW, 200)
      const step = Math.max(18, viewW / Math.max(visible, 2))
      const W = Math.max(viewW, step * days.length)
      const H = height
      const pad = { t: 14, b: 30 }
      const level = total.key === 'followers'
      const totals = trend.map(entry => entry.total)
      const { lo, hi, ticks } = axisOf(totals.length > 0 ? totals : [0], { zero: !level, integer: true })
      const x = i => step * i + step / 2
      const y = v => pad.t + (H - pad.t - pad.b) * (1 - (v - lo) / (hi - lo))
      useEffect(() => { if (scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth }, [W, group, total.key])
      // 一层一层往上叠；没出数的日子断开，不当成 0。
      const stacks = series.map((_, si) => days.map(day => {
        const entry = byDay.get(day)
        if (entry === undefined) return undefined
        return series.slice(0, si + 1).reduce((sum, item) => sum + (valueOf(entry, item) ?? 0), 0)
      }))
      const runs = days.reduce((all, day, i) => {
        if (!byDay.has(day)) return all
        const last = all.at(-1)
        if (last && last.at(-1) === i - 1) last.push(i)
        else all.push([i])
        return all
      }, [])
      const area = (si, run) => {
        const top = run.map(i => [x(i), y(stacks[si][i])])
        const bottom = run.map(i => [x(i), si === 0 ? y(level ? lo : 0) : y(stacks[si - 1][i])]).reverse()
        return `M${[...top, ...bottom].map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join('L')}Z`
      }
      const bandFrom = band ? days.indexOf(band.from) : -1
      const bandTo = band ? days.indexOf(band.to) : -1
      const every = Math.max(1, Math.round(64 / step))
      const onDown = e => {
        if (e.pointerType !== 'mouse' || e.button !== 0) return
        drag.current = { x: e.clientX, left: scroller.current.scrollLeft, moved: false }
        e.currentTarget.setPointerCapture(e.pointerId)
      }
      const onMove = e => {
        if (drag.current) {
          const dx = e.clientX - drag.current.x
          if (Math.abs(dx) > 3) drag.current.moved = true
          scroller.current.scrollLeft = drag.current.left - dx
          setHover(undefined)
          return
        }
        const box = e.currentTarget.getBoundingClientRect()
        const px = (e.clientX - box.left) * (W / box.width)
        setHover(Math.max(0, Math.min(days.length - 1, Math.floor(px / step))))
      }
      const onUp = e => { drag.current = undefined; if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId) }
      const at = hover === undefined ? undefined : days[hover]
      const entry = at === undefined ? undefined : byDay.get(at)
      const popLeft = hover === undefined || !scroller.current ? 0 : x(hover) - scroller.current.scrollLeft + axisW
      return h('div', { ref, className: cls('dy-pan') },
        h('svg', { className: cls('dy-pan-axis'), width: axisW, height: H, 'aria-hidden': true },
          ticks.map(v => h('text', { key: v, x: axisW - 8, y: y(v) + 4, textAnchor: 'end', className: cls('dy-axis') }, dyValue(v, 'count')))),
        h('div', { ref: scroller, className: cls('dy-pan-scroll'), onScroll: () => setHover(undefined) },
          h('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': total.label, onPointerDown: onDown, onPointerMove: onMove, onPointerUp: onUp, onPointerCancel: onUp, onPointerLeave: () => { if (!drag.current) setHover(undefined) } },
            bandFrom >= 0 && bandTo >= bandFrom ? h('rect', { x: x(bandFrom) - step / 2, y: pad.t, width: (bandTo - bandFrom + 1) * step, height: H - pad.t - pad.b, className: cls('dy-pan-band') }) : null,
            ticks.map(v => h('line', { key: v, x1: 0, x2: W, y1: y(v), y2: y(v), className: cls('dy-grid') })),
            days.map((day, i) => (days.length - 1 - i) % every === 0 ? h('text', { key: day, x: x(i), y: H - 8, textAnchor: 'middle', className: cls('dy-axis', day === today && 'dy-pan-today') }, day === today ? t('v2.chart.today') : dotDay(day)) : null),
            days.map((day, i) => byDay.has(day) ? null : h('rect', { key: `gap-${day}`, x: x(i) - step / 2, y: pad.t, width: step, height: H - pad.t - pad.b, className: cls('dy-pan-gap') })),
            series.map((item, si) => runs.map((run, ri) => run.length === 1
              ? h('rect', { key: `${item.key}-${ri}`, x: x(run[0]) - step * 0.3, width: step * 0.6, y: y(stacks[si][run[0]]), height: Math.max(0, (si === 0 ? y(level ? lo : 0) : y(stacks[si - 1][run[0]])) - y(stacks[si][run[0]])), fill: item.color, fillOpacity: 0.8 })
              : h('path', { key: `${item.key}-${ri}`, d: area(si, run), fill: item.color, fillOpacity: 0.78, stroke: item.color, strokeWidth: 1 }))).reverse(),
            at !== undefined ? h('line', { x1: x(hover), x2: x(hover), y1: pad.t, y2: H - pad.b, className: cls('dy-guide') }) : null)),
        at !== undefined ? h('div', { className: cls('dy-pop'), style: { left: `${popLeft}px`, transform: `translateX(${popLeft > (width * 0.6) ? '-105%' : '8%'})` } },
          h('span', { className: cls('dy-pop-day') }, at === today ? `${at} · ${t('v2.chart.today')}` : at),
          entry === undefined ? h('span', { className: cls('dy-pop-row') }, t('v2.chart.notYet')) : h(Fragment, null,
            [...series].reverse().map(item => {
              const value = valueOf(entry, item)
              return h('span', { key: item.key, className: cls('dy-pop-row') }, h('i', { style: { background: item.color } }), item.label, h('b', null, value === undefined ? t('v2.chart.noReport') : dyFull(value, 'count')))
            }),
            h('span', { className: cls('dy-pop-row', 'dy-pop-total') }, t('v2.net.total'), h('b', null, dyFull(entry.total, 'count'))))) : null)
    }

    /** 没有每天的数（或只有一天）时：各账号一条横条，比谁多。 */
    function PartBars({ total, net }) {
      const max = Math.max(1, ...total.parts.map(part => Math.abs(part.value)))
      return h('div', { className: cls('dy-parts') }, [...total.parts].sort((a, b) => b.value - a.value).map(part => {
        const item = net.accounts.find(entry => entry.account.id === part.accountId)
        return h('div', { key: part.accountId, className: cls('dy-part') },
          h('span', { className: cls('dy-part-who') }, item ? h(AccountAvatar, { account: item.account, platform: item.platform, size: 22, badge: true }) : null, h('span', { className: cls('dy-ellipsis') }, item?.account.name ?? '')),
          h('span', { className: cls('dy-part-track') }, h('i', { style: { width: `${(Math.abs(part.value) / max) * 100}%`, background: accountColor(net, part.accountId) } })),
          h('b', { className: cls('dy-num') }, dyValue(part.value, total.unit)))
      }))
    }

    function SyncedWorks({ works, net, onOpenPost }) {
      if (works.length === 0) return null
      const owner = post => net.accounts.find(item => item.account.id === post.accountId)
      return h('div', { className: cls('dy-sync') },
        h('h3', { className: cls('dy-sub-title') }, t('v2.net.synced'), h(Tip, { text: t('v2.net.syncedTip') })),
        works.map((work, index) => h('div', { key: index, className: cls('dy-sync-row') },
          h('span', { className: cls('dy-sync-covers') }, work.posts.slice(0, 3).map(post => h('button', { key: `${post.accountId}:${post.postId}`, type: 'button', onClick: () => onOpenPost(post), title: owner(post)?.platform.displayName }, h(PostCover, { post, width: 36 })))),
          h('span', { className: cls('dy-sync-main') },
            h('span', { className: cls('dy-sync-title') }, work.title),
            h('span', { className: cls('dy-sync-chips') }, work.posts.map(post => {
              const item = owner(post)
              const [label, value] = postNumbers(post, item?.platform)[0] ?? []
              return h('button', { key: `${post.accountId}:${post.postId}`, type: 'button', className: cls('dy-ai-chip'), onClick: () => onOpenPost(post) }, h(PlatformLogo, { platform: item?.platform, size: 12 }), item?.platform.displayName ?? '', value === undefined ? '' : ` ${label} ${dyNum(value)}`)
            }))),
          h('span', { className: cls('dy-sync-total') }, h('span', null, t('v2.net.total')), h('b', { className: cls('dy-num') }, dyNum(work.views ?? work.likes))))))
    }

    function NetworkBoard({ net, onOpenPost }) {
      const [selected, setSelected] = useState('views')
      const [group, setGroup] = useState('account')
      const totals = net.totals
      const current = totals.find(total => total.key === selected) ?? totals[0]
      if (current === undefined) return null
      const from = net.accounts.map(item => item.from).sort()[0]
      const to = net.accounts.map(item => item.to).sort().at(-1)
      const series = chartSeries(net, group)
      // 图例的数：选中周期里每个系列的合计（同平台的账号加起来）。
      const partOf = item => current.parts.filter(part => item.ids.includes(part.accountId)).reduce((sum, part) => sum + part.value, 0)
      const hasPart = item => current.parts.some(part => item.ids.includes(part.accountId))
      return h(DyCard, { title: t('v2.net.title'), tip: t('v2.net.tip'), note: from ? t('v2.net.note', { period: rangeText(from, to) }) : undefined },
        h('div', { className: cls('dy-net-tiles'), role: 'tablist' }, totals.map((total, index) => h('button', {
          key: total.key, type: 'button', role: 'tab', className: cls('dy-net-tile'), 'aria-selected': total.key === current.key, style: { '--dy-metric-color': dyColor(index) }, onClick: () => setSelected(total.key),
        },
        h('span', { className: cls('dy-metric-label') }, t(`v2.net.${total.key}`)),
        h('b', { className: cls('dy-num', 'dy-net-value') }, dyNum(total.value)),
        h(Change, { change: total.change, label: t('v2.compare.short') }),
        h(ShareBar, { total, net })))),
        h('div', { className: cls('dy-net-chart') },
          h('div', { className: cls('dy-net-chart-head') },
            h('span', { className: cls('dy-net-chart-title') }, t('v2.chart.trend', { label: t(`v2.net.${current.key}`) }), h('span', { className: cls('dy-card-note') }, t('v2.chart.drag'))),
            h('span', { className: cls('grow') }),
            h(DySeg, { value: group, onChange: setGroup, label: t('v2.chart.group'), options: [{ value: 'account', label: t('v2.chart.byAccount') }, { value: 'platform', label: t('v2.chart.byPlatform') }] })),
          (current.trend ?? []).length > 0
            ? h(PanChart, { key: `${current.key}`, total: current, net, group, visible: Math.max(net.days, 14), window: from ? { from, to } : undefined })
            : h(PartBars, { total: current, net }),
          h('div', { className: cls('dy-legend', 'dy-net-legend') }, series.filter(hasPart).map(item => h('span', { key: item.key },
            h('i', { style: { background: item.color } }),
            group === 'platform' ? h(PlatformLogo, { platform: item.platform, size: 14 }) : null,
            item.label,
            h('b', { className: cls('dy-num') }, dyValue(partOf(item), current.unit)))))),
        h(SyncedWorks, { works: net.synced, net, onOpenPost }))
    }

    /** 各账号数据可以切换的维度：热度 = 平台的播放 / 观看 / 阅读量。 */
    const BENTO_DIMENSIONS = ['views', 'followers', 'fansNet', 'engagement', 'likes', 'comments', 'shares']
    function bentoValue(item, dimension) {
      const kpi = item.kpis.find(entry => entry.key === dimension)
      if (dimension === 'followers') return { label: kpi?.label ?? t('v2.card.followers'), value: kpi?.value ?? item.followers, unit: 'count', change: kpi?.change, daily: kpi?.daily ?? [] }
      return kpi === undefined || kpi.value === undefined ? undefined : { label: kpi.label, value: kpi.value, unit: kpi.unit, change: kpi.change, daily: kpi.daily }
    }
    /** 便当盒的格子大小：第一个最大，其余按个数排满两行，再往下一格一格。 */
    function bentoSize(count, index) {
      if (index === 0) return count === 1 ? 'hero' : 'big'
      if (count === 2) return 'big'
      if (count === 3) return 'wide'
      if (index === 3 && count === 4) return 'wide'
      return 'small'
    }

    /** 一条小走势线（不画坐标轴）。 */
    function TrendSpark({ points, color, height = 44 }) {
      const [ref, width] = useWidth()
      const gradient = useRef(`dys-${Math.random().toString(36).slice(2, 8)}`).current
      if (points.length < 2) return h('div', { ref, className: cls('dy-spark'), style: { height } })
      const W = Math.max(width, 60)
      const values = points.map(point => point.value)
      const lo = Math.min(...values)
      const hi = Math.max(...values)
      const span = hi - lo || 1
      const x = i => (i * W) / (points.length - 1)
      const y = v => 3 + (height - 6) * (1 - (v - lo) / span)
      const line = points.map((point, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(point.value).toFixed(1)}`).join('')
      return h('div', { ref, className: cls('dy-spark') },
        h('svg', { width: W, height, viewBox: `0 0 ${W} ${height}`, 'aria-hidden': true },
          h('defs', null, h('linearGradient', { id: gradient, x1: 0, y1: 0, x2: 0, y2: 1 }, h('stop', { offset: '0%', stopColor: color, stopOpacity: 0.28 }), h('stop', { offset: '100%', stopColor: color, stopOpacity: 0 }))),
          h('path', { d: `${line}L${W},${height}L0,${height}Z`, fill: `url(#${gradient})` }),
          h('path', { d: line, fill: 'none', stroke: color, strokeWidth: 2, strokeLinejoin: 'round', strokeLinecap: 'round' })))
    }

    function BentoTile({ item, dimension, size, health }) {
      const metric = bentoValue(item, dimension)
      const color = item.platform.color ?? `var(--${P}-p-${item.platform.id}, var(--${P}-p-other))`
      const followers = bentoValue(item, 'followers')
      const engagement = item.kpis.find(kpi => kpi.key === 'engagement')
      return h('button', { type: 'button', className: cls('dy-bento-tile', `dy-bento-${size}`), style: { '--tint': color }, onClick: () => face.select({ kind: 'account', id: item.account.id }) },
        h('span', { className: cls('dy-bento-head') },
          h(AccountAvatar, { account: item.account, platform: item.platform, size: size === 'small' ? 28 : 36, badge: true }),
          h('span', { className: cls('dy-bento-who') }, h('b', { className: cls('dy-ellipsis') }, item.account.name), h('span', null, item.platform.displayName)),
          h(HealthDot, { health })),
        metric === undefined
          ? h('span', { className: cls('dy-bento-none') }, t('v2.bento.none'))
          : h(Fragment, null,
            h('span', { className: cls('dy-bento-label') }, metric.label),
            h('span', { className: cls('dy-bento-value') }, h('b', { className: cls('dy-num') }, dyValue(metric.value, metric.unit)), h(Change, { change: metric.change })),
            size === 'small' ? null : h(TrendSpark, { points: metric.daily, color, height: size === 'big' || size === 'hero' ? 72 : 40 })),
        size === 'small' ? null : h('span', { className: cls('dy-bento-foot') },
          dimension !== 'followers' && followers?.value !== undefined ? h('span', null, t('v2.card.followers'), ' ', h('b', { className: cls('dy-num') }, dyNum(followers.value))) : null,
          dimension !== 'engagement' && engagement?.value !== undefined ? h('span', null, engagement.label, ' ', h('b', { className: cls('dy-num') }, dyValue(engagement.value, 'percent'))) : null))
    }

    function BentoBoard({ net, store }) {
      const [dimension, setDimension] = useState('views')
      const sorted = [...net.accounts].sort((a, b) => (bentoValue(b, dimension)?.value ?? -Infinity) - (bentoValue(a, dimension)?.value ?? -Infinity))
      return h(DyCard, {
        title: t('v2.bento.title'), tip: t('v2.bento.tip'),
        tools: h(DySeg, { value: dimension, onChange: setDimension, label: t('v2.bento.dimension'), options: BENTO_DIMENSIONS.map(key => ({ value: key, label: t(`v2.dim.${key}`) })) }),
      },
      h('div', { className: cls('dy-bento') }, sorted.map((item, index) => h(BentoTile, { key: item.account.id, item, dimension, size: bentoSize(sorted.length, index), health: healthOf(store.summary, item.account.id) ?? item.health }))))
    }

    /** 最新作品：列表。按类型、平台筛，点表头排序，平台不给的数写「—」。 */
    const LIST_KINDS = ['all', 'video', 'image', 'article']
    const LIST_COLUMNS = ['views', 'likes', 'comments', 'shares', 'collects']
    const LIST_PAGE = 20
    function WorksList({ net, onOpenPost }) {
      const [kind, setKind] = useState('all')
      const [platformId, setPlatformId] = useState('all')
      const [sort, setSort] = useState('newest')
      const [limit, setLimit] = useState(LIST_PAGE)
      const itemOf = post => net.accounts.find(entry => entry.account.id === post.accountId)
      const platforms = [...new Map(net.accounts.map(item => [item.platform.id, item.platform])).values()]
      const ofPlatform = net.posts.filter(post => platformId === 'all' || itemOf(post)?.platform.id === platformId)
      const counts = Object.fromEntries(LIST_KINDS.map(key => [key, key === 'all' ? ofPlatform.length : ofPlatform.filter(post => post.format === key).length]))
      const filtered = kind === 'all' ? ofPlatform : ofPlatform.filter(post => post.format === kind)
      const rows = sort === 'newest' ? filtered : [...filtered].sort((a, b) => (b[sort] ?? -1) - (a[sort] ?? -1))
      const head = (key, label) => h('button', { key, type: 'button', role: 'columnheader', className: cls('dy-wl-sort'), 'aria-sort': sort === key ? 'descending' : 'none', onClick: () => setSort(sort === key ? 'newest' : key) }, label, sort === key ? h(Icon, { name: 'down', size: 12 }) : null)
      return h(DyCard, {
        title: t('v2.feed.title'), note: t('v2.posts.count', { count: rows.length }),
        tools: [
          h(DySeg, { key: 'kind', value: kind, onChange: value => { setKind(value); setLimit(LIST_PAGE) }, label: t('v2.feed.kind'), options: LIST_KINDS.filter(key => key === 'all' || counts[key] > 0 || key === kind).map(key => ({ value: key, label: `${t(`v2.feed.${key}`)} ${counts[key]}` })) }),
          h(DyBtn, { key: 'export', icon: 'download', disabled: rows.length === 0, onClick: () => exportPosts(t('v2.feed.title'), rows, undefined) }, t('v2.export.button')),
        ],
      },
      platforms.length > 1 ? h('div', { className: cls('dy-wl-platforms'), role: 'group', 'aria-label': t('v2.list.platform') },
        [{ id: 'all' }, ...platforms].map(platform => h('button', { key: platform.id, type: 'button', className: cls('dy-wl-chip'), 'aria-pressed': platformId === platform.id, onClick: () => { setPlatformId(platform.id); setLimit(LIST_PAGE) } },
          platform.id === 'all' ? null : h(PlatformLogo, { platform, size: 14 }), platform.id === 'all' ? t('v2.list.allPlatforms') : platform.displayName))) : null,
      rows.length === 0 ? h('p', { className: cls('dy-muted') }, t('v2.feed.none')) : h(Fragment, null,
        h('div', { className: cls('dy-wl'), role: 'table' },
          h('div', { className: cls('dy-wl-row', 'dy-wl-head'), role: 'row' },
            h('span', { role: 'columnheader' }, t('v2.list.work')),
            head('newest', t('v2.list.published')),
            LIST_COLUMNS.map(key => head(key, t(`v2.list.${key}`)))),
          rows.slice(0, limit).map(post => {
            const item = itemOf(post)
            const labels = item?.platform.metrics ?? DEFAULT_COUNTER_LABELS
            return h('button', { key: `${post.accountId}:${post.postId}`, type: 'button', role: 'row', className: cls('dy-wl-row'), onClick: () => onOpenPost(post) },
              h('span', { className: cls('dy-wl-work'), role: 'cell' },
                h(PostCover, { post, width: 42 }),
                h('span', { className: cls('dy-wl-main') },
                  h('span', { className: cls('dy-wl-title') }, post.title),
                  h('span', { className: cls('dy-wl-meta') }, h(PlatformLogo, { platform: item?.platform, size: 14 }), h('span', { className: cls('dy-ellipsis') }, item?.account.name ?? ''), h('span', { className: cls('dy-wl-kind') }, t(`v2.feed.${LIST_KINDS.includes(post.format) ? post.format : 'all'}`)),
                    post.publishedAt ? h('span', { className: cls('dy-wl-date') }, formatInstant(post.publishedAt)) : null))),
              h('span', { role: 'cell', className: cls('dy-wl-time') }, post.publishedAt ? formatInstant(post.publishedAt) : '—'),
              LIST_COLUMNS.map(key => h('span', { key, role: 'cell', className: cls('dy-num', 'dy-wl-num'), title: labels[key] ? `${labels[key]}` : t('v2.list.notReported') },
                post[key] === undefined ? '—' : dyNum(post[key]))))
          })),
        rows.length > limit ? h('div', { className: cls('dy-feed-more') }, h(DyBtn, { onClick: () => setLimit(limit + LIST_PAGE) }, t('v2.feed.more', { count: Math.min(LIST_PAGE, rows.length - limit) }))) : null))
    }

    function OverviewView({ store, onFix, onOpenPost, tools }) {
      const [days, setDays] = useState(7)
      const net = useNetwork(days, store.version)
      const brief = useBrief(store.accounts.some(account => account.demo !== true))
      const items = store.summary?.accounts ?? []
      const attention = items.filter(item => needsAttention(item.health)).sort((a, b) => HEALTH[a.health.state].rank - HEALTH[b.health.state].rank)
      // 简报的一行点开后还在总览里；「让 AI 展开」才交给右边的 AI 助手，带上这一条的说明。
      const askBrief = item => {
        const detail = item.detail ? t('v2.ask.briefDetail', { detail: item.detail }) : ''
        if (item.kind === 'topic') face.chat.open(t('v2.ask.briefTopic', { text: item.text, platform: item.platform ?? t('v2.ask.anyPlatform'), detail }))
        else face.chat.open(t('v2.ask.briefItem', { text: item.text, detail }))
      }
      return h('div', { className: cls('dy-page') },
        h('header', { className: cls('dy-page-head') },
          h('div', { className: cls('dy-page-head-main') }, h('h1', { className: cls('dy-page-title') }, t('v2.nav.overview')), h('p', { className: cls('dy-page-sub') }, t('v2.overview.sub', { count: store.accounts.length }))),
          h(DySeg, { value: days, onChange: setDays, label: t('v2.range.label'), options: rangeOptions() }),
          tools),
        h(Attention, { items: attention, onAction: onFix }),
        h(DailyBrief, { state: brief, store, net: net.data, days, onOpenPost, onAsk: askBrief }),
        net.data === undefined
          ? (net.reason ? h(LoadError, { reason: net.reason, onRetry: face.reloadSummary }) : h(Waiting))
          : h(Fragment, null,
            h(NetworkBoard, { net: net.data, onOpenPost }),
            h(BentoBoard, { net: net.data, store }),
            h(WorksList, { net: net.data, onOpenPost })))
    }

    addStyles(`
.$-dy-brief{gap:14px}
.$-dy-brief-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:6px 20px}
.$-dy-brief-row{display:flex;align-items:center;gap:10px;min-width:0;min-height:38px;padding:6px 8px;border:0;border-radius:8px;background:none;color:var(--$-dy-text);text-align:left;cursor:pointer;animation:$-dy-brief-in .35s ease both}
.$-dy-brief-row:hover{background:var(--$-dy-tile)}
.$-dy-brief-row>svg:last-child{flex:none;color:var(--$-dy-text-3)}
.$-dy-brief-tag{flex:none;display:inline-grid;place-items:center;min-width:34px;height:20px;padding:0 5px;border-radius:4px;font-size:11px;font-weight:600}
.$-dy-brief-alert{background:var(--$-dy-red-soft);color:var(--$-dy-red)}
.$-dy-brief-fact{background:var(--$-dy-seg);color:var(--$-dy-text-2)}
.$-dy-brief-action{background:var(--$-dy-blue-soft);color:var(--$-dy-blue)}
.$-dy-brief-topic{background:color-mix(in srgb,var(--$-dy-green) 14%,transparent);color:var(--$-dy-green)}
.$-dy-brief-text{flex:1;min-width:0;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;font-size:14px;line-height:22px}
.$-dy-brief-text b{font-family:var(--$-dy-font-num);font-weight:700}
.$-dy-brief-typing{display:inline-flex;align-items:center;gap:8px;min-height:38px;padding:0 8px;color:var(--$-dy-text-3);font-size:13px}
.$-dy-brief-ghost{height:38px;border-radius:8px;background:linear-gradient(90deg,var(--$-dy-seg),var(--$-dy-tile-hover),var(--$-dy-seg));background-size:200% 100%;animation:$-dy-shimmer 1.4s linear infinite}
.$-dy-brief-problem{margin:0;color:var(--$-dy-red);font-size:13px}
/* 展开的简报：左边这一条的说明和依据，右边其他几条 */
/* 框的大小固定（宽:高 = 2:1，高度 420–560），换哪一条都不跳；内容长了在框里滑，按钮一直在底下 */
.$-dy-brief-split{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(260px,1fr);grid-template-rows:minmax(0,1fr);aspect-ratio:2/1;min-height:420px;max-height:560px;border:1px solid var(--$-dy-line);border-radius:12px;overflow:hidden;animation:$-dy-brief-in .25s ease both}
.$-dy-bd{display:flex;flex-direction:column;min-width:0;min-height:0}
.$-dy-bd-body{flex:1;min-height:0;display:flex;flex-direction:column;gap:18px;padding:22px 24px 18px;overflow-y:auto;overscroll-behavior:contain;scrollbar-gutter:stable}
.$-dy-bd-head{display:flex;align-items:flex-start;gap:10px}
.$-dy-bd-head .$-dy-brief-tag{margin-top:4px}
.$-dy-bd-title{margin:0;font-size:18px;line-height:28px;font-weight:600}
.$-dy-bd-title b,.$-dy-bd-text b,.$-dy-bd-item-text b{font-family:var(--$-dy-font-num);font-weight:700}
.$-dy-bd-text{margin:0;font-size:15px;line-height:26px;color:var(--$-dy-text)}
.$-dy-bd-old{color:var(--$-dy-text-3);font-size:13px;line-height:22px}
.$-dy-bd-sec{display:flex;flex-direction:column;gap:10px;min-width:0}
.$-dy-bd-label{margin:0;color:var(--$-dy-text-3);font-size:12px;line-height:18px;font-weight:500}
.$-dy-bd-acct{display:flex;flex-direction:column;gap:12px;padding:14px 16px;border-radius:10px;background:var(--$-dy-tile)}
.$-dy-bd-who{display:flex;align-items:center;gap:8px;min-width:0;font-size:14px;font-weight:600}
.$-dy-bd-plat,.$-dy-bd-range{flex:none;color:var(--$-dy-text-3);font-size:12px;font-weight:400;white-space:nowrap}
.$-dy-bd-range{margin-left:auto;font-family:var(--$-dy-font-num)}
.$-dy-bd-main{display:grid;grid-template-columns:auto minmax(96px,1fr);align-items:end;gap:20px}
.$-dy-bd-figure{display:flex;flex-direction:column;gap:2px}
.$-dy-bd-k{color:var(--$-dy-text-2);font-size:12px;line-height:18px}
.$-dy-bd-v{font-size:28px;line-height:34px;font-weight:700}
.$-dy-bd-chips{display:flex;flex-wrap:wrap;gap:8px}
.$-dy-bd-chip{display:inline-flex;align-items:baseline;gap:6px;padding:4px 10px;border-radius:999px;background:var(--$-dy-card);color:var(--$-dy-text-2);font-size:12px;line-height:18px}
.$-dy-bd-chip b{color:var(--$-dy-text);font-size:13px}
.$-dy-bd-works{display:flex;flex-direction:column}
.$-dy-bd-work{display:flex;align-items:center;gap:12px;width:100%;padding:8px;border:0;border-radius:8px;background:none;color:var(--$-dy-text);text-align:left;cursor:pointer}
.$-dy-bd-work:hover{background:var(--$-dy-tile)}
.$-dy-bd-work-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.$-dy-bd-work-nums{flex:none;display:flex;gap:16px}
.$-dy-bd-work-nums>span{display:flex;flex-direction:column;align-items:flex-end;gap:0}
.$-dy-bd-work-nums small{color:var(--$-dy-text-3);font-size:11px;line-height:16px}
.$-dy-bd-work-nums b{font-size:14px;line-height:20px}
.$-dy-bd-actions{flex:none;display:flex;flex-wrap:wrap;gap:8px;padding:12px 24px;border-top:1px solid var(--$-dy-line);background:var(--$-dy-card)}
.$-dy-bd-list{display:flex;flex-direction:column;gap:2px;min-height:0;padding:8px;border-left:1px solid var(--$-dy-line);background:var(--$-dy-tile);overflow-y:auto;overscroll-behavior:contain}
.$-dy-bd-item{display:flex;align-items:flex-start;gap:8px;width:100%;padding:9px 10px;border:0;border-radius:8px;background:none;color:var(--$-dy-text-2);text-align:left;cursor:pointer}
.$-dy-bd-item:hover{background:var(--$-dy-tile-hover);color:var(--$-dy-text)}
.$-dy-bd-item[aria-selected=true]{background:var(--$-dy-card);color:var(--$-dy-text);box-shadow:0 1px 3px rgba(0,0,0,.08)}
.$-dy-bd-item .$-dy-brief-tag{margin-top:1px}
.$-dy-bd-item>.$-dy-avatar,.$-dy-bd-item>svg{margin-top:2px}
.$-dy-bd-item-text{flex:1;min-width:0;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;font-size:13px;line-height:20px}
@container $-dypage (max-width:760px){.$-dy-brief-split{grid-template-columns:minmax(0,1fr);grid-template-rows:440px 220px;aspect-ratio:auto;max-height:none}.$-dy-bd-list{border-left:0;border-top:1px solid var(--$-dy-line)}.$-dy-bd-work-nums{display:none}}
@keyframes $-dy-brief-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@keyframes $-dy-shimmer{from{background-position:200% 0}to{background-position:-200% 0}}
.$-dy-ai-chip{display:inline-flex;align-items:center;gap:4px;height:20px;padding:0 6px;border:0;border-radius:6px;background:var(--$-dy-seg);color:var(--$-dy-text-2);font-size:11px;font-weight:400;white-space:nowrap;cursor:pointer}

.$-dy-pan{position:relative;display:flex;min-width:0}
.$-dy-pan-axis{flex:none;display:block}
.$-dy-pan-scroll{flex:1;min-width:0;overflow-x:auto;overflow-y:hidden;scrollbar-width:none;cursor:grab;touch-action:pan-x}
.$-dy-pan-scroll::-webkit-scrollbar{display:none}
.$-dy-pan-scroll:active{cursor:grabbing}
.$-dy-pan-scroll svg{display:block}
.$-dy-pan-band{fill:var(--$-dy-blue);fill-opacity:.06}
.$-dy-pan-gap{fill:var(--$-dy-text-3);fill-opacity:.06}
.$-dy-pan-today{fill:var(--$-dy-text-2);font-weight:600}
.$-dy-net-chart-head{display:flex;align-items:center;flex-wrap:wrap;gap:8px 12px}
.$-dy-net-chart-title{display:inline-flex;align-items:baseline;gap:10px;font-size:15px;font-weight:600}

.$-dy-wl-platforms{display:flex;flex-wrap:wrap;gap:8px}
.$-dy-wl-chip{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 10px;border:0;border-radius:999px;background:var(--$-dy-seg);color:var(--$-dy-text-2);font-size:13px;cursor:pointer}
.$-dy-wl-chip[aria-pressed=true]{background:var(--$-dy-primary);color:var(--$-dy-on-primary)}
.$-dy-wl{display:flex;flex-direction:column;overflow-x:auto;overscroll-behavior-x:contain}
.$-dy-wl-row{display:grid;grid-template-columns:minmax(260px,1fr) 108px repeat(5,minmax(56px,76px));align-items:center;gap:12px;padding:10px 8px;border:0;border-bottom:1px solid var(--$-dy-line);background:none;color:var(--$-dy-text);text-align:right;cursor:pointer}
.$-dy-wl-row>*:first-child{text-align:left}
.$-dy-wl-row:not(.$-dy-wl-head):hover{background:var(--$-dy-tile)}
.$-dy-wl-head{cursor:default;padding-top:8px;padding-bottom:8px;border-radius:8px 8px 0 0;background:var(--$-dy-tile);color:var(--$-dy-text-2);font-size:12px;border-bottom:0}
.$-dy-wl-sort{display:inline-flex;align-items:center;justify-content:flex-end;gap:2px;padding:0;border:0;background:none;color:inherit;font:inherit;cursor:pointer}
.$-dy-wl-sort[aria-sort=descending]{color:var(--$-dy-text);font-weight:600}
.$-dy-wl-work{display:flex;align-items:center;gap:12px;min-width:0}
.$-dy-wl-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.$-dy-wl-title{overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;font-size:14px;line-height:20px}
.$-dy-wl-meta{display:flex;align-items:center;gap:6px;min-width:0;color:var(--$-dy-text-3);font-size:12px}
.$-dy-wl-kind{flex:none;padding:0 5px;border-radius:4px;background:var(--$-dy-seg);font-size:11px;line-height:16px}
.$-dy-wl-time{color:var(--$-dy-text-2);font-size:12px;white-space:nowrap}
.$-dy-wl-date{display:none;flex:none;white-space:nowrap}
.$-dy-wl-num{font-size:14px}
/* 窄的时候一列不少：发布时间收进标题下面那行，数字列左右滑，「作品」那列钉在左边。 */
@container $-dypage (max-width:820px){.$-dy-wl-row{grid-template-columns:minmax(200px,1fr) repeat(5,56px);gap:10px;min-width:546px}.$-dy-wl-row>:nth-child(2){display:none}.$-dy-wl-date{display:inline}.$-dy-wl-row>:first-child{position:sticky;left:0;z-index:1;background:var(--$-dy-card);box-shadow:8px 0 8px -8px rgba(0,0,0,.18)}.$-dy-wl-head>:first-child{background:var(--$-dy-tile)}.$-dy-wl-row:not(.$-dy-wl-head):hover>:first-child{background:var(--$-dy-tile)}}

.$-dy-net-tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:12px}
.$-dy-net-tile{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:4px;min-width:0;padding:14px 16px 16px;border:0;border-radius:10px;background:var(--$-dy-tile);color:var(--$-dy-text);text-align:left;cursor:pointer;overflow:hidden}
.$-dy-net-tile:hover{background:var(--$-dy-tile-hover)}
.$-dy-net-tile[aria-selected=true]{box-shadow:inset 0 -3px 0 var(--dy-metric-color)}
.$-dy-net-value{font-size:24px;line-height:32px;font-weight:700}
.$-dy-share{display:flex;width:100%;height:5px;margin-top:6px;border-radius:3px;overflow:hidden;background:var(--$-dy-seg)}
.$-dy-share i{display:block;height:100%}
.$-dy-share i+i{box-shadow:inset 1px 0 0 var(--$-dy-tile)}
.$-dy-net-chart{display:flex;flex-direction:column;gap:12px}
.$-dy-net-legend{flex-wrap:wrap;gap:8px 18px}
.$-dy-net-legend span{display:inline-flex;align-items:center;gap:6px;color:var(--$-dy-text-2);font-size:12px}
.$-dy-net-legend b{color:var(--$-dy-text);font-size:13px}
.$-dy-pop-total{padding-top:4px;border-top:1px solid var(--$-dy-line);color:var(--$-dy-text)}
.$-dy-parts{display:flex;flex-direction:column;gap:10px;padding:4px 0}
.$-dy-part{display:grid;grid-template-columns:minmax(120px,200px) 1fr auto;align-items:center;gap:12px}
.$-dy-part-who{display:flex;align-items:center;gap:8px;min-width:0;font-size:13px}
.$-dy-part-track{height:10px;border-radius:5px;background:var(--$-dy-seg);overflow:hidden}
.$-dy-part-track i{display:block;height:100%;border-radius:5px}
.$-dy-part b{font-size:15px}
.$-dy-sync{display:flex;flex-direction:column;gap:8px;padding-top:8px;border-top:1px solid var(--$-dy-line)}
.$-dy-sync-row{display:flex;align-items:center;gap:14px;padding:10px 0;border-bottom:1px solid var(--$-dy-line)}
.$-dy-sync-row:last-child{border-bottom:0}
.$-dy-sync-covers{flex:none;display:flex}
.$-dy-sync-covers button{padding:0;border:2px solid var(--$-dy-card);border-radius:6px;background:none;cursor:pointer;line-height:0}
.$-dy-sync-covers button+button{margin-left:-14px}
.$-dy-sync-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px}
.$-dy-sync-title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;line-height:22px}
.$-dy-sync-chips{display:flex;flex-wrap:wrap;gap:6px}
.$-dy-sync-total{flex:none;display:flex;flex-direction:column;align-items:flex-end;gap:2px;color:var(--$-dy-text-3);font-size:12px}
.$-dy-sync-total b{color:var(--$-dy-text);font-size:18px}

.$-dy-bento{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-auto-rows:minmax(150px,auto);grid-auto-flow:dense;gap:14px}
@container $-dypage (max-width:760px){.$-dy-bento{grid-template-columns:repeat(2,minmax(0,1fr))}.$-dy-bento-hero{grid-column:span 2}}
.$-dy-bento-tile{position:relative;display:flex;flex-direction:column;gap:8px;min-width:0;padding:18px;border:0;border-radius:20px;background:linear-gradient(150deg,color-mix(in srgb,var(--tint) 11%,var(--$-dy-card)),var(--$-dy-card) 62%);box-shadow:0 0 0 1px color-mix(in srgb,var(--tint) 16%,var(--$-dy-line)),0 1px 2px rgba(0,0,0,.04);color:var(--$-dy-text);text-align:left;cursor:pointer;transition:transform .2s,box-shadow .2s;overflow:hidden}
.$-dy-bento-tile:hover{transform:translateY(-2px);box-shadow:0 0 0 1px color-mix(in srgb,var(--tint) 30%,var(--$-dy-line)),0 10px 28px rgba(0,0,0,.08)}
.$-dy-bento-big{grid-column:span 2;grid-row:span 2}
.$-dy-bento-hero{grid-column:span 4;grid-row:span 1}
.$-dy-bento-wide{grid-column:span 2}
.$-dy-bento-head{display:flex;align-items:center;gap:10px;min-width:0}
.$-dy-bento-who{flex:1;min-width:0;display:flex;flex-direction:column;line-height:18px}
.$-dy-bento-who b{font-size:14px}
.$-dy-bento-who span{color:var(--$-dy-text-3);font-size:12px}
.$-dy-bento-label{margin-top:auto;color:var(--$-dy-text-2);font-size:13px}
.$-dy-bento-value{display:flex;align-items:baseline;flex-wrap:wrap;gap:8px}
.$-dy-bento-value b{font-size:28px;line-height:34px;font-weight:700}
.$-dy-bento-big .$-dy-bento-value b,.$-dy-bento-hero .$-dy-bento-value b{font-size:44px;line-height:52px}
.$-dy-bento-small .$-dy-bento-value b{font-size:24px;line-height:30px}
.$-dy-bento-none{margin-top:auto;color:var(--$-dy-text-3);font-size:13px}
.$-dy-bento-foot{display:flex;flex-wrap:wrap;gap:4px 14px;color:var(--$-dy-text-3);font-size:12px}
.$-dy-bento-foot b{color:var(--$-dy-text-2);font-size:12px}
.$-dy-spark{width:100%;min-width:0;line-height:0}
.$-dy-spark svg{display:block;max-width:100%}

.$-dy-feed-more{display:flex;justify-content:center}
`)

    // ---- 3V.6 账号看板：数据总览（雷达 + 分析 + TOP3）、作品数据、粉丝数据、作品列表（照抖音「数据中心」从上往下）

    function HealthBanner({ platform, health, busy, onLogin, onRefresh }) {
      if (health === undefined || health.state === 'ok') return null
      const tone = HEALTH[health.state].tone
      return h('div', { className: cls('dy-alert', `dy-alert-${tone}`), role: tone === 'danger' ? 'alert' : 'status' },
        h(Icon, { name: health.state === 'pending' ? 'clock' : 'warn', size: 16 }),
        h('span', { className: cls('grow') }, t(`v2.health.${health.state}.long`), health.message ? `（${health.message}）` : '',
          health.state === 'login-required' ? ` ${t('v2.health.loginHint', { platform: platform?.displayName ?? '' })}` : ''),
        health.state === 'login-required'
          ? h(DyBtn, { kind: 'primary', onClick: onLogin }, t('v2.fix.login-required'))
          : h(DyBtn, { busy, onClick: onRefresh }, t(`v2.fix.${health.state}`)))
    }

    /** 雷达图右边那块的 TOP3 按哪个数排：雷达选中了哪个维度就按作品的同一个数排（作品没有这个数时按播放）。 */
    const TOP_BY = { views: 'views', likes: 'likes', comments: 'comments', shares: 'shares', collects: 'collects', engagement: 'interactions' }
    function topPosts(posts, key, platform) {
      const since = new Date(Date.now() - 30 * 86_400_000).toISOString()
      const recent = posts.filter(post => (post.publishedAt ?? post.updatedAt) >= since)
      const labels = platform.metrics ?? DEFAULT_COUNTER_LABELS
      const valueOf = (post, pick) => pick === 'interactions'
        ? (post.views ? ((post.likes ?? 0) + (post.comments ?? 0) + (post.shares ?? 0)) / post.views : undefined)
        : post[pick]
      // 按选中的维度排；作品上没有这个数（比如小红书公开主页不给单条的观看数）就换一个作品上有的数，不说「没有作品」。
      const wanted = TOP_BY[key] ?? (labels.views !== undefined ? 'views' : 'likes')
      const pick = [wanted, 'views', 'likes', 'comments', 'collects', 'shares'].find(field => recent.some(post => valueOf(post, field) !== undefined)) ?? wanted
      const label = pick === 'interactions' ? t('v2.top.engagement') : t('v2.top.total', { label: labels[pick] ?? DEFAULT_COUNTER_LABELS[pick] })
      const ranked = recent.filter(post => valueOf(post, pick) !== undefined).sort((a, b) => valueOf(b, pick) - valueOf(a, pick)).slice(0, 3)
      return { label, unit: pick === 'interactions' ? 'percent' : 'count', none: recent.length === 0, items: ranked.map(post => ({ post, value: valueOf(post, pick) })) }
    }

    function OverviewBoard({ dash, onOpenPost }) {
      const [selected, setSelected] = useState(undefined)
      const kpis = dash.headline
      const current = kpis.find(kpi => kpi.key === selected) ?? kpis[0]
      const from = (() => { const date = new Date(`${dash.to}T00:00:00Z`); date.setUTCDate(date.getUTCDate() - 6); return date.toISOString().slice(0, 10) })()
      const top = topPosts(dash.posts, current?.key, dash.platform)
      const noun = dash.platform.noun ?? t('v2.posts.noun')
      if (kpis.length < 3 || current === undefined) return null
      return h(DyCard, { title: t('v2.board.overview'), tip: t('v2.board.overviewTip'), note: t('v2.board.period', { from, to: dash.to }) },
        h('div', { className: cls('dy-ov') },
          h(DyRadar, { kpis, selected: current?.key, onSelect: setSelected }),
          h('div', { className: cls('dy-ov-side') },
            h('h3', { className: cls('dy-sub-title') }, t('v2.board.analysis', { label: current.label })),
            h('p', { className: cls('dy-ov-sentence') }, analysisSentence(current, noun)),
            h('div', { className: cls('dy-ov-top-head') }, h('h3', { className: cls('dy-sub-title') }, t('v2.board.top', { label: top.label })),
              h('button', { type: 'button', className: cls('dy-link'), onClick: () => document.getElementById('dy-posts')?.scrollIntoView({ behavior: 'smooth' }) }, t('v2.board.allPosts'), h(Icon, { name: 'right', size: 12 }))),
            top.items.length === 0 ? h('p', { className: cls('dy-muted') }, t(top.none ? 'v2.board.noTop' : 'v2.board.noTopCounts')) : h('div', { className: cls('dy-top') }, top.items.map(({ post, value }, index) => h('button', { key: post.postId, type: 'button', className: cls('dy-top-row'), onClick: () => onOpenPost(post) },
              h(PostCover, { post, width: 42 }),
              h('span', { className: cls('dy-top-title') }, post.title),
              h('span', { className: cls('dy-top-rank'), 'data-rank': index + 1 }, index + 1),
              h('b', { className: cls('dy-num', 'dy-top-num') }, dyValue(value, top.unit))))))))
    }
    /** 「X分析」那一句（照抖音：您的视频播放量为 6.81万，高于 98% 的同类创作者 → 这里和前 7 天比）。 */
    function analysisSentence(kpi, noun) {
      const value = dyValue(kpi.value, kpi.unit)
      if (kpi.change === undefined) return h(Fragment, null, t('v2.sentence.only', { label: kpi.label, noun }), h('b', null, value))
      return h(Fragment, null, t('v2.sentence.only', { label: kpi.label, noun }), h('b', null, value), t(kpi.change >= 0 ? 'v2.sentence.higher' : 'v2.sentence.lower'),
        h('b', null, `${Math.abs(kpi.change * 100).toFixed(Math.abs(kpi.change) < 0.1 ? 1 : 0)}%`))
    }

    /** 时间范围（照抖音：昨天 | 近7天 | 近30天）。 */
    const RANGES = [1, 7, 30]
    const rangeOptions = () => RANGES.map(days => ({ value: days, label: days === 1 ? t('v2.range.yesterday') : t('v2.range.days', { days }) }))

    /** 作品数据、粉丝数据：右上角时间范围、日期、导出；中间一排指标卡；下面是选中那项的走势。 */
    function SeriesBoard({ title, tip, account, days, onDays, dash, pick, prefer, exportName, after }) {
      const kpis = dash === undefined ? [] : pick(dash)
      const [selected, setSelected] = useState(undefined)
      const current = kpis.find(kpi => kpi.key === selected) ?? kpis.find(kpi => kpi.key === prefer) ?? kpis[0]
      if (dash !== undefined && kpis.length === 0) return null
      return h(DyCard, {
        title, tip, note: t('v2.board.daily'),
        tools: [
          h(DySeg, { key: 'range', value: days, onChange: onDays, label: t('v2.range.label'), options: rangeOptions() }),
          dash ? h('span', { key: 'date', className: cls('dy-date') }, h(Icon, { name: 'calendar', size: 14 }), rangeText(dash.from, dash.to)) : null,
          h(DyBtn, { key: 'export', icon: 'download', disabled: kpis.length === 0, onClick: () => exportKpis(`${account.name}-${exportName}-${dash.from}至${dash.to}`, kpis) }, t('v2.export.button')),
        ],
      },
      dash === undefined ? h(Waiting) : h(Fragment, null,
        h(MetricCards, { kpis, value: current?.key, onChange: setSelected }),
        current ? h(DyLine, { key: current.key, points: current.daily, unit: current.unit, label: current.label, color: kpis.indexOf(current), zero: current.key !== 'followers' }) : null,
        after))
    }

    const POST_SORTS = ['newest', 'views', 'likes', 'comments']
    function PostsBoard({ dash, onOpenPost }) {
      const [sort, setSort] = useState('newest')
      const labels = dash.platform.metrics ?? DEFAULT_COUNTER_LABELS
      const keys = ['views', 'likes', 'comments', 'shares', 'collects'].filter(key => labels[key] !== undefined && dash.posts.some(post => post[key] !== undefined))
      const sorts = POST_SORTS.filter(key => key === 'newest' || keys.includes(key))
      const rows = sort === 'newest' ? dash.posts : [...dash.posts].sort((a, b) => (b[sort] ?? -1) - (a[sort] ?? -1))
      const noun = dash.platform.noun ?? t('v2.posts.noun')
      return h(DyCard, {
        id: 'dy-posts', title: t('v2.posts.title', { noun }), note: t('v2.posts.count', { count: dash.posts.length }),
        tools: [
          h(DySeg, { key: 'sort', value: sort, onChange: setSort, label: t('v2.posts.sort'), options: sorts.map(key => ({ value: key, label: key === 'newest' ? t('v2.posts.newest') : labels[key] })) }),
          h(DyBtn, { key: 'export', icon: 'download', disabled: rows.length === 0, onClick: () => exportPosts(`${dash.account.name}-${t('v2.posts.title', { noun })}`, rows, dash.platform) }, t('v2.export.button')),
        ],
      },
      rows.length === 0 ? h('p', { className: cls('dy-muted') }, t('v2.posts.none')) : h('div', { className: cls('dy-table'), role: 'table', style: { '--cols': keys.length } },
        h('div', { className: cls('dy-tr', 'dy-th'), role: 'row' },
          h('span', { role: 'columnheader' }, t('v2.posts.info', { noun })), keys.map(key => h('span', { key, role: 'columnheader' }, labels[key]))),
        rows.map(post => h('button', { key: post.postId, type: 'button', className: cls('dy-tr'), role: 'row', onClick: () => onOpenPost(post) },
          h('span', { className: cls('dy-td-post'), role: 'cell' }, h(PostCover, { post, width: 54 }),
            h('span', { className: cls('dy-list-main') }, h('span', { className: cls('dy-list-title') }, post.title), h('span', { className: cls('dy-list-meta') }, post.publishedAt ? t('v2.posts.published', { at: formatInstant(post.publishedAt) }) : t('v2.posts.noTime')))),
          keys.map(key => h('span', { key, role: 'cell', className: cls('dy-num', 'dy-td-num') }, post[key] === undefined ? '—' : dyNum(post[key])))))))
    }

    function AccountView({ account, store, onLogin, onOpenPost, tools }) {
      const [worksDays, setWorksDays] = useState(7)
      const [fansDays, setFansDays] = useState(7)
      const week = useDashboard(account.id, 7, store.version)
      const works = useDashboard(account.id, worksDays, store.version)
      const fans = useDashboard(account.id, fansDays, store.version)
      const dash = week.data
      const platform = store.platforms.find(item => item.id === account.platform)
      const health = healthOf(store.summary, account.id) ?? dash?.health
      const busy = store.busy[account.id] === true
      return h('div', { className: cls('dy-page') },
        h('header', { className: cls('dy-page-head') },
          h(AccountAvatar, { account, platform, size: 44, badge: true }),
          h('div', { className: cls('dy-page-head-main') },
            h('h1', { className: cls('dy-page-title') }, account.name, platform?.beta ? h('span', { className: cls('dy-beta') }, t('v2.beta')) : null, h(HealthTag, { health })),
            h('p', { className: cls('dy-page-sub') }, [platform?.displayName, freshness(health, Date.now())].filter(Boolean).join(' · '))),
          h(DyBtn, { icon: 'refresh', busy, disabled: account.demo === true, title: account.demo ? t('v2.demo.noRefresh') : undefined, onClick: () => face.refresh(account.id) }, t('v2.action.refresh')),
          tools),
        h(HealthBanner, { platform, health, busy, onLogin: () => onLogin(account), onRefresh: () => face.refresh(account.id) }),
        week.reason && !dash ? h(LoadError, { reason: week.reason, onRetry: face.reloadSummary }) : null,
        dash === undefined ? (week.reason ? null : h(Waiting)) : h(Fragment, null,
          dash.headline.length < 3 && health?.state === 'ok' ? h('div', { className: cls('dy-alert', 'dy-alert-muted') }, h(Icon, { name: 'info', size: 16 }), h('span', { className: cls('grow') }, t('v2.board.limited', { platform: platform?.displayName ?? '' }))) : null,
          h(OverviewBoard, { dash, onOpenPost }),
          h(SeriesBoard, { title: t('v2.board.works'), tip: t('v2.board.worksTip'), account, days: worksDays, onDays: setWorksDays, dash: works.data, pick: d => d.works, prefer: 'views', exportName: t('v2.board.works') }),
          h(SeriesBoard, { title: t('v2.board.fans'), tip: t('v2.board.fansTip'), account, days: fansDays, onDays: setFansDays, dash: fans.data, pick: d => d.fans, prefer: 'followers', exportName: t('v2.board.fans') }),
          h(PostsBoard, { dash, onOpenPost })))
    }

    // ---- 3V.7 作品详情弹窗（照抖音单作品页的「总览」：头部封面和标题，下面流量指标卡和几个比率）
    //
    // 抖音单作品页还有流量分析、观众分析、评论热词、评论管理，要读平台创作者后台的作品接口，以后接。

    function WorkModal({ target, onClose, onAsk }) {
      const detail = useRemote(() => remote.postDetail(target.accountId, target.postId), [target.accountId, target.postId])
      // useRemote 在数据回来之前给的是 null，这里统一当成「还没有」。
      const d = detail.data ?? undefined
      const post = d?.post
      return h(Modal, {
        title: t('v2.work.title'), onClose, width: 880,
        footer: [
          post?.url ? h(DyBtn, { key: 'open', icon: 'link', onClick: () => face.openPost(d.account, post.url) }, t('v2.work.open')) : null,
          h(DyBtn, { key: 'ai', kind: 'primary', icon: 'spark', disabled: post === undefined, onClick: () => { onAsk(d); onClose() } }, t('v2.work.ask')),
        ].filter(Boolean),
      },
      detail.reason && !d ? h(LoadError, { reason: detail.reason, onRetry: detail.reload }) : d === undefined ? h(Waiting) : h('div', { className: cls('dy-work') },
        h('div', { className: cls('dy-work-head') },
          h(PostCover, { post, width: 84 }),
          h('div', { className: cls('dy-work-info') },
            h('p', { className: cls('dy-work-title') }, post.title),
            h('p', { className: cls('dy-list-meta') }, h(PlatformLogo, { platform: d.platform, size: 14 }), [d.account.name, post.publishedAt ? t('v2.work.published', { at: formatInstant(post.publishedAt) }) : null].filter(Boolean).join(' · ')),
            h('p', { className: cls('dy-work-status') }, h('span', { className: cls('dy-ok') }, h(Icon, { name: 'check', size: 12 })), t('v2.work.updated', { at: agoText(post.updatedAt, Date.now()) }),
              d.rank ? h('span', { className: cls('dy-tag', 'dy-tag-info') }, t('v2.work.rank', { by: d.rank.by, of: d.rank.of, position: d.rank.position })) : null))),
        h('div', { className: cls('dy-tabs') }, h('span', { className: cls('dy-tab'), 'aria-selected': true }, t('v2.work.tabOverview'))),
        d.metrics.length === 0 ? h('p', { className: cls('dy-muted') }, t('v2.work.noData')) : h('section', { className: cls('dy-work-card') },
          h('h3', { className: cls('dy-sub-title') }, t('v2.work.traffic'), h(Tip, { text: t('v2.work.trafficTip', { count: d.baselinePosts }) })),
          h('div', { className: cls('dy-work-tiles') }, d.metrics.map(item => h('div', { key: item.key, className: cls('dy-work-tile') },
          h('span', { className: cls('dy-work-tile-label') }, t('v2.work.metric', { label: item.label })),
          h('b', { className: cls('dy-num') }, dyNum(item.value)),
          versusMedian(item.value, item.median))))),
        d.rates.length === 0 ? null : h('section', { className: cls('dy-work-card') },
          h('h3', { className: cls('dy-sub-title') }, t('v2.work.engagement')),
          h('div', { className: cls('dy-work-rates') }, d.rates.map(rate => h('div', { key: rate.key, className: cls('dy-work-rate') },
            h('span', { className: cls('dy-work-tile-label') }, rate.label), h('b', { className: cls('dy-num') }, dyValue(rate.value, 'percent')), versusMedian(rate.value, rate.median, 'percent'))))),
        h('p', { className: cls('dy-note') }, t('v2.work.more'))))
    }

    /** 和账号近期中位数比（照抖音「比往期」）：高的绿、低的红。 */
    function versusMedian(value, median, unit) {
      if (value === undefined || median === undefined || median === 0) return h('span', { className: cls('dy-change') }, t('v2.work.noMedian'))
      const ratio = value / median
      const up = ratio >= 1
      return h('span', { className: cls('dy-change', up ? 'dy-up' : 'dy-down'), title: t('v2.work.median', { value: dyValue(median, unit ?? 'count') }) },
        t('v2.work.vs'), ` ${up ? '↑' : '↓'}${Math.abs((ratio - 1) * 100).toFixed(0)}%`)
    }

    // ---- 3V.8 添加平台、数据指标说明

    function AddPlatformModal({ platforms, accounts, onPick, onClose }) {
      const usable = platforms.filter(platform => platform.scrape)
      return h(Modal, { title: t('v2.add.title'), onClose, width: 560 },
        h('p', { className: cls('dy-muted') }, t('v2.add.body')),
        h('div', { className: cls('dy-pick') }, usable.map(platform => {
          const count = accounts.filter(account => account.platform === platform.id && account.demo !== true).length
          const full = count >= MAX_ACCOUNTS
          return h('button', { key: platform.id, type: 'button', className: cls('dy-pick-item'), disabled: full, onClick: () => onPick(platform) },
            h(PlatformLogo, { platform, size: 36 }),
            h('span', { className: cls('dy-pick-name') }, platform.displayName, platform.beta ? h('span', { className: cls('dy-beta') }, t('v2.beta')) : null),
            h('span', { className: cls('dy-pick-sub') }, full ? t('v2.add.full', { max: MAX_ACCOUNTS }) : count > 0 ? t('v2.add.count', { count, max: MAX_ACCOUNTS }) : t('v2.add.scan')))
        })))
    }

    /** 右边缘「数据指标说明」抽屉（照抖音）：数据什么时候更新、每个指标怎么算。 */
    function MetricsDrawer({ dash, onClose }) {
      const kpis = dash === undefined ? [] : [...dash.works, ...dash.fans]
      return h(Drawer, { title: t('v2.help.title'), onClose, width: 380 },
        h('div', { className: cls('dy-help') },
          h('h3', { className: cls('dy-sub-title') }, t('v2.help.when')),
          h('p', null, t('v2.help.whenBody')),
          h('h3', { className: cls('dy-sub-title') }, t('v2.help.what')),
          kpis.length === 0 ? h('p', null, t('v2.help.pick')) : h('dl', null, kpis.map(kpi => [h('dt', { key: `${kpi.key}-t` }, kpi.label), h('dd', { key: `${kpi.key}-d` }, kpi.hint)])),
          h('h3', { className: cls('dy-sub-title') }, t('v2.help.missing')),
          h('p', null, t('v2.help.missingBody'))))
    }

    // ---- 3V.9 AI 助手：右边一栏放 DSH 自己的对话；输入框上方放几个固定的快捷模块（找选题、最新作品分析、导出数据）
    //
    // 对话在一个专门的工作区里（ui.js 建的「文稿/自媒体」），所以 AI 导出的表格就在那个文件夹里。
    // 快捷模块只把一句话填进输入框（说清是哪个账号），不替你发：可以改完再发。

    const CHAT_SLOT = 'media.chat'
    const ChatView = props => props.renderSlot('conversation.session', { view: 'chat' })
    function ChatSlot({ sessionId, useSession, useConversation, useSessions, renderFactorySlot }) {
      const session = useSession(v => v)
      const targets = useConversation(v => v.activeTargets.size)
      const summaryBlank = useSessions(st => st.byId[sessionId]?.blank)
      const shell = targets > 0 || (!session.blank && !session.awaitingFirstTurn) || session.running ? 'active' : session.promptAttempted ? 'engaging' : 'blank'
      const settling = shell === 'blank' && session.openState === 'loading' && summaryBlank !== true
      const hero = shell === 'blank' && (session.openState === 'open' || summaryBlank === true)
      return renderFactorySlot('conversation.content', { variant: 'embedded', phase: settling ? 'settling' : hero ? 'hero' : 'active', hero }, { slots: { views: ChatView } })
    }

    /** 快捷模块对着哪个账号：看板上选中的账号；在总览时是「全部账号」。 */
    function chatTarget(store) {
      const account = store.view.kind === 'account' ? store.accounts.find(item => item.id === store.view.id) : undefined
      const platform = store.platforms.find(item => item.id === account?.platform)
      return { account, platform }
    }
    function quickPrompt(kind, store) {
      const { account, platform } = chatTarget(store)
      if (account === undefined) return t(`v2.ask.all.${kind}`)
      return t(`v2.ask.${kind}`, { account: account.name, account_id: account.id, platform: platform?.displayName ?? account.platform, noun: platform?.noun ?? t('v2.posts.noun') })
    }
    const QUICK = [['topics', 'spark'], ['latest', 'trend'], ['export', 'download']]

    function ChatPane({ renderSlot, SessionProvider }) {
      const store = useSource(face.store)
      const chat = store.chat
      const sid = face.chat.sid()
      const reference = sid ? face.chat.hold(sid) : null
      const { account, platform } = chatTarget(store)
      return h(SidePane, {
        width: chat.width, min: 360, max: 760, onResize: width => face.setChat({ width }), label: t('v2.chat.title'),
        title: h('span', { className: cls('dy-chat-title') }, h(Icon, { name: 'spark', size: 15 }), t('v2.chat.title')),
        sub: account ? h('span', { className: cls('dy-chat-sub') }, h(PlatformLogo, { platform, size: 14 }), account.name) : t('v2.chat.all'),
        tools: [
          h(Btn, { key: 'new', kind: 'ghost', sm: true, icon: 'plus', label: t('v2.chat.new'), disabled: chat.pending, onClick: () => face.chat.open('', { fresh: true }) }),
          h(Btn, { key: 'full', kind: 'ghost', sm: true, icon: 'expand', label: t('v2.chat.full'), disabled: !sid, onClick: face.chat.full }),
          h(Btn, { key: 'x', kind: 'ghost', sm: true, icon: 'right', label: t('v2.chat.close'), onClick: () => face.setChat({ open: false }) }),
        ],
      },
      chat.error ? h(Alert, { tone: 'danger' }, t('v2.chat.failed', { reason: chat.error })) : null,
      reference
        ? h(SessionProvider, { session: reference }, renderSlot(CHAT_SLOT, {}))
        : chat.pending ? h(Loading, { text: t('v2.chat.opening') })
          : h('div', { className: cls('dy-chat-empty') },
            h('p', { className: cls('dy-sub-title') }, t('v2.chat.emptyTitle')), h('p', { className: cls('dy-muted') }, t('v2.chat.emptyBody')),
            h('div', { className: cls('dy-quick-list') }, QUICK.map(([kind, icon]) => h('button', { key: kind, type: 'button', className: cls('dy-quick'), onClick: () => face.chat.open(quickPrompt(kind, store)) }, h(Icon, { name: icon, size: 14 }), t(`v2.quick.${kind}`))),
              h('button', { type: 'button', className: cls('dy-quick'), onClick: () => face.chat.open('') }, h(Icon, { name: 'chat', size: 14 }), t('v2.chat.blank')))))
    }

    /** 输入框上方那一排快捷模块。只出现在自媒体自己的对话里（看对话属于哪个工作区文件夹）。 */
    function Dock(props) {
      const { sessionId } = props
      const folder = props.useWorkspaces(w => w.items?.find(x => x.sessionIds?.includes(sessionId))?.path ?? '')
      const running = props.useSession(x => x.running)
      const store = useSource(face.store)
      if (face.chat.folder() === undefined || folder !== face.chat.folder()) return null
      const { account } = chatTarget(store)
      return h('div', { style: { padding: '0 var(--dsh-composer-side-clearance, 16px)' } }, h('div', { style: { maxWidth: 'var(--dsh-composer-card-max-width, 776px)', margin: '0 auto 8px' } },
        h(Embed, { className: cls('dy-dock') },
          h('span', { className: cls('dy-dock-for') }, account ? t('v2.dock.for', { name: account.name }) : t('v2.dock.all')),
          QUICK.map(([kind, icon]) => h('button', { key: kind, type: 'button', className: cls('dy-quick'), disabled: running, onClick: () => face.chat.open(quickPrompt(kind, store)) },
            h(Icon, { name: icon, size: 14 }), t(`v2.quick.${kind}`))))))
    }

    /** 右边缘的竖条按钮（照抖音「数据指标说明」）：AI 助手收起时一直在，点开右边一栏；指标说明点开抽屉。 */
    function EdgeTabs({ chatOpen, onChat, onHelp }) {
      return h('div', { className: cls('dy-edge') },
        chatOpen ? null : h('button', { type: 'button', className: cls('dy-edge-tab', 'dy-edge-ai'), onClick: onChat, title: t('v2.chat.title') }, h(Icon, { name: 'spark', size: 14 }), h('span', null, t('v2.edge.ai'))),
        h('button', { type: 'button', className: cls('dy-edge-tab'), onClick: onHelp, title: t('v2.help.title') }, h('span', null, t('v2.edge.help'))))
    }

    // ---- 3V.10 整个页面：左边一列 | 中间看板 | 右边 AI 助手；弹窗、抽屉和登录小浏览器盖在上面

    function MediaPageV2({ renderSlot, SessionProvider }) {
      const store = useSource(face.store)
      const [theme, setTheme] = usePageTheme()
      const browser = useSource(face.sources.browser)
      const [adding, setAdding] = useState(false)
      const [work, setWork] = useState(undefined)
      const [help, setHelp] = useState(false)
      const chatOn = store.chat.open && typeof renderSlot === 'function' && SessionProvider !== undefined
      const toggleChat = () => chatOn ? face.setChat({ open: false }) : face.chat.open('')
      // AI 助手只从右边缘的竖条拉出、从它自己那一栏的右上角收起，页头不再放第二个入口。
      const tools = null
      const platformOf = id => store.platforms.find(platform => platform.id === id)
      const relogin = account => face.openBrowser(account.platform, undefined, 'browse', account.id)
      const scan = platform => face.openBrowser(platform.id, undefined, 'connect')
      const onFix = (account, health) => health.state === 'login-required' ? relogin(account) : face.select({ kind: 'account', id: account.id })
      const onRemove = async account => {
        const yes = await ask({ title: t('v2.remove.title', { name: account.name }), text: t('v2.remove.body'), ok: t('v2.remove.ok'), danger: true })
        if (yes) await face.remove(account.id)
      }
      const openPost = post => setWork({ accountId: post.accountId, postId: post.postId })
      const askPost = d => face.chat.open(t('v2.ask.post', { account: d.account.name, account_id: d.account.id, platform: d.platform.displayName, post: d.post.postId, title: d.post.title }))
      const current = store.view.kind === 'account' ? store.accounts.find(account => account.id === store.view.id) : undefined
      const helpDash = useDashboard(help ? current?.id : undefined, 30, store.version)
      const empty = store.status === 'ready' && store.accounts.length === 0
      let body
      if (store.status !== 'ready') body = h('div', { className: cls('dy-page') }, store.status === 'error' ? h(LoadError, { reason: store.reason, onRetry: face.reload }) : h(Waiting))
      else if (empty) body = h(FirstRun, { platforms: store.platforms, onPick: scan })
      else if (current !== undefined) body = h(AccountView, { key: current.id, account: current, store, onLogin: relogin, onOpenPost: openPost, tools })
      else body = h(OverviewView, { store, onFix, onOpenPost: openPost, tools })
      return h(Root, { className: cls('dy-root'), theme },
        h('div', { className: cls('shell') },
          empty ? null : h(MediaNav, { store, onAddAccount: scan, onAddPlatform: () => setAdding(true), onRemove, theme, onTheme: setTheme }),
          h('main', { className: cls('main') }, h('div', { className: cls('scroll', 'dy-scroll') }, body), empty ? null : h(EdgeTabs, { chatOpen: chatOn, onChat: toggleChat, onHelp: () => setHelp(true) })),
          chatOn ? h(ChatPane, { renderSlot, SessionProvider }) : null),
        adding ? h(AddPlatformModal, { platforms: store.platforms, accounts: store.accounts, onClose: () => setAdding(false), onPick: platform => { setAdding(false); scan(platform) } }) : null,
        work ? h(WorkModal, { target: work, onClose: () => setWork(undefined), onAsk: askPost }) : null,
        help ? h(MetricsDrawer, { dash: current ? helpDash.data : undefined, onClose: () => setHelp(false) }) : null,
        h(BrowserPanel, { browser, platform: platformOf(browser.platform), onInput: face.browserInput, onRetry: face.retryBrowser, onClose: face.closeBrowser, onIdentify: face.identifyBrowser, onConnect: face.connectIdentity, onMinimize: face.minimizeBrowser }),
        h(MiniBrowser, { browser, expand: face.expandBrowser, close: face.closeBrowser, retry: face.retryBrowser, identify: face.identifyBrowser, connect: face.connectIdentity }))
    }

    /** 页面要用的数据源和动作，第 4 段挂载时装好。 */
    let face = null

    // 看板的样式（照抖音「数据中心」量出来的：底色 #F9F9FA、白卡 12px 圆角、标题 20px/600、数字 DIN、分段控件 32px 高）。
    // 颜色都取自第 1 段 THEME 里的 --$-dy-*，深色模式在那里改。
    addStyles(`
.$-dy-root{font-family:var(--$-dy-font);color:var(--$-dy-text);background:var(--$-dy-bg);-webkit-font-smoothing:antialiased}
.$-dy-root .$-main{position:relative;background:var(--$-dy-bg)}
.$-dy-scroll{background:var(--$-dy-bg)}
.$-dy-num{font-family:var(--$-dy-font-num);font-variant-numeric:tabular-nums;letter-spacing:0}
.$-dy-muted{margin:0;color:var(--$-dy-text-2);font-size:14px;line-height:22px}
.$-dy-note{margin:0;color:var(--$-dy-text-3);font-size:12px;line-height:20px}
.$-dy-ellipsis{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.$-dy-link{display:inline-flex;align-items:center;gap:2px;padding:0;border:0;background:none;color:var(--$-dy-text-2);font-size:13px;cursor:pointer}
.$-dy-link:hover{color:var(--$-dy-text)}
.$-dy-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:32px;padding:0 14px;border:0;border-radius:8px;font-size:14px;line-height:22px;white-space:nowrap;cursor:pointer;transition:background .15s}
.$-dy-btn:disabled{opacity:.45;cursor:not-allowed}
.$-dy-btn-primary{background:var(--$-dy-primary);color:var(--$-dy-on-primary)}
.$-dy-btn-primary:hover:not(:disabled){background:var(--$-dy-primary-hover)}
.$-dy-btn-secondary{background:var(--$-dy-seg);color:var(--$-dy-text-strong)}
.$-dy-btn-secondary:hover:not(:disabled){background:var(--$-dy-seg-hover)}
.$-dy-btn-text{background:none;color:var(--$-dy-text-2);padding:0 6px}
.$-dy-seg{display:inline-flex;align-items:center;gap:2px;height:32px;padding:2px;border-radius:8px;background:var(--$-dy-seg)}
.$-dy-seg-item{height:28px;min-width:64px;padding:0 12px;border:0;border-radius:6px;background:none;color:var(--$-dy-text-2);font-size:14px;cursor:pointer;white-space:nowrap}
.$-dy-seg-item[aria-pressed=true]{background:var(--$-dy-card);color:var(--$-dy-text);font-weight:500;box-shadow:0 1px 2px rgba(0,0,0,.06)}
.$-dy-date{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px;border-radius:8px;background:var(--$-dy-seg);color:var(--$-dy-text-strong);font-size:14px;font-family:var(--$-dy-font-num)}
.$-dy-tip{position:relative;display:inline-flex;align-items:center;margin-left:4px;color:var(--$-dy-text-3);cursor:help;vertical-align:middle}
.$-dy-tip:hover::after,.$-dy-tip:focus::after{content:attr(data-tip);position:absolute;left:50%;bottom:calc(100% + 8px);transform:translateX(-50%);z-index:30;width:max-content;max-width:280px;padding:8px 12px;border-radius:6px;background:var(--$-dy-tooltip);color:#fff;font-size:12px;line-height:18px;font-weight:400;white-space:normal;text-align:left;pointer-events:none}
.$-dy-tag{display:inline-flex;align-items:center;height:20px;margin-left:8px;padding:0 6px;border-radius:4px;font-size:12px;line-height:20px;font-weight:500;white-space:nowrap;vertical-align:middle}
.$-dy-tag-good{background:var(--$-dy-blue-soft);color:var(--$-dy-blue)}
.$-dy-tag-info{background:var(--$-dy-blue-soft);color:var(--$-dy-blue)}
.$-dy-tag-danger{background:var(--$-dy-red-soft);color:var(--$-dy-red)}
.$-dy-tag-warn{background:var(--$-dy-orange-soft);color:var(--$-dy-orange)}
.$-dy-tag-muted{background:var(--$-dy-seg);color:var(--$-dy-text-2)}
.$-dy-dot{flex:none;width:7px;height:7px;border-radius:50%}
.$-dy-dot-danger{background:var(--$-dy-red)}
.$-dy-dot-warn{background:var(--$-dy-orange)}
.$-dy-dot-muted{background:var(--$-dy-text-3)}
.$-dy-change{font-size:12px;line-height:18px;color:var(--$-dy-text-3);font-family:var(--$-dy-font-num);white-space:nowrap}
.$-dy-up{color:var(--$-dy-green)}
.$-dy-down{color:var(--$-dy-red)}
.$-dy-beta{margin-left:6px;padding:0 5px;border-radius:4px;background:var(--$-dy-seg);color:var(--$-dy-text-3);font-size:11px;line-height:16px;font-weight:400;vertical-align:middle}
.$-dy-avatar{position:relative;flex:none;display:inline-grid;place-items:center;width:20px;height:20px;border-radius:50%;background:var(--$-dy-seg);color:var(--$-dy-text-2);font-size:11px;font-weight:600}
.$-dy-avatar>img{width:100%;height:100%;border-radius:50%;object-fit:cover;display:block}
.$-dy-avatar-badge{position:absolute;right:-3px;bottom:-3px;display:block;border-radius:5px;box-shadow:0 0 0 2px var(--$-dy-card)}
.$-dy-cover{flex:none;display:inline-grid;place-items:center;border-radius:4px;object-fit:cover;background:var(--$-dy-seg);color:var(--$-dy-text-3)}

.$-dy-nav{flex:none;display:flex;flex-direction:column;gap:2px;width:232px;padding:calc(20px + var(--dsh-frame-top-clearance,0px)) 12px 16px;border-right:1px solid var(--$-dy-line);background:var(--$-dy-card);overflow-y:auto}
.$-dy-nav-brand{display:flex;align-items:center;gap:8px;padding:0 4px 16px 12px;font-size:16px;line-height:24px;font-weight:600}
.$-dy-theme{flex:none;display:inline-flex;align-items:center;gap:2px;height:28px;padding:2px;border-radius:999px;background:var(--$-dy-seg)}
.$-dy-theme-item{display:inline-grid;place-items:center;width:28px;height:24px;padding:0;border:0;border-radius:999px;background:none;color:var(--$-dy-text-3);cursor:pointer;transition:background .15s,color .15s}
.$-dy-theme-item:hover{color:var(--$-dy-text)}
.$-dy-theme-item[aria-checked=true]{background:var(--$-dy-card);color:var(--$-dy-text);box-shadow:0 1px 2px rgba(0,0,0,.12)}
.$-dy-nav-item{display:flex;align-items:center;gap:10px;width:100%;height:40px;padding:0 12px;border:0;border-radius:8px;background:none;color:var(--$-dy-text);font-size:14px;text-align:left;cursor:pointer}
.$-dy-nav-item:hover{background:var(--$-dy-hover)}
.$-dy-nav-item[aria-current=page]{background:var(--$-dy-seg);font-weight:600}
.$-dy-nav-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.$-dy-nav-group{display:flex;flex-direction:column;gap:2px;margin-top:12px}
.$-dy-nav-head{position:relative;display:flex;align-items:center;gap:10px;height:36px;padding:0 4px 0 12px;color:var(--$-dy-text-2);font-size:13px;font-weight:500}
.$-dy-nav-act{position:absolute;right:4px;display:inline-flex;align-items:center;gap:2px;height:24px;padding:0 6px;border:0;border-radius:6px;background:var(--$-dy-card);color:var(--$-dy-text-3);font-size:12px;cursor:pointer;visibility:hidden}
.$-dy-nav-head:hover .$-dy-nav-act,.$-dy-nav-head:focus-within .$-dy-nav-act{visibility:visible}
.$-dy-nav-act:hover{background:var(--$-dy-seg);color:var(--$-dy-text)}
.$-dy-nav-row{position:relative;display:flex;align-items:center}
.$-dy-nav-child{padding-left:20px}
.$-dy-nav-del{position:absolute;right:6px;display:inline-grid;place-items:center;width:26px;height:26px;border:0;border-radius:6px;background:var(--$-dy-card);color:var(--$-dy-text-3);cursor:pointer;visibility:hidden}
.$-dy-nav-row:hover .$-dy-nav-del,.$-dy-nav-row:focus-within .$-dy-nav-del{visibility:visible}
.$-dy-nav-del:hover{color:var(--$-dy-red);background:var(--$-dy-red-soft)}
.$-dy-nav-plus{display:flex;align-items:center;gap:8px;height:40px;margin-top:16px;padding:0 12px;border:1px dashed var(--$-dy-line-strong);border-radius:8px;background:none;color:var(--$-dy-text-2);font-size:14px;cursor:pointer}
.$-dy-nav-plus:hover{color:var(--$-dy-text);border-color:var(--$-dy-text-3)}
.$-dy-nav-foot{margin-top:auto;padding:16px 12px 0;color:var(--$-dy-text-3);font-size:12px;line-height:18px}
.$-dy-nav-foot p{margin:0}

.$-dy-page{container:$-dypage/inline-size;display:flex;flex-direction:column;gap:16px;max-width:1240px;margin:0 auto;padding:calc(24px + var(--dsh-frame-top-clearance,0px)) 48px 64px 32px}
.$-dy-page-head{display:flex;align-items:center;flex-wrap:wrap;gap:12px 16px;margin-bottom:4px}
.$-dy-page-head-main{flex:1 1 240px;min-width:0}
.$-dy-page-title{display:flex;align-items:center;flex-wrap:wrap;margin:0;font-size:22px;line-height:30px;font-weight:600}
.$-dy-page-sub{margin:2px 0 0;color:var(--$-dy-text-2);font-size:13px;line-height:20px}
.$-dy-card{display:flex;flex-direction:column;gap:20px;padding:24px;border-radius:12px;background:var(--$-dy-card)}
.$-dy-card-head{display:flex;align-items:center;flex-wrap:wrap;gap:8px 12px;min-height:32px}
.$-dy-card-title{display:flex;align-items:center;margin:0;font-size:20px;line-height:28px;font-weight:600}
.$-dy-card-note{color:var(--$-dy-text-2);font-size:12px;line-height:20px}
.$-dy-card-tools{display:flex;align-items:center;flex-wrap:wrap;gap:8px 12px}
.$-dy-sub-title{display:flex;align-items:center;margin:0;font-size:16px;line-height:24px;font-weight:600}

.$-dy-alerts{display:flex;flex-direction:column;gap:8px}
.$-dy-alert{display:flex;align-items:center;gap:10px;padding:10px 12px 10px 16px;border-radius:8px;font-size:14px;line-height:22px}
.$-dy-alert-danger{background:var(--$-dy-red-soft);color:var(--$-dy-text)}
.$-dy-alert-danger>svg:first-child{color:var(--$-dy-red)}
.$-dy-alert-warn{background:var(--$-dy-orange-soft)}
.$-dy-alert-warn>svg:first-child{color:var(--$-dy-orange)}
.$-dy-alert-muted{background:var(--$-dy-seg)}

.$-dy-metrics{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:12px}
.$-dy-metric{position:relative;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:4px;min-width:0;height:94px;padding:0 16px;border:0;border-radius:8px;background:var(--$-dy-tile);color:var(--$-dy-text);text-align:left;cursor:pointer;overflow:hidden}
.$-dy-metric:hover{background:var(--$-dy-tile-hover)}
.$-dy-metric[aria-selected=true]::after{content:'';position:absolute;left:0;right:0;bottom:0;height:3px;background:var(--dy-metric-color)}
.$-dy-metric-label{display:flex;align-items:center;color:var(--$-dy-text-2);font-size:14px;line-height:22px;white-space:nowrap}
.$-dy-metric-value{font-size:22px;line-height:30px;font-weight:700}
.$-dy-chart{position:relative;width:100%;min-width:0}
.$-dy-chart svg{display:block;max-width:100%}
.$-dy-chart-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:var(--$-dy-text-3);font-size:13px}
.$-dy-grid{stroke:var(--$-dy-line);stroke-dasharray:4 4}
.$-dy-axis{fill:var(--$-dy-text-3);font-size:12px;font-family:var(--$-dy-font-num)}
.$-dy-guide{stroke:var(--$-dy-text-3);stroke-dasharray:3 3}
.$-dy-pop{position:absolute;top:10px;z-index:5;display:flex;flex-direction:column;gap:6px;min-width:150px;padding:10px 12px;border-radius:8px;background:var(--$-dy-card);box-shadow:0 4px 16px rgba(0,0,0,.12);font-size:12px;line-height:18px;pointer-events:none}
.$-dy-pop-day{color:var(--$-dy-text-2)}
.$-dy-pop-row{display:flex;align-items:center;gap:6px;color:var(--$-dy-text-2)}
.$-dy-pop-row i{width:8px;height:8px;border-radius:50%}
.$-dy-pop-row b{margin-left:auto;padding-left:16px;color:var(--$-dy-text);font-family:var(--$-dy-font-num);font-size:13px}

.$-dy-ov{display:grid;grid-template-columns:minmax(420px,1.35fr) minmax(260px,1fr);gap:24px 32px;align-items:center}
@container $-dypage (max-width:760px){.$-dy-ov{grid-template-columns:minmax(0,1fr)}}
.$-dy-radar{display:flex;flex-direction:column;align-items:center;gap:12px;padding:28px 0 0}
.$-dy-radar-stage{position:relative;width:min(100%,540px);aspect-ratio:1.5;margin:0 auto}
.$-dy-radar-svg{position:absolute;left:50%;top:50%;width:58%;transform:translate(-50%,-50%);overflow:visible}
.$-dy-radar-ring{fill:none;stroke:var(--$-dy-line-strong);stroke-width:.8}
.$-dy-radar-axis{stroke:var(--$-dy-line-strong);stroke-width:.8}
.$-dy-radar-cur{fill:var(--$-dy-blue);fill-opacity:.16;stroke:var(--$-dy-blue);stroke-width:1.6}
.$-dy-radar-prev{fill:var(--$-dy-text-3);fill-opacity:.07;stroke:var(--$-dy-text-3);stroke-width:1.2;stroke-dasharray:4 3}
.$-dy-radar-dot{fill:var(--$-dy-card);stroke:var(--$-dy-blue);stroke-width:1.6}
.$-dy-radar-box{position:absolute;display:flex;flex-direction:column;gap:2px;min-width:112px;padding:6px 12px;border:1px solid var(--$-dy-line);border-radius:8px;background:var(--$-dy-card);color:var(--$-dy-text);text-align:left;cursor:pointer;white-space:nowrap}
.$-dy-radar-box:hover{border-color:var(--$-dy-line-strong)}
.$-dy-radar-box[aria-pressed=true]{border-color:var(--$-dy-blue);box-shadow:0 0 0 1px var(--$-dy-blue)}
.$-dy-radar-box-top{display:flex;align-items:center;gap:6px;color:var(--$-dy-text-2);font-size:13px;line-height:20px}
.$-dy-radar-box-top .$-dy-tag{margin-left:0;height:18px;line-height:18px}
.$-dy-radar-box-val{display:flex;align-items:baseline;gap:8px}
.$-dy-radar-box-val b{font-size:18px;line-height:26px;font-weight:700}
.$-dy-legend{display:flex;justify-content:center;gap:20px}
.$-dy-legend button{display:inline-flex;align-items:center;gap:6px;padding:0;border:0;background:none;color:var(--$-dy-text-2);font-size:12px;cursor:pointer}
.$-dy-legend button[aria-pressed=false]{opacity:.4}
.$-dy-legend i{width:8px;height:8px;border-radius:50%}
.$-dy-legend-cur{background:var(--$-dy-blue)}
.$-dy-legend-prev{background:var(--$-dy-text-3)}
.$-dy-ov-side{display:flex;flex-direction:column;gap:12px;min-width:0;padding-top:8px}
.$-dy-ov-sentence{margin:0 0 8px;color:var(--$-dy-text-2);font-size:14px;line-height:22px}
.$-dy-ov-sentence b{margin:0 2px;color:var(--$-dy-text);font-family:var(--$-dy-font-num);font-size:16px}
.$-dy-ov-top-head{display:flex;align-items:center;justify-content:space-between}
.$-dy-top{display:flex;flex-direction:column;gap:4px;padding:8px;border-radius:8px;background:var(--$-dy-tile)}
.$-dy-top-row{display:flex;align-items:center;gap:12px;padding:8px;border:0;border-radius:8px;background:none;color:var(--$-dy-text);text-align:left;cursor:pointer}
.$-dy-top-row:hover{background:var(--$-dy-card)}
.$-dy-top-title{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:15px;line-height:22px}
.$-dy-top-num{flex:none;font-size:16px;font-weight:700}
.$-dy-top-rank{flex:none;order:-1;width:18px;color:var(--$-dy-text-3);font-family:var(--$-dy-font-num);font-size:16px;font-weight:700;text-align:center}
.$-dy-top-rank[data-rank="1"]{color:#FE2C55}
.$-dy-top-rank[data-rank="2"]{color:#FF7D00}
.$-dy-top-rank[data-rank="3"]{color:#F7BA1E}

.$-dy-list{display:flex;flex-direction:column}
.$-dy-list-row{display:flex;align-items:center;gap:14px;padding:12px 8px;border:0;border-bottom:1px solid var(--$-dy-line);background:none;color:var(--$-dy-text);text-align:left;cursor:pointer}
.$-dy-list-row:last-child{border-bottom:0}
.$-dy-list-row:hover{background:var(--$-dy-tile)}
.$-dy-list-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px}
.$-dy-list-title{overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;font-size:14px;line-height:22px}
.$-dy-list-meta{display:flex;align-items:center;gap:6px;margin:0;color:var(--$-dy-text-3);font-size:12px;line-height:18px}
.$-dy-list-nums{flex:none;display:flex;gap:20px}
.$-dy-list-nums>span{display:flex;flex-direction:column;align-items:flex-end;gap:2px;color:var(--$-dy-text-3);font-size:12px}
.$-dy-list-nums b{color:var(--$-dy-text);font-size:15px}
.$-dy-table{display:flex;flex-direction:column}
.$-dy-tr{display:grid;grid-template-columns:minmax(300px,1fr) repeat(var(--cols,5),minmax(72px,100px));align-items:center;gap:16px;padding:12px 8px;border:0;border-bottom:1px solid var(--$-dy-line);background:none;color:var(--$-dy-text);text-align:right;cursor:pointer}
.$-dy-tr>*:first-child{text-align:left}
.$-dy-th{cursor:default;padding-top:10px;padding-bottom:10px;border-radius:8px 8px 0 0;background:var(--$-dy-tile);color:var(--$-dy-text-2);font-size:13px;border-bottom:0}
.$-dy-tr:not(.$-dy-th):hover{background:var(--$-dy-tile)}
.$-dy-td-post{display:flex;align-items:center;gap:12px;min-width:0}
.$-dy-td-num{font-size:15px}
@container $-dypage (max-width:820px){.$-dy-tr{grid-template-columns:minmax(200px,1fr) repeat(var(--cols,5),minmax(52px,72px));gap:10px}}

.$-dy-acards{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}
.$-dy-acard{display:flex;flex-direction:column;gap:16px;padding:20px;border:1px solid var(--$-dy-line);border-radius:12px;background:var(--$-dy-card);color:var(--$-dy-text);text-align:left;cursor:pointer;transition:border-color .15s,box-shadow .15s}
.$-dy-acard:hover{border-color:var(--$-dy-line-strong);box-shadow:0 4px 16px rgba(0,0,0,.05)}
.$-dy-acard-head{display:flex;align-items:center;gap:10px}
.$-dy-acard-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:16px;line-height:24px;font-weight:600}
.$-dy-acard-nums{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.$-dy-acard-nums>span{display:flex;flex-direction:column;gap:2px;min-width:0;padding:12px;border-radius:8px;background:var(--$-dy-tile)}
.$-dy-acard-nums b{font-size:20px;line-height:28px;font-weight:700}
.$-dy-acard-label{color:var(--$-dy-text-2);font-size:12px;line-height:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.$-dy-acard-sub{color:var(--$-dy-text-3);font-size:12px;line-height:18px;font-family:var(--$-dy-font-num)}
.$-dy-acard-latest{display:flex;align-items:center;gap:10px;min-width:0}
.$-dy-acard-latest-text{flex:1;min-width:0;display:flex;flex-direction:column;font-size:13px;line-height:20px}

.$-dy-first{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;min-height:100%;max-width:640px;margin:0 auto;padding:48px 24px;text-align:center}
.$-dy-first-logos{display:flex;gap:12px;margin-bottom:12px}
.$-dy-first-title{margin:0;font-size:24px;line-height:32px;font-weight:600}
.$-dy-first-body{margin:0 0 12px;color:var(--$-dy-text-2);font-size:14px;line-height:22px}
.$-dy-first-note{margin:8px 0 0;color:var(--$-dy-text-3);font-size:12px;line-height:18px}
.$-dy-pick{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;width:100%}
.$-dy-pick-item{display:grid;grid-template-columns:auto 1fr;grid-template-rows:auto auto;column-gap:12px;align-items:center;padding:16px;border:1px solid var(--$-dy-line);border-radius:12px;background:var(--$-dy-card);color:var(--$-dy-text);text-align:left;cursor:pointer;transition:border-color .15s,box-shadow .15s}
.$-dy-pick-item>:first-child{grid-row:span 2}
.$-dy-pick-item:hover:not(:disabled){border-color:var(--$-dy-text-3);box-shadow:0 4px 16px rgba(0,0,0,.05)}
.$-dy-pick-item:disabled{opacity:.5;cursor:not-allowed}
.$-dy-pick-name{display:flex;align-items:center;font-size:15px;line-height:22px;font-weight:600}
.$-dy-pick-sub{color:var(--$-dy-text-3);font-size:12px;line-height:18px}

.$-dy-work{display:flex;flex-direction:column;gap:16px}
.$-dy-work-head{display:flex;gap:16px;align-items:flex-start}
.$-dy-work-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:8px}
.$-dy-work-title{margin:0;font-size:16px;line-height:24px;font-weight:600}
.$-dy-work-status{display:flex;align-items:center;gap:6px;margin:0;color:var(--$-dy-text-2);font-size:12px}
.$-dy-ok{display:inline-grid;place-items:center;width:14px;height:14px;border-radius:50%;background:var(--$-dy-green);color:#fff}
.$-dy-tabs{display:flex;gap:32px;border-bottom:1px solid var(--$-dy-line)}
.$-dy-tab{padding:8px 0;font-size:14px;color:var(--$-dy-text-2)}
.$-dy-tab[aria-selected=true]{color:var(--$-dy-text);font-weight:600;box-shadow:inset 0 -2px 0 var(--$-dy-text)}
.$-dy-work-card{display:flex;flex-direction:column;gap:12px;padding:16px;border:1px solid var(--$-dy-line);border-radius:12px}
.$-dy-work-tiles,.$-dy-work-rates{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.$-dy-work-tile,.$-dy-work-rate{display:flex;flex-direction:column;align-items:flex-start;gap:4px;padding:12px 14px;border:1px solid transparent;border-radius:8px;background:var(--$-dy-tile);color:var(--$-dy-text);text-align:left}
.$-dy-work-tile-label{color:var(--$-dy-text-2);font-size:13px;line-height:20px}
.$-dy-work-tile b,.$-dy-work-rate b{font-size:22px;line-height:30px;font-weight:700}

.$-dy-help{display:flex;flex-direction:column;gap:10px;font-size:13px;line-height:20px;color:var(--$-dy-text-2)}
.$-dy-help p{margin:0}
.$-dy-help .$-dy-sub-title{margin-top:8px;color:var(--$-dy-text);font-size:14px}
.$-dy-help dl{display:grid;grid-template-columns:auto 1fr;gap:8px 12px;margin:0}
.$-dy-help dt{color:var(--$-dy-text);font-weight:500;white-space:nowrap}
.$-dy-help dd{margin:0}

.$-dy-edge{position:absolute;right:0;top:calc(96px + var(--dsh-frame-top-clearance,0px));z-index:6;display:flex;flex-direction:column;gap:8px}
.$-dy-edge-tab{display:flex;flex-direction:column;align-items:center;gap:6px;width:28px;padding:10px 0;border:0;border-radius:8px 0 0 8px;background:var(--$-dy-seg);color:var(--$-dy-text-2);font-size:12px;line-height:16px;cursor:pointer}
.$-dy-edge-tab span{writing-mode:vertical-rl;letter-spacing:2px}
.$-dy-edge-tab:hover{background:var(--$-dy-seg-hover);color:var(--$-dy-text)}
.$-dy-edge-ai{background:var(--$-dy-primary);color:var(--$-dy-on-primary)}
.$-dy-edge-ai:hover{background:var(--$-dy-primary-hover);color:var(--$-dy-on-primary)}

.$-dy-chat-title,.$-dy-chat-sub{display:inline-flex;align-items:center;gap:6px}
.$-dy-chat-empty{display:flex;flex-direction:column;gap:12px;padding:32px 20px}
.$-dy-quick-list{display:flex;flex-direction:column;gap:8px;margin-top:8px}
.$-dy-dock{display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px}
.$-dy-dock-for{color:var(--$-dy-text-3);font-size:12px}
.$-dy-quick{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 12px;border:1px solid var(--$-dy-line-strong);border-radius:999px;background:var(--$-dy-card);color:var(--$-dy-text);font-size:13px;cursor:pointer}
.$-dy-quick:hover:not(:disabled){border-color:var(--$-dy-text-3)}
.$-dy-quick:disabled{opacity:.5;cursor:not-allowed}
.$-dy-root .$-modal{border-radius:12px}
`)

    // ---- 3.11 文案：界面上所有的字，中文和英文各一份。页面里用 t('nav.today') 取，花括号里的是要填进去的数。

    const TEXT_BASE = {
      zh: {
        'panel': '自媒体',
        'page.title': '自媒体',
        'page.sections': '自媒体页面分区',
        'header.selectAccount': '选择账号',
        'header.accountOption': '{name} · {platform}',
        'role.own': '我的账号',
        'role.benchmark': '对标账号',
        'role.ownGroup': '我的账号',
        'role.benchmarkGroup': '对标账号',
        'tab.accounts': '账号',
        'action.refresh': '立即抓取',
        'action.refreshing': '正在抓取',
        'action.import': '导入文件',
        'action.openBrowser': '打开浏览器',
        'action.login': '登录',
        'action.retry': '重试',
        'action.cancel': '取消',
        'action.save': '保存',
        'action.saving': '正在保存',
        'action.edit': '编辑',
        'action.delete': '删除',
        'action.deleting': '正在删除',
        'action.close': '关闭',
        'state.loading': '正在加载',
        'state.loadFailed': '加载失败：{reason}',
        'error.notFound': '账号不存在，可能已被删除',
        'error.invalid': '填写的内容有误，请检查后再试',
        'error.busy': '这个账号正在处理其他任务，请稍后再试',
        'error.loginRequired': '需要先登录平台账号',
        'error.browserUnavailable': '无法启动浏览器，请确认已安装 Chrome',
        'error.llmFailed': 'AI 生成失败，请检查模型设置后重试',
        'error.importFailed': '文件导入失败，请确认是平台后台导出的文件',
        'error.parseFailed': '页面内容无法识别，平台可能改版了',
        'error.scrapeFailed': '抓取页面数据失败，请稍后重试',
        'error.unsupported': '这个账号不支持自动抓取，请导入后台文件',
        'error.invalidProfile': '主页链接无法打开，请检查账号设置',
        'error.transport': '与服务的连接中断，请重新连接后重试',
        'error.unknown': '发生未知错误，请稍后重试',
        'notice.refreshDone': '抓取完成，更新了 {posts} 条作品',
        'notice.refreshFailed': '抓取失败：{reason}',
        'notice.importDone': '导入完成，写入了 {posts} 条作品',
        'notice.importFailed': '导入失败：{reason}',
        'notice.topicsDone': '已生成 {count} 个选题',
        'notice.topicsFailed': '选题生成失败：{reason}',
        'notice.created': '已添加账号「{name}」',
        'notice.saved': '已保存账号「{name}」',
        'notice.deleted': '账号已删除',
        'notice.deleteFailed': '删除失败：{reason}',
        'notice.loggedIn': '{platform} 已登录',
        'login.in': '已登录',
        'login.out': '未登录',
        'login.unknown': '登录状态未知',
        'overview.window': '近 {days} 天',
        'overview.delta': '近 {days} 天 {delta}',
        'overview.emptyTitle': '还没有数据',
        'overview.emptyBody': '点击立即抓取，或导入平台后台导出的文件',
        'overview.emptyLogin': '先在内置浏览器里登录{platform}，再抓取数据；也可以导入后台导出的文件',
        'overview.metrics': '账号数据',
        'overview.windowLabel': '统计时间范围',
        'overview.deltaFlat': '近 {days} 天无变化',
        'overview.recentEmpty': '抓取或导入作品后显示',
        'overview.chartMode': '图表内容',
        'overview.modeTrend': '账号趋势',
        'overview.modePosts': '作品表现',
        'overview.postsTitle': '近期作品表现',
        'overview.postsChartLabel': '最近 {count} 篇作品的{metric}柱状图，最高 {max}',
        'overview.trendNote': '账号趋势需要多次抓取才能形成曲线，目前已抓取 {count} 次；开启自动抓取后会逐步积累',
        'overview.barLabel': '{title}，{date}，{metric} {value}',
        'overview.barStats': '播放/阅读 {views} · 赞 {likes} · 评 {comments} · 藏 {collects}',
        'metric.plays': '播放/阅读',
        'overview.trend': '趋势',
        'overview.metricLabel': '趋势指标',
        'overview.chartLabel': '{window}{metric}趋势图',
        'overview.chartEmpty': '这段时间还没有数据点',
        'overview.runOk': '{time} 通过{source}更新了 {posts} 条作品',
        'overview.runFailed': '{time} 更新失败：{reason}',
        'overview.monitorOff': '未开启自动抓取',
        'metric.followers': '粉丝',
        'metric.likes': '获赞',
        'metric.posts': '作品数',
        'metric.views': '浏览',
        'metric.likesShort': '点赞',
        'metric.comments': '评论',
        'metric.collects': '收藏',
        'metric.shares': '分享',
        'source.scrape': '抓取',
        'source.import': '导入',
        'posts.title': '标题',
        'posts.published': '发布时间',
        'posts.emptyTitle': '还没有作品数据',
        'posts.emptyBody': '抓取或导入后，这里会列出最近的作品',
        'posts.top': '表现突出',
        'posts.bottom': '表现偏弱',
        'format.image': '图文',
        'format.video': '视频',
        'format.article': '文章',
        'format.other': '其他',
        'report.latest': '最新 · {time}',
        'report.at': '生成于 {time}',
        'report.history': '历史报告',
        'priority.high': '高优先级',
        'priority.medium': '中优先级',
        'priority.low': '低优先级',
        'topics.intro': '结合账号定位、近期作品表现和对标账号，推荐接下来可以做的选题',
        'topics.generate': '生成选题',
        'topics.regenerate': '重新生成',
        'topics.generating': '正在生成',
        'topics.emptyTitle': '还没有选题报告',
        'topics.angle': '切入角度',
        'topics.reason': '推荐理由',
        'topics.headlines': '标题参考',
        'topics.references': '参考作品',
        'form.createTitle': '添加账号',
        'form.editTitle': '编辑账号',
        'form.platform': '平台',
        'form.platformPlaceholder': '选择平台',
        'form.role': '账号类型',
        'form.name': '名称',
        'form.namePlaceholder': '方便你辨认的名字',
        'form.profileUrl': '主页链接',
        'form.niche': '内容领域',
        'form.nichePlaceholder': '例如：职场成长、美食探店',
        'form.notes': '补充说明',
        'form.notesPlaceholder': '目标人群、内容风格、近期目标等，AI 分析时会参考',
        'form.monitor': '自动抓取',
        'form.monitorUnavailable': '这个平台只支持导入文件，不能自动抓取',
        'form.interval': '抓取间隔（分钟）',
        'form.intervalBefore': '每',
        'form.intervalAfter': '分钟抓取一次',
        'form.platformRequired': '请选择平台',
        'form.nameRequired': '请填写名称',
        'form.urlInvalid': '主页链接需要以 http:// 或 https:// 开头',
        'form.intervalInvalid': '抓取间隔至少 30 分钟',
        'accounts.intro': '我的账号会被自动抓取数据，对标账号用于选题参考',
        'accounts.add': '添加账号',
        'accounts.emptyTitle': '还没有账号',
        'accounts.emptyBody': '添加一个账号开始使用',
        'accounts.monitorEvery': '每 {minutes} 分钟自动抓取',
        'accounts.monitorOff': '未开启自动抓取',
        'accounts.loginTooltip': '在内置浏览器中登录{platform}',
        'accounts.editNamed': '编辑「{name}」',
        'accounts.deleteNamed': '删除「{name}」',
        'accounts.deleteTitle': '删除账号',
        'accounts.deleteBody': '删除「{name}」及其数据和报告，删除后无法恢复',
        'import.heading': '导入「{name}」的后台数据',
        'import.unsupported': '这个平台暂不支持导入文件',
        'import.hintFallback': '上传创作者后台导出的 Excel 或 CSV 文件',
        'import.running': '正在导入',
        'import.pick': '选择文件',
        'import.result': '已导入 {file}，写入 {posts} 条作品',
        'import.snapshotWritten': '账号数据已更新',
        'import.snapshotSkipped': '文件里没有账号汇总数据，只更新了作品',
        'import.unmapped': '未识别的列：{columns}',
        'import.tooLarge': '文件超过 20 MB，请导出更短时间范围的数据',
        'browser.title': '{platform} 浏览器',
        'browser.back': '后退',
        'browser.reload': '刷新',
        'browser.address': '网址',
        'browser.addressPlaceholder': '输入网址后按回车',
        'browser.close': '关闭浏览器',
        'browser.pictureAlt': '网页画面',
        'browser.keyboard': '浏览器键盘输入',
        'browser.opening': '正在打开浏览器',
        'browser.loading': '网页加载中',
        'connect.stage.launch': '正在启动浏览器…',
        'connect.stage.connect': '正在连接{platform}…',
        'connect.stage.load': '{platform}登录页加载中，二维码出来就能扫…',
        'connect.seconds': '{s} 秒',
        'connect.slow': '网络慢时要二三十秒，页面一直在加载，不是卡住了',
        'browser.reopen': '重新打开',
        'browser.keyboardOn': '键盘输入已连接到网页',
        'browser.keyboardOff': '点击网页后可以输入文字',
        'browser.loginHint': '登录信息只保存在本机',
        'browser.closedByHost': '浏览器已关闭',
        'browser.streamLost': '与浏览器的连接中断了',
        'add.title': '添加账号',
        'add.scanHeading': '扫码添加我的账号',
        'add.scanBody': '选择平台后会打开登录页，用手机 App 扫码登录，账号会被自动识别',
        'add.noScanPlatforms': '暂无支持扫码登录的平台',
        'add.benchmark': '添加对标账号',
        'add.benchmarkBody': '粘贴对标账号的主页链接，用于选题参考',
        'add.manual': '手动添加',
        'empty.scan': '扫码添加账号',
        'connect.hint': '请用手机 App 扫码登录，登录后会自动识别账号',
        'connect.identifying': '正在识别账号',
        'connect.identifyFailed': '无法识别账号：{reason}',
        'connect.retry': '重试识别',
        'connect.identified': '已登录：{name}',
        'connect.confirm': '确认添加账号',
        'connect.niche': '内容领域',
        'connect.nichePlaceholder': '内容领域（选填）',
        'connect.add': '添加为我的账号',
        'connect.update': '更新账号',
        'connect.saving': '正在保存',
        'connect.failed': '保存失败：{reason}',
        'browser.minimize': '缩小',
        'browser.expand': '展开',
        'mini.waiting': '等待扫码',
        'mini.identified': '已识别：{name}',
        'mini.failed': '识别失败',
        'mini.qrCaption': '用{platform} App 扫码登录',
        'mini.qrAlt': '{platform} 登录二维码',
        'mini.fullPage': '查看整页',
        'mini.qrOnly': '只看二维码',
        'metric.fansNet': '净增粉丝',
        'metric.playsDaily': '播放量',
        'metric.profileViews': '主页访问',
        'metric.postLikes': '作品获赞',
        'metric.rate': '互动率',
        'overview.windowSum': '近 {days} 天合计 · 日均 {average}',
        'overview.tipChange': '较前一天 {delta}',
        'overview.content': '内容表现',
        'overview.contentScope': '基于最近 {count} 篇作品，按中位数统计，单条爆款不会拉高整体水平',
        'content.medianViews': '播放/阅读中位数',
        'content.meanViews': '平均值 {mean}',
        'content.engagement': '互动率',
        'content.engagementHint': '（赞 + 评 + 藏 + 转）÷ 播放',
        'content.collect': '收藏率',
        'content.collectHint': '收藏 ÷ 播放，反映内容的干货价值',
        'content.share': '转发率',
        'content.shareHint': '转发 ÷ 播放，反映用户的分享意愿',
        'content.cadence': '发布频率',
        'content.perWeek': '每周 {count} 篇',
        'content.cadenceHint': '近 {days} 天发布 {count} 篇',
        'posts.summary': '共 {count} 条作品 · 播放中位数 {views} · 互动率中位数 {rate}',
        'posts.sortBy': '按{column}排序',
        'posts.formatFilter': '作品类型',
        'posts.allFormats': '全部',
        'posts.search': '搜索标题',
        'posts.noMatch': '没有符合条件的作品',
        'posts.untitled': '（无标题）',
        'report.byline': '由 {model} 生成 · {time}',
        'report.expand': '展开全文',
        'report.collapse': '收起',
        'report.copyHeadline': '复制标题：{text}',
        'report.copied': '已复制',
        'topics.progress': '正在读取热榜、搜索同类作品和相关新闻，再生成选题，通常需要 2 到 4 分钟',
        'topics.openDetail': '查看选题详情：{title}',
        'topics.relatedNone': '没有找到同类作品',
        'topics.related': '{platform}同类作品',
        'topics.openPost': '在内置浏览器中打开：{title}',
        'related.meta': '@{author} · {date}',
        'related.stats': '赞 {likes} · 评 {comments} · 藏 {collects}',
        'research.summary': '本次参考：热榜 {trending} 条 · 搜索 {searches} 个关键词 · 新闻 {news} 条 · 更新对标账号 {benchmarks} 个',
        'research.show': '查看参考资料',
        'research.hide': '收起参考资料',
        'research.trending': '{platform}热榜',
        'research.searches': '搜索的关键词',
        'research.searchResult': '{keyword} · {count} 条',
        'research.news': '相关新闻',
        'research.notes': '未完成的来源',
        'topics.findRelated': '搜索{platform}同类作品',
        'topics.refreshRelated': '重新搜索同类作品',
        'topics.searching': '正在搜索',
        'topics.relatedMissing': '这份报告还没有{platform}同类作品',
        'topics.relatedProgress': '正在{platform}搜索每个选题的同类作品，通常需要 1 到 2 分钟',
        'notice.relatedDone': '已为 {count}/{total} 个选题找到同类作品',
        'notice.relatedFailed': '搜索同类作品失败：{reason}',
        'topics.video': '视频怎么拍',
        'topics.videoHook': '开口第一句',
        'topics.videoSeconds': '约 {count} 秒',
        'topics.videoCover': '封面字：{text}',
        'notice.articleCreated': '已在创作工作台新建文章「{title}」',
        'notice.articleFailed': '新建文章失败：{detail}',
        'overview.nextRunAt': '下次自动抓取 {time}',
        'topics.emptyBody': '会读取平台热榜、搜索同类爆款和相关新闻，再结合你的作品数据推荐选题，大约需要 2 到 4 分钟',
        'accounts.current': '当前查看',
        'accounts.ownHint': '会被自动抓取数据',
        'accounts.benchmarkHint': '生成选题时会参考它们的高赞作品',
        'accounts.ownEmpty': '还没有自己的账号',
        'accounts.benchmarkEmpty': '还没有对标账号。加几个同领域做得好的账号，选题会参考它们的爆款',
        'accounts.addBenchmark': '添加对标账号',
        'action.more': '更多操作',
        'nav.today': '今天',
        'nav.topics': '找选题',
        'nav.accounts': '账号',
        'nav.manageAccounts': '管理账号',
        'status.noData': '还没有数据',
        'status.updated': '{ago}更新',
        'status.lastFailed': '上次抓取失败：{reason}',
        'time.justNow': '刚刚',
        'time.minutesAgo': '{count} 分钟前',
        'time.hoursAgo': '{count} 小时前',
        'time.daysAgo': '{count} 天前',
        'today.todo': '需要处理',
        'today.numbers': '账号数据',
        'today.plays': '近 {days} 天播放',
        'today.visits': '近 {days} 天主页访问',
        'today.daily': '日均 {average}',
        'today.ready': '今天可以写',
        'today.readyNote': '共 {count} 个选题，按优先级挑了前 3 个',
        'today.allTopics': '全部选题',
        'today.relatedLine': '同款 {count} 条 · 最高赞 {likes}',
        'today.ownPosts': '我的最近作品',
        'today.baselineViews': '对比最近 20 条的播放中位数 {value}',
        'today.baselineInteractions': '对比最近 20 条的互动中位数 {value}',
        'today.views': '播放 {count}',
        'today.likes': '赞 {count}',
        'today.above': '高出平时 · {ratio} 倍',
        'today.below': '低于平时 · {ratio} 倍',
        'today.usual': '接近平时',
        'today.peers': '同行近期爆款',
        'today.peersNote': '来自 {count} 个对标账号和选题时的搜索',
        'today.peersSearchNote': '来自选题时搜到的同类作品',
        'today.peersEmpty': '添加对标账号或生成一次选题后，这里会列出{platform}上同领域的近期爆款',
        'today.peerMeta': '@{author} · {ago}',
        'today.fromBenchmark': '对标账号',
        'today.fromSearch': '搜索「{keyword}」',
        'todo.loginTitle': '{platform}登录已失效',
        'todo.loginBody': '自动抓取会失败，重新扫码登录就能恢复',
        'todo.login': '去登录',
        'todo.noDataTitle': '还没有账号数据',
        'todo.noDataFetch': '抓取一次就能看到粉丝、播放和每条作品的表现',
        'todo.noDataImport': '导入平台后台导出的数据文件后就能看到',
        'todo.fetch': '立即抓取',
        'todo.refetch': '重新抓取',
        'todo.runFailedTitle': '上次抓取失败',
        'todo.staleDays': '数据已经 {count} 天没更新',
        'todo.staleBody': '抓取一次，看看最近的作品表现',
        'todo.noTopicsTitle': '还没有选题',
        'todo.noTopicsBody': '会读热榜、搜同类爆款，再结合你的作品数据推荐，大约 2 到 4 分钟',
        'todo.oldTopicsTitle': '选题是 {count} 天前生成的',
        'todo.oldTopicsBody': '热点变化快，换一批会更准',
        'todo.newTopics': '换一批',
        'todo.noBenchmarkTitle': '还没有对标账号',
        'todo.noBenchmarkBody': '加 2 到 3 个同领域做得好的账号，这里会显示他们的爆款，选题也会参考',
        'topics.listLabel': '选题列表',
        'topics.meta': '{time} 生成 · {count} 个选题',
        'topics.progressHint': '可以先去别的页面，生成好了会提醒你',
        'topics.rowRelated': '同款 {count} · 最高赞 {likes}',
        'empty.title': '先连上你的账号',
        'empty.body': '扫码登录你的账号后，这里每天会告诉你该处理什么、写什么、哪条作品表现好',
        'drafts.title': '待发布',
        'drafts.note': '{count} 条等你发布',
        'drafts.urlPlaceholder': '粘贴发布后的作品链接',
        'drafts.urlLabel': '「{title}」的作品链接',
        'drafts.waiting': '等下次抓取到这条作品后显示数据',
        'drafts.waitingTag': '待发布',
        'drafts.publishedTag': '已发布',
        'drafts.kind.video': '视频',
        'drafts.kind.article': '文章',
        'drafts.kind.card': '小红书卡片',
        'drafts.meta': '{source} · {ago}',
        'drafts.reveal': '打开文件夹',
        'drafts.markPublished': '已发布',
        'drafts.openPost': '看作品',
        'drafts.remove': '移除「{title}」',
        'demo.title': '这是演示数据',
        'demo.body': '数字、作品和报告都是预置的，不会去平台抓取，也不花钱。讲完可以一键清除。',
        'demo.clear': '清除演示数据',
        'demo.load': '先看演示',
        'notice.draftFailed': '没能更新待发布内容：{reason}',
        'notice.revealFailed': '没能打开文件夹：{detail}',
        'notice.demoFailed': '演示数据没有处理成功：{reason}',
        'notice.demoLoaded': '已加载演示数据',
        'notice.demoCleared': '已清除演示数据',
        'demo.tag': '演示数据',
        'demo.status': '数字是预置的，不会更新',
        'settings.problems': '界面设置有 {count} 处没看懂，已跳过：{detail}（文件：{file}）',
        'topics.direction': '这次想做的方向',
        'topics.directionPlaceholder': '这次想做什么方向？比如：双十一、某个新品、给新手看的入门（可不填）',
        'topics.directionOf': '方向：{text}',
        'benchmarks.title': '和对标账号比',
        'benchmarks.count': '{count} 个对标账号',
        'benchmarks.me': '我',
        'benchmarks.noData': '还没数据',
        'benchmarks.account': '账号',
        'benchmarks.followers': '粉丝',
        'benchmarks.change': '近 {days} 天涨粉',
        'benchmarks.recent': '近 30 天发布',
        'benchmarks.interactions': '互动中位数',
        'benchmarks.top': '最高赞作品',
        'benchmarks.updated': '更新',
        'benchmarks.note': '互动 = 赞 + 评 + 藏 + 转，取最近 60 条作品的中位数。平台不给看别人作品的播放量，所以这里比互动，不比播放。',
        'benchmarks.emptyTitle': '还没有对标账号',
        'benchmarks.emptyBody': '加 2 到 3 个同领域做得好的账号，就能把粉丝、发布频率和互动放在一起比，他们出了爆款也会提醒你。',
        'benchmarks.ownOnlyTitle': '这是一个对标账号',
        'benchmarks.ownOnlyBody': '切到自己的账号，就能看到和各个对标账号的对比。',
        'benchmarks.hitTitle': '对标账号「{name}」出了爆款',
        'benchmarks.hitBody': '{title} · 赞 {likes}，是它平时的 {ratio} 倍',
        'benchmarks.open': '看看',
        'nav.all': '全部账号',
        'all.title': '全部账号',
        'all.count': '{count} 个账号合在一起看',
        'all.sub': '你自己的 {count} 个账号合在一起看。点某一行，进那个账号。',
        'all.subEach': '你自己的 {count} 个账号，一个一个摆出来看。',
        'all.mode': '怎么看',
        'all.scope': '看哪个账号',
        'all.modeSum': '合在一起',
        'all.modeEach': '逐个展示',
        'all.open': '进这个账号',
        'all.playsShort': '播放 / 阅读',
        'all.interactions': '互动中位数 {count}',
        'all.numbers': '合计',
        'all.numbersNote': '{count} 个账号加在一起',
        'all.followers': '粉丝合计',
        'all.plays': '近 {days} 天播放 / 阅读',
        'all.partial': '只有 {count} / {total} 个账号有这项数据',
        'all.likes': '获赞合计',
        'all.recent': '近 30 天发布',
        'all.recentNote': '所有账号加起来的条数',
        'all.accounts': '各个账号',
        'all.accountsNote': '点一行进那个账号',
        'all.state': '状态',
        'all.lastFailed': '上次抓取失败',
        'all.attention': '{count} 个账号需要处理：{names}。点下面那个账号进去看。',
        'all.latest': '最近发的作品',
        'all.latestNote': '所有账号混在一起，最新的 {count} 条',
        'alert.attention': '登录失效或上次抓取失败，点开看看',
      },
      en: {
        'panel': 'Media',
        'page.title': 'Media',
        'page.sections': 'Media page sections',
        'header.selectAccount': 'Select account',
        'header.accountOption': '{name} · {platform}',
        'role.own': 'My account',
        'role.benchmark': 'Benchmark',
        'role.ownGroup': 'My accounts',
        'role.benchmarkGroup': 'Benchmark accounts',
        'tab.accounts': 'Accounts',
        'action.refresh': 'Fetch now',
        'action.refreshing': 'Fetching',
        'action.import': 'Import file',
        'action.openBrowser': 'Open browser',
        'action.login': 'Log in',
        'action.retry': 'Retry',
        'action.cancel': 'Cancel',
        'action.save': 'Save',
        'action.saving': 'Saving',
        'action.edit': 'Edit',
        'action.delete': 'Delete',
        'action.deleting': 'Deleting',
        'action.close': 'Close',
        'state.loading': 'Loading',
        'state.loadFailed': 'Could not load: {reason}',
        'error.notFound': 'The account no longer exists.',
        'error.invalid': 'Some values are invalid. Check them and try again.',
        'error.busy': 'This account is busy with another task. Try again shortly.',
        'error.loginRequired': 'Log in to the platform first.',
        'error.browserUnavailable': 'The browser could not start. Make sure Chrome is installed.',
        'error.llmFailed': 'AI generation failed. Check your model settings and try again.',
        'error.importFailed': 'The file could not be imported. Use a file exported from the creator dashboard.',
        'error.parseFailed': 'The page could not be read. The platform may have changed its layout.',
        'error.scrapeFailed': 'The page data could not be fetched. Try again later.',
        'error.unsupported': 'This account cannot be fetched automatically. Import a dashboard file instead.',
        'error.invalidProfile': 'The profile URL could not be opened. Check the account settings.',
        'error.transport': 'The connection was lost. Reconnect and try again.',
        'error.unknown': 'Something went wrong. Try again later.',
        'notice.refreshDone': 'Fetched; {posts} posts updated',
        'notice.refreshFailed': 'Fetch failed: {reason}',
        'notice.importDone': 'Imported; {posts} posts written',
        'notice.importFailed': 'Import failed: {reason}',
        'notice.topicsDone': '{count} topics generated',
        'notice.topicsFailed': 'Topic generation failed: {reason}',
        'notice.created': 'Added account “{name}”',
        'notice.saved': 'Saved account “{name}”',
        'notice.deleted': 'Account deleted',
        'notice.deleteFailed': 'Delete failed: {reason}',
        'notice.loggedIn': 'Logged in to {platform}',
        'login.in': 'Logged in',
        'login.out': 'Logged out',
        'login.unknown': 'Login unknown',
        'overview.window': 'Last {days} days',
        'overview.delta': '{delta} in {days} days',
        'overview.emptyTitle': 'No data yet',
        'overview.emptyBody': 'Fetch now, or import a file exported from the creator dashboard.',
        'overview.emptyLogin': 'Log in to {platform} in the built-in browser before fetching, or import an exported file.',
        'overview.metrics': 'Account data',
        'overview.windowLabel': 'Time range',
        'overview.deltaFlat': 'No change in {days} days',
        'overview.recentEmpty': 'Shown after posts are fetched or imported',
        'overview.chartMode': 'Chart content',
        'overview.modeTrend': 'Account trend',
        'overview.modePosts': 'Post performance',
        'overview.postsTitle': 'Recent post performance',
        'overview.postsChartLabel': '{metric} of the last {count} posts, highest {max}',
        'overview.trendNote': 'The account trend needs several fetches to form a line; fetched {count} times so far. Automatic fetching builds it up over time.',
        'overview.barLabel': '{title}, {date}, {metric} {value}',
        'overview.barStats': 'Plays/reads {views} · Likes {likes} · Comments {comments} · Saves {collects}',
        'metric.plays': 'Plays/reads',
        'overview.trend': 'Trend',
        'overview.metricLabel': 'Trend metric',
        'overview.chartLabel': '{metric} trend, {window}',
        'overview.chartEmpty': 'No data points in this range yet',
        'overview.runOk': '{time}: {posts} posts updated by {source}',
        'overview.runFailed': '{time}: update failed: {reason}',
        'overview.monitorOff': 'Automatic fetching is off',
        'metric.followers': 'Followers',
        'metric.likes': 'Likes',
        'metric.posts': 'Posts',
        'metric.views': 'Views',
        'metric.likesShort': 'Likes',
        'metric.comments': 'Comments',
        'metric.collects': 'Saves',
        'metric.shares': 'Shares',
        'source.scrape': 'fetching',
        'source.import': 'import',
        'posts.title': 'Title',
        'posts.published': 'Published',
        'posts.emptyTitle': 'No posts yet',
        'posts.emptyBody': 'Recent posts appear here after a fetch or an import.',
        'posts.top': 'Standout',
        'posts.bottom': 'Underperforming',
        'format.image': 'Image',
        'format.video': 'Video',
        'format.article': 'Article',
        'format.other': 'Other',
        'report.latest': 'Latest · {time}',
        'report.at': 'Generated {time}',
        'report.history': 'Report history',
        'priority.high': 'High priority',
        'priority.medium': 'Medium priority',
        'priority.low': 'Low priority',
        'topics.intro': 'Ideas for what to post next, based on your positioning, recent results and benchmark accounts.',
        'topics.generate': 'Generate topics',
        'topics.regenerate': 'Generate again',
        'topics.generating': 'Generating',
        'topics.emptyTitle': 'No topic reports yet',
        'topics.angle': 'Angle',
        'topics.reason': 'Why',
        'topics.headlines': 'Headline ideas',
        'topics.references': 'Reference posts',
        'form.createTitle': 'Add account',
        'form.editTitle': 'Edit account',
        'form.platform': 'Platform',
        'form.platformPlaceholder': 'Choose a platform',
        'form.role': 'Account type',
        'form.name': 'Name',
        'form.namePlaceholder': 'A name you recognize',
        'form.profileUrl': 'Profile URL',
        'form.niche': 'Content niche',
        'form.nichePlaceholder': 'For example: career growth, food reviews',
        'form.notes': 'Notes',
        'form.notesPlaceholder': 'Audience, style and goals; the AI uses them in its analysis',
        'form.monitor': 'Automatic fetching',
        'form.monitorUnavailable': 'This platform supports file import only.',
        'form.interval': 'Fetch interval in minutes',
        'form.intervalBefore': 'Every',
        'form.intervalAfter': 'minutes',
        'form.platformRequired': 'Choose a platform.',
        'form.nameRequired': 'Enter a name.',
        'form.urlInvalid': 'The profile URL must start with http:// or https://.',
        'form.intervalInvalid': 'The interval must be at least 30 minutes.',
        'accounts.intro': 'Your accounts are fetched automatically; benchmark accounts inform topic ideas.',
        'accounts.add': 'Add account',
        'accounts.emptyTitle': 'No accounts yet',
        'accounts.emptyBody': 'Add an account to get started.',
        'accounts.monitorEvery': 'Fetched every {minutes} minutes',
        'accounts.monitorOff': 'Automatic fetching is off',
        'accounts.loginTooltip': 'Log in to {platform} in the built-in browser',
        'accounts.editNamed': 'Edit “{name}”',
        'accounts.deleteNamed': 'Delete “{name}”',
        'accounts.deleteTitle': 'Delete account',
        'accounts.deleteBody': 'Delete “{name}” with its data and reports. This cannot be undone.',
        'import.heading': 'Import dashboard data for “{name}”',
        'import.unsupported': 'This platform does not support file import yet.',
        'import.hintFallback': 'Upload an Excel or CSV file exported from the creator dashboard.',
        'import.running': 'Importing',
        'import.pick': 'Choose file',
        'import.result': 'Imported {file}; {posts} posts written',
        'import.snapshotWritten': 'Account totals updated',
        'import.snapshotSkipped': 'The file has no account totals; only posts were updated',
        'import.unmapped': 'Unrecognized columns: {columns}',
        'import.tooLarge': 'The file is larger than 20 MB. Export a shorter time range.',
        'browser.title': '{platform} browser',
        'browser.back': 'Back',
        'browser.reload': 'Reload',
        'browser.address': 'Address',
        'browser.addressPlaceholder': 'Type a URL and press Enter',
        'browser.close': 'Close browser',
        'browser.pictureAlt': 'Web page',
        'browser.keyboard': 'Browser keyboard input',
        'browser.opening': 'Opening the browser',
        'browser.loading': 'Page loading',
        'connect.stage.launch': 'Starting the browser…',
        'connect.stage.connect': 'Connecting to {platform}…',
        'connect.stage.load': 'Loading the {platform} login page; scan once the QR code shows…',
        'connect.seconds': '{s}s',
        'connect.slow': 'on a slow network this takes 20–30 seconds; it is still loading, not stuck',
        'browser.reopen': 'Reopen',
        'browser.keyboardOn': 'Typing goes to the page',
        'browser.keyboardOff': 'Click the page to type',
        'browser.loginHint': 'Login data stays on this computer',
        'browser.closedByHost': 'The browser was closed.',
        'browser.streamLost': 'The connection to the browser was lost.',
        'add.title': 'Add account',
        'add.scanHeading': 'Scan to add my account',
        'add.scanBody': 'Pick a platform to open its login page, scan with the phone app, and the account is recognized automatically.',
        'add.noScanPlatforms': 'No platform supports scan login yet',
        'add.benchmark': 'Add benchmark account',
        'add.benchmarkBody': 'Paste the profile link of an account you want to learn from.',
        'add.manual': 'Add manually',
        'empty.scan': 'Scan to add an account',
        'connect.hint': 'Scan with the phone app to log in; the account is recognized after login',
        'connect.identifying': 'Recognizing the account',
        'connect.identifyFailed': 'Could not recognize the account: {reason}',
        'connect.retry': 'Recognize again',
        'connect.identified': 'Logged in as {name}',
        'connect.confirm': 'Confirm the account',
        'connect.niche': 'Content niche',
        'connect.nichePlaceholder': 'Content niche (optional)',
        'connect.add': 'Add as my account',
        'connect.update': 'Update account',
        'connect.saving': 'Saving',
        'connect.failed': 'Could not save: {reason}',
        'browser.minimize': 'Minimize',
        'browser.expand': 'Expand',
        'mini.waiting': 'Waiting for scan',
        'mini.identified': 'Recognized: {name}',
        'mini.failed': 'Recognition failed',
        'mini.qrCaption': 'Scan with the {platform} app to log in',
        'mini.qrAlt': '{platform} login QR code',
        'mini.fullPage': 'Show full page',
        'mini.qrOnly': 'Show QR code only',
        'metric.fansNet': 'Net followers',
        'metric.playsDaily': 'Plays',
        'metric.profileViews': 'Profile visits',
        'metric.postLikes': 'Post likes',
        'metric.rate': 'Engagement',
        'overview.windowSum': 'Last {days} days total · {average} per day',
        'overview.tipChange': '{delta} from the day before',
        'overview.content': 'Content performance',
        'overview.contentScope': 'Based on the latest {count} posts, using medians so one viral post does not lift the whole picture',
        'content.medianViews': 'Median plays/reads',
        'content.meanViews': 'Average {mean}',
        'content.engagement': 'Engagement rate',
        'content.engagementHint': '(likes + comments + saves + shares) ÷ plays',
        'content.collect': 'Save rate',
        'content.collectHint': 'Saves ÷ plays; shows how useful the content is',
        'content.share': 'Share rate',
        'content.shareHint': 'Shares ÷ plays; shows how willing viewers are to pass it on',
        'content.cadence': 'Posting frequency',
        'content.perWeek': '{count} per week',
        'content.cadenceHint': '{count} posts in the last {days} days',
        'posts.summary': '{count} posts · median plays {views} · median engagement {rate}',
        'posts.sortBy': 'Sort by {column}',
        'posts.formatFilter': 'Post type',
        'posts.allFormats': 'All',
        'posts.search': 'Search titles',
        'posts.noMatch': 'No posts match',
        'posts.untitled': '(Untitled)',
        'report.byline': 'Generated by {model} · {time}',
        'report.expand': 'Show more',
        'report.collapse': 'Show less',
        'report.copyHeadline': 'Copy headline: {text}',
        'report.copied': 'Copied',
        'topics.progress': 'Reading trending searches, similar posts and related news before writing topics; this usually takes 2 to 4 minutes',
        'topics.openDetail': 'View topic details: {title}',
        'topics.relatedNone': 'No similar posts found',
        'topics.related': 'Similar {platform} posts',
        'topics.openPost': 'Open in the built-in browser: {title}',
        'related.meta': '@{author} · {date}',
        'related.stats': '{likes} likes · {comments} comments · {collects} saves',
        'research.summary': 'Sources: {trending} trending searches · {searches} keywords searched · {news} news items · {benchmarks} benchmark accounts updated',
        'research.show': 'Show sources',
        'research.hide': 'Hide sources',
        'research.trending': '{platform} trending',
        'research.searches': 'Searched keywords',
        'research.searchResult': '{keyword} · {count}',
        'research.news': 'Related news',
        'research.notes': 'Unfinished sources',
        'topics.findRelated': 'Search similar {platform} posts',
        'topics.refreshRelated': 'Search similar posts again',
        'topics.searching': 'Searching',
        'topics.relatedMissing': 'This report has no similar {platform} posts yet',
        'topics.relatedProgress': 'Searching {platform} for similar posts to each topic; this usually takes 1 to 2 minutes',
        'notice.relatedDone': 'Found similar posts for {count} of {total} topics',
        'notice.relatedFailed': 'Searching similar posts failed: {reason}',
        'topics.video': 'How to film it',
        'topics.videoHook': 'Opening line',
        'topics.videoSeconds': 'About {count} s',
        'topics.videoCover': 'Cover text: {text}',
        'notice.articleCreated': 'Created the article “{title}” in the creation workbench',
        'notice.articleFailed': 'Could not create the article: {detail}',
        'overview.nextRunAt': 'Next automatic fetch {time}',
        'topics.emptyBody': 'Reads trending searches, similar hit posts and related news, then recommends topics from your post data; this takes about 2 to 4 minutes',
        'accounts.current': 'Viewing',
        'accounts.ownHint': 'Fetched automatically',
        'accounts.benchmarkHint': 'Their top posts inform topic suggestions',
        'accounts.ownEmpty': 'No accounts of your own yet',
        'accounts.benchmarkEmpty': 'No benchmark accounts yet. Add a few strong accounts in your field and topic suggestions will draw on their hits',
        'accounts.addBenchmark': 'Add a benchmark account',
        'action.more': 'More actions',
        'nav.today': 'Today',
        'nav.topics': 'Find topics',
        'nav.accounts': 'Accounts',
        'nav.manageAccounts': 'Manage accounts',
        'status.noData': 'No data yet',
        'status.updated': 'Updated {ago}',
        'status.lastFailed': 'Last fetch failed: {reason}',
        'time.justNow': 'just now',
        'time.minutesAgo': '{count} min ago',
        'time.hoursAgo': '{count} h ago',
        'time.daysAgo': '{count} d ago',
        'today.todo': 'Needs attention',
        'today.numbers': 'Account numbers',
        'today.plays': 'Plays, last {days} days',
        'today.visits': 'Profile visits, last {days} days',
        'today.daily': '{average} a day',
        'today.ready': 'Ready to write',
        'today.readyNote': '{count} topics; the top 3 by priority',
        'today.allTopics': 'All topics',
        'today.relatedLine': '{count} similar posts · top {likes} likes',
        'today.ownPosts': 'My recent posts',
        'today.baselineViews': 'Compared with the median plays of the last 20 posts: {value}',
        'today.baselineInteractions': 'Compared with the median interactions of the last 20 posts: {value}',
        'today.views': '{count} plays',
        'today.likes': '{count} likes',
        'today.above': 'Above usual · {ratio}×',
        'today.below': 'Below usual · {ratio}×',
        'today.usual': 'About usual',
        'today.peers': 'Recent hits in your field',
        'today.peersNote': 'From {count} benchmark accounts and topic searches',
        'today.peersSearchNote': 'From similar posts found while generating topics',
        'today.peersEmpty': 'Add a benchmark account or generate topics once to see recent hits in your field on {platform}',
        'today.peerMeta': '@{author} · {ago}',
        'today.fromBenchmark': 'Benchmark',
        'today.fromSearch': 'Search “{keyword}”',
        'todo.loginTitle': '{platform} login has expired',
        'todo.loginBody': 'Automatic fetches will fail until you scan the QR code to log in again',
        'todo.login': 'Log in',
        'todo.noDataTitle': 'No account data yet',
        'todo.noDataFetch': 'Fetch once to see followers, plays and how each post did',
        'todo.noDataImport': 'Import a data file exported from the platform dashboard to see it',
        'todo.fetch': 'Fetch now',
        'todo.refetch': 'Fetch again',
        'todo.runFailedTitle': 'Last fetch failed',
        'todo.staleDays': 'Data is {count} days old',
        'todo.staleBody': 'Fetch to see how recent posts did',
        'todo.noTopicsTitle': 'No topics yet',
        'todo.noTopicsBody': 'Reads trending searches and similar hits, then recommends from your post data; this takes about 2 to 4 minutes',
        'todo.oldTopicsTitle': 'Topics were generated {count} days ago',
        'todo.oldTopicsBody': 'Trends move fast; a new set will fit better',
        'todo.newTopics': 'New set',
        'todo.noBenchmarkTitle': 'No benchmark accounts yet',
        'todo.noBenchmarkBody': 'Add 2 or 3 strong accounts in your field to see their hits here and inform your topics',
        'topics.listLabel': 'Topic list',
        'topics.meta': 'Generated {time} · {count} topics',
        'topics.progressHint': 'You can leave this page; you will be notified when it is done',
        'topics.rowRelated': '{count} similar · top {likes} likes',
        'empty.title': 'Connect your account first',
        'empty.body': 'After you log in by scanning a QR code, this page tells you each day what to fix, what to write and which posts did well',
        'drafts.title': 'To publish',
        'drafts.note': '{count} waiting to be published',
        'drafts.urlPlaceholder': 'Paste the link of the published post',
        'drafts.urlLabel': 'Post link for “{title}”',
        'drafts.waiting': 'Counters appear after the next fetch finds this post',
        'drafts.waitingTag': 'To publish',
        'drafts.publishedTag': 'Published',
        'drafts.kind.video': 'Video',
        'drafts.kind.article': 'Article',
        'drafts.kind.card': '小红书 cards',
        'drafts.meta': '{source} · {ago}',
        'drafts.reveal': 'Open folder',
        'drafts.markPublished': 'Mark published',
        'drafts.openPost': 'View post',
        'drafts.remove': 'Remove “{title}”',
        'demo.title': 'This is sample data',
        'demo.body': 'The numbers, posts and reports are made up; nothing is fetched and nothing is charged. Clear it in one click when you are done.',
        'demo.clear': 'Clear sample data',
        'demo.load': 'Try sample data',
        'notice.draftFailed': 'Could not update the content to publish: {reason}',
        'notice.revealFailed': 'Could not open the folder: {detail}',
        'notice.demoFailed': 'Sample data failed: {reason}',
        'notice.demoLoaded': 'Sample data loaded',
        'notice.demoCleared': 'Sample data cleared',
        'demo.tag': 'Sample data',
        'demo.status': 'Fixed numbers that never update',
        'settings.problems': '{count} parts of the page settings were not understood and were skipped: {detail} (file: {file})',
        'topics.direction': 'Direction for this run',
        'topics.directionPlaceholder': 'What should the topics be about? A sale, a new product, a beginner guide (optional)',
        'topics.directionOf': 'Direction: {text}',
        'benchmarks.title': 'Against benchmark accounts',
        'benchmarks.count': '{count} benchmark accounts',
        'benchmarks.me': 'Me',
        'benchmarks.noData': 'No data yet',
        'benchmarks.account': 'Account',
        'benchmarks.followers': 'Followers',
        'benchmarks.change': 'Gained in {days} days',
        'benchmarks.recent': 'Posts in 30 days',
        'benchmarks.interactions': 'Median interactions',
        'benchmarks.top': 'Most liked post',
        'benchmarks.updated': 'Updated',
        'benchmarks.note': 'Interactions are likes, comments, collects and shares, as the median of the latest 60 posts. Platforms do not show other accounts’ plays, so interactions are compared instead.',
        'benchmarks.emptyTitle': 'No benchmark accounts yet',
        'benchmarks.emptyBody': 'Add two or three strong accounts in your field to compare followers, cadence and interactions, and to hear when one of their posts takes off.',
        'benchmarks.ownOnlyTitle': 'This is a benchmark account',
        'benchmarks.ownOnlyBody': 'Switch to one of your own accounts to compare it with its benchmarks.',
        'benchmarks.hitTitle': 'Benchmark account “{name}” has a hit',
        'benchmarks.hitBody': '{title} · {likes} likes, {ratio} times its usual',
        'benchmarks.open': 'Open',
        'nav.all': 'All accounts',
        'all.title': 'All accounts',
        'all.count': '{count} accounts together',
        'all.sub': 'Your {count} accounts together. Click a row to open that account.',
        'all.subEach': 'Your {count} accounts, one after another.',
        'all.mode': 'View',
        'all.scope': 'Which account',
        'all.modeSum': 'Together',
        'all.modeEach': 'One by one',
        'all.open': 'Open this account',
        'all.playsShort': 'Plays / reads',
        'all.interactions': 'Median interactions {count}',
        'all.numbers': 'Totals',
        'all.numbersNote': '{count} accounts added up',
        'all.followers': 'Followers, total',
        'all.plays': 'Plays / reads, last {days} days',
        'all.partial': 'Only {count} of {total} accounts report this',
        'all.likes': 'Likes, total',
        'all.recent': 'Posts, last 30 days',
        'all.recentNote': 'Across all accounts',
        'all.accounts': 'Each account',
        'all.accountsNote': 'Click a row to open the account',
        'all.state': 'Status',
        'all.lastFailed': 'Last fetch failed',
        'all.attention': '{count} accounts need attention: {names}. Open the account below.',
        'all.latest': 'Latest posts',
        'all.latestNote': 'All accounts mixed, newest {count}',
        'alert.attention': 'Login expired or the last fetch failed; open to see',
      },
    }


    /** 看板（3V）的文案。和上面的合在一起，同名的以这里为准。 */
    const TEXT_V2 = {
      zh: {
        'v2.brief.title': '今日简报',
        'v2.brief.tip': 'AI 每天 {at}（北京时间）看一遍各平台近 7 天的数据，挑出今天最值得知道的几件事；那时没开 DSH 的话，第一次打开总览时补写。点一行就地展开：左边是这一条的说明、依据的数和相关作品，右边是其他几条。',
        'v2.theme.label': '日间 / 夜间',
        'v2.theme.light': '日间模式',
        'v2.theme.dark': '夜间模式',
        'v2.brief.noDetail': '这份简报是之前生成的，没有详细说明。点「重新生成」后，每一条都会写上依据和具体做法。',
        'v2.brief.evidence': '依据 · 平台报的近 {days} 天数据',
        'v2.brief.network': '全网{label}',
        'v2.brief.work': '说的是这条作品',
        'v2.brief.recent': '最近的作品',
        'v2.brief.askTopic': '让 AI 写成脚本',
        'v2.brief.askMore': '让 AI 展开',
        'v2.brief.openAccount': '打开「{name}」的看板',
        'v2.brief.collapse': '收起',
        'v2.brief.collapseTip': '收起（Esc），↑↓ 换一条',
        'v2.brief.alert': '提醒',
        'v2.brief.fact': '数据',
        'v2.brief.action': '建议',
        'v2.brief.topic': '选题',
        'v2.brief.metaToday': '今天 {time} 生成',
        'v2.brief.metaDay': '{day} {time} 生成',
        'v2.brief.scheduled': '每天 {at} 自动生成',
        'v2.brief.writing': '正在生成…',
        'v2.brief.reading': '正在看各平台的数据…',
        'v2.brief.more': '还在写…',
        'v2.brief.rewrite': '重新生成',
        'v2.brief.empty': '还没有简报，每天 {at} 自动生成，也可以点「重新生成」现在写一份。',
        'v2.brief.failed': '没写成：{reason}',
        'v2.chart.trend': '{label}走势',
        'v2.chart.drag': '左右拖动看更早，最多 90 天',
        'v2.chart.group': '分组',
        'v2.chart.byAccount': '按账号',
        'v2.chart.byPlatform': '按平台',
        'v2.chart.today': '今天',
        'v2.chart.notYet': '平台还没出这天的数',
        'v2.chart.noReport': '未报告',
        'v2.list.platform': '平台',
        'v2.list.allPlatforms': '全部平台',
        'v2.list.work': '作品',
        'v2.list.published': '发布时间',
        'v2.list.views': '播放/阅读',
        'v2.list.likes': '点赞',
        'v2.list.comments': '评论',
        'v2.list.shares': '分享',
        'v2.list.collects': '收藏',
        'v2.list.notReported': '这个平台不提供',
        'v2.ask.briefDetail': '（简报里的说明：{detail}）',
        'v2.ask.briefTopic': '今日简报里有个选题：「{text}」，适合发在{platform}。{detail}先用 media_accounts、media_posts 看看相关账号最近的数据，再把它展开成一条可以直接做的内容：标题、开头 3 秒、结构、配图或画面建议、发布时间。',
        'v2.ask.briefItem': '今日简报里说：「{text}」。{detail}结合各平台最近的数据（先用 media_accounts 和 media_overview 看一下），说说为什么、具体该怎么做。',
        'v2.net.title': '全网数据',
        'v2.net.tip': '各平台的数直接相加，不去重；每个平台的统计周期以平台为准（比如小红书比抖音晚一天出数）。下面的横条是各账号的占比，停上去看具体数。',
        'v2.net.note': '统计周期 {period}',
        'v2.net.views': '播放 / 阅读',
        'v2.net.followers': '粉丝总数',
        'v2.net.fansNet': '粉丝净增',
        'v2.net.likes': '点赞',
        'v2.net.comments': '评论',
        'v2.net.shares': '分享',
        'v2.net.posts': '发布作品',
        'v2.net.total': '合计',
        'v2.net.synced': '多平台同步发布',
        'v2.net.syncedTip': '标题相同或相近、一周内发在不同平台的作品，数字合计。',
        'v2.bento.title': '各账号数据',
        'v2.bento.tip': '按选中的维度从高到低排，最大的那个放最大格；点一格进入账号看板。热度就是平台的播放 / 观看 / 阅读量。',
        'v2.bento.dimension': '维度',
        'v2.bento.none': '这个平台不提供这个数',
        'v2.dim.views': '热度',
        'v2.dim.followers': '粉丝',
        'v2.dim.fansNet': '粉丝净增',
        'v2.dim.engagement': '互动率',
        'v2.dim.likes': '点赞',
        'v2.dim.comments': '评论',
        'v2.dim.shares': '分享',
        'v2.feed.title': '最新作品',
        'v2.feed.kind': '作品类型',
        'v2.feed.all': '全部',
        'v2.feed.video': '视频',
        'v2.feed.image': '图文',
        'v2.feed.article': '文章',
        'v2.feed.more': '再看 {count} 条',
        'v2.feed.none': '这一类还没有作品',
        'v2.ask.anyPlatform': '各个平台',
        'v2.error.limit': '这个平台已经有 3 个账号了，先删掉一个再添加',
        'v2.notice.refreshed': '已更新',
        'v2.notice.refreshFailed': '没更新成功：{reason}',
        'v2.notice.deleted': '账号已删除',
        'v2.notice.deleteFailed': '没删掉：{reason}',
        'v2.notice.demoLoaded': '已加入演示数据',
        'v2.notice.demoCleared': '演示数据已清除',
        'v2.notice.demoFailed': '演示数据没弄好：{reason}',
        'v2.unit.seconds': '{value}秒',
        'v2.compare.short': '较上期',
        'v2.compare.flat': '持平',
        'v2.health.login-required': '需要重新扫码',
        'v2.health.failing': '更新失败',
        'v2.health.stale': '数据过期',
        'v2.health.pending': '等待更新',
        'v2.health.ok': '正常',
        'v2.health.login-required.long': '登录已失效，数据停在上次更新时。',
        'v2.health.failing.long': '上次自动更新失败，数据停在上次更新时。',
        'v2.health.stale.long': '数据很久没更新了，数字可能已经过时。',
        'v2.health.pending.long': '还没读到数据，等第一次更新。',
        'v2.health.loginHint': '点「重新扫码」，用{platform} App 扫一下就好，扫完会自动更新。',
        'v2.fix.login-required': '重新扫码',
        'v2.fix.failing': '再试一次',
        'v2.fix.stale': '立即更新',
        'v2.fix.pending': '立即更新',
        'v2.fresh.never': '还没有数据',
        'v2.fresh.updated': '数据更新于{ago}',
        'v2.fresh.next': '下次自动更新 {at}',
        'v2.fresh.manual': '自动更新已关闭',
        'v2.chart.empty': '暂无数据',
        'v2.radar.label': '近 7 天和前 7 天的对比',
        'v2.radar.current': '近7天',
        'v2.radar.previous': '前7天',
        'v2.radar.tagUp': '明显提升',
        'v2.radar.tagDown': '明显下降',
        'v2.range.label': '时间范围',
        'v2.range.yesterday': '昨天',
        'v2.range.days': '近{days}天',
        'v2.export.day': '日期',
        'v2.export.title': '标题',
        'v2.export.published': '发布时间',
        'v2.export.link': '链接',
        'v2.export.button': '导出数据',
        'v2.nav.label': '自媒体账号',
        'v2.nav.overview': '总览',
        'v2.nav.add': '添加账号',
        'v2.nav.addAccount': '再添加一个{platform}账号',
        'v2.nav.remove': '删除「{name}」',
        'v2.nav.addPlatform': '添加平台',
        'v2.beta': '试用',
        'v2.demo.note': '正在看演示数据。',
        'v2.demo.clear': '清除演示数据',
        'v2.demo.load': '载入演示数据（开发用）',
        'v2.demo.noRefresh': '演示账号的数据是预置的，不会去平台更新',
        'v2.first.title': '添加你的第一个账号',
        'v2.first.body': '选一个平台，用手机 App 扫码登录。登录后会读取这个账号的作品和数据，看板就出现在这里，之后每隔几小时自动更新。',
        'v2.first.note': '登录信息只存在这台电脑上。每个平台最多添加 3 个账号。',
        'v2.card.followers': '粉丝',
        'v2.card.net': '近7天 {value}',
        'v2.card.week': '近7天{label}',
        'v2.card.latest': '最新作品',
        'v2.overview.sub': '{count} 个账号，点卡片看每个账号的完整数据',
        'v2.overview.accounts': '各账号数据',
        'v2.overview.accountsTip': '每个账号近 7 天（到昨天为止）的数据，和再往前 7 天比。只显示平台给出的数。',
        'v2.overview.window': '近 7 天',
        'v2.overview.latest': '最新作品',
        'v2.posts.title': '全部{noun}',
        'v2.posts.noun': '作品',
        'v2.posts.info': '{noun}',
        'v2.posts.count': '共 {count} 条',
        'v2.posts.sort': '排序',
        'v2.posts.newest': '最新发布',
        'v2.posts.none': '还没有读到作品',
        'v2.posts.published': '发布于 {at}',
        'v2.posts.noTime': '发布时间未知',
        'v2.top.total': '{label}量',
        'v2.top.engagement': '互动率',
        'v2.board.overview': '数据总览',
        'v2.board.overviewTip': '近 7 天（到昨天为止）和再往前 7 天比。平台不给同类作者的数，所以这里和自己的上一周期比。',
        'v2.board.period': '统计周期：{from} 至 {to}',
        'v2.board.daily': '平台每天更新前一天的数据',
        'v2.board.analysis': '{label}分析',
        'v2.board.top': '近30天{label} TOP3',
        'v2.board.allPosts': '查看所有作品',
        'v2.board.noTop': '近 30 天还没有发布作品',
        'v2.board.noTopCounts': '近 30 天的作品还没有读到单条数据',
        'v2.board.limited': '{platform}目前只读得到公开主页上的作品和互动数。播放、粉丝变化这些要接创作者后台，接好以前这些模块不显示。',
        'v2.board.works': '作品数据',
        'v2.board.worksTip': '平台每天报告的作品数据，包含历史作品在这段时间里新增的播放、点赞等。',
        'v2.board.fans': '粉丝数据',
        'v2.board.fansTip': '平台每天报告的粉丝数据。',
        'v2.sentence.only': '近 7 天{label}为',
        'v2.sentence.higher': '，比前 7 天高',
        'v2.sentence.lower': '，比前 7 天低',
        'v2.action.refresh': '立即更新',
        'v2.work.title': '作品数据',
        'v2.work.tabOverview': '总览',
        'v2.work.open': '在平台上打开',
        'v2.work.ask': '让 AI 分析这条',
        'v2.work.published': '发布于 {at}',
        'v2.work.updated': '数据更新于{at}',
        'v2.work.rank': '按{by}在近期 {of} 条作品里排第 {position}',
        'v2.work.noData': '这条作品还没有数据',
        'v2.work.traffic': '核心数据',
        'v2.work.trafficTip': '和这个账号最近 {count} 条作品的中位数比',
        'v2.work.metric': '{label}量',
        'v2.work.engagement': '互动数据',
        'v2.work.vs': '比往期',
        'v2.work.noMedian': '暂无往期对比',
        'v2.work.median': '往期中位数 {value}',
        'v2.work.more': '流量来源、观众画像、评论热词要读平台创作者后台，还没接入。',
        'v2.add.title': '添加平台',
        'v2.add.body': '选一个平台，会打开它的登录页，用手机 App 扫码就行。每个平台最多 3 个账号。',
        'v2.add.full': '已满 {max} 个',
        'v2.add.count': '已添加 {count}/{max}',
        'v2.add.scan': '扫码添加',
        'v2.help.title': '数据指标说明',
        'v2.help.when': '数据更新时间',
        'v2.help.whenBody': '平台每天中午前后给出前一天的数据。插件按设定的间隔（默认 6 小时）去平台读一次，所以「近 7 天」都算到昨天为止。账号页右上角的「立即更新」可以马上读一次。',
        'v2.help.what': '数据指标含义',
        'v2.help.pick': '打开某个账号后，这里会列出它每个指标怎么算。',
        'v2.help.missing': '为什么有的指标没有',
        'v2.help.missingBody': '这里只显示平台自己给出的数。平台不提供的指标（比如小红书公开主页没有阅读量和粉丝变化），整块不出现，不拿估算的数凑。',
        'v2.edge.ai': 'AI 助手',
        'v2.edge.help': '数据指标说明',
        'v2.chat.title': 'AI 助手',
        'v2.chat.hide': '收起 AI 助手',
        'v2.chat.all': '全部账号',
        'v2.chat.new': '新对话',
        'v2.chat.full': '在对话页全屏打开',
        'v2.chat.close': '收起（对话还在）',
        'v2.chat.failed': '没打开对话：{reason}',
        'v2.chat.opening': '正在准备对话…',
        'v2.chat.emptyTitle': '问问 AI',
        'v2.chat.emptyBody': '它读得到这里的所有数据：找选题、分析最新作品、导出表格，或者直接问「我最新那条视频有多少评论」。',
        'v2.chat.blank': '我自己问',
        'v2.quick.topics': '找选题',
        'v2.quick.latest': '最新作品分析',
        'v2.quick.export': '导出数据',
        'v2.dock.for': '对「{name}」：',
        'v2.dock.all': '对全部账号：',
        'v2.ask.topics': '帮「{account}」（{platform}，账号 id {account_id}）找选题：先用 media_overview 和 media_posts 看最近的数据，再调用 media_topics 生成，最后挑最值得做的 3 个讲清楚为什么。我想要的方向：',
        'v2.ask.latest': '分析「{account}」（{platform}，账号 id {account_id}）最新发布的{noun}：用 media_post 读 latest，和账号近期中位数比，说清楚表现好或差在哪、可能的原因，再给下一条 3 条以内的改进建议。',
        'v2.ask.export': '把「{account}」（{platform}，账号 id {account_id}）最近的{noun}数据整理成 Excel 表格，保存到当前文件夹：用 media_posts 取最近 50 条，列出标题、发布时间和各项数据，再告诉我文件放在哪。',
        'v2.ask.all.topics': '帮我找选题：先用 media_accounts 列出我的账号，问我给哪个账号找，再用 media_topics 生成。',
        'v2.ask.all.latest': '看一下我所有账号最新发布的作品（先用 media_accounts，再对每个账号用 media_post 读 latest），哪条表现最好、哪条最差，为什么？',
        'v2.ask.all.export': '把我所有账号近 30 天的数据汇总成一张 Excel 表格，保存到当前文件夹：每个账号用 media_overview（days 30）和 media_posts。',
        'v2.ask.post': '分析「{account}」（{platform}，账号 id {account_id}）的这条作品《{title}》（作品 id {post}）：用 media_post 读它，和账号近期中位数比，说清楚好在哪、差在哪，给出下一条可以怎么改。',
        'v2.remove.title': '删除「{name}」？',
        'v2.remove.body': '这个账号存下来的数据（每天的数字、作品、AI 报告）会一起删掉，删了找不回来。平台上的账号本身不受影响。',
        'v2.remove.ok': '删除',
      },
      en: {
        'v2.brief.title': 'Today',
        'v2.brief.tip': 'Every day at {at} (Beijing time) AI reads the last 7 days of every platform and picks what is worth knowing today; if DSH is not open then, it is written when you first open the overview. Click a line to open it in place: its explanation, the numbers behind it and related works on the left, the other lines on the right.',
        'v2.theme.label': 'Light / dark',
        'v2.theme.light': 'Light',
        'v2.theme.dark': 'Dark',
        'v2.brief.noDetail': 'This brief was written earlier and has no explanations. Click Rewrite to get the reasons and steps for every line.',
        'v2.brief.evidence': 'Based on · last {days} days as reported by the platforms',
        'v2.brief.network': 'All platforms · {label}',
        'v2.brief.work': 'The work it is about',
        'v2.brief.recent': 'Recent works',
        'v2.brief.askTopic': 'Script it with AI',
        'v2.brief.askMore': 'Expand with AI',
        'v2.brief.openAccount': 'Open {name}',
        'v2.brief.collapse': 'Collapse',
        'v2.brief.collapseTip': 'Collapse (Esc); ↑↓ to switch',
        'v2.brief.alert': 'Alert',
        'v2.brief.fact': 'Data',
        'v2.brief.action': 'Do',
        'v2.brief.topic': 'Topic',
        'v2.brief.metaToday': 'Written today at {time}',
        'v2.brief.metaDay': 'Written {day} {time}',
        'v2.brief.scheduled': 'Written daily at {at}',
        'v2.brief.writing': 'Writing…',
        'v2.brief.reading': 'Reading every platform…',
        'v2.brief.more': 'Still writing…',
        'v2.brief.rewrite': 'Rewrite',
        'v2.brief.empty': 'No brief yet. One is written daily at {at}; click Rewrite for one now.',
        'v2.brief.failed': 'Could not write it: {reason}',
        'v2.chart.trend': '{label} trend',
        'v2.chart.drag': 'Drag sideways for earlier days, up to 90',
        'v2.chart.group': 'Group',
        'v2.chart.byAccount': 'By account',
        'v2.chart.byPlatform': 'By platform',
        'v2.chart.today': 'Today',
        'v2.chart.notYet': 'Not reported by the platforms yet',
        'v2.chart.noReport': 'not reported',
        'v2.list.platform': 'Platform',
        'v2.list.allPlatforms': 'All platforms',
        'v2.list.work': 'Post',
        'v2.list.published': 'Published',
        'v2.list.views': 'Views/reads',
        'v2.list.likes': 'Likes',
        'v2.list.comments': 'Comments',
        'v2.list.shares': 'Shares',
        'v2.list.collects': 'Saves',
        'v2.list.notReported': 'Not reported by this platform',
        'v2.ask.briefDetail': '(The brief explains: {detail}) ',
        'v2.ask.briefTopic': 'Today\'s brief has a topic: "{text}", for {platform}. {detail}Check the related accounts with media_accounts and media_posts, then turn it into a piece I can make: title, first 3 seconds, structure, visuals and when to publish.',
        'v2.ask.briefItem': 'Today\'s brief says: "{text}". {detail}Check recent data of every platform (media_accounts, media_overview) and tell me why and what exactly to do.',
        'v2.net.title': 'All platforms',
        'v2.net.tip': 'Every platform added up, without de-duplication; each platform keeps its own reporting window. The bars show each account\'s share; hover for numbers.',
        'v2.net.note': 'Window {period}',
        'v2.net.views': 'Views / reads',
        'v2.net.followers': 'Followers',
        'v2.net.fansNet': 'Net followers',
        'v2.net.likes': 'Likes',
        'v2.net.comments': 'Comments',
        'v2.net.shares': 'Shares',
        'v2.net.posts': 'Posts',
        'v2.net.total': 'Total',
        'v2.net.synced': 'Published on several platforms',
        'v2.net.syncedTip': 'Works with the same or a similar title on different platforms within a week; numbers added up.',
        'v2.bento.title': 'Accounts',
        'v2.bento.tip': 'Sorted by the chosen dimension, the largest in the biggest box; open a box for the account. Reach is the platform\'s views or reads.',
        'v2.bento.dimension': 'Dimension',
        'v2.bento.none': 'Not reported by this platform',
        'v2.dim.views': 'Reach',
        'v2.dim.followers': 'Followers',
        'v2.dim.fansNet': 'Net followers',
        'v2.dim.engagement': 'Engagement',
        'v2.dim.likes': 'Likes',
        'v2.dim.comments': 'Comments',
        'v2.dim.shares': 'Shares',
        'v2.feed.title': 'Latest posts',
        'v2.feed.kind': 'Post type',
        'v2.feed.all': 'All',
        'v2.feed.video': 'Video',
        'v2.feed.image': 'Image',
        'v2.feed.article': 'Article',
        'v2.feed.more': 'Show {count} more',
        'v2.feed.none': 'No posts of this type yet',
        'v2.ask.anyPlatform': 'any platform',
        'v2.error.limit': 'This platform already has 3 accounts; remove one first',
        'v2.notice.refreshed': 'Updated',
        'v2.notice.refreshFailed': 'Update failed: {reason}',
        'v2.notice.deleted': 'Account removed',
        'v2.notice.deleteFailed': 'Could not remove: {reason}',
        'v2.notice.demoLoaded': 'Sample data added',
        'v2.notice.demoCleared': 'Sample data cleared',
        'v2.notice.demoFailed': 'Sample data failed: {reason}',
        'v2.unit.seconds': '{value}s',
        'v2.compare.short': 'vs prior',
        'v2.compare.flat': 'flat',
        'v2.health.login-required': 'Scan again',
        'v2.health.failing': 'Update failed',
        'v2.health.stale': 'Out of date',
        'v2.health.pending': 'Waiting',
        'v2.health.ok': 'OK',
        'v2.health.login-required.long': 'The login expired; the numbers are from the last update.',
        'v2.health.failing.long': 'The last automatic update failed; the numbers are from the last update.',
        'v2.health.stale.long': 'The numbers have not been updated for a long time and may be out of date.',
        'v2.health.pending.long': 'Nothing fetched yet; waiting for the first update.',
        'v2.health.loginHint': 'Click "Scan again" and scan with the {platform} app; it updates right after.',
        'v2.fix.login-required': 'Scan again',
        'v2.fix.failing': 'Try again',
        'v2.fix.stale': 'Update now',
        'v2.fix.pending': 'Update now',
        'v2.fresh.never': 'No data yet',
        'v2.fresh.updated': 'Updated {ago}',
        'v2.fresh.next': 'next update {at}',
        'v2.fresh.manual': 'automatic updates off',
        'v2.chart.empty': 'No data',
        'v2.radar.label': 'Last 7 days against the 7 days before',
        'v2.radar.current': 'Last 7 days',
        'v2.radar.previous': '7 days before',
        'v2.radar.tagUp': 'Well up',
        'v2.radar.tagDown': 'Well down',
        'v2.range.label': 'Period',
        'v2.range.yesterday': 'Yesterday',
        'v2.range.days': '{days} days',
        'v2.export.day': 'Date',
        'v2.export.title': 'Title',
        'v2.export.published': 'Published',
        'v2.export.link': 'Link',
        'v2.export.button': 'Export',
        'v2.nav.label': 'Media accounts',
        'v2.nav.overview': 'Overview',
        'v2.nav.add': 'Add',
        'v2.nav.addAccount': 'Add another {platform} account',
        'v2.nav.remove': 'Remove "{name}"',
        'v2.nav.addPlatform': 'Add a platform',
        'v2.beta': 'Trial',
        'v2.demo.note': 'Showing sample data.',
        'v2.demo.clear': 'Clear sample data',
        'v2.demo.load': 'Load sample data (development)',
        'v2.demo.noRefresh': 'Sample accounts are never fetched',
        'v2.first.title': 'Add your first account',
        'v2.first.body': 'Pick a platform and log in by scanning with its phone app. The account\'s posts and numbers are read, the dashboard appears here, and it updates every few hours.',
        'v2.first.note': 'Logins are stored on this computer only. Up to 3 accounts per platform.',
        'v2.card.followers': 'Followers',
        'v2.card.net': '7 days {value}',
        'v2.card.week': '{label}, 7 days',
        'v2.card.latest': 'Latest post',
        'v2.overview.sub': '{count} accounts; open one for its full data',
        'v2.overview.accounts': 'Accounts',
        'v2.overview.accountsTip': 'Each account\'s last 7 days (up to yesterday) against the 7 days before. Only numbers the platform reports.',
        'v2.overview.window': 'Last 7 days',
        'v2.overview.latest': 'Latest posts',
        'v2.posts.title': 'All posts',
        'v2.posts.noun': 'Post',
        'v2.posts.info': 'Post',
        'v2.posts.count': '{count} in all',
        'v2.posts.sort': 'Sort',
        'v2.posts.newest': 'Newest',
        'v2.posts.none': 'No posts fetched yet',
        'v2.posts.published': 'Published {at}',
        'v2.posts.noTime': 'Publish time unknown',
        'v2.top.total': '{label}',
        'v2.top.engagement': 'Engagement rate',
        'v2.board.overview': 'Overview',
        'v2.board.overviewTip': 'The last 7 days (up to yesterday) against the 7 days before. Platforms do not report peers, so this compares with your own prior period.',
        'v2.board.period': '{from} to {to}',
        'v2.board.daily': 'Platforms report each day on the next day',
        'v2.board.analysis': '{label}',
        'v2.board.top': 'Top 3 by {label}, last 30 days',
        'v2.board.allPosts': 'All posts',
        'v2.board.noTop': 'Nothing published in the last 30 days',
        'v2.board.noTopCounts': 'No per-post numbers for the last 30 days yet',
        'v2.board.limited': '{platform} only shows public posts and their engagement for now. Views and follower changes need the creator backend; those modules stay hidden until it is connected.',
        'v2.board.works': 'Posts',
        'v2.board.worksTip': 'Daily numbers reported by the platform, including new views and likes on older posts.',
        'v2.board.fans': 'Followers',
        'v2.board.fansTip': 'Daily follower numbers reported by the platform.',
        'v2.sentence.only': '{label} in the last 7 days:',
        'v2.sentence.higher': ', up',
        'v2.sentence.lower': ', down',
        'v2.action.refresh': 'Update now',
        'v2.work.title': 'Post data',
        'v2.work.tabOverview': 'Overview',
        'v2.work.open': 'Open on the platform',
        'v2.work.ask': 'Ask AI about this post',
        'v2.work.published': 'published {at}',
        'v2.work.updated': 'updated {at}',
        'v2.work.rank': 'No. {position} of {of} recent posts by {by}',
        'v2.work.noData': 'No numbers for this post yet',
        'v2.work.traffic': 'Key numbers',
        'v2.work.trafficTip': 'Compared with the median of the account\'s last {count} posts',
        'v2.work.metric': '{label}',
        'v2.work.engagement': 'Engagement',
        'v2.work.vs': 'vs usual',
        'v2.work.noMedian': 'No earlier posts to compare',
        'v2.work.median': 'Usual (median) {value}',
        'v2.work.more': 'Traffic sources, audience and comment keywords need the platform\'s creator backend and are not connected yet.',
        'v2.add.title': 'Add a platform',
        'v2.add.body': 'Pick a platform to open its login page, then scan with the phone app. Up to 3 accounts per platform.',
        'v2.add.full': '{max} accounts, full',
        'v2.add.count': '{count}/{max} added',
        'v2.add.scan': 'Scan to add',
        'v2.help.title': 'About the numbers',
        'v2.help.when': 'When numbers update',
        'v2.help.whenBody': 'Platforms publish each day\'s numbers around noon the next day. The plugin reads them on a schedule (every 6 hours by default), so "last 7 days" ends yesterday. "Update now" on an account reads right away.',
        'v2.help.what': 'What each number means',
        'v2.help.pick': 'Open an account to see how each of its numbers is counted.',
        'v2.help.missing': 'Why some numbers are missing',
        'v2.help.missingBody': 'Only numbers the platform itself reports are shown. A number the platform does not give (Xiaohongshu public pages have no views or follower changes) leaves its module out instead of an estimate.',
        'v2.edge.ai': 'AI',
        'v2.edge.help': 'Help',
        'v2.chat.title': 'AI assistant',
        'v2.chat.hide': 'Hide AI assistant',
        'v2.chat.all': 'All accounts',
        'v2.chat.new': 'New conversation',
        'v2.chat.full': 'Open full width',
        'v2.chat.close': 'Hide (the conversation stays)',
        'v2.chat.failed': 'Could not open the conversation: {reason}',
        'v2.chat.opening': 'Preparing the conversation…',
        'v2.chat.emptyTitle': 'Ask AI',
        'v2.chat.emptyBody': 'It reads all the numbers here: find topics, analyze your latest post, export a sheet, or ask "how many comments did my latest video get".',
        'v2.chat.blank': 'Ask my own question',
        'v2.quick.topics': 'Find topics',
        'v2.quick.latest': 'Latest post review',
        'v2.quick.export': 'Export data',
        'v2.dock.for': 'For "{name}":',
        'v2.dock.all': 'For all accounts:',
        'v2.ask.topics': 'Find topics for "{account}" ({platform}, account id {account_id}): read recent data with media_overview and media_posts, then run media_topics, and explain the 3 best ones. The direction I want:',
        'v2.ask.latest': 'Review the latest {noun} of "{account}" ({platform}, account id {account_id}): read it with media_post latest, compare it with the account median, explain what worked or not and why, and give up to 3 changes for the next one.',
        'v2.ask.export': 'Export the recent {noun} data of "{account}" ({platform}, account id {account_id}) to an Excel sheet in the current folder: take the last 50 with media_posts, with title, publish time and every counter, and tell me where the file is.',
        'v2.ask.all.topics': 'Help me find topics: list my accounts with media_accounts, ask which one, then run media_topics.',
        'v2.ask.all.latest': 'Look at the latest post of each of my accounts (media_accounts, then media_post latest for each): which did best, which worst, and why?',
        'v2.ask.all.export': 'Put the last 30 days of all my accounts into one Excel sheet in the current folder, using media_overview (days 30) and media_posts for each account.',
        'v2.ask.post': 'Analyze the post "{title}" (post id {post}) of "{account}" ({platform}, account id {account_id}): read it with media_post, compare with the account median, explain what worked and what did not, and suggest changes for the next one.',
        'v2.remove.title': 'Remove "{name}"?',
        'v2.remove.body': 'The data stored for this account (daily numbers, posts, AI reports) is deleted too and cannot be recovered. The account on the platform is not affected.',
        'v2.remove.ok': 'Remove',
      },
    }
    const TEXT = {
      zh: { ...TEXT_BASE.zh, ...TEXT_V2.zh },
      en: { ...TEXT_BASE.en, ...TEXT_V2.en },
    }
    // ================================================================== 4. 挂载（把页面接进 DSH）

    /**
     * 左侧栏的图标。有账号登录失效、或者上次更新失败，图标右上角多一个红点，不用打开页面也能看到。
     * 这个图标画在 DSH 的侧栏里（不在本插件的外框里），拿不到第 1 段「外观」的变量，所以红点的颜色直接用 DSH 的变量。
     */
    function PanelIcon({ size = 20 }) {
      const store = useSource(face.store)
      const alert = (store.summary?.accounts ?? []).some(item => item.account.demo !== true && (item.health.state === 'login-required' || item.health.state === 'failing'))
      return h('span', { style: { position: 'relative', display: 'inline-flex' } }, h(Icon, { name: 'gauge', size }),
        alert ? h('i', { title: t('v2.health.login-required'), style: { position: 'absolute', top: -2, right: -3, width: 7, height: 7, borderRadius: '50%', background: 'var(--dsw-alias-state-error-primary)' } }) : null)
    }

    return {
      inject: ['slots', 'locale', 'connection', 'layout', 'sessions'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(ID, TEXT), `${ID}: 文案`)
        t = ctx.locale.bind(ID)
        rpc = (endpoint, payload) => ctx.connection.rpc.call('/api', endpoint, payload)
        ctx.effect(() => {
          const el = document.createElement('style')
          el.setAttribute('data-plugin-style', ID)
          el.textContent = (THEME + STYLES + PAGE_STYLES).replaceAll('$-', `${P}-`)
          document.head.append(el)
          return () => el.remove()
        }, `${ID}: 样式`)

        // 做成了用底部小字，没做成用右下角的卡片。
        const report = (text, tone = 'success') => { if (tone === 'success') toast(text, 4000); else notify(text, { tone: 'danger' }) }
        const showPanel = () => ctx.layout.selectPanel(ID)
        const store = createMediaStore({ remote, report })
        const platformName = platform => store.get().platforms.find(item => item.id === platform)?.displayName
        // 「重新扫码」是带着账号打开小浏览器的；登录上以后马上更新这个账号，左边的红点就消了。
        let relogin
        const browser = createBrowserSource({
          remote, identifyFallbackMs: IDENTIFY_FALLBACK_MS, platformName,
          onLoggedIn: platform => {
            report(t('notice.loggedIn', { platform: platformName(platform) ?? platform }))
            const account = relogin
            relogin = undefined
            if (account !== undefined) void store.actions.refresh(account)
            else void store.actions.reloadSummary()
          },
        })

        // ---- AI 助手：一段对话放在右边一栏（不跳页）。对话在 ui.js 建的工作区里；换成新对话就再建一段。
        let chatFolder
        void rpc(BRIDGE, { action: 'chatInfo' }).then(result => { if (result?.ok) chatFolder = result.value.folder }).catch(() => { /* 没有画面转接就没有快捷模块，不影响看板 */ })
        const workspaceList = () => (ctx.get('uiWorkspace')?.workspaces ?? ctx.get('workspaces'))?.list?.getSnapshot?.()
        const listed = sid => {
          const list = ctx.sessions.list.getSnapshot()
          const archived = workspaceList()?.archivedSessionIds ?? []
          return list.phase !== 'ready' || (list.byId[sid] !== undefined && !archived.includes(sid))
        }
        let chatSid = readSaved().chatSid
        const currentSid = () => chatSid !== undefined && listed(chatSid) ? chatSid : undefined
        // 正在显示的那段对话由这里拿着；换掉的那段过一会儿再放手（等它的界面先卸掉）。
        let held = null
        const letGo = previous => { if (previous) setTimeout(() => previous.reference.release(), 1500) }
        const hold = sid => {
          if (held?.sid === sid) return held.reference
          const before = held
          held = sid ? { sid, reference: ctx.sessions.retain(sid, { source: ID }) } : null
          letGo(before)
          return held?.reference ?? null
        }
        ctx.effect(() => () => { letGo(held); held = null }, `${ID}: AI 助手的对话`)
        /** 打开 AI 助手；ask 是要填进输入框的话（不替用户发，send: true 才直接发）。fresh: true 开一段新对话。 */
        const openChat = async (ask = '', { fresh = false, send = false } = {}) => {
          const text = String(ask ?? '').trim()
          store.actions.setChat({ open: true, pending: true, error: undefined })
          try {
            let sid = fresh ? undefined : currentSid()
            if (sid === undefined) {
              const result = await rpc(BRIDGE, { action: 'openChat' })
              if (!result?.ok) throw new Error(result?.error?.message ?? t('error.unknown'))
              chatFolder = result.value.folder
              sid = await ctx.get('uiWorkspace').connectWorkspace(result.value.workspaceId, {})
              chatSid = sid
              writeSaved({ chatSid: sid })
            }
            const binding = await hold(sid).ready
            store.actions.setChat({ pending: false })
            const input = ctx.get('conversation')?.input
            if (!text || !input) return
            input.requestDraftInitialization(binding, { prompt: text, whenDraftExists: 'replace' })
            const shell = input.shellFor(binding)
            await new Promise(resolve => setTimeout(resolve, 30))
            if (send) shell.submit('queue')
            else shell.focus()
          } catch (error) {
            store.actions.setChat({ pending: false, error: error?.message ?? String(error) })
          }
        }
        const fullChat = () => { const sid = currentSid(); if (!sid) return; ctx.get('uiWorkspace').openSession(sid); ctx.layout.selectPanel(null) }

        face = {
          ...store.actions,
          store: store.observable,
          sources: { browser: browser.hooks.browser },
          openBrowser: (platform, url, mode, account) => { relogin = mode === 'browse' && url === undefined ? account : undefined; return browser.actions.open(platform, url, mode, account) },
          openPost: (account, url) => browser.actions.open(account.platform, url, 'browse', account.id),
          browserInput: browser.actions.input, retryBrowser: browser.actions.retry, closeBrowser: browser.actions.close,
          identifyBrowser: browser.actions.identify, minimizeBrowser: browser.actions.minimize,
          expandBrowser: () => { browser.actions.expand(); showPanel() },
          // 大窗和小窗确认账号走同一条路：加成功了就把小浏览器关掉。
          connectIdentity: async (identity, niche) => {
            const outcome = await store.actions.connect(identity, niche, browser.hooks.browser.getSnapshot().view?.id)
            if (outcome.ok) await browser.actions.close()
            return outcome
          },
          addPlatform: () => {},
          chat: { open: openChat, sid: currentSid, hold, full: fullChat, folder: () => chatFolder },
        }
        ctx.effect(() => async () => { await browser.dispose() }, `${ID}: 登录小浏览器`)
        // 开发用（localStorage dsh-media.dev = 1 时才有）：在控制台里用 __mediaFace.openBrowser(平台, 网址, 'browse', 账号 id) 打开账号自己的平台页面。
        if (DEV) window.__mediaFace = face

        // 切回这个面板时重读一次总览：后台这期间自动更新过、或者登录失效了，马上能看到。
        const isShown = () => ctx.layout.panelInfo.getSnapshot().activePanelId === ID
        let shown = isShown()
        ctx.effect(() => ctx.layout.panelInfo.subscribe(() => {
          const now = isShown()
          if (now && !shown && store.get().status === 'ready') void store.actions.reloadSummary()
          shown = now
        }), `${ID}: 切回来时刷新`)

        ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: ID, locale: ID, children: { [CHAT_SLOT]: { kind: 'single', scope: 'session' } } }, MediaPageV2))
        ctx.slots.inject(CHAT_SLOT, () => ctx.slots.register({ name: CHAT_SLOT }, ChatSlot))
        ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({ name: 'conversation.input.dock', id: ID, order: 45, locale: ID }, Dock))
        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({ name: 'sidebar.panellist', id: ID, order: 20, locale: ID, label: () => t('panel') }, PanelIcon))
      },
    }
  },
})
