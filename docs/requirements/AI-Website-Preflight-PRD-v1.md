# AI Website Preflight
MVP 产品需求文档 v1.0

定位：AI 建站后的“上线前验收”工具
目标：用 30 天验证真实需求与 SEO 获客，而不是先做完整 SaaS。

版本日期：2026-09-05

## 1. 产品定义

一句话：用户用 Codex、Cursor、Lovable、Replit、Bolt 等工具完成网站后，在正式发布或推广前输入 URL，系统自动完成上线前体检，指出必须修复的问题，并生成可直接交给 Codex/AI Coding Agent 的修复任务。

### 核心闭环

1. 用户输入公开可访问的网站 URL。

1. 系统执行 Preflight Scan（上线前检查）。

1. 返回 Ready Score、Must Fix、Warnings、Passed。

1. 用户点击“Fix with Codex”，获得结构化修复提示词/Markdown。

1. 用户让 Codex 修改网站。

1. 用户回来重新扫描，直到达到 Ready to Launch。

### 目标用户

- 使用 Codex / Cursor / Lovable / Replit / Bolt / v0 等工具独立建站的人。

- 懂一点技术，但不熟悉 SEO、安全、可访问性、上线检查的个人开发者。

- 小型独立开发者、Micro-SaaS 创作者、自由职业开发者。

- 后期可扩展到小型 Agency，但 MVP 不为 Agency 优化。

## 2. MVP 成功标准

MVP 的唯一核心假设：陌生用户愿意把自己的网站 URL 提交给我们扫描，并愿意根据结果采取修复动作。

| 指标 | 观察内容 | 意义 |
| --- | --- | --- |
| Scan | 陌生用户提交域名并完成扫描 | 需求成立的第一信号 |
| Fix Prompt | 点击/复制 Codex 修复提示词 | 结果具有行动价值 |
| Rescan | 同一域名再次扫描 | 形成产品闭环 |
| Organic | Google/Bing 自然搜索产生 impressions/clicks | SEO 获客有苗头 |

## 3. 第一版明确不做

- 不做登录/注册。

- 不做会员、Stripe、支付。

- 不接大模型 API 作为核心依赖。

- 不做复杂 Dashboard。

- 不做团队、Agency、白标报告。

- 不做浏览器插件。

- 不做自动修改用户代码或 GitHub 仓库。

- 不承诺完整安全漏洞扫描或法律合规认证。

- 不追求扫描整个大型网站；MVP 默认最多抓取 5–10 个页面。

- 不为了“功能丰富”加入与上线验收无关的工具。

## 4. 网站信息架构

- / — 首页 + URL 输入 + 产品解释

- /scan/{id} — 扫描进度/结果页（随机不可预测 ID）

- /tools/sitemap-checker — 独立 SEO 工具入口

- /tools/robots-txt-checker

- /tools/meta-tag-checker

- /tools/og-preview

- /tools/security-headers-checker

- /tools/broken-link-checker

- /tools/ai-crawler-checker

- /tools/schema-checker（可第二批上线）

- /tools/ssl-checker（可第二批上线）

- /guides/... — 后续根据 Search Console 查询数据创建指南页

## 5. 首页需求

### 首屏

建议英文市场优先。核心标题示例：

Is your AI-built website actually ready to launch?

副标题：Run a preflight check for SEO, broken links, security basics, social sharing and launch mistakes — then get a fix pack for Codex.

- 一个 URL 输入框。

- 主按钮：Run Preflight。

- 输入框下方明确说明：只扫描公开页面；不会修改网站。

- 展示 5–7 个典型检查项，避免首页堆砌几十个术语。

- 下方展示示例报告：NOT READY → 修复 → READY TO LAUNCH。

### 首页 CTA 原则

所有内容最终只推动一个动作：提交 URL 扫描。不要同时出现注册、订阅、咨询、下载 App 等竞争 CTA。

## 6. 扫描流程

1. 规范化 URL；只允许 http/https。

1. 阻止 localhost、私网 IP、云元数据地址等 SSRF 风险目标。

1. 请求首页并记录 HTTP 状态、重定向、TLS、响应头。

1. 发现 sitemap.xml / robots.txt；从首页和 sitemap 选择最多 5–10 个代表页面。

1. 对页面执行 HTML 级规则检查。

1. 必要时将少量页面放入受控 Headless Browser 队列进行渲染检查。

1. 汇总规则结果并计算 Ready Score。

1. 生成 Must Fix / Warning / Passed。

1. 根据真实检测证据生成确定性的 Codex Fix Pack，不依赖 LLM 也能工作。

## 7. MVP 检测清单

