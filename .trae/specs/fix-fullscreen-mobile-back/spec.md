# 全屏播放器 & 移动端适配修复 Spec

## Why
全屏播放器存在两个交互 bug：进度条无法拖拽/点击跳转、关闭按钮（×）无法退出全屏播放器。此外，所有页面缺少移动端返回键，在手机端无法方便地回退到上一页。

## What Changes
- 修复全屏播放器进度条拖动/点击跳转功能
- 修复全屏播放器关闭按钮（×）无法退出
- 给所有页面添加移动端顶部返回键（适配手机浏览器无物理返回键场景）
- 服务 Skill: frontend-skill, shadcn, web-artifacts-builder, web-design-guidelines

## Impact
- Affected specs: 无
- Affected code: `js/player.js`, `index.html`, `css/layout.css`, `js/app.js`

---

## ADDED Requirements

### Requirement: 全屏播放器进度条可交互
全屏播放器进度条 SHALL 支持点击跳转和拖拽跳转，与底部播放器进度条行为一致。

#### Scenario: 点击进度条跳转
- **WHEN** 用户在全屏播放器中点击进度条某位置
- **THEN** 播放进度跳转到对应位置
- **AND** 进度条视觉即时更新

#### Scenario: 拖拽进度条跳转
- **WHEN** 用户在全屏播放器中按住进度条并拖动
- **THEN** 播放进度跟随拖拽位置实时更新
- **AND** 松开后继续从新位置播放

### Requirement: 全屏播放器关闭按钮可用
全屏播放器关闭按钮（×）SHALL 能正确退出全屏播放器，返回之前的页面。

#### Scenario: 点击关闭按钮
- **WHEN** 用户在全屏播放器中点击右上角 × 按钮
- **THEN** 全屏播放器关闭，显示之前浏览的页面
- **AND** 播放器底部栏继续显示当前播放状态

### Requirement: 移动端页面返回键
所有页面 SHALL 在移动端视口下显示顶部返回键，用户可通过它返回上一页。

#### Scenario: 移动端返回上一页
- **WHEN** 用户在移动端浏览非首页页面
- **THEN** 页面顶部左侧显示返回键按钮
- **AND** 点击后导航回浏览历史中的上一页

#### Scenario: 首页不显示返回键
- **WHEN** 用户在移动端浏览首页
- **THEN** 页面顶部不显示返回键

---

## 根因分析

### Bug 1: 全屏进度条无法拖拽
**根因**：`fullscreen-player` 容器初始状态为 `opacity: 0; pointer-events: none`。`bindControls()` 在 `Player.init()` 中调用，此时元素虽然存在于 DOM 但父容器 `pointer-events: none` 导致子元素事件无法正常触发。即使 `.is-open` 后变为 `pointer-events: auto`，事件绑定已在 init 时完成，但某些浏览器中 `pointer-events: none` 的父容器下的子元素事件监听器可能不会被正确注册。

**修复**：在 `renderFullscreen()` 中（当 `.is-open` 时）重新绑定进度条事件，并使用 `{ once: true }` 标记防止重复绑定。

### Bug 2: 关闭按钮无法退出
**根因**：与 Bug 1 相同——`fullscreen-player` 的 `pointer-events: none` 初始状态可能影响事件监听器注册。此外，`renderFullscreen()` 每 tick 调用一次，频繁操作 `fs-controls` 的 innerHTML 可能触发 DOM 重排影响事件。

**修复**：添加内联 `onclick` 属性作为 fallback，确保关闭行为始终可用。同时修复 `bindControls()` 中的时序问题。

### Bug 3: 缺少移动端返回键
**根因**：当前只有底部 3 个 Tab 导航，没有浏览历史回退机制。移动端用户进入子页面后无法方便返回。

**修复**：在 `app.js` 中添加导航历史栈，在 `navigate()` 中记录历史，在移动端顶部栏渲染返回按钮（首页除外）。