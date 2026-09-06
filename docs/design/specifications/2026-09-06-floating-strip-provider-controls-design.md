# 浮动条 Provider 管理与右键菜单设计

**需求：** `REQ-20260906-002`  
**日期：** 2026-09-06  
**状态：** 已实现并合入main，双平台自动化通过；真实Windows桌面验收受环境限制（2026-09-06）
**依赖：** [紧凑浮动条与闲置折叠](2026-09-06-compact-floating-strip-and-idle-fold-design.md)

## 目标

允许用户决定浮动条显示哪些 Provider、以什么顺序显示，并从浮动条直接刷新、临时隐藏、打开 Settings 或退出；不改变采集、Widget、菜单栏摘要和账户登录行为。

## 范围拆分

Provider 显示顺序与“是否继续监控”是不同概念。本阶段只控制浮动条呈现：隐藏 Provider 不停止采集，不删除缓存，不退出 CLI，也不改变菜单栏、Widget、通知和详情的数据来源。这避免用户为了缩短浮动条而意外失去提醒或历史数据。

## Provider 配置

新增 `FloatingStripProviderLayout`：

```text
orderedProviders: [claude, codex, deepseek]
hiddenProviders: []
```

规则：

- 默认顺序保持 Claude Code、OpenAI Codex、DeepSeek；
- Settings → Appearance 增加 `Floating strip services`，每项有显示开关和拖动排序；
- 至少保留一个可见 Provider；关闭最后一项时拒绝并显示固定提示；
- 读取配置时去重、丢弃未知 ID，并把版本升级后新增的 Provider 追加到末尾且默认可见；
- 当前打开的 Provider 被隐藏时立即关闭详情；
- 1、2、3 项分别按当前 density 的统一公式计算浮动条高度与肩部位置，不留下空槽；
- Widget、菜单栏摘要、阈值通知和 Provider 采集顺序不随浮动条排序变化。

## 右键菜单

在 Provider 圆环、拖动区域或折叠把手上右键，显示平台原生菜单：

1. `Refresh now`
2. `Hide for 1 hour`
3. 分隔线
4. `Settings…`
5. `Quit AI Token Meter`

行为：

- `Refresh now` 调用既有用户发起刷新入口；刷新中禁用，不能创建重叠采集。
- `Hide for 1 hour` 保存绝对 `hiddenUntil`；重启后仍生效。菜单栏或托盘提供 `Show Floating Strip Now`，可提前解除。
- `Settings…` 使用既有置前流程，默认打开 Appearance Tab。
- `Quit` 调用现有安全退出路径，先停止采集、折叠计时器和 DeepSeek 托管窗口。
- 打开右键菜单期间暂停折叠和详情自动隐藏；菜单关闭后重新计算延迟。
- 右键不得开始拖动、切换 Provider 详情或触发空白处关闭。

## 设置与持久化

macOS 使用独立 UserDefaults store；Windows 扩展 `AppSettings` JSON。`hiddenUntil` 与 Provider layout 分开保存，便于用户重置显示顺序而不改变临时隐藏状态。

提供 `Restore default order`，仅恢复三项顺序和可见性。Settings 始终使用系统字体，Windows 下排序按钮必须可由键盘操作，并提供 Move up / Move down 的辅助入口，不能只依赖拖动。

## 错误处理

- 配置损坏：规范化后至少显示 Claude Code；同时把 Codex 和 DeepSeek 追加为可见，等价于默认配置。
- `hiddenUntil` 无效、非有限或早于当前时间：视为未隐藏并清除。
- Settings/刷新动作失败：显示既有固定脱敏反馈，不关闭浮动条。
- 临时隐藏到期时处于全屏：只清除时间，不强制显示；继续遵循全屏可见性策略。

## 测试与验收

- Provider layout 的去重、未知值、至少一项、升级追加和 round-trip；
- 1/2/3 Provider 下 Compact/Comfortable 高度与左右轮廓；
- 隐藏当前 Provider 关闭详情，其他 Provider 保持选择能力；
- 右键不触发拖动/详情，菜单打开暂停折叠；
- `hiddenUntil` 重启恢复、到期、提前显示和全屏优先级；
- macOS 原生 NSMenu 与 Windows Tauri menu 的项目、禁用状态和动作映射；
- 键盘、VoiceOver/Narrator 可调整 Provider 顺序；
- 完整双平台回归、文档与安全门禁。

## 非目标

- 不停止隐藏 Provider 的采集；
- 不改变 Widget 三项布局；
- 不在本阶段新增 Provider；
- 不增加可编辑菜单项目或任意隐藏时长；
- 不让右键菜单展示账户邮箱、余额或其他敏感信息。
