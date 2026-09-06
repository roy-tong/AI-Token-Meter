# 紧凑浮动条与闲置折叠设计

**需求：** `REQ-20260906-002`  
**日期：** 2026-09-06  
**状态：** 待用户审查书面规格  
**前置研究：** [CodeNotch 竞品研究](../../development/2026-09-06-codenotch-competitive-review.md)

## 目标

在不丢失黑蓝深海背景、三个纯 Logo、Provider 品牌色、S 形贴边轮廓和现有点击详情交互的前提下，让 macOS 与 Windows 浮动条明显变瘦，并提供可选的闲置折叠能力。

## 方案比较

### 方案 A：只压缩现有尺寸

把 108×356pt 和 60pt 圆环整体缩小。改动最少，但拖动命中区、肩部曲线和 Windows DPI 容易随等比例缩放变得生硬，也没有解决闲置时长期占用屏幕的问题。

### 方案 B：独立紧凑布局 + 可选折叠（采用）

保留 Comfortable 现状，新增单独测量的 Compact 轮廓和布局；闲置折叠是独立开关。该方案能直接改善桌面占用，同时保留无障碍点击尺寸与回退能力。

### 方案 C：完全采用 CodeNotch 式悬停展开

默认收起、悬停展开并改为悬停详情。视觉最激进，但会改变用户已确认的点击详情、拖动和自动隐藏习惯，也会提高 Windows 透明窗口命中风险，因此不采用。

## 密度模型

新增跨平台枚举 `FloatingStripDensity`：

| 选项 | 浮动条尺寸 | 圆环 | Logo 光学框 | 环间距 | 轨道 / 进度线 |
| --- | --- | --- | --- | --- | --- |
| Compact | 78×286 logical points | 48pt | 21pt | 10pt | 4pt / 3.5pt |
| Comfortable | 108×356 logical points | 60pt | 26.4pt | 12pt | 5pt / 5pt |

- 新安装和升级后尚无该偏好的用户默认使用 `Compact`；`Comfortable` 完整保留为 Settings 中的回退选项。
- macOS 使用 logical point，Windows 使用 CSS logical pixel；Windows 原生窗口按显示器 scale factor 换算物理像素。
- 密度只改变浮动条，不改变详情页、菜单面板、Settings、Widget 或用户选择的字体。
- Compact 的点击圆环仍大于 macOS 44pt 最小目标；无障碍标签、键盘移动和 provider detail open/closed value 保持现状。

## Compact 轮廓

Compact 使用独立 78×286 基准路径，不对现有 108×356 路径做运行时等比例压扁：

```text
M 78 12
C 71 17, 63 21, 48 22
C 21 23, 0 42, 0 70
L 0 216
C 0 244, 21 263, 48 264
C 63 265, 71 269, 78 274
Z
```

- 左边贴靠使用 `x' = width - x` 镜像；背景图也只镜像 X，Logo 与进度方向不镜像。
- 背景继续由单一 Surface 承载并在完整路径内 `scaledToFill/cover`，上下肩部不得使用独立伪元素拼接。
- Compact 背景遮罩由当前 `0.38` 提高到 `0.46`，减弱缩小后高亮线条与圆环竞争；Comfortable 维持当前效果。
- 不添加边框或外部阴影；Windows 继续关闭 WebView/系统外框，并以 SVG clip path 作为可见裁剪源。
- 拖动把手尺寸为 18×3pt，默认透明度 `0.16`，指针进入非按钮区域时升至 `0.34`；整个非按钮 Surface 都能拖动。

## 闲置折叠

新增 `FloatingStripFoldDelay`：`never`、`5 seconds`、`15 seconds`，默认 `never`。折叠和密度互相独立。

### 状态机

```text
expanded → foldPending → folded
    ↑            ↓          ↓
    └──── interaction/detail/drag/focus ────┘
```

- `expanded`：显示完整浮动条。
- `foldPending`：没有交互且延迟已开始；任何交互立即取消。
- `folded`：窗口缩成贴边的 12×96 logical point 把手，保持原屏幕、边缘和归一化中心高度。

以下任一条件成立时保持或恢复 `expanded`：

