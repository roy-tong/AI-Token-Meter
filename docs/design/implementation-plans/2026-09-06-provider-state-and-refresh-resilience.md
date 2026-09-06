# Provider 状态表达与刷新韧性 实现计划

**需求：** REQ-20260906-002
**执行：** 使用 executing-plans 内联执行；用户已授权按推荐完成，无需再次选择执行方式。
**规格：** [已确认规格](../specifications/2026-09-06-provider-state-and-refresh-resilience-design.md)
**目标：** 同步交付 macOS/Windows 的Provider 状态表达与刷新韧性。
**架构：** 可测试纯值策略负责决策，原生窗口负责生命周期，设置只持久化用户偏好。保留现有数据采集及显示器恢复契约。
**技术栈：** Swift/SwiftUI/AppKit、Rust/Tauri、React/TypeScript。

## 任务 1：失败分类与持久化退避

**文件与职责：** Sources/AIMeterCore/Coordination/RefreshBackoff.swift；Sources/AIMeterCore/Coordination/RefreshCoordinator.swift；Tests/AIMeterCoreTests/RefreshCoordinatorTests.swift；windows/src-tauri/src/collectors/refresh.rs；windows/src-tauri/src/collectors/application.rs。
**交付行为：** 注入时钟测试；限流尊重截止时间，网络/CLI 手动绕过一次；成功清零；取消无失败；重启恢复；一项退避不阻塞其他项。

- [ ] 先为上述行为增加输入/输出测试，验证功能缺失导致失败；核心断言：
```text
var backoff = RefreshBackoffState(); backoff.record(.rateLimited, now: 100); #expect(!backoff.isEligible(now: 159, manual: true)); #expect(backoff.isEligible(now: 160, manual: true))
```
- [ ] 实现纯值策略并连接调用方。失败路径保留已保存位置和已成功数据；持久化失败记录脱敏错误。
- [ ] Swift 使用 `bash scripts/test.sh --filter <对应测试组>`；前端使用 `cd windows && npm test`；Rust 使用 `cd windows/src-tauri && cargo test`。断言通过后检查调用链和边界。
- [ ] 更新开发记录和复选框，运行 `git diff --check`，提交独立 Git 检查点。

## 任务 2：状态环和新鲜度呈现

**文件与职责：** Sources/AIMeterApp/Views/UsageRing.swift；Sources/AIMeterApp/AppModel.swift；windows/src/components/UsageRing.tsx；windows/src/details/ProviderDetail.tsx；windows/src/styles.css；windows/src/App.test.tsx。
**交付行为：** 刷新开始保留数值；独立内环；等待状态动作可访问；缓存按 fetchedAt 显示分钟；Reduce Motion 停止动画；取消和旧 generation 不留下刷新状态。

- [ ] 先为上述行为增加输入/输出测试，验证功能缺失导致失败；核心断言：
```text
expect(screen.getByRole('button', { name: /DeepSeek/ })).toHaveAccessibleDescription(/Refreshing/)
```
- [ ] 实现纯值策略并连接调用方。失败路径保留已保存位置和已成功数据；持久化失败记录脱敏错误。
- [ ] Swift 使用 `bash scripts/test.sh --filter <对应测试组>`；前端使用 `cd windows && npm test`；Rust 使用 `cd windows/src-tauri && cargo test`。断言通过后检查调用链和边界。
- [ ] 更新开发记录和复选框，运行 `git diff --check`，提交独立 Git 检查点。

## 任务 3：集成验收与文档

**文件与职责：** docs/development/2026-09-06-compact-progressive-strip.md；docs/development/README.md；docs/requirements-backlog.md；README.md。
**交付行为：** 按三份规格逐项自审；完整 Swift/Rust/frontend/合同/文档/安全检查；真实 Windows 无法在本机执行的项明确记录，不冒充完成；保存 Git 检查点。

- [ ] 先为上述行为增加输入/输出测试，验证功能缺失导致失败；核心断言：
```text
bash scripts/test.sh
cd windows && npm test && npm run build
cd src-tauri && cargo test
bash scripts/check-docs.sh
```
- [ ] 实现纯值策略并连接调用方。失败路径保留已保存位置和已成功数据；持久化失败记录脱敏错误。
- [ ] Swift 使用 `bash scripts/test.sh --filter <对应测试组>`；前端使用 `cd windows && npm test`；Rust 使用 `cd windows/src-tauri && cargo test`。断言通过后检查调用链和边界。
- [ ] 更新开发记录和复选框，运行 `git diff --check`，提交独立 Git 检查点。

## 验证口径

每个测试必须能捕获实际错误的分支、持久化或窗口几何。正常路径与未知配置、取消、到期、多屏回退一并检查。视觉改动用渲染结果检验，避免仅检查源码字符串。完整回归后再合并；真实 Windows 桌面验收单列环境限制。

