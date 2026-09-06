# 浮动条 Provider 管理与右键菜单 实现计划

**需求：** REQ-20260906-002
**执行：** 使用 executing-plans 内联执行；用户已授权按推荐完成，无需再次选择执行方式。
**规格：** [已确认规格](../specifications/2026-09-06-floating-strip-provider-controls-design.md)
**目标：** 同步交付 macOS/Windows 的浮动条 Provider 管理与右键菜单。
**架构：** 可测试纯值策略负责决策，原生窗口负责生命周期，设置只持久化用户偏好。保留现有数据采集及显示器恢复契约。
**技术栈：** Swift/SwiftUI/AppKit、Rust/Tauri、React/TypeScript。

## 任务 1：显示排序和持久化

**文件与职责：** Sources/AIMeterCore/Preferences/FloatingStripPreferences.swift；Sources/AIMeterApp/Views/AppearanceSettingsView.swift；windows/src-tauri/src/platform/windows/strip_preferences.rs；windows/src/settings/SettingsWindow.tsx。
**交付行为：** 规范化未知、重复、全隐藏配置；隐藏最后一项拒绝；顺序调整和重启恢复；浮动条高度依据可见项数。

- [ ] 先为上述行为增加输入/输出测试，验证功能缺失导致失败；核心断言：
```text
var preferences = FloatingStripPreferences(); preferences.hiddenProviders = [.claude, .codex, .deepSeek]; preferences.normalize(); #expect(!preferences.visibleProviders.isEmpty)
```
- [ ] 实现纯值策略并连接调用方。失败路径保留已保存位置和已成功数据；持久化失败记录脱敏错误。
- [ ] Swift 使用 `bash scripts/test.sh --filter <对应测试组>`；前端使用 `cd windows && npm test`；Rust 使用 `cd windows/src-tauri && cargo test`。断言通过后检查调用链和边界。
- [ ] 更新开发记录和复选框，运行 `git diff --check`，提交独立 Git 检查点。

## 任务 2：原生菜单、临时隐藏与恢复

**文件与职责：** Sources/AIMeterApp/System/FloatingPanelController.swift；Sources/AIMeterApp/AppModel.swift；Sources/AIMeterApp/Views/MenuBarView.swift；windows/src-tauri/src/lib.rs；windows/src-tauri/src/platform/windows/tray.rs。
**交付行为：** 菜单动作刷新/一小时隐藏/Appearance/退出；持久化截止时间；到期恢复遵守全屏策略；菜单持有交互锁；右键不触发拖动。

- [ ] 先为上述行为增加输入/输出测试，验证功能缺失导致失败；核心断言：
```text
#expect(FloatingStripPreferences(hiddenUntil: 100).isTemporarilyHidden(now: 99)); #expect(!FloatingStripPreferences(hiddenUntil: 100).isTemporarilyHidden(now: 100))
```
- [ ] 实现纯值策略并连接调用方。失败路径保留已保存位置和已成功数据；持久化失败记录脱敏错误。
- [ ] Swift 使用 `bash scripts/test.sh --filter <对应测试组>`；前端使用 `cd windows && npm test`；Rust 使用 `cd windows/src-tauri && cargo test`。断言通过后检查调用链和边界。
- [ ] 更新开发记录和复选框，运行 `git diff --check`，提交独立 Git 检查点。

## 验证口径

每个测试必须能捕获实际错误的分支、持久化或窗口几何。正常路径与未知配置、取消、到期、多屏回退一并检查。视觉改动用渲染结果检验，避免仅检查源码字符串。完整回归后再合并；真实 Windows 桌面验收单列环境限制。

