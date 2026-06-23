# 全屏播放器 Bug 集中修复 Spec

## Why
全屏播放器页面存在多个严重交互 bug：
1. 列表循环等播放模式切换后全屏 UI 不更新
2. 均衡器滑块触屏拖拽卡顿/无反应（因为每次拖拽重渲染整个面板）
3. 全屏播放器内队列按钮点击无法弹出队列面板
4. 外部播放器队列面板弹出后滚动条未隐藏，影响美观

## What Changes
- 修复 `cyclePlayMode()` 切换后在 `renderFullscreen()` 中更新播放模式按钮状态
- 重构 EQ 滑块拖拽：不再每次拖拽时重渲染整个面板，只更新滑块 DOM 位置
- 全屏播放器内队列按钮打开队列面板时，将面板渲染到全屏播放器内部或使用 portal 模式
- 隐藏队列面板的滚动条（添加 `scrollbar-width: none` / `::-webkit-scrollbar` 样式）

## Impact
- Affected specs: fix-player-menu-interactions, fix-fullscreen-mobile-back
- Affected code: `js/player/core.js`, `js/player/effects.js`, `js/player/ui.js`, `js/player/fullscreen.js`, `css/layout.css`

---

## ADDED Requirements

### Requirement: 播放模式切换全屏 UI 同步更新
全屏播放器中的播放模式按钮 SHALL 在切换模式后立即更新显示。

#### Scenario: 全屏播放器切换播放模式
- **WHEN** 用户在全屏播放器中点击播放模式按钮
- **THEN** 按钮文字和图标即时更新为新模式
- **AND** 底部栏播放模式按钮同步更新

### Requirement: EQ 滑块触屏流畅拖拽
均衡器面板中的频段滑块 SHALL 在触屏拖拽时流畅响应，不卡顿。

#### Scenario: 触屏拖拽 EQ 滑块
- **WHEN** 用户在均衡器面板中长按并上下拖动频段滑块
- **THEN** 滑块位置实时跟随手指移动
- **AND** dB 值实时更新
- **AND** 拖拽过程中面板不闪烁、不重建

### Requirement: 全屏播放器队列面板
全屏播放器中的队列按钮 SHALL 能在全屏模式下打开队列面板。

#### Scenario: 全屏播放器内打开队列
- **WHEN** 用户在全屏播放器中点击队列按钮
- **THEN** 队列面板在全屏播放器上方弹出显示
- **AND** 面板包含当前播放列表

### Requirement: 队列面板隐藏滚动条
播放队列面板的滚动条 SHALL 对用户不可见。

#### Scenario: 队列面板滚动条
- **WHEN** 队列列表内容超出面板高度
- **THEN** 内容可滚动但滚动条不可见

---

## 根因分析

### Bug 1: 播放模式切换全屏不更新
**根因**: `cyclePlayMode()` (core.js:140-145) 只调用了 `renderPlayModeButton()` 更新底部栏，没有触发 `renderFullscreen()` 更新全屏按钮。虽然 `renderFullscreen()` 在 `tick()` 和 `togglePlay()` 中被调用，但仅在模式切换时不会触发。

**修复**: 在 `cyclePlayMode()` 中添加 `renderFullscreen()` 调用。

### Bug 2: EQ 滑块拖拽卡顿
**根因**: `renderEQPanel()` (effects.js:18-107) 在每次 `updateGain()` 回调中调用，导致整个面板 HTML 被替换。滑块 DOM 被销毁后，`dragging` 变量虽然仍为 `true`，但新的 slider 元素没有绑定拖拽事件，后续 touchmove 事件无法响应。

**修复**: 重构滑块更新逻辑，使用 `requestAnimationFrame` 节流 DOM 更新，仅更新滑块位置和 dB 值，不重建整个面板。将 `renderEQPanel()` 调用从 `updateGain` 中移除，改为直接操作 DOM。

### Bug 3: 全屏队列按钮无效
**根因**: 队列面板 `.queue-panel` 位于 `player-bar` 内部，使用 `position: absolute` 相对 player-bar 定位。当全屏播放器打开时（`z-index: 1000`），player-bar 的 `z-index: 98` 被全屏遮挡，队列面板不可见。

**修复**: 将队列面板重构为独立于 player-bar 的 fixed 定位元素，或使用 portal 模式将其渲染到 body 级别。同时在全屏模式下调整队列面板的 z-index 使其高于全屏播放器。

### Bug 4: 队列面板滚动条未隐藏
**根因**: `.queue-list` 设置了 `overflow-y: auto` 但未隐藏滚动条样式。

**修复**: 添加 CSS 隐藏滚动条（WebKit 和 Firefox 兼容）。