| 类别/规则 | 检查内容 | 默认级别 |
| --- | --- | --- |
| Availability | 首页可访问；2xx/合理重定向；不存在重定向循环 | Critical |
| HTTPS | HTTPS 可用；证书基本有效 | Critical |
| Robots | robots.txt 可访问；未意外 Disallow: / | Critical |
| Sitemap | 存在 sitemap；URL 可访问；格式可解析 | High |
| Indexability | 页面未出现意外 noindex | Critical |
| Canonical | canonical 存在且目标合理 | High |
| Title | 页面 title 存在、非明显默认值、不过度重复 | High |
| Meta description | 主要页面存在 description | Medium |
| H1 | 主要页面存在 H1；避免明显缺失/重复 | Medium |
| Broken internal links | 抽样页面内部链接无明显 4xx/5xx | Critical |
| Placeholder links | 检测 href='#'、javascript:void、明显空链接 | High |
| Placeholder content | 检测 lorem ipsum、TODO、Coming soon 等明显残留 | High |
| Default branding | 检测常见默认 title/favicon/模板痕迹（仅作为 warning） | Low |
| Favicon | favicon 可发现且可访问 | Low |
| Open Graph | og:title / description / image 基础字段 | Medium |
| OG image | og:image URL 可访问 | Medium |
| Viewport | 存在移动端 viewport | High |
| Images alt | 抽样重要图片缺失 alt 的比例 | Medium |
| Form labels | 基础表单控件 label/aria-label | Medium |
| Heading order | 明显异常的 heading 结构 | Low |
| Security headers | CSP/HSTS/X-Content-Type-Options/frame/referrer 等基础提示 | Medium |
| Mixed content | HTTPS 页面引用明显 HTTP 资源 | High |
| Exposed secrets | 仅检测 HTML/JS 中高置信度常见 secret pattern；避免声称完整安全扫描 | Critical |
| 404 page | 抽样不存在 URL 是否返回合理 404 状态 | Medium |
| Contact path | 检测常见 contact/about/support 入口，仅提示 | Low |
| Privacy | 存在 privacy 链接/页面（按网站类型提示，不做法律结论） | Medium |
| Terms | 存在 terms 链接/页面（按网站类型提示） | Low |
| Analytics | 识别常见 analytics；仅信息项 | Info |
| Structured data | JSON-LD 是否可解析；明显语法错误 | Medium |
| AI crawler access | robots 对常见 AI crawler 的声明/阻止情况，仅报告事实 | Info |

## 8. 评分规则 v1

评分必须简单、可解释，不能制造虚假精确度。建议从 100 分开始扣分，并同时使用“硬阻断规则”。

- Critical：每项 -15；High：-8；Medium：-4；Low：-1；Info：不扣分。

- 最低 0 分，最高 100 分。

- 任意 Critical 未通过时，即使总分较高，也不能显示 READY。

- READY TO LAUNCH：无 Critical，且分数 ≥ 90。

- ALMOST READY：无 Critical，且 75–89。

- NOT READY：存在 Critical，或分数 < 75。

- 结果页必须显示扣分原因，避免只有一个黑盒分数。

## 9. 结果页

### 顶部

- 域名 + 扫描时间。

- Ready Score 大数字。

- READY / ALMOST READY / NOT READY 状态。

- 一句话总结：例如“3 issues should be fixed before launch.”

- 主 CTA：Generate Fix Pack for Codex。

- 次 CTA：Scan Again。

### 问题卡片

每个问题统一包含：严重级别、用户能理解的问题描述、证据、为什么重要、如何验证修复。不要只输出专业术语。

### 示例

Broken link — Critical
Evidence: /pricing links to /checkout-old, which returned 404.
Why it matters: Visitors cannot complete this path.
Verify: /checkout-old should return a valid page or the link should be changed.

## 10. Codex Fix Pack

MVP 不需要调用 AI。根据规则结果用模板生成 Markdown，用户可复制或下载。

# Prelaunch Fix Pack

Goal: Fix the verified pre-launch issues below without redesigning the site.

Rules:
- Preserve the current visual design unless a task explicitly requires UI changes.
- Do not remove working features.
- Inspect the existing framework before editing.
- After each task, run the project's existing tests/build checks.
- Do not invent missing business/legal information; flag it for the owner.

## Task 1 — [Critical] Fix broken internal link
Evidence: ...
Expected result: ...
Acceptance criteria:
- ...
- ...

## Final verification
Run the production build, then verify each acceptance criterion.

关键原则：只把扫描实际发现的问题写入 Fix Pack；不要生成“可能存在”的虚构问题。

## 11. SEO 获客设计

主产品概念“preflight”可能没有足够直接搜索量，因此 SEO 入口由具体问题型免费工具承担，再导流到 Full Preflight。

### 第一批工具页

- Sitemap Checker

- Robots.txt Checker

- Meta Tag Checker

- Open Graph Preview / Checker

- Security Headers Checker

- Broken Link Checker

- AI Crawler / robots Checker

### 第二类：平台长尾页

- Lovable SEO / launch checklist

- Replit SEO / Google indexing

- Bolt SEO / sitemap

- Cursor-built website launch checklist

- Codex website launch checklist

禁止批量生成无实质内容的 SEO 页面。每个平台页必须有真实、平台相关的步骤/检查或示例。

## 12. 技术架构建议

- 前端：Next.js + TypeScript（便于 SEO、工具页和后续全栈扩展）。

- 样式：Tailwind CSS；组件保持轻量。

- 后端：Next.js API 或独立轻量 Node 服务均可；MVP 优先减少服务数量。

