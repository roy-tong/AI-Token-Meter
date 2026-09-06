# 紧凑浮动条与闲置折叠 实现计划

**需求：** REQ-20260906-002
**执行：** 使用 executing-plans 内联执行；用户已授权按推荐完成，无需再次选择执行方式。
**规格：** [已确认规格](../specifications/2026-09-06-compact-floating-strip-and-idle-fold-design.md)
**目标：** 同步交付 macOS/Windows 的紧凑浮动条与闲置折叠。
**架构：** 可测试纯值策略负责决策，原生窗口负责生命周期，设置只持久化用户偏好。保留现有数据采集及显示器恢复契约。
**技术栈：** Swift/SwiftUI/AppKit、Rust/Tauri、React/TypeScript。

## 任务 1：纯值偏好、尺寸与折叠状态机

**文件与职责：** Sources/AIMeterCore/Preferences/FloatingStripPreferences.swift；Sources/AIMeterCore/UI/FloatingStripFoldState.swift；Tests/AIMeterCoreTests/FloatingStripPreferencesTests.swift；windows/src-tauri/src/platform/windows/strip_preferences.rs。
**交付行为：** 旧配置默认 Compact/Never；1–3 项分别收缩高度；交互重置截止时间；详情锁阻止折叠；超过截止时间才能折叠。

- [x] 先为上述行为增加输入/输出测试，验证功能缺失导致失败；核心断言：
```text
var state = FloatingStripFoldState(); state.update(now: 0, delay: 5, locked: false); state.update(now: 6, delay: 5, locked: false); #expect(state.isFolded)
```
- [x] 实现纯值策略并连接调用方。失败路径保留已保存位置和已成功数据；持久化失败记录脱敏错误。
- [x] Swift 使用 `bash scripts/test.sh --filter <对应测试组>`；前端使用 `cd windows && npm test`；Rust 使用 `cd windows/src-tauri && cargo test`。断言通过后检查调用链和边界。
- [x] 更新开发记录和复选框，运行 `git diff --check`，提交独立 Git 检查点。

## 任务 2：macOS 窗口和设置接入

**文件与职责：** Sources/AIMeterApp/AppModel.swift；Sources/AIMeterApp/System/FloatingPanelController.swift；Sources/AIMeterApp/Views/FloatingStripView.swift；Sources/AIMeterApp/Views/FloatingStripShape.swift；Sources/AIMeterApp/Views/FloatingStripBackground.swift；Sources/AIMeterApp/Views/AppearanceSettingsView.swift；Tests/AIMeterAppTests/FloatingStripDragShapeTests.swift。
**交付行为：** 根据同一 metrics 绘制、命中、设置窗口尺寸；折叠不写位置；原生定时器持有折叠；焦点、刷新、拖动、详情锁展开。

- [x] 先为上述行为增加输入/输出测试，验证功能缺失导致失败；核心断言：
```text
let metrics = FloatingStripDensity.compact; #expect(metrics.height(providerCount: 2) == 228)
```
- [x] 实现纯值策略并连接调用方。失败路径保留已保存位置和已成功数据；持久化失败记录脱敏错误。
- [x] Swift 使用 `bash scripts/test.sh --filter <对应测试组>`；前端使用 `cd windows && npm test`；Rust 使用 `cd windows/src-tauri && cargo test`。断言通过后检查调用链和边界。
- [x] 更新开发记录和复选框，运行 `git diff --check`，提交独立 Git 检查点。

## 任务 3：Windows 窗口和设置接入

**文件与职责：** windows/src/components/FloatingStrip.tsx；windows/src/Shell.tsx；windows/src/styles.css；windows/src/settings/SettingsWindow.tsx；windows/src-tauri/src/lib.rs；windows/src-tauri/src/platform/windows/window_controller.rs；windows/src/App.test.tsx。
**交付行为：** 原生循环控制折叠及窗口大小；前端事件汇报交互，单一 SVG 裁切覆盖肩部；Settings 保存后广播；四档 DPI 运行几何检查。

- [ ] 先为上述行为增加输入/输出测试，验证功能缺失导致失败；核心断言：
```text
expect(screen.getByRole('navigation')).toHaveAttribute('data-density', 'compact')
```
- [ ] 实现纯值策略并连接调用方。失败路径保留已保存位置和已成功数据；持久化失败记录脱敏错误。
- [ ] Swift 使用 `bash scripts/test.sh --filter <对应测试组>`；前端使用 `cd windows && npm test`；Rust 使用 `cd windows/src-tauri && cargo test`。断言通过后检查调用链和边界。
- [ ] 更新开发记录和复选框，运行 `git diff --check`，提交独立 Git 检查点。

## 验证口径

每个测试必须能捕获实际错误的分支、持久化或窗口几何。正常路径与未知配置、取消、到期、多屏回退一并检查。视觉改动用渲染结果检验，避免仅检查源码字符串。完整回归后再合并；真实 Windows 桌面验收单列环境限制。
