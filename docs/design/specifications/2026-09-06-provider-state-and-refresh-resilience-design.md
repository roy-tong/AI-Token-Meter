# Provider 状态表达与刷新韧性设计

**需求：** `REQ-20260906-002`  
**日期：** 2026-09-06  
**状态：** 用户已确认，实施中（2026-09-06）
**依赖：** [紧凑浮动条与闲置折叠](2026-09-06-compact-floating-strip-and-idle-fold-design.md)

## 目标

把“额度用了多少”“数据是否可信/新鲜”“Provider 是否正在刷新或等待用户处理”拆成不同视觉与数据通道；同时为三项采集增加按失败类型区分的持久化退避，减少限流和无意义重试。

## 不冒充实时会话监控

AI Token Meter 当前没有稳定、跨平台且不读取会话内容的接口判断 Claude Code、OpenAI Codex 或 DeepSeek 是否正在生成回答。因此本阶段不声称监控真实对话运行状态，也不扫描提示词、会话标题、工程目录或“正在等待什么”。

状态名称采用可验证语义：

```text
idle       没有应用自己发起的动作
refreshing 正在读取该 Provider 的额度/余额
waiting    需要登录、授权、配置 Key 或完成官网同步
```

DeepSeek、Claude Code 与 OpenAI Codex 都能可靠支持这三态；未来若官方提供真实 session activity，可在新需求中增加 `working`，不能用本机进程存在或文件更新时间冒充。

## 双轨视觉

- 外层现有品牌/语义环只表示额度已用比例，不因 refreshing/waiting 改写数值。
- 内层 25% 短弧表示 refreshing，使用中性白蓝色并以 1.1 秒一周旋转；Reduce Motion 下显示静态短弧。
- waiting 显示完整内环的低频明暗脉冲，并在详情中给出固定动作文本；Reduce Motion 下显示静态琥珀内环和非颜色图标。
- idle 不显示内环。
- 无额度数据时显示轨道和 Logo，但绝不把未知值画成 0%。
- Compact 与 Comfortable 使用同一相对内环半径，Windows 和 macOS 使用同一 duration、状态色和辅助功能文案。

## 数据来源与新鲜度

本项目继续使用现有 Snapshot 字段，不把 freshness 与 origin 混为一个枚举：

- `Official`：官方 CLI、官方 app-server 或官方余额接口返回的额度；
- `Local estimate`：本机允许字段聚合；
- `Fresh`：本轮成功；
- `Cached · N min ago`：采集失败后保留上次成功值；
- `Needs sign-in` / `Needs setup` / `Unavailable`：没有可显示值时的明确状态。

详情页把 origin 放在区块标题，新鲜度放在更新时间附近；浮动条保持无文字，只通过透明度、非颜色状态图标和辅助功能 value 表达。现有 `Official quota` / `Local activity` 文案迁移到同一 formatter，不改变数据口径。

## Provider 刷新状态

每项 Provider 有独立的 `ProviderOperationState`。手动全量刷新可以并行启动三项，但每项只允许一个 generation 拥有最终结果；较早动作、登录轮询或超时回调不得覆盖较新状态。

进入 refreshing 时只改变内环；成功、失败、取消都必须退出 refreshing。登录、工作区授权、缺少 API Key 和 DeepSeek 官网同步需要用户动作时进入 waiting。用户完成动作并成功刷新后回 idle。

## 持久化退避

新增每 Provider 独立的非敏感 `RefreshBackoffState`：

```text
failureKind
consecutiveFailures
nextEligibleAt
```

策略：

| 失败类型 | 第一次等待 | 递增 | 上限 | 手动刷新 |
| --- | ---: | --- | ---: | --- |
| HTTP/服务限流 | 60 秒 | 每次 ×2 | 15 分钟 | 尊重服务端 Retry-After/本地截止时间 |
| 网络/服务不可达 | 30 秒 | 每次 ×2 | 10 分钟 | 可立即尝试一次 |
| CLI 传输失败 | 30 秒 | 每次 ×2 | 5 分钟 | 可立即尝试一次 |
| 登录/授权/缺少 Key | 15 分钟 | 固定 | 15 分钟 | 用户完成相应动作后立即清除 |

- 服务端给出有效 `Retry-After` 时使用 `max(本地退避, Retry-After)`；无效或为 0 时仍使用本地下限。
- 成功立即清除该 Provider 的退避。
- `nextEligibleAt` 持久化，重启不能绕过限流；超过 24 小时或损坏的未来值按 24 小时上限规范化。
- Scheduled refresh 跳过尚未到期的 Provider，但不阻塞其他 Provider；保留缓存并更新为明确的 Cached 状态。
- Manual refresh 可绕过一次网络/CLI 退避，但不能绕过服务端限流截止时间。
- 更新安装、退出或 Provider 登录切换仍使用现有取消语义，取消不计为失败。

## 刷新频率

主额度采集继续遵循用户当前设置，默认 300 秒。本阶段不增加 15 秒级本地活动轮询，不因 UI 动画提高网络频率。右键 `Refresh now` 和菜单栏/托盘刷新共用同一手动入口。

## 平台与合同

- macOS：`AIMeterCore` 新增纯值状态机和 UserDefaults 持久化；`RefreshCoordinator` 接收 eligibility policy；`AppModel` 映射到展示状态。
- Windows：Rust 以同一 raw value、等待表和 generation 语义实现；JSON 设置只存非敏感截止时间和计数。
- 共享合同增加状态枚举与固定 fixture；不得在 Snapshot、日志或事件中加入凭证、邮箱、会话路径或原始错误正文。

## 错误处理

- 系统时钟回拨：以保存时刻和最大 24 小时窗口规范化，不能永久锁死。
- 状态持久化失败：当前进程内退避仍生效，错误进入脱敏日志；不阻止显示缓存。
- 较旧 generation 迟到：丢弃结果且不改变当前内环状态。
- Provider 不支持某一 origin：不显示该区块，不用空卡占位。
- waiting 原因未知：使用 `Action required`，不拼接 CLI 或服务端原始错误。

## 测试与验收

- operation state 的 refreshing/waiting/idle 转换、取消和 generation 所有权；
- 外环数值在刷新/等待中不变，内环和非颜色状态单独变化；
- 无读数为 dash/unavailable，不是 0%；
- 四类退避的首次值、指数递增、上限、成功清除、手动绕过和 Retry-After 下限；
- 重启恢复、时钟回拨、损坏数据和 24 小时规范化；
- 一个 Provider 退避不阻塞其他 Provider；
- macOS/Windows fixture 和 raw value 一致；
- Reduce Motion、VoiceOver/Narrator 与缓存可访问性文案；
- 完整双平台测试、构建、文档和公开安全门禁。

## 非目标

- 不宣称监控真实回答生成状态；
- 不读取会话内容、标题、路径或等待原因；
- 不改变用户设置的主刷新间隔；
- 不把 DeepSeek 官网 30 天同步变成后台自动登录；
- 不在本阶段增加 Cursor、Antigravity 或其他 Provider。