- 数据库：SQLite 起步足够；只保存扫描元数据、规则结果、匿名事件。后续再迁移 PostgreSQL。

- 队列：MVP 可用数据库 job table + 单 worker；限制并发，适配 1GB RAM。

- 抓取：undici/fetch + cheerio；Headless Browser 仅在必要检查中使用。

- 定时清理：自动删除过期扫描详情，例如 30 天；避免数据库无限增长。

- 反滥用：IP/域名速率限制、最大响应体、请求超时、最大页面数。

- 部署：Docker 可选；1GB 服务器优先减少常驻进程和 Chromium 并发。

### SSRF / 安全硬要求

- 解析 DNS 后拒绝 loopback、RFC1918 私网、link-local、云 metadata 地址。

- 每次重定向后重新验证目标地址。

- 限制协议为 HTTP/HTTPS。

- 设置连接/读取超时、最大下载大小、最大重定向次数。

- 不要执行从目标网站获得的任意代码或 shell 命令。

- Headless Browser 使用隔离上下文并限制资源。

## 13. 数据与隐私

- MVP 不要求账号。

- 扫描 URL 属于公开网页输入，但仍应提供隐私说明。

- 不要保存抓取到的完整页面源码超过完成扫描所需时间。

- 报告 URL 使用随机不可预测 ID；默认不让搜索引擎索引用户报告。

- 分析事件只记录必要字段：来源页、scan_started、scan_completed、fix_pack_copied、rescan。

- 不要公开用户扫描过哪些域名。

- 对“secret detection”明确声明仅是基础检查，不等于安全审计。

## 14. 30 天执行计划

| 阶段 | 时间 | 交付 |
| --- | --- | --- |
| MVP | Day 1–7 | URL 扫描、20–30规则、评分、结果页、Fix Pack、Rescan |
| SEO入口 | Day 8–14 | 5–7 个独立工具页；Search Console/Bing Webmaster 配置 |
| 真实流量 | Day 15–21 | 提交 sitemap；改善 indexability；记录真实用户行为 |
| 判断 | Day 22–30 | 只依据曝光、点击、扫描、Fix Pack、Rescan 数据决定继续/调整 |

## 15. 30 / 90 / 180 天止损框架

### 30 天

- 核心不是收入，而是收录、曝光和陌生用户扫描。

- 强信号：自然搜索开始产生点击；出现非本人域名扫描；出现 Fix Pack copy / rescan。

- 弱信号：只有 impressions 没点击——优先调整关键词、标题和落地页。

- 危险信号：页面正常收录但几乎没有 impressions，且工具页无真实使用。

### 90 天

- 确认至少一组关键词/工具页能够持续带来搜索访问。

- 确认扫描→Fix Pack→Rescan 漏斗中至少两个环节有稳定使用。

- 若流量有增长但留存弱，优化产品；若产品有人用但 SEO 弱，扩展长尾入口；两者都弱则考虑转向 AI Coding Cost。

### 180 天

- 只有在真实使用稳定后才加入账号、历史记录、自动监控和付费。

- 付费候选：更多页面扫描、周期性自动扫描、历史 diff、邮件提醒、完整报告、Agency。

- 若 180 天仍无法形成稳定自然流量或重复使用，不因沉没成本继续堆功能。

## 16. Codex 开发约束（建议直接放入仓库 AGENTS.md）

Product principle:
This is a pre-launch verification product, not a generic SEO dashboard.

MVP priorities:
1. Accurate evidence.
2. Fast scan.
3. Clear human-readable findings.
4. Actionable Codex Fix Pack.
5. Rescan loop.
6. SEO landing pages.

Do not add without explicit approval:
- authentication
- payments
- subscriptions
- AI API calls
- dashboards
- teams
- browser extensions
- automatic repository modification
- unrelated utilities

Engineering:
- Keep memory usage suitable for a 1 GB server.
- Limit crawling and browser concurrency.
- Treat all scanned URLs and HTML as untrusted input.
- Implement SSRF protections before public launch.
- Every finding must include reproducible evidence.
- Never claim a legal/security guarantee.
- Add tests for every detection rule and scoring rule.

## 17. 第一阶段验收标准

- 输入正常公开 URL 可完成扫描，不因单个页面失败导致整个任务崩溃。

- 恶意/私网 URL 被拒绝。

- 扫描结果至少覆盖核心 20 项规则。

- 每个失败项包含证据与可理解说明。

- Ready Score 可复现，规则有自动测试。

- Fix Pack 只包含真实失败项，并有 acceptance criteria。

- 用户可重新扫描。

- 至少 5 个独立 SEO 工具页可被搜索引擎抓取。

- 用户扫描报告默认 noindex。

- 在目标 1GB 服务器上限制并发后可稳定运行。

## 18. 立项决策

建议：批准 30 天 MVP 验证，但不批准提前建设完整 SaaS。第一个里程碑不是“功能做完”，而是“出现陌生用户自然搜索进入并完成扫描”。

如果验证失败，优先复盘搜索意图、入口页面和产品定位；若 90 天仍无明显信号，则回到候选项目 AI Coding Cost / Usage，而不是继续扩大本项目范围。
