# 2026-09-06 CodeNotch 竞品研究

- **需求：** `REQ-20260906-001`
- **状态：** 已完成
- **研究对象：** [vinzdg/codenotch](https://github.com/vinzdg/codenotch)
- **边界：** 本轮只做公开资料、源码与本项目现状对照，不直接修改产品界面，不复制第三方品牌资产或逐像素复刻其外观。

## 结论

CodeNotch 看起来“更瘦但仍清晰”，主要不是字体或配色更激进，而是采用了三层信息结构：

1. 闲置时折叠成很窄的屏幕边缘把手；
2. 展开后只显示 44pt 状态环、Logo 和一个百分比；
3. 额度窗口、重置时间与正在运行的会话放进悬停卡片。

AI Token Meter 不应照搬它的纯黑外观或百分比标签。更适合本项目的方向是：保留黑蓝深海背景、三个纯 Logo、点击详情与 Provider 专属配色，同时新增一档真正紧凑的浮动条密度，并把折叠、运行中、等待用户、数据可信度和临时隐藏做成独立能力。

## 公开事实核对

CodeNotch 官方 README 和源码说明了以下行为：

- 支持 Claude Code、Cursor、OpenAI Codex 与 Antigravity；
- 从已有工具的登录态、官方端点、本地数据库、语言服务器或回退日志读取信息，不单独建立账户体系；
- 浮动条可位于四个屏幕边缘，左右为纵向、上下为横向；
- 闲置时折叠为边缘小胶囊，指针进入后展开；
- 外层额度环以已用比例显示，内层细弧表达“正在工作”，等待用户时变为脉冲提示；
- 每个 Provider 声明 `.official`、`.derived` 或 `.manual` 数据可信度，失败显示 `stale`、`needsAuth` 或 `error`，而不是编造百分比；
- 空闲时降低到每 5 分钟轮询；Claude 遇到 429 时使用持久化指数退避；
- 右键菜单提供 Settings、Refresh now、Hide for 1 hour 与 Quit；
- Sparkle 自动更新使用 EdDSA 签名。

主要依据：

- [CodeNotch README](https://github.com/vinzdg/codenotch#readme)
- [CodeNotch 设计规格](https://github.com/vinzdg/codenotch/blob/main/docs/specs/2026-08-28-usage-notch-design.md)
- [NotchLayout.swift](https://github.com/vinzdg/codenotch/blob/main/Sources/Notch/NotchLayout.swift)
- [ProviderRing.swift](https://github.com/vinzdg/codenotch/blob/main/Sources/Features/ProviderRing.swift)
- [NotchRootView.swift](https://github.com/vinzdg/codenotch/blob/main/Sources/Notch/NotchRootView.swift)
- [MIT License](https://github.com/vinzdg/codenotch/blob/main/LICENSE)

## 为什么它显得更瘦

### 定量对照

| 指标 | AI Token Meter 当前 macOS | CodeNotch | 视觉影响 |
| --- | ---: | ---: | --- |
| 展开主体宽度 | 108pt | 约 70pt | 我们宽约 54%，桌面占用更强 |
| Provider 环直径 | 60pt | 44pt | 我们环大约 36%，同时放大间距和肩部 |
| Provider 环间距 | 12pt | 约 31pt，但包含环下百分比布局 | 两者不能只比较裸间距；CodeNotch 把文字纳入节奏 |
| Logo 尺寸 | 环直径的 44%，约 26.4pt | 约 17pt | CodeNotch 留出更多负空间，环更容易读 |
| 环线宽 | 5pt | 外轨约 5.8pt、进度约 3pt | 它用粗轨道定形、细进度表达数据，层次更明确 |
| 闲置状态 | 始终完整显示 | 约 10pt 宽的边缘把手 | 这是其“很瘦”的最大来源 |

CodeNotch 的原始设计帧以 117px 对应 44pt，因此源码中的 186px 主体深度约为 70pt，26px 折叠宽度约为 10pt。AI Token Meter 的 108×356pt、60pt 状态环和 5pt 双层环来自当前 `FloatingPanelController`、`FloatingStripContentLayout` 与 `UsageRing`。

### 视觉结构对照

CodeNotch 的清晰度来自：

- 常驻区只回答“还剩多少、是否正在工作、是否在等我”；
- 黑底、白 Logo、单一状态色，颜色职责非常少；
- 所有尺寸由一个 `NotchLayout` 集中管理，并直接引用设计帧测量；
- 状态环、工作弧和等待脉冲使用不同半径及线宽，不在同一轨道争夺注意力；
- 展开与收起时由轮廓裁切内容，避免控件缩放造成视觉抖动；
- 透明面板为详情预留空间，未显示区域保持点击穿透。

AI Token Meter 当前优势则是：

- 三个品牌色、深海背景和 S 形贴边轮廓已经形成自己的识别度；
- 常驻圆环内只显示 Logo，符合此前明确的空间要求；
- Claude Code、OpenAI Codex、DeepSeek 的详情比 CodeNotch 更完整，包含重置券、余额与 30 天统计；
- macOS/Windows 使用同一展示口径，并有多屏位置持久化、外部点击关闭和可配置自动隐藏；
- 凭证边界更保守，CLI 凭证不由主应用保存，DeepSeek Key 使用系统安全存储。

## 推荐借鉴项

### P0：紧凑浮动条密度

增加 `Compact` / `Comfortable` 两档，保留当前布局为 `Comfortable`，建议把 `Compact` 作为后续视觉候选：

- 主体目标宽度：72–78pt；
- Provider 环：46–48pt，仍不低于 44pt 可点击目标；
- Logo 光学校正框：20–22pt；
- 环线：轨道 4pt、进度 3–3.5pt；
- 环间距：8–10pt；
- 拖动把手平时降到低对比或隐藏，悬停时出现，但保留至少 44pt 的透明拖动命中区；
- 深海背景不删除，只降低局部高光和对比，避免缩小后与三个环争抢注意力；
- S 形肩部继续保留，按紧凑尺寸重新绘制曲线，不等比例压缩现有 108×356 轮廓。

这会直接回应“更瘦”的需求，同时不破坏用户已经确认的 Logo-only 与深海背景方向。

### P0：可选的闲置折叠

增加 `Never`、`After 5s`、`After 15s` 三档，折叠后只保留 10–12pt 的边缘把手；鼠标进入较大的透明热区后展开。首版建议默认 `Never`，避免改变现有用户习惯，并确保：

- VoiceOver、键盘焦点、详情打开、拖动和刷新期间禁止折叠；
- 全屏隐藏策略优先于折叠策略；
- 左右屏幕边缘、多显示器和 Windows DPI 分别验收；
- 折叠动画只裁切内容，不缩放 Logo 和环。

### P1：工作状态与等待状态

借鉴 CodeNotch 的双轨表达：

- 外层环继续只表示额度已用比例；
- 内层短弧表示 Provider 正在工作；
- 等待登录、授权或用户输入时使用低频脉冲，不改变额度本身；
- 只显示 `Working`、`Waiting`、`Idle` 这种粗粒度状态，不读取或展示会话标题、工程路径、提示词或“它在等什么”。

这样既增加功能，也不会越过本项目“不读取对话内容”的隐私边界。

### P1：统一显示数据可信度与新鲜度

本项目已经区分 `Official quota` 与 `Local activity`，可以进一步统一为：

- `Official`：官方端点或官方 CLI 返回；
- `Local estimate`：本机统计推导；
- `Cached · N min ago`：上次成功值；
- `Needs sign-in` / `Unavailable`：无值时绝不显示 0%。

该信息只需出现在详情和辅助功能描述中，浮动条仍保持无文字。

### P1：持久化退避与按活动调节刷新

在现有 5 分钟刷新基础上增加：

- CLI 或本机活动正在运行时适当加快刷新；
- 空闲时保持 5 分钟；
- 429、登录失效和网络失败分别退避；
- 把下一次允许请求时间持久化，重启后不立即重复撞限流；
- “Refresh now”明确覆盖普通间隔，但不绕过服务端明确的强制等待。

### P1：Provider 显示与排序

允许在 Settings 中隐藏未使用的 Provider，并拖动排序。隐藏后浮动条长度按 1–3 项自适应；数据采集是否停止应单独明确，建议默认同步停止并清除该 Provider 的界面缓存，但不退出官方 CLI。

### P2：浮动条右键快捷菜单

建议增加：

- Refresh now
- Hide for 1 hour
- Settings…
- Quit AI Token Meter

这比把所有操作都集中到菜单栏/托盘更适合贴边工具，且不会增加常驻视觉元素。

## 暂不建议借鉴

- **环下百分比：** 用户此前已明确要求三个圆环只显示 Logo；应维持现状，精确数值放详情与菜单栏。
- **移除深海背景改为纯黑：** 会丢掉 AI Token Meter 已确认的视觉身份。
- **默认自动折叠：** 可能影响可发现性与拖动，先作为选项并做真机验证。
- **直接读取会话名称、工作目录或等待内容：** 与本项目当前隐私承诺冲突。
- **立即支持上/下贴边：** macOS 与 Windows 的轮廓、任务栏/Dock、多屏和 DPI 成本较高；当前左/右稳定性优先。
- **直接增加 Cursor/Antigravity：** 可作为 Provider 扩展候选，但应先完成数据授权、公开接口稳定性和跨平台可行性评估。
- **改成后台自动更新：** 当前产品设计要求用户点击检查和立即更新；不应因竞品行为自行改变。

## 建议实施顺序

1. 先制作 `Compact` 与当前 `Comfortable` 的双平台静态对比原型，包含 100%、125%、150%、200% Windows DPI；
2. 用户确认后实现紧凑密度，保留当前模式作为可回退选项；
3. 再做闲置折叠，优先验证点击、拖动、详情层级、全屏和多屏恢复；
4. 然后增加 Provider 显示/排序与右键菜单；
5. 最后评估粗粒度工作状态和持久化退避，不读取会话内容。

## 验收口径

- 研究结论有 CodeNotch 官方 README、设计规格和源码依据；
- 明确区分可借鉴、暂不建议和本项目已有优势；
- 视觉建议能解释“更瘦但仍清晰”的原因，并给出可实现的尺寸范围；
- 不把本轮研究冒充为已完成的产品改版；
- 不复制 CodeNotch Logo、截图、品牌资产或逐像素外观。