- 指针位于浮动条或详情；
- 详情已打开；
- 正在拖动；
- Provider 按钮或辅助功能元素获得焦点；
- VoiceOver 正在读取；
- 正在刷新、登录或打开 DeepSeek 官网同步；
- 系统正在执行显示器拓扑恢复。

折叠把手使用同一深海背景和轮廓端色，中央只有一条 3×40pt 低亮竖线，不显示 Logo、百分比或文字。指针进入把手立即展开；展开动画 180ms，折叠动画 160ms。`Reduce Motion` 开启时不做插值，直接切换尺寸和裁剪状态。

### 与现有可见性规则的关系

优先级从高到低：

1. 用户关闭 Show Floating Strip 或 `hiddenUntil` 尚未到期：整个窗口不可见；
2. 全屏/桌面层策略判定不可见：整个窗口不可见；
3. 可见且折叠条件成立：显示把手；
4. 其他情况：显示完整浮动条。

隐藏、折叠和密度不得改写已保存的显示器、左右边缘或垂直位置。

## 设置

Settings → Appearance 新增：

- `Floating strip size`：Compact / Comfortable；
- `Fold when idle`：Never / After 5 seconds / After 15 seconds。

Settings 本身继续使用系统字体；选项立即生效并持久化。密度切换时以当前浮动条中心为锚重新吸附，不跳到另一显示器，也不覆盖保存的位置。

## 平台架构

### 共享领域

`AIMeterCore` 与 Windows Rust 分别保存相同 raw value 的密度和折叠延迟。跨平台合同增加固定枚举值，不把平台像素放入共享 Snapshot schema。

### macOS

- `FloatingStripMetrics` 持有两档几何；`FloatingStripShape` 接收 metrics。
- `FloatingPanelController` 根据密度改变 `NSPanel` 尺寸，并由独立折叠状态机管理延迟和交互锁。
- `AppModel` 只持久化用户偏好；Panel Controller 持有瞬时 hover/drag/focus/fold 状态。

### Windows

- React/CSS 用密度 class 和两条文档级 SVG path 渲染。
- Rust `window_controller` 负责 logical/physical size、贴边重算和折叠窗口大小。
- 前端只发出明确的 pointer/focus interaction 事件；折叠计时与最终窗口动作由 Rust 单一所有者执行，避免浏览器计时与原生拖动竞争。

## 错误处理

- 偏好损坏或出现未知 raw value：恢复 Compact + Never，不修改位置。
- 原生窗口 resize 失败：保持当前尺寸，写脱敏日志，不保存错误状态。
- 折叠期间显示器断开：先按现有策略临时回到主屏，再按当前 fold state 计算窗口尺寸；目标屏恢复后回原屏。
- 详情打开时若折叠计时器迟到：generation token 使旧回调失效，禁止收起当前详情。
- Windows scale factor 改变：从 logical metrics 重新计算，不累计缩放误差。

## 测试与验收

- 两档设置 round-trip、损坏值回退和升级默认测试；
- macOS/Windows 对同一 density raw value、逻辑尺寸、环尺寸和 fold delay 的合同测试；
- Compact 左右基准路径、背景裁切、无阴影、Logo 不镜像的渲染测试；
- 折叠状态机覆盖延迟、取消、旧计时器、详情、拖动、焦点、VoiceOver、刷新和 Reduce Motion；
- 切换密度、折叠/展开、重启、多屏断开/恢复不得改变已保存位置；
- Windows 100%/125%/150%/200% DPI 计算样式和窗口尺寸门禁；
- macOS Demo 截图与 Windows 浏览器 fixture 各生成 Compact/Comfortable 对比证据；
- 完整 Swift、PTY、Windows 前端/Rust、跨平台合同、文档与公开安全门禁通过后，才能标记自动化完成。

真实视觉验收应确认：Compact 比当前明显变瘦，三个 Logo 仍清晰，肩部圆润、背景连续、无白边，折叠把手可发现且不会干扰屏幕边缘操作。

## 非目标

- 不改变 Provider 详情内容或字体大小；
- 不增加圆环下百分比；
- 不增加上/下贴边；
- 不删除深海背景；
- 不在本阶段实现 Provider 排序、右键菜单、实时运行状态或刷新退避。